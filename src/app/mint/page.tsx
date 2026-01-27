'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SovereignType, CreateSovereignParams } from '@/types/sovereign';
import { PROTOCOL_CONSTANTS, LAMPORTS_PER_GOR } from '@/lib/config';
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
  tokenDecimals: number;
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
  tokenDecimals: 9,
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
  const { connected } = useWallet();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
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
        const bondTargetLamports = parseFloat(formData.bondTarget) * LAMPORTS_PER_GOR;
        return bondTargetLamports >= PROTOCOL_CONSTANTS.MIN_BOND_TARGET_LAMPORTS;
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
    
    setIsSubmitting(true);
    try {
      // TODO: Implement actual sovereign creation via Anchor program
      console.log('Creating sovereign with params:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to sovereigns page on success
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to create sovereign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate creation fee
  const bondTargetSol = parseFloat(formData.bondTarget) || 0;
  const creationFeeSol = (bondTargetSol * PROTOCOL_CONSTANTS.DEFAULT_CREATION_FEE_BPS) / 10000;

  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="h1 mb-2" style={{ color: 'var(--text-light)' }}>Launch Your $overeign</h1>
          <p className="text-[var(--muted)]">
            Launch your projects token and crowd fundraise its liquidity.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
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
                </div>
                <div>
                  <label className="input-label">Decimals</label>
                  <select
                    className="select"
                    value={formData.tokenDecimals}
                    onChange={(e) => updateForm({ tokenDecimals: parseInt(e.target.value) })}
                  >
                    <option value={6}>6</option>
                    <option value={9}>9 (Recommended)</option>
                  </select>
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
                  placeholder="Amount to deposit (min 30% of supply)"
                  value={formData.depositAmount}
                  onChange={(e) => updateForm({ depositAmount: e.target.value })}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  Minimum 30% of total token supply required
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
                  placeholder="50"
                  value={formData.bondTarget}
                  onChange={(e) => updateForm({ bondTarget: e.target.value })}
                  min={50}
                />
                <div className="text-xs text-[var(--faint)] mt-2">
                  Minimum 50 GOR required
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
                <div className="k">Creation Fee (0.5% of bond target)</div>
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
                disabled={!connected || isSubmitting}
                className="btn btn-primary btn-lg"
              >
                {isSubmitting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  'Go $overeign'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
