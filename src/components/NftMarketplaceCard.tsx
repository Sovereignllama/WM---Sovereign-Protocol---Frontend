'use client';

import { useState } from 'react';
import { LAMPORTS_PER_GOR, config } from '@/lib/config';

// ============================================================
// Types
// ============================================================

export interface NftListing {
  mint: string;
  owner: string;
  sovereign: string;
  sharesBps: number;
  depositAmount: string;         // lamports string
  name: string;
  symbol: string;
  mintedAt: string;
  /** Listing info (undefined = not listed) */
  listingPriceGor?: number;
  /** Enriched fields from pool data */
  positionValueGor?: number;
  annualReturnPct?: number;
}

export interface NftMarketplaceCardProps {
  /** All NFTs for this sovereign (from backend) */
  nfts: NftListing[];
  /** Pool data for valuation */
  lpFeesAccumulatedGor: number;
  totalFeesCollectedGor: number;
  gorReserveGor: number;
  initialGorReserveGor: number;
  poolAgeSeconds: number;
  recoveryComplete: boolean;
  /** Token symbol */
  tokenSymbol: string;
  /** Connected wallet (to highlight own NFT) */
  connectedWallet?: string;
  /** Callback when clicking an NFT */
  onSelectNft?: (nft: NftListing) => void;
}

// ============================================================
// Component
// ============================================================

export function NftMarketplaceCard({
  nfts,
  lpFeesAccumulatedGor,
  totalFeesCollectedGor,
  gorReserveGor,
  initialGorReserveGor,
  poolAgeSeconds,
  recoveryComplete,
  tokenSymbol,
  connectedWallet,
  onSelectNft,
}: NftMarketplaceCardProps) {
  const [selectedNft, setSelectedNft] = useState<NftListing | null>(null);

  if (!nfts || nfts.length === 0) {
    return null;
  }

  const poolAgeYears = poolAgeSeconds / (365.25 * 24 * 3600);

  // Enrich NFTs with valuation
  const enrichedNfts = nfts.map((nft) => {
    const depositGor = Number(nft.depositAmount) / LAMPORTS_PER_GOR;
    const shareFraction = nft.sharesBps / 10000;
    const positionLpFees = lpFeesAccumulatedGor * shareFraction;
    const positionValue = depositGor + positionLpFees;
    const annualReturn = poolAgeYears > 0 && depositGor > 0
      ? (positionLpFees / depositGor) / poolAgeYears * 100
      : 0;

    return {
      ...nft,
      depositGor,
      shareFraction,
      sharesPercent: nft.sharesBps / 100,
      positionLpFees,
      positionValueGor: positionValue,
      annualReturnPct: annualReturn,
      gorReserveShare: gorReserveGor * shareFraction,
      isOwn: connectedWallet ? nft.owner === connectedWallet : false,
    };
  });

  // Sort: listed first, then by share descending
  const sorted = [...enrichedNfts].sort((a, b) => {
    if (a.listingPriceGor && !b.listingPriceGor) return -1;
    if (!a.listingPriceGor && b.listingPriceGor) return 1;
    return b.sharesBps - a.sharesBps;
  });

  const handleNftClick = (nft: typeof sorted[0]) => {
    if (selectedNft?.mint === nft.mint) {
      setSelectedNft(null);
    } else {
      setSelectedNft(nft);
      onSelectNft?.(nft);
    }
  };

  const selected = selectedNft
    ? enrichedNfts.find(n => n.mint === selectedNft.mint) ?? null
    : null;

  return (
    <div className="card card-clean p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">$overeign NFT Marketplace</h3>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">
            {nfts.length} position{nfts.length !== 1 ? 's' : ''} minted · {tokenSymbol}
          </p>
        </div>
        {!recoveryComplete && (
          <span className="text-[10px] bg-[var(--money-green)]/10 text-[var(--money-green)] px-2 py-0.5 rounded-full">
            Recovery
          </span>
        )}
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((nft) => (
          <button
            key={nft.mint}
            onClick={() => handleNftClick(nft)}
            className={`text-left rounded-xl p-3 border transition-all hover:border-[var(--money-green)]/50 ${
              selected?.mint === nft.mint
                ? 'border-[var(--money-green)] bg-[var(--money-green)]/5'
                : 'border-[var(--border)] bg-[var(--landfill-black)]'
            } ${nft.isOwn ? 'ring-1 ring-[var(--money-green)]/30' : ''}`}
          >
            {/* Owner badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--muted)] truncate max-w-[120px]">
                {nft.isOwn ? (
                  <span className="text-[var(--money-green)] font-medium">Your Position</span>
                ) : (
                  `${nft.owner.slice(0, 4)}…${nft.owner.slice(-4)}`
                )}
              </span>
              {nft.listingPriceGor && (
                <span className="text-[10px] bg-[var(--money-green)]/10 text-[var(--money-green)] px-1.5 py-0.5 rounded-full font-medium">
                  For Sale
                </span>
              )}
            </div>

            {/* Share */}
            <div className="text-lg font-bold text-white mb-1">
              {nft.sharesPercent.toFixed(2)}%
            </div>

            {/* Value */}
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-[var(--muted)]">Value</span>
              <span className="text-white font-medium">
                {nft.positionValueGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
              </span>
            </div>

            {/* Annual Return */}
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-[var(--muted)]">Annual Return</span>
              <span className={`font-medium ${nft.annualReturnPct > 0 ? 'text-[var(--money-green)]' : 'text-[var(--muted)]'}`}>
                {nft.annualReturnPct > 0 ? `${nft.annualReturnPct.toFixed(1)}%` : '—'}
              </span>
            </div>

            {/* Listing price if listed */}
            {nft.listingPriceGor && (
              <div className="flex justify-between text-[10px] border-t border-[var(--border)] pt-1 mt-1">
                <span className="text-[var(--muted)]">Price</span>
                <span className="text-[var(--money-green)] font-bold">
                  {nft.listingPriceGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Expanded Detail Panel */}
      {selected && (
        <div className="mt-4 bg-[var(--landfill-black)] rounded-xl p-4 border border-[var(--money-green)]/20 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white">Position Details</h4>
            <button
              onClick={() => setSelectedNft(null)}
              className="text-[var(--muted)] hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--muted)] block text-[10px]">Owner</span>
              <a
                href={`${config.explorerUrl}${config.explorerAddressPath}${selected.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--money-green)] hover:underline truncate block"
              >
                {selected.isOwn ? 'You' : `${selected.owner.slice(0, 8)}…${selected.owner.slice(-8)}`}
              </a>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">NFT Mint</span>
              <a
                href={`${config.explorerUrl}${config.explorerAddressPath}${selected.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--money-green)] hover:underline truncate block"
              >
                {selected.mint.slice(0, 8)}…{selected.mint.slice(-8)}
              </a>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">Original Deposit</span>
              <span className="text-white font-medium">
                {selected.depositGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">Share</span>
              <span className="text-white font-medium">{selected.sharesPercent.toFixed(2)}%</span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">Accrued LP Fees</span>
              <span className="text-[var(--money-green)] font-medium">
                +{selected.positionLpFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">GOR Reserve Share</span>
              <span className="text-white font-medium">
                {selected.gorReserveShare.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">Estimated Value</span>
              <span className="text-[var(--money-green)] font-bold text-sm">
                {selected.positionValueGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px]">Annual Return</span>
              <span className={`font-bold text-sm ${selected.annualReturnPct > 0 ? 'text-[var(--money-green)]' : 'text-[var(--muted)]'}`}>
                {selected.annualReturnPct > 0 ? `${selected.annualReturnPct.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[var(--faint)] mt-3">
            Minted {new Date(selected.mintedAt).toLocaleDateString()}
          </div>

          {/* Buy button (if listed and not own) */}
          {selected.listingPriceGor && !selected.isOwn && (
            <button className="w-full btn-money py-2 text-xs font-bold mt-3">
              Buy for {selected.listingPriceGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
            </button>
          )}
        </div>
      )}
    </div>
  );
}
