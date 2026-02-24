'use client';

import { useState, useRef, useMemo } from 'react';
import { LAMPORTS_PER_GOR, config } from '@/lib/config';
import { getProtocolStatePDA } from '@/lib/program/pdas';

// ============================================================
// Types
// ============================================================

export interface MintNftModalProps {
  open: boolean;
  onClose: () => void;
  onMint: (amountLamports: bigint) => void;
  isMinting?: boolean;
  error?: string | null;
  /** Current deposit record amount in GOR (display) */
  depositAmountGor: number;
  /** Current deposit record amount in lamports (for calculations) */
  depositAmountLamports: bigint;
  /** Shares percent */
  sharesPercent: number;
  /** NFT mint fee in bps (e.g. 500 = 5%) */
  mintFeeBps: number;
  /** Minimum NFT backing in lamports */
  minNftBacking: bigint;
  /** Token symbol for display */
  tokenSymbol: string;
}

// ============================================================
// Component
// ============================================================

export function MintNftModal({
  open,
  onClose,
  onMint,
  isMinting = false,
  error,
  depositAmountGor,
  depositAmountLamports,
  sharesPercent,
  mintFeeBps,
  minNftBacking,
  tokenSymbol,
}: MintNftModalProps) {
  const [inputMode, setInputMode] = useState<'gor' | 'percent'>('gor');
  const [gorValue, setGorValue] = useState('');
  const [pctValue, setPctValue] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  // ── Derived values ──

  const mintFeePct = mintFeeBps / 100;
  const minBackingGor = Number(minNftBacking) / LAMPORTS_PER_GOR;

  // The amount the user wants to carve out (before fee)
  const rawAmountGor = inputMode === 'gor'
    ? parseFloat(gorValue) || 0
    : (parseFloat(pctValue) || 0) / 100 * depositAmountGor;

  const rawAmountLamports = BigInt(Math.floor(rawAmountGor * LAMPORTS_PER_GOR));

  // Fee is charged ON TOP (paid as SOL to treasury), NOT deducted from backing
  const feeGor = rawAmountGor * (mintFeeBps / 10000);
  const nftBackingGor = rawAmountGor; // full amount becomes NFT backing

  // Share of the sovereign this NFT represents
  const nftSharePct = depositAmountGor > 0
    ? (rawAmountGor / depositAmountGor) * sharesPercent
    : 0;

  // Remaining DR after carve
  const remainingGor = depositAmountGor - rawAmountGor;

  // Validation
  const isAmountTooSmall = rawAmountLamports < minNftBacking && rawAmountGor > 0;
  const isAmountTooLarge = rawAmountLamports > depositAmountLamports;
  const isValid = rawAmountGor > 0 && !isAmountTooSmall && !isAmountTooLarge;

  const handleMint = () => {
    if (!isValid) return;
    onMint(rawAmountLamports);
  };

  // Quick-fill buttons
  const handleQuickFill = (pct: number) => {
    const amount = depositAmountGor * (pct / 100);
    setInputMode('gor');
    setGorValue(amount.toFixed(4));
    setPctValue(pct.toString());
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[var(--dark-green-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Mint $overeign NFT</h2>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              Carve a portion of your deposit into a tradeable NFT
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-4 space-y-3">
          {/* Current DR info */}
          <div className="bg-[var(--landfill-black)] rounded-xl p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">Your Deposit Record</div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Balance</span>
              <span className="text-sm font-bold text-[var(--money-green)]">
                {depositAmountGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Share</span>
              <span className="text-sm font-bold text-white">{sharesPercent.toFixed(2)}%</span>
            </div>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setInputMode('gor')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
                inputMode === 'gor'
                  ? 'bg-[var(--money-green)] text-black'
                  : 'bg-[var(--landfill-black)] text-[var(--muted)] hover:text-white'
              }`}
            >
              Amount (GOR)
            </button>
            <button
              onClick={() => setInputMode('percent')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
                inputMode === 'percent'
                  ? 'bg-[var(--money-green)] text-black'
                  : 'bg-[var(--landfill-black)] text-[var(--muted)] hover:text-white'
              }`}
            >
              Percentage (%)
            </button>
          </div>

          {/* Amount input */}
          <div>
            {inputMode === 'gor' ? (
              <div className="relative">
                <input
                  type="number"
                  value={gorValue}
                  onChange={(e) => {
                    setGorValue(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setPctValue(depositAmountGor > 0 ? ((val / depositAmountGor) * 100).toFixed(2) : '0');
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-[var(--landfill-black)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--money-green)] transition-colors pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">GOR</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={pctValue}
                  onChange={(e) => {
                    setPctValue(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setGorValue((depositAmountGor * val / 100).toFixed(4));
                  }}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full bg-[var(--landfill-black)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--money-green)] transition-colors pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">%</span>
              </div>
            )}
          </div>

          {/* Quick fill buttons — only shown in GOR mode */}
          {inputMode === 'gor' && (
            <div className="flex gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleQuickFill(pct)}
                  className="flex-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--landfill-black)] text-[var(--muted)] hover:text-white hover:border-[var(--money-green)] border border-[var(--border)] transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {/* Breakdown */}
          {rawAmountGor > 0 && (
            <div className="bg-[var(--landfill-black)] rounded-xl p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">Mint Breakdown</div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[var(--muted)]">Carve Amount</span>
                <span className="text-sm text-white">
                  {rawAmountGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                </span>
              </div>

              <div className="border-t border-[var(--border)] pt-2 flex justify-between items-baseline">
                <span className="text-xs font-medium text-white">NFT Backing</span>
                <span className="text-sm font-bold text-[var(--money-green)]">
                  {nftBackingGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[var(--muted)]">Mint Fee ({mintFeePct}%, charged on top)</span>
                <span className="text-sm text-yellow-400">
                  +{feeGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[var(--muted)]">NFT Share</span>
                <span className="text-sm text-white">{nftSharePct.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[var(--muted)]">DR Remaining</span>
                <span className="text-sm text-white">
                  {remainingGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                </span>
              </div>
            </div>
          )}

          {/* Validation errors */}
          {isAmountTooSmall && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] text-red-400">
                Amount ({rawAmountGor.toFixed(4)} GOR) is below the minimum NFT backing of {minBackingGor.toFixed(4)} GOR.
              </p>
            </div>
          )}
          {isAmountTooLarge && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] text-red-400">
                Amount exceeds your deposit record balance.
              </p>
            </div>
          )}

          {/* TX error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] text-red-400">{error}</p>
            </div>
          )}

          {/* Fee note — links to on-chain protocol state */}
          <div className="text-[10px] text-[var(--faint)]">
            Mint fee:{' '}
            <a
              href={`${config.explorerUrl}${config.explorerAddressPath}${getProtocolStatePDA()[0].toBase58()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--money-green)] hover:underline"
            >
              {mintFeePct}%
            </a>
          </div>

          {/* Mint button */}
          <button
            onClick={handleMint}
            disabled={!isValid || isMinting}
            className="w-full btn-money py-3 text-sm font-bold disabled:opacity-40"
          >
            {isMinting ? 'Minting NFT...' : 'Mint NFT'}
          </button>
        </div>
      </div>
    </div>
  );
}
