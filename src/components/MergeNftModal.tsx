'use client';

import { useRef } from 'react';
import { LAMPORTS_PER_GOR } from '@/lib/config';

// ============================================================
// Types
// ============================================================

export interface MergeNftModalProps {
  open: boolean;
  onClose: () => void;
  onMerge: () => void;
  isMerging?: boolean;
  error?: string | null;
  /** NFT backing amount (raw lamports string) */
  depositAmount: string;
  /** NFT share in bps (e.g. 500 = 5%) */
  sharesBps: number;
  /** Current deposit record balance in GOR */
  currentDrGor: number;
  /** Current deposit record shares percent */
  currentDrSharesPct: number;
  /** Token symbol for display */
  tokenSymbol: string;
  /** NFT mint address */
  nftMint: string;
}

// ============================================================
// Component
// ============================================================

export function MergeNftModal({
  open,
  onClose,
  onMerge,
  isMerging = false,
  error,
  depositAmount,
  sharesBps,
  currentDrGor,
  currentDrSharesPct,
  tokenSymbol,
  nftMint,
}: MergeNftModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const nftGor = Number(depositAmount) / LAMPORTS_PER_GOR;
  const nftSharePct = sharesBps / 100;
  const newDrGor = currentDrGor + nftGor;
  const newDrSharesPct = currentDrSharesPct + nftSharePct;

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
            <h2 className="text-sm font-bold text-white">Merge NFT → Deposit Record</h2>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              {tokenSymbol} · {nftSharePct.toFixed(2)}% position
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* NFT being merged */}
          <div className="bg-[var(--landfill-black)] rounded-xl p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">NFT to Merge</div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Backing</span>
              <span className="text-sm font-bold text-white">
                {nftGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Share</span>
              <span className="text-sm font-bold text-white">{nftSharePct.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-[var(--faint)] truncate mt-1">
              Mint: {nftMint.slice(0, 8)}…{nftMint.slice(-8)}
            </div>
          </div>

          {/* Result preview */}
          <div className="bg-[var(--landfill-black)] rounded-xl p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">After Merge</div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">DR Balance</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--faint)] line-through">
                  {currentDrGor.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="text-xs text-[var(--faint)]">→</span>
                <span className="text-sm font-bold text-[var(--money-green)]">
                  {newDrGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">DR Share</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--faint)] line-through">
                  {currentDrSharesPct.toFixed(2)}%
                </span>
                <span className="text-xs text-[var(--faint)]">→</span>
                <span className="text-sm font-bold text-[var(--money-green)]">
                  {newDrSharesPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-[10px] text-yellow-400">
              ⚠️ This will <span className="font-bold">permanently burn</span> the NFT and add its backing + share back into your deposit record. This action cannot be undone.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] text-red-400">{error}</p>
            </div>
          )}

          {/* Merge button */}
          <button
            onClick={onMerge}
            disabled={isMerging}
            className="w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40
              bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
          >
            {isMerging ? 'Merging...' : 'Burn NFT & Merge into DR'}
          </button>
        </div>
      </div>
    </div>
  );
}
