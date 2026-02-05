'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SovereignType, CreateSovereignParams } from '@/types/sovereign';
import { PROTOCOL_CONSTANTS, LAMPORTS_PER_GOR } from '@/lib/config';
import { useProtocolState } from '@/hooks/useSovereign';
import { useCreateSovereign } from '@/hooks/useTransactions';
import { useRouter } from 'next/navigation';
import { createTokenMetadata, isPinataConfigured } from '@/lib/upload';
import Link from 'next/link';

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
  treasuryAddress: string;
  
  // Step 2: Token Config (BYO)
  existingMint: string;
  depositAmount: string;
  
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
  treasuryAddress: '',
  existingMint: '',
  depositAmount: '',
  bondTarget: '50',
  bondDurationDays: 14,
  swapFeeBps: 30,
  creatorBuyIn: '0',
};

export default function MintPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const createSovereign = useCreateSovereign();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use live protocol state values with fallbacks to defaults
  const creationFeeBps = protocolState?.creationFeeBps ?? PROTOCOL_CONSTANTS.DEFAULT_CREATION_FEE_BPS;
  const minBondTargetGor = protocolState?.minBondTargetGor ?? (PROTOCOL_CONSTANTS.MIN_BOND_TARGET_LAMPORTS / LAMPORTS_PER_GOR);
  const minDepositGor = protocolState?.minDepositGor ?? (PROTOCOL_CONSTANTS.MIN_DEPOSIT_LAMPORTS / LAMPORTS_PER_GOR);
  const byoMinSupplyBps = 3000; // TODO: Add to protocolState when available on-chain

  const updateForm = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

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
        if (formData.sovereignType === 'TokenLaunch') {
          return formData.name.length >= 3 && formData.name.length <= 32;
        } else {
          // BYO Token doesn't need name in step 1
          return true;
        }
      case 2:
        if (formData.sovereignType === 'TokenLaunch') {
          return (
            formData.tokenName.length >= 1 &&
            formData.tokenSymbol.length >= 1 &&
            formData.tokenSymbol.length <= 10 &&
            parseFloat(formData.tokenSupply) > 0
          );
        } else {
          return (
            formData.name.length >= 3 &&
            formData.name.length <= 32 &&
            formData.existingMint.length === 44 &&
            parseFloat(formData.depositAmount) > 0
          );
        }
      case 3:
        const bondTargetGor = parseFloat(formData.bondTarget) || 0;
        return bondTargetGor >= minBondTargetGor;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
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
    
    setError(null);
    
    try {
      // Convert form data to transaction params
      const bondTargetLamports = BigInt(Math.floor(parseFloat(formData.bondTarget) * LAMPORTS_PER_GOR));
      
      // Upload token metadata if image is provided (Token Launch only)
      let metadataUri: string | undefined;
      if (formData.sovereignType === 'TokenLaunch' && formData.tokenImage) {
        if (!isPinataConfigured()) {
          throw new Error('Image upload not configured. Please contact support or launch without an image.');
        }
        
        setIsUploadingImage(true);
        setError(null);
        
        try {
          metadataUri = await createTokenMetadata(
            formData.tokenName,
            formData.tokenSymbol,
            formData.tokenImage,
            formData.tokenDescription || undefined
          );
          console.log('Metadata URI:', metadataUri);
        } finally {
          setIsUploadingImage(false);
        }
      }
      
      const params = {
        sovereignType: formData.sovereignType as 'TokenLaunch' | 'BYOToken',
        bondTarget: bondTargetLamports,
        bondDurationDays: formData.bondDurationDays,
        name: formData.name,
        // Token Launch fields
        ...(formData.sovereignType === 'TokenLaunch' && {
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
          tokenSupply: BigInt(formData.tokenSupply) * BigInt(10 ** 9), // Always 9 decimals
          sellFeeBps: formData.sellFeeBps,
          feeMode: 'FairLaunch' as const, // Default fee mode
          metadataUri,
        }),
        // BYO Token fields
        ...(formData.sovereignType === 'BYOToken' && {
          existingMint: new PublicKey(formData.existingMint),
          depositAmount: BigInt(formData.depositAmount),
        }),
      };
      
      console.log('Creating sovereign with params:', params);
      
      const result = await createSovereign.mutateAsync(params);
      
      console.log('Sovereign created:', result);
      
      // Redirect to the new sovereign page on success
      router.push(`/sovereign/${result.sovereignId}`);
    } catch (err: any) {
      console.error('Failed to create sovereign:', err);
      setError(err.message || 'Failed to create sovereign. Please try again.');
    }
  };

  // Calculate creation fee from live protocol state
  const bondTargetSol = parseFloat(formData.bondTarget) || 0;
  const creationFeeSol = (bondTargetSol * creationFeeBps) / 10000;
  const creationFeePercent = (creationFeeBps / 100).toFixed(2);

  return (
    <div className="h-full">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="h1 mb-1" style={{ color: 'var(--text-light)' }}>Launch Your $overeign</h1>
          <p className="text-[var(--muted)] text-sm">
            Launch your projects token and crowd fundraise its liquidity.
          </p>
        </div>

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
          {/* Step 1: Type & Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="h3 text-white mb-4">Choose Launch Type</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => updateForm({ sovereignType: 'TokenLaunch' })}
                    className={`card text-left transition-all ${
                      formData.sovereignType === 'TokenLaunch' 
                        ? 'border-[var(--hazard-yellow)] glow-yellow' 
                        : 'hover:border-[rgba(242,183,5,0.25)]'
                    }`}
                  >
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="font-bold text-white mb-1">Token Launch</div>
                    <div className="text-sm text-[var(--muted)]">
                      Create a new token with built-in sell fees (0-3%)
                    </div>
                  </button>
                  <button
                    onClick={() => updateForm({ sovereignType: 'BYOToken' })}
                    className={`card text-left transition-all ${
                      formData.sovereignType === 'BYOToken' 
                        ? 'border-[var(--hazard-yellow)] glow-yellow' 
                        : 'hover:border-[rgba(242,183,5,0.25)]'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔗</div>
                    <div className="font-bold text-white mb-1">BYO Token</div>
                    <div className="text-sm text-[var(--muted)]">
                      Bring an existing token (min 30% supply required)
                    </div>
                  </button>
                </div>
              </div>

              {formData.sovereignType === 'TokenLaunch' && (
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
              )}
            </div>
          )}

          {/* Step 2: Token Configuration */}
          {step === 2 && formData.sovereignType === 'TokenLaunch' && (
            <div className="space-y-6">
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
                      className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--hazard-yellow)] transition-colors"
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
                <label className="input-label">Sell Fee ({formData.sellFeeBps / 100}%)</label>
                <input
                  type="range"
                  className="w-full accent-[var(--hazard-yellow)]"
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

              {formData.sellFeeBps > 0 && (
                <div>
                  <label className="input-label">Treasury Address (Optional)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    placeholder="Wallet address to receive sell fees"
                    value={formData.treasuryAddress}
                    onChange={(e) => updateForm({ treasuryAddress: e.target.value })}
                  />
                  <div className="text-xs text-[var(--faint)] mt-2">
                    Leave empty to use creator wallet
                  </div>
                </div>
              )}

              <div className="alert info">
                <p className="text-sm">
                  💡 100% of the token supply will be deposited into the liquidity pool.
                </p>
              </div>
            </div>
          )}

          {step === 2 && formData.sovereignType === 'BYOToken' && (
            <div className="space-y-6">
              <h2 className="h3 text-white mb-4">Existing Token</h2>
              
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

              <div>
                <label className="input-label">Token Mint Address</label>
                <input
                  type="text"
                  className="input font-mono text-sm"
                  placeholder="Enter SPL token mint address"
                  value={formData.existingMint}
                  onChange={(e) => updateForm({ existingMint: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Deposit Amount (Tokens)</label>
                <input
                  type="number"
                  className="input"
                  placeholder={`Amount to deposit (min ${byoMinSupplyBps / 100}% of supply)`}
                  value={formData.depositAmount}
                  onChange={(e) => updateForm({ depositAmount: e.target.value })}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  Minimum {byoMinSupplyBps / 100}% of total token supply required
                </div>
              </div>

              <div className="alert warning">
                <p className="text-sm">
                  ⚠️ BYO tokens don't have sell fees unless the token has transfer hooks.
                </p>
              </div>
            </div>
          )}

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
                <label className="input-label">Swap Fee ({(formData.swapFeeBps / 100).toFixed(1)}%)</label>
                <input
                  type="range"
                  className="w-full accent-[var(--hazard-yellow)]"
                  min={30}
                  max={200}
                  step={10}
                  value={formData.swapFeeBps}
                  onChange={(e) => updateForm({ swapFeeBps: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-[var(--faint)] mt-1">
                  <span>0.3%</span>
                  <span>2%</span>
                </div>
                <div className="text-xs text-[var(--faint)] mt-2">
                  LP trading fee on each swap - 100% goes to investors during recovery
                </div>
              </div>

              {formData.sovereignType === 'TokenLaunch' && (
                <div>
                  <label className="input-label">Creator Buy-in (GOR)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={formData.creatorBuyIn}
                    onChange={(e) => updateForm({ creatorBuyIn: e.target.value })}
                    min={0}
                    step="0.1"
                  />
                  <div className="text-xs text-[var(--faint)] mt-2">
                    Optional: GOR to market buy tokens at theoretical price upon successful bonding. Tokens locked until active phase.
                  </div>
                </div>
              )}

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
                  <span className="text-white font-bold">
                    {formData.sovereignType === 'TokenLaunch' ? 'Token Launch' : 'BYO Token'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Name</span>
                  <span className="text-white font-bold">{formData.name}</span>
                </div>
                {formData.sovereignType === 'TokenLaunch' && (
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
                      <span className="text-[var(--muted)]">Sell Fee</span>
                      <span className="text-white font-bold">{(formData.sellFeeBps / 100).toFixed(1)}%</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Bond Target</span>
                  <span className="text-white font-bold">{formData.bondTarget} GOR</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Bond Duration</span>
                  <span className="text-white font-bold">{formData.bondDurationDays} days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Swap Fee</span>
                  <span className="text-white font-bold">{(formData.swapFeeBps / 100).toFixed(1)}%</span>
                </div>
                {parseFloat(formData.creatorBuyIn) > 0 && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Creator Buy-in</span>
                    <span className="text-white font-bold">{formData.creatorBuyIn} GOR</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-[var(--muted)]">Creation Fee</span>
                  <span className="text-[var(--hazard-yellow)] font-bold">{creationFeeSol.toFixed(4)} GOR</span>
                </div>
              </div>

              <div className="alert money">
                <div className="alert-title">Recovery-First Mechanics</div>
                <p className="text-sm">
                  100% of LP fees go to investors until they recover their principal. 
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
          
          {/* Error display */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
