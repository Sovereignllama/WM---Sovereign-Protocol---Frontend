'use client';

import { useState, useRef } from 'react';
import { LAMPORTS_PER_GOR } from '@/lib/config';

// ============================================================
// Types
// ============================================================

export interface NftListingModalProps {
  open: boolean;
  onClose: () => void;
  onList: (priceGor: number) => void;
  isListing?: boolean;
  /** Deposit data */
  depositAmountGor: number;
  sharesPercent: number;
  /** Pool/fee data for valuation */
  lpFeesAccumulatedGor: number;
  totalFeesCollectedGor: number;
  recoveryComplete: boolean;
  /** Pool age (seconds since finalization) for annualized return */
  poolAgeSeconds: number;
  /** Current pool GOR reserve */
  gorReserveGor: number;
  /** Token symbol for display */
  tokenSymbol: string;
  /** NFT mint address */
  nftMint: string;
}

// ============================================================
// Component
// ============================================================

export function NftListingModal({
  open,
  onClose,
  onList,
  isListing = false,
  depositAmountGor,
  sharesPercent,
  lpFeesAccumulatedGor,
  totalFeesCollectedGor,
  recoveryComplete,
  poolAgeSeconds,
  gorReserveGor,
  tokenSymbol,
  nftMint,
}: NftListingModalProps) {
  const [price, setPrice] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  // ── Valuation calculations ──

  // Share of LP fees this position has accrued
  const positionShareFraction = sharesPercent / 100;
  const positionLpFees = lpFeesAccumulatedGor * positionShareFraction;

  // Deposit value = original deposit + accrued LP fee share
  const depositValue = depositAmountGor + positionLpFees;

  // Annualized return: (fees_earned / deposit) / (pool_age_years)
  const poolAgeYears = poolAgeSeconds / (365.25 * 24 * 3600);
  const annualReturn = poolAgeYears > 0 && depositAmountGor > 0
    ? (positionLpFees / depositAmountGor) / poolAgeYears * 100
    : 0;

  // Share of the GOR reserve (what the position controls)
  const gorReserveShare = gorReserveGor * positionShareFraction;

  const handleList = () => {
    const priceGor = parseFloat(price);
    if (!priceGor || priceGor <= 0) return;
    onList(priceGor);
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
            <h2 className="text-sm font-bold text-white">List $overeign NFT</h2>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              {tokenSymbol} · {sharesPercent.toFixed(2)}% position
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Valuation stats */}
        <div className="px-5 pb-4 space-y-3">
          {/* Position value card */}
          <div className="bg-[var(--landfill-black)] rounded-xl p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-2">Position Value</div>
            
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Original Deposit</span>
              <span className="text-sm font-bold text-white">{depositAmountGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">Accrued LP Fees</span>
              <span className="text-sm font-bold text-[var(--money-green)]">
                +{positionLpFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[var(--muted)]">GOR Reserve Share</span>
              <span className="text-sm font-bold text-white">
                {gorReserveShare.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div className="border-t border-[var(--border)] pt-2 flex justify-between items-baseline">
              <span className="text-xs font-medium text-white">Estimated Value</span>
              <span className="text-lg font-bold text-[var(--money-green)]">
                {depositValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>
          </div>

          {/* Annual return */}
          <div className="bg-[var(--landfill-black)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Annual % Return</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">Based on LP fees earned since pool launch</div>
            </div>
            <div className={`text-xl font-bold ${annualReturn > 0 ? 'text-[var(--money-green)]' : 'text-[var(--muted)]'}`}>
              {annualReturn > 0 ? `${annualReturn.toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Recovery status */}
          {!recoveryComplete && (
            <div className="bg-[var(--hazard-yellow)]/10 border border-[var(--hazard-yellow)]/20 rounded-xl p-3">
              <p className="text-[10px] text-[var(--hazard-yellow)]">
                ⚠️ Recovery not yet complete — LP fees are still accumulating toward the recovery target. 
                The buyer will inherit this position and continue earning fees.
              </p>
            </div>
          )}

          {/* Price input */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1.5 block">
              Listing Price
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.1"
                  className="w-full bg-[var(--landfill-black)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--money-green)] transition-colors pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">GOR</span>
              </div>
            </div>
            {price && parseFloat(price) > 0 && (
              <div className="mt-1.5 text-[10px] text-[var(--muted)]">
                {parseFloat(price) > depositValue
                  ? `${((parseFloat(price) / depositValue - 1) * 100).toFixed(1)}% above estimated value`
                  : parseFloat(price) < depositValue
                  ? `${((1 - parseFloat(price) / depositValue) * 100).toFixed(1)}% below estimated value`
                  : 'At estimated value'}
              </div>
            )}
          </div>

          {/* NFT Mint */}
          <div className="text-[10px] text-[var(--faint)] truncate">
            NFT: {nftMint.slice(0, 8)}…{nftMint.slice(-8)}
          </div>

          {/* List button */}
          <button
            onClick={handleList}
            disabled={!price || parseFloat(price) <= 0 || isListing}
            className="w-full btn-money py-3 text-sm font-bold disabled:opacity-40"
          >
            {isListing ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
