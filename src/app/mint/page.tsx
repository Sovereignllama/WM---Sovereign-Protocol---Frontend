'use client';

import { useState, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { SovereignType } from '@/lib/program/client';
import { PROTOCOL_CONSTANTS, LAMPORTS_PER_GOR, config } from '@/lib/config';
import { getSovereignPDA } from '@/lib/program/pdas';
import { useProtocolState } from '@/hooks/useSovereign';
import { useCreateSovereign, type CreationProgress, type CreateSovereignMutationParams } from '@/hooks/useTransactions';
import { useRouter } from 'next/navigation';
import { createTokenMetadata, createUploadAuth, isPinataConfigured } from '@/lib/upload';
import { PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import Link from 'next/link';
import CreationStepper from '@/components/CreationStepper';
import { BYOTokenPicker } from '@/components/BYOTokenPicker';
import { useTrackedTokens, type TrackedToken } from '@/hooks/useTrackedTokens';

type Step = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1: Type & Basic Info
  sovereignType: SovereignType;
  name: string;
  
  // Step 2: Token Config (Token Launch)
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  tokenImage: File | null;
  tokenImagePreview: string;
  tokenDescription: string;
  sellFeeBps: number;
  
  // Step 2: BYO Token Config
  existingMint: string;
  depositAmount: string;
  byoTokenDecimals: number;
  byoTokenSupply: string;
  byoTokenSymbol: string;
  byoMintValid: boolean;
  byoMintLoading: boolean;
  byoTokenProgramId: string;
  byoMintAuthorityRenounced: boolean;
  byoFreezeAuthorityRenounced: boolean;
  
  // Step 3: $overeign Config
  bondTarget: string;
  bondDurationDays: number;
  swapFeeBps: number;
  
  // Step 4: Creator Buy-in
  creatorBuyIn: string;
}

const defaultFormData: FormData = {
  sovereignType: 'TokenLaunch',
  name: '',
  tokenName: '',
  tokenSymbol: '',
  tokenSupply: '1000000000',
  tokenImage: null,
  tokenImagePreview: '',
  tokenDescription: '',
  sellFeeBps: 0,

  // BYO defaults
  existingMint: '',
  depositAmount: '',
  byoTokenDecimals: 0,
  byoTokenSupply: '0',
  byoTokenSymbol: '',
  byoMintValid: false,
  byoMintLoading: false,
  byoTokenProgramId: '',
  byoMintAuthorityRenounced: false,
  byoFreezeAuthorityRenounced: false,

  bondTarget: '50',
  bondDurationDays: 14,
  swapFeeBps: 100,
  creatorBuyIn: '0',
};

export default function MintPage() {
  const router = useRouter();
  const { connected, publicKey, signMessage } = useWallet();
  const { connection } = useConnection();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── BYO token picker state ──
  const [byoPickerOpen, setByoPickerOpen] = useState(false);
  const { tokens: trackedTokens, walletBalances } = useTrackedTokens();
  const [selectedTrackedToken, setSelectedTrackedToken] = useState<TrackedToken | null>(null);

  // ── BYO: Get market price from tracked token data (GOR per token) ──
  const getByoMarketPrice = (): number => {
    if (selectedTrackedToken?.currentPrice && selectedTrackedToken.currentPrice > 0) {
      return selectedTrackedToken.currentPrice;
    }
    if (formData.existingMint && trackedTokens.length > 0) {
      const match = trackedTokens.find(t => t.tokenMint === formData.existingMint);
      if (match?.currentPrice && match.currentPrice > 0) {
        return match.currentPrice;
      }
    }
    return 0;
  };

  const formatGorPrice = (p: number): string => {
    if (p <= 0) return '\u2014';
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    if (p >= 0.000001) return p.toFixed(9);
    return p.toExponential(3);
  };

  // ── BYO: Auto-populate bond target at 10% below market price ──
  const autoCalcByoBondTarget = (depositHuman?: number, marketPriceOverride?: number) => {
    const deposit = depositHuman ?? (parseFloat(formData.depositAmount) || 0);
    const marketPrice = marketPriceOverride ?? getByoMarketPrice();
    if (deposit > 0 && marketPrice > 0) {
      const targetPrice = marketPrice * 0.9; // 10% below market
      const recommendedBond = deposit * targetPrice;
      const effectiveBond = Math.max(recommendedBond, minBondTargetGor);
      updateForm({ bondTarget: effectiveBond.toFixed(2) });
    }
  };

  // ── Creation stepper state ──
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const createdSovereignIdRef = useRef<string | null>(null);
  /** Saved params from the last creation attempt, used for resume */
  const lastCreationParamsRef = useRef<CreateSovereignMutationParams | null>(null);

  const createSovereign = useCreateSovereign((progress) => {
    setCreationProgress(progress);
    // Capture sovereign ID as soon as step 1 confirms (for resume)
    if (progress.sovereignId && !createdSovereignIdRef.current) {
      createdSovereignIdRef.current = progress.sovereignId;
    }
  });

  const isTokenLaunch = formData.sovereignType === 'TokenLaunch';
  const isBYO = formData.sovereignType === 'BYOToken';
  const byoMinSupplyBps = protocolState?.byoMinSupplyBps ?? PROTOCOL_CONSTANTS.DEFAULT_BYO_MIN_SUPPLY_BPS;
  const byoMinSupplyPct = byoMinSupplyBps / 100;

  // Use live protocol state values with fallbacks to defaults
  const creationFeeBps = protocolState?.creationFeeBps ?? PROTOCOL_CONSTANTS.DEFAULT_CREATION_FEE_BPS;
  const minBondTargetGor = protocolState?.minBondTargetGor ?? (PROTOCOL_CONSTANTS.MIN_BOND_TARGET_LAMPORTS / LAMPORTS_PER_GOR);
  const minDepositGor = protocolState?.minDepositGor ?? (PROTOCOL_CONSTANTS.MIN_DEPOSIT_LAMPORTS / LAMPORTS_PER_GOR);

  const updateForm = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // ── BYO: Validate mint address on change ──
  const validateMint = useCallback(async (mintAddress: string) => {
    updateForm({ byoMintLoading: true, byoMintValid: false, byoTokenSymbol: '', byoTokenSupply: '0', byoTokenDecimals: 0, byoTokenProgramId: '', byoMintAuthorityRenounced: false, byoFreezeAuthorityRenounced: false });
    try {
      const mintPubkey = new PublicKey(mintAddress);
      // Try Token program first, then Token-2022
      let mintInfo;
      let programId: PublicKey = TOKEN_PROGRAM_ID;
      try {
        mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
        programId = TOKEN_PROGRAM_ID;
      } catch {
        mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
        programId = TOKEN_2022_PROGRAM_ID;
      }
      const supply = mintInfo.supply.toString();
      const decimals = mintInfo.decimals;
      const mintAuthorityRenounced = mintInfo.mintAuthority === null;
      const freezeAuthorityRenounced = mintInfo.freezeAuthority === null;
      updateForm({
        byoMintValid: true,
        byoMintLoading: false,
        byoTokenDecimals: decimals,
        byoTokenSupply: supply,
        byoTokenSymbol: `${decimals}d`,
        byoTokenProgramId: programId.toBase58(),
        byoMintAuthorityRenounced: mintAuthorityRenounced,
        byoFreezeAuthorityRenounced: freezeAuthorityRenounced,
      });
      setError(null);
    } catch (err: any) {
      updateForm({ byoMintValid: false, byoMintLoading: false });
      setError('Invalid mint address or token not found on-chain');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setError(null);
    updateForm({ 
      tokenImage: file, 
      tokenImagePreview: previewUrl 
    });
  };

  const removeImage = () => {
    if (formData.tokenImagePreview) {
      URL.revokeObjectURL(formData.tokenImagePreview);
    }
    updateForm({ 
      tokenImage: null, 
      tokenImagePreview: '' 
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return formData.sovereignType === 'TokenLaunch' || formData.sovereignType === 'BYOToken';
      case 2:
        if (formData.name.length < 3 || formData.name.length > 32) return false;
        if (isTokenLaunch) {
          return (
            formData.tokenName.length >= 1 &&
            formData.tokenSymbol.length >= 1 &&
            formData.tokenSymbol.length <= 10 &&
            parseFloat(formData.tokenSupply) > 0 &&
            formData.tokenImage !== null
          );
        } else {
          // BYO Token validation
          if (!formData.byoMintValid || formData.byoMintLoading) return false;
          const deposit = parseFloat(formData.depositAmount) || 0;
          if (deposit <= 0) return false;
          // Check minimum supply percentage
          const totalSupply = BigInt(formData.byoTokenSupply);
          if (totalSupply === 0n) return false;
          const depositLamports = BigInt(Math.floor(deposit * (10 ** formData.byoTokenDecimals)));
          const depositBps = Number(depositLamports * 10000n / totalSupply);
          return depositBps >= byoMinSupplyBps;
        }
      case 3:
        const bondTargetGor = parseFloat(formData.bondTarget) || 0;
        const buyIn = parseFloat(formData.creatorBuyIn) || 0;
        const maxBuyIn = bondTargetGor / 100; // 1% of bond target
        return bondTargetGor >= minBondTargetGor && buyIn <= maxBuyIn;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    // BYO: ensure bond target is populated before entering Step 3
    if (step === 2 && isBYO) {
      autoCalcByoBondTarget();
    }
    if (step < 4) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!connected) return;

    // ── Guard: If a previous attempt already created the sovereign on-chain,
    //    auto-resume instead of creating a duplicate. ──
    if (createdSovereignIdRef.current && lastCreationParamsRef.current) {
      console.log('Previous sovereign exists on-chain, auto-resuming:', createdSovereignIdRef.current);
      const sovId = BigInt(createdSovereignIdRef.current);
      const [sovPDA] = getSovereignPDA(sovId, new PublicKey(config.programId));

      setError(null);
      setCreationError(null);
      setCreationProgress(null);

      try {
        const resumeParams: CreateSovereignMutationParams = {
          ...lastCreationParamsRef.current,
          resumeSovereignId: sovId,
          resumeSovereignPDA: sovPDA,
        };
        const result = await createSovereign.mutateAsync(resumeParams);
        createdSovereignIdRef.current = result.sovereignId;
      } catch (err: any) {
        console.error('Failed to auto-resume creation:', err);
        const message = err.message || 'Failed to resume creation. Please try again.';
        setError(message);
        setCreationError(message);
        if (creationProgress) {
          setCreationProgress(prev => {
            if (!prev) return prev;
            const updated = { ...prev, steps: prev.steps.map(s => ({ ...s })) };
            const activeStep = updated.steps.find(s => s.status === 'signing' || s.status === 'confirming');
            if (activeStep) activeStep.status = 'error';
            return updated;
          });
        }
      }
      return;
    }
    
    setError(null);
    setCreationError(null);
    setCreationProgress(null);
    createdSovereignIdRef.current = null;
    lastCreationParamsRef.current = null;
    
    try {
      const bondTargetLamports = BigInt(Math.floor(parseFloat(formData.bondTarget) * LAMPORTS_PER_GOR));

      if (isTokenLaunch) {
        // ── Token Launch flow ──
        if (!formData.tokenImage) {
          throw new Error('Token image is required.');
        }
        if (!isPinataConfigured()) {
          throw new Error('Image upload not configured. Please contact support.');
        }

        setIsUploadingImage(true);
        setError(null);

        if (!publicKey || !signMessage) {
          throw new Error('Wallet must support message signing for image upload.');
        }

        // Sign upload auth once for both image + metadata uploads
        const uploadAuth = await createUploadAuth(publicKey.toBase58(), signMessage);

        let metadataUri: string;
        try {
          metadataUri = await createTokenMetadata(
            formData.tokenName,
            formData.tokenSymbol,
            formData.tokenImage,
            formData.tokenDescription || undefined,
            uploadAuth
          );
          console.log('Metadata URI:', metadataUri);
        } finally {
          setIsUploadingImage(false);
        }

        const params: CreateSovereignMutationParams = {
          sovereignType: 'TokenLaunch' as const,
          bondTarget: bondTargetLamports,
          bondDurationDays: formData.bondDurationDays,
          name: formData.name,
          swapFeeBps: formData.swapFeeBps,
          ...(parseFloat(formData.creatorBuyIn) > 0 && {
            creatorBuyIn: BigInt(Math.floor(parseFloat(formData.creatorBuyIn) * LAMPORTS_PER_GOR)),
          }),
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
          tokenSupply: BigInt(formData.tokenSupply) * BigInt(10 ** 9), // Always 9 decimals
          sellFeeBps: formData.sellFeeBps,
          metadataUri,
        };

        // Save params for potential resume
        lastCreationParamsRef.current = params;

        console.log('Creating TokenLaunch sovereign with params:', params);
        const result = await createSovereign.mutateAsync(params);
        console.log('Sovereign created:', result);
        createdSovereignIdRef.current = result.sovereignId;

      } else {
        // ── BYO Token flow ──
        const existingMint = new PublicKey(formData.existingMint);
        const depositLamports = BigInt(
          Math.floor(parseFloat(formData.depositAmount) * (10 ** formData.byoTokenDecimals))
        );

        const params: CreateSovereignMutationParams = {
          sovereignType: 'BYOToken' as const,
          bondTarget: bondTargetLamports,
          bondDurationDays: formData.bondDurationDays,
          name: formData.name,
          swapFeeBps: formData.swapFeeBps,
          ...(parseFloat(formData.creatorBuyIn) > 0 && {
            creatorBuyIn: BigInt(Math.floor(parseFloat(formData.creatorBuyIn) * LAMPORTS_PER_GOR)),
          }),
          existingMint,
          depositAmount: depositLamports,
          tokenProgramId: formData.byoTokenProgramId
            ? new PublicKey(formData.byoTokenProgramId)
            : undefined,
        };

        // Save params for potential resume
        lastCreationParamsRef.current = params;

        console.log('Creating BYOToken sovereign with params:', params);
        const result = await createSovereign.mutateAsync(params);
        console.log('Sovereign created:', result);
        createdSovereignIdRef.current = result.sovereignId;
      }
    } catch (err: any) {
      console.error('Failed to create sovereign:', err);
      const message = err.message || 'Failed to create sovereign. Please try again.';
      setError(message);
      setCreationError(message);

      // Mark current step as error in the progress
      if (creationProgress) {
        setCreationProgress(prev => {
          if (!prev) return prev;
          const updated = { ...prev, steps: prev.steps.map(s => ({ ...s })) };
          const activeStep = updated.steps.find(s => s.status === 'signing' || s.status === 'confirming');
          if (activeStep) activeStep.status = 'error';
          return updated;
        });
      }
    }
  };

  /**
   * Resume a partially-created sovereign from where it left off.
   * Uses the saved params + the sovereignId captured from the progress callback.
   */
  const handleResume = async () => {
    const savedParams = lastCreationParamsRef.current;
    const savedProgress = creationProgress;
    if (!savedParams || !savedProgress?.sovereignId || !savedProgress?.sovereignPDA) {
      return;
    }

    // Clear error state but keep the progress (stepper will rebuild from resume)
    setError(null);
    setCreationError(null);

    try {
      const resumeParams: CreateSovereignMutationParams = {
        ...savedParams,
        resumeSovereignId: BigInt(savedProgress.sovereignId),
        resumeSovereignPDA: new PublicKey(savedProgress.sovereignPDA),
      };

      console.log('Resuming creation for sovereign:', savedProgress.sovereignId);
      const result = await createSovereign.mutateAsync(resumeParams);
      console.log('Sovereign creation resumed successfully:', result);
      createdSovereignIdRef.current = result.sovereignId;
    } catch (err: any) {
      console.error('Failed to resume creation:', err);
      const message = err.message || 'Failed to resume creation. Please try again.';
      setError(message);
      setCreationError(message);

      // Mark current step as error
      if (creationProgress) {
        setCreationProgress(prev => {
          if (!prev) return prev;
          const updated = { ...prev, steps: prev.steps.map(s => ({ ...s })) };
          const activeStep = updated.steps.find(s => s.status === 'signing' || s.status === 'confirming');
          if (activeStep) activeStep.status = 'error';
          return updated;
        });
      }
    }
  };

  const handleStepperClose = () => {
    if (createdSovereignIdRef.current && creationProgress?.steps.every(s => s.status === 'confirmed')) {
      // All done — navigate to sovereign page
      router.push(`/sovereign/${createdSovereignIdRef.current}`);
    } else if (createdSovereignIdRef.current && creationProgress?.steps.some(s => s.status === 'confirmed')) {
      // Partial creation — navigate to sovereign page (it exists on-chain)
      router.push(`/sovereign/${createdSovereignIdRef.current}`);
    } else {
      // Error case — dismiss overlay, keep form state
      setCreationProgress(null);
      setCreationError(null);
    }
  };

  // Calculate creation fee from live protocol state
  const bondTargetSol = parseFloat(formData.bondTarget) || 0;
  const creationFeeSol = (bondTargetSol * creationFeeBps) / 10000;
  const creationFeePercent = (creationFeeBps / 100).toFixed(2);
  const maxCreatorBuyIn = bondTargetSol / 100; // 1% of bond target

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8" />
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`step ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
                <div className="step-number">
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-sm ml-2 hidden md:inline`} style={{ color: s === step ? 'var(--text-light)' : 'var(--muted)' }}>
                  {s === 1 && 'Type'}
                  {s === 2 && 'Token'}
                  {s === 3 && '$overeign'}
                  {s === 4 && 'Review'}
                </span>
              </div>
              {s < 4 && (
                <div className={`w-12 md:w-20 h-0.5 mx-2 ${s < step ? 'bg-[var(--profit)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <div className="card card-highlight">
          {/* Step 1: Type Selection */}
          {step === 1 && (
            <div className="py-10">
              <div className="flex items-center justify-center gap-12">
                <button
                  type="button"
                  onClick={() => updateForm({ sovereignType: 'TokenLaunch' })}
                  className="text-2xl font-black tracking-wide transition-all"
                  style={{
                    color: isTokenLaunch ? '#d4ffe6' : 'var(--muted)',
                    textShadow: isTokenLaunch
                      ? '0 0 20px rgba(46,235,127,0.9), 0 0 40px rgba(46,235,127,0.6), 0 0 60px rgba(46,235,127,0.3)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTokenLaunch) {
                      e.currentTarget.style.color = '#d4ffe6';
                      e.currentTarget.style.textShadow = '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTokenLaunch) {
                      e.currentTarget.style.color = 'var(--muted)';
                      e.currentTarget.style.textShadow = 'none';
                    }
                  }}
                >
                  Token Launch
                </button>
                <button
                  type="button"
                  onClick={() => updateForm({ sovereignType: 'BYOToken' })}
                  className="text-2xl font-black tracking-wide transition-all"
                  style={{
                    color: isBYO ? '#d4ffe6' : 'var(--muted)',
                    textShadow: isBYO
                      ? '0 0 20px rgba(46,235,127,0.9), 0 0 40px rgba(46,235,127,0.6), 0 0 60px rgba(46,235,127,0.3)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isBYO) {
                      e.currentTarget.style.color = '#d4ffe6';
                      e.currentTarget.style.textShadow = '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isBYO) {
                      e.currentTarget.style.color = 'var(--muted)';
                      e.currentTarget.style.textShadow = 'none';
                    }
                  }}
                >
                  BYO Token
                </button>
              </div>

              {/* Explainer */}
              {(isTokenLaunch || isBYO) && (
                <p className="text-sm text-center mt-6 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
                  {isTokenLaunch
                    ? 'Create a token.'
                    : 'Bring a token.'}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Token Configuration (Token Launch) */}
          {step === 2 && isTokenLaunch && (
            <div className="space-y-6">
              <div>
                <label className="input-label">Sovereign Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Moon Protocol"
                  value={formData.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  maxLength={32}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  3-32 characters
                </div>
              </div>

              <h2 className="h3 text-white mb-4">Token Configuration</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Token Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Moon Token"
                    value={formData.tokenName}
                    onChange={(e) => updateForm({ tokenName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Token Symbol</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., MOON"
                    value={formData.tokenSymbol}
                    onChange={(e) => updateForm({ tokenSymbol: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Token Image Upload */}
              <div>
                <label className="input-label">Token Image</label>
                <div className="mt-2">
                  {formData.tokenImagePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img 
                          src={formData.tokenImagePreview} 
                          alt="Token preview" 
                          className="w-24 h-24 rounded-lg object-cover border border-[var(--border)]"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--faint)]">{formData.tokenImage?.name}</p>
                        <p className="text-xs text-[var(--faint)] mt-1">
                          {formData.tokenImage && (formData.tokenImage.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--money-green)]/30 hover:shadow-[0_0_8px_rgba(46,235,127,0.1)] transition-colors"
                    >
                      <div className="text-3xl mb-2">🖼️</div>
                      <p className="text-sm text-[var(--faint)]">Click to upload token image</p>
                      <p className="text-xs text-[var(--faint)] mt-1">PNG, JPG, GIF, or WebP (max 5MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Token Description (Optional) */}
              <div>
                <label className="input-label">Description (Optional)</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="A brief description of your token..."
                  value={formData.tokenDescription}
                  onChange={(e) => updateForm({ tokenDescription: e.target.value })}
                  maxLength={500}
                />
                <p className="text-xs text-[var(--faint)] mt-1">{formData.tokenDescription.length}/500</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Total Supply</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="1000000000"
                    value={formData.tokenSupply}
                    onChange={(e) => updateForm({ tokenSupply: e.target.value })}
                  />
                  <p className="text-xs text-[var(--faint)] mt-1">Token will use 9 decimals (standard)</p>
                </div>
              </div>

              <div>
                <label className="input-label">Transfer Fee ({(formData.sellFeeBps / 100).toFixed(1)}%)</label>
                <input
                  type="range"
                  className="w-full accent-[var(--money-green)]"
                  min={0}
                  max={300}
                  step={10}
                  value={formData.sellFeeBps}
                  onChange={(e) => updateForm({ sellFeeBps: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-[var(--faint)] mt-1">
                  <span>0%</span>
                  <span>3%</span>
                </div>
              </div>

              <div className="alert info">
                <p className="text-sm">
                  💡 100% of the token supply will be deposited into the liquidity pool.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: BYO Token Configuration */}
          {step === 2 && isBYO && (
            <div className="space-y-6">
              <div>
                <label className="input-label">Sovereign Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Moon Protocol"
                  value={formData.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  maxLength={32}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  3-32 characters
                </div>
              </div>

              <h2 className="h3 text-white mb-4">BYO Token Configuration</h2>

              <div>
                <label className="input-label">Token Mint Address</label>
                {/* Token selector button + manual input */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setByoPickerOpen(true)}
                    className="flex items-center gap-2 bg-[var(--card-bg)] hover:border-[var(--money-green)] border border-[var(--border)] px-3 py-2 rounded-xl shrink-0 transition-all cursor-pointer group"
                  >
                    {selectedTrackedToken ? (
                      <>
                        {selectedTrackedToken.tokenImage ? (
                          <img src={selectedTrackedToken.tokenImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--border)] flex items-center justify-center text-[9px] font-bold text-[var(--muted)]">
                            {(selectedTrackedToken.tokenSymbol || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-white text-sm font-bold">{selectedTrackedToken.tokenName || selectedTrackedToken.tokenSymbol}</span>
                      </>
                    ) : (
                      <span className="text-[var(--money-green)] text-sm font-bold">Select token</span>
                    )}
                    <span className="text-[var(--muted)] group-hover:text-white text-[10px] transition-colors">▼</span>
                  </button>
                  <input
                    type="text"
                    className="input font-mono text-sm flex-1"
                    placeholder="Or paste mint address..."
                    value={formData.existingMint}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      updateForm({ existingMint: val, byoMintValid: false });
                      setSelectedTrackedToken(null); // clear picker selection on manual input
                      if (val.length >= 32 && val.length <= 44) {
                        validateMint(val);
                      }
                    }}
                  />
                </div>

                {/* Loading state */}
                {formData.byoMintLoading && (
                  <p className="text-xs text-[var(--money-green)] mt-2 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Validating mint...
                  </p>
                )}

                {/* Wallet balance (from manual input or tracked token) */}
                {formData.existingMint && !formData.byoMintLoading && (() => {
                  // Check wallet balance for this specific mint
                  const bal = walletBalances[formData.existingMint];
                  const tracked = selectedTrackedToken;
                  const decimals = formData.byoMintValid ? formData.byoTokenDecimals : (tracked?.tokenDecimals ?? 9);
                  const humanBal = bal ? Number(bal.raw) / 10 ** decimals : (tracked?.walletBalance ?? 0);
                  if (humanBal <= 0) return null;
                  return (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-[var(--muted)]">Wallet balance:</span>
                      <span className="text-white font-bold">
                        {humanBal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        {tracked ? ` ${tracked.tokenSymbol}` : ''}
                      </span>
                    </div>
                  );
                })()}

                {/* Market price from existing pool */}
                {formData.existingMint && !formData.byoMintLoading && (() => {
                  const mp = getByoMarketPrice();
                  if (mp <= 0) return null;
                  return (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-[var(--muted)]">Market price:</span>
                      <span className="text-[var(--money-green)] font-bold">{formatGorPrice(mp)} GOR/token</span>
                      <span className="text-[var(--faint)]">(pool defaults to 10% below)</span>
                    </div>
                  );
                })()}

                {/* Validated mint info */}
                {!formData.byoMintLoading && formData.byoMintValid && (
                  <div className="mt-3 p-3 rounded-lg bg-[var(--money-green)]/10 border border-[var(--money-green)]/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Total Supply</span>
                      <span className="text-white font-bold">
                        {(Number(formData.byoTokenSupply) / 10 ** formData.byoTokenDecimals).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[var(--muted)]">Decimals</span>
                      <span className="text-white font-bold">{formData.byoTokenDecimals}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[var(--muted)]">Program</span>
                      <span className="text-white font-bold text-xs">
                        {formData.byoTokenProgramId === TOKEN_2022_PROGRAM_ID.toBase58() ? 'Token-2022' : 'SPL Token'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">Deposit Amount (tokens)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Amount of tokens to deposit"
                  value={formData.depositAmount}
                  onChange={(e) => {
                    updateForm({ depositAmount: e.target.value });
                    const deposit = parseFloat(e.target.value) || 0;
                    if (deposit > 0) autoCalcByoBondTarget(deposit);
                  }}
                  min={0}
                />
                {formData.byoMintValid && formData.byoTokenSupply !== '0' && (
                  (() => {
                    const deposit = parseFloat(formData.depositAmount) || 0;
                    const totalHuman = Number(formData.byoTokenSupply) / 10 ** formData.byoTokenDecimals;
                    const pct = totalHuman > 0 ? (deposit / totalHuman) * 100 : 0;
                    const meetsMin = pct >= byoMinSupplyPct;
                    const mintSafe = formData.byoMintAuthorityRenounced;
                    const freezeSafe = formData.byoFreezeAuthorityRenounced;
                    const warnings: string[] = [];
                    if (!mintSafe) warnings.push('Mint authority is active — supply can be inflated');
                    if (!freezeSafe) warnings.push('Freeze authority is active — accounts can be frozen');
                    return (
                      <div className="mt-2">
                        {warnings.length > 0 ? (
                          <div className="text-xs text-yellow-400 space-y-0.5">
                            {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--money-green)]">Token Safety: ✓ Authorities renounced</div>
                        )}
                        <div className={`text-xs ${meetsMin ? 'text-[var(--money-green)]' : 'text-[var(--money-green)]'}`}>
                          {pct.toFixed(2)}% of total supply {meetsMin ? '✓' : `(minimum ${byoMinSupplyPct}% required)`}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateForm({ depositAmount: totalHuman.toString() });
                            autoCalcByoBondTarget(totalHuman);
                          }}
                          className="text-xs text-[var(--money-green)] hover:underline mt-1"
                        >
                          Max ({totalHuman.toLocaleString()})
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="alert info">
                <p className="text-sm">
                  🔗 Your existing token will be deposited into the liquidity pool. You must hold at least {byoMinSupplyPct}% of the total supply.
                </p>
              </div>
            </div>
          )}

          {/* BYO token picker modal */}
          <BYOTokenPicker
            open={byoPickerOpen}
            onClose={() => setByoPickerOpen(false)}
            tokens={trackedTokens}
            selectedMint={formData.existingMint || null}
            onSelect={(token) => {
              setSelectedTrackedToken(token);
              updateForm({ existingMint: token.tokenMint, byoMintValid: false });
              validateMint(token.tokenMint);
              // Auto-calc bond target with this token's price
              const deposit = parseFloat(formData.depositAmount) || 0;
              if (deposit > 0 && token.currentPrice > 0) {
                autoCalcByoBondTarget(deposit, token.currentPrice);
              }
            }}
          />

          {/* Step 3: $overeign Configuration */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="h3 text-white mb-4">$overeign Configuration</h2>
              
              <div>
                <label className="input-label">Bond Target (GOR)</label>
                <input
                  type="number"
                  className="input"
                  placeholder={minBondTargetGor.toString()}
                  value={formData.bondTarget}
                  onChange={(e) => updateForm({ bondTarget: e.target.value })}
                  min={minBondTargetGor}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  Minimum {minBondTargetGor} GOR required
                </div>
              </div>

              {/* BYO: Implied pool price vs market */}
              {isBYO && (() => {
                const depositHuman = parseFloat(formData.depositAmount) || 0;
                const bondGor = parseFloat(formData.bondTarget) || 0;
                if (depositHuman <= 0 || bondGor <= 0) return null;
                const impliedPrice = bondGor / depositHuman;
                const marketPrice = getByoMarketPrice();
                const discount = marketPrice > 0 ? ((1 - impliedPrice / marketPrice) * 100) : 0;
                return (
                  <div className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Implied Pool Price</span>
                      <span className="text-white font-bold">{formatGorPrice(impliedPrice)} GOR/token</span>
                    </div>
                    {marketPrice > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Current Market</span>
                          <span className="text-[var(--faint)]">{formatGorPrice(marketPrice)} GOR/token</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">vs Market</span>
                          <span className={`font-bold ${discount > 0 ? 'text-[var(--money-green)]' : discount < 0 ? 'text-[var(--hazard-red)]' : 'text-white'}`}>
                            {discount > 0 ? `${discount.toFixed(1)}% below` : discount < 0 ? `${Math.abs(discount).toFixed(1)}% above` : 'At market'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="input-label">Bond Duration</label>
                <select
                  className="select"
                  value={formData.bondDurationDays}
                  onChange={(e) => updateForm({ bondDurationDays: parseInt(e.target.value) })}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days (Recommended)</option>
                  <option value={21}>21 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div>
                <label className="input-label">Recovery Swap Fee ({(formData.swapFeeBps / 100).toFixed(1)}%)</label>
                <input
                  type="range"
                  className="w-full accent-[var(--money-green)]"
                  min={100}
                  max={300}
                  step={10}
                  value={formData.swapFeeBps}
                  onChange={(e) => updateForm({ swapFeeBps: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-[var(--faint)] mt-1">
                  <span>1%</span>
                  <span>2%</span>
                  <span>3%</span>
                </div>
                <div className="text-xs text-[var(--faint)] mt-2">
                  LP trading fee during recovery phase. Snaps to the protocol default rate (0.30%) once recovery completes.
                </div>
              </div>

              <div>
                  <label className="input-label">Creator Buy-in (GOR)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input flex-1"
                      placeholder="0"
                      value={formData.creatorBuyIn}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (val <= maxCreatorBuyIn) {
                          updateForm({ creatorBuyIn: e.target.value });
                        } else {
                          updateForm({ creatorBuyIn: maxCreatorBuyIn.toString() });
                        }
                      }}
                      min={0}
                      max={maxCreatorBuyIn}
                      step="0.1"
                    />
                    <button
                      type="button"
                      onClick={() => updateForm({ creatorBuyIn: maxCreatorBuyIn.toFixed(2) })}
                      className="px-3 py-2 text-xs font-bold text-[var(--money-green)] border border-[var(--border)] rounded-xl hover:border-[var(--money-green)]/40 hover:shadow-[0_0_6px_rgba(46,235,127,0.12)] transition-colors shrink-0"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="text-xs text-[var(--faint)] mt-2">
                    Optional: GOR to market buy tokens at theoretical price upon successful bonding. Max {maxCreatorBuyIn.toFixed(2)} GOR (1% of bond target).
                  </div>
                </div>

              <div className="stat money">
                <div className="k">Creation Fee ({creationFeePercent}% of bond target)</div>
                <div className="v">{creationFeeSol.toFixed(4)} GOR</div>
                <div className="sub">Escrowed during bonding, released on success</div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="h3 text-white mb-4">Review & Launch</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Type</span>
                  <span className="text-white font-bold">{isTokenLaunch ? 'Token Launch' : 'BYO Token'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Name</span>
                  <span className="text-white font-bold">{formData.name}</span>
                </div>

                {/* Token Launch fields */}
                {isTokenLaunch && (
                  <>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Token</span>
                      <span className="text-white font-bold">
                        {formData.tokenName} ({formData.tokenSymbol})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Supply</span>
                      <span className="text-white font-bold">
                        {parseInt(formData.tokenSupply).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Transfer Fee</span>
                      <span className="text-white font-bold">{(formData.sellFeeBps / 100).toFixed(1)}%</span>
                    </div>
                  </>
                )}

                {/* BYO Token fields */}
                {isBYO && (
                  <>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Token Mint</span>
                      <span className="text-white font-bold text-xs font-mono">
                        {formData.existingMint.slice(0, 8)}...{formData.existingMint.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Deposit Amount</span>
                      <span className="text-white font-bold">
                        {parseFloat(formData.depositAmount).toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">% of Supply</span>
                      <span className="text-white font-bold">
                        {((parseFloat(formData.depositAmount) / (Number(formData.byoTokenSupply) / 10 ** formData.byoTokenDecimals)) * 100).toFixed(2)}%
                      </span>
                    </div>
                    {(() => {
                      const depositHuman = parseFloat(formData.depositAmount) || 0;
                      const bondGor = parseFloat(formData.bondTarget) || 0;
                      const impliedPrice = depositHuman > 0 && bondGor > 0 ? bondGor / depositHuman : 0;
                      if (impliedPrice <= 0) return null;
                      const marketPrice = getByoMarketPrice();
                      return (
                        <>
                          <div className="flex justify-between py-2 border-b border-[var(--border)]">
                            <span className="text-[var(--muted)]">Implied Pool Price</span>
                            <span className="text-white font-bold">{formatGorPrice(impliedPrice)} GOR/token</span>
                          </div>
                          {marketPrice > 0 && (
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                              <span className="text-[var(--muted)]">vs Market</span>
                              <span className={`font-bold ${
                                impliedPrice < marketPrice ? 'text-[var(--money-green)]' : 'text-[var(--hazard-red)]'
                              }`}>
                                {((1 - impliedPrice / marketPrice) * 100).toFixed(1)}% {impliedPrice < marketPrice ? 'below' : 'above'}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Common fields */}
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Bond Target</span>
                  <span className="text-white font-bold">{formData.bondTarget} GOR</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Bond Duration</span>
                  <span className="text-white font-bold">{formData.bondDurationDays} days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Recovery Swap Fee</span>
                  <span className="text-white font-bold">{(formData.swapFeeBps / 100).toFixed(1)}%</span>
                </div>
                <div className="text-xs text-[var(--faint)] -mt-2 mb-2 text-right">
                  Snaps to protocol default (0.30%) after recovery
                </div>
                {parseFloat(formData.creatorBuyIn) > 0 && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Creator Buy-in</span>
                    <span className="text-white font-bold">{formData.creatorBuyIn} GOR</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-[var(--muted)]">Creation Fee</span>
                  <span className="text-[var(--money-green)] font-bold">{creationFeeSol.toFixed(4)} GOR</span>
                </div>
              </div>

              <div className="alert money">
                <div className="alert-title">Recovery-First Mechanics</div>
                <p className="text-sm">
                  100% of LP fees go to Liquidity Providers until they recover their principal. 
                  LP is locked after recovery completes and stays locked unless volume fails to meet the minimum threshold.
                </p>
              </div>

              {!connected && (
                <div className="alert warning">
                  <p className="text-sm">
                    ⚠️ Please connect your wallet to launch a sovereign.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[var(--border)]">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="btn btn-outline"
            >
              ← Back
            </button>
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="btn btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!connected || createSovereign.isPending || isUploadingImage}
                className="btn btn-primary btn-lg"
              >
                {isUploadingImage ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Uploading Image...
                  </>
                ) : createSovereign.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating $overeign...
                  </>
                ) : (
                  'Go $overeign'
                )}
              </button>
            )}
          </div>
          
          {/* Error display (only when stepper is not showing) */}
          {error && !creationProgress && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Creation progress overlay */}
      <CreationStepper
        progress={creationProgress}
        error={creationError}
        onClose={handleStepperClose}
        onResume={handleResume}
      />
    </div>
  );
}
