'use client';

import Link from 'next/link';
import { SovereignDisplayData } from '@/types/sovereign';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';

interface SovereignCardProps {
  sovereign: SovereignDisplayData;
  priceChange24h?: number;
  nftCount?: number;
}

export function SovereignCard({ sovereign, priceChange24h, nftCount }: SovereignCardProps) {
  const { data: metadata } = useTokenMetadata(sovereign.metadataUri);
  const imageUrl = metadata?.image;
  const description = metadata?.description;

  // Determine progress % based on state
  const progressPct = sovereign.status === 'Bonding'
    ? sovereign.bondProgress
    : sovereign.status === 'Recovery'
    ? sovereign.recoveryProgress
    : null;

  // Short creator address
  const creatorShort = sovereign.creator
    ? `${sovereign.creator.toString().slice(0, 4)}...${sovereign.creator.toString().slice(-4)}`
    : '';

  return (
    <Link href={`/sovereign/${sovereign.sovereignId}`}>
      <div className="group relative rounded-xl bg-[var(--landfill-black)] border border-[var(--border)] hover:border-[var(--hazard-yellow)] transition-all cursor-pointer overflow-hidden">
        {/* Status indicator stripe */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: sovereign.status === 'Active' ? 'var(--money-green)'
            : sovereign.status === 'Bonding' ? 'var(--hazard-yellow)'
            : sovereign.status === 'Recovery' ? 'var(--hazard-orange)'
            : sovereign.status === 'Failed' ? 'var(--loss)'
            : 'var(--border)'
        }} />

        {/* Image area */}
        <div className="relative w-full aspect-square bg-[var(--dark-green-bg)] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={sovereign.tokenSymbol || sovereign.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold text-[var(--border)] select-none">
                {(sovereign.tokenSymbol || sovereign.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Progress bar overlay at bottom of image */}
          {progressPct !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(progressPct, 100)}%`,
                  background: sovereign.status === 'Recovery' ? 'var(--hazard-orange)' : 'var(--money-green)',
                }}
              />
            </div>
          )}

          {/* 24h price change badge */}
          {priceChange24h != null && priceChange24h !== 0 && ['Recovery', 'Active'].includes(sovereign.status) && (
            <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${
              priceChange24h > 0
                ? 'bg-[var(--profit)]/20 text-[var(--profit)]'
                : 'bg-[var(--loss)]/20 text-[var(--loss)]'
            }`}>
              {priceChange24h > 0 ? '▲' : '▼'} {Math.abs(priceChange24h).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3">
          {/* Name row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-white truncate leading-tight">
              {sovereign.name}
            </h3>
            <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--dark-green-bg)] px-1.5 py-0.5 rounded flex-shrink-0">
              ${sovereign.tokenSymbol || 'TOKEN'}
            </span>
          </div>

          {/* Creator */}
          {creatorShort && (
            <p className="text-[10px] text-[var(--faint)] mb-1 font-mono">
              by {creatorShort}
            </p>
          )}

          {/* Description snippet */}
          {description && (
            <p className="text-[10px] text-[var(--muted)] leading-tight mb-2 line-clamp-2">
              {description}
            </p>
          )}

          {/* Context-aware stats row */}
          {sovereign.status === 'Bonding' && (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[var(--muted)]">Bonded: </span>
                  <span className="text-[var(--money-green)] font-bold">
                    {sovereign.bondProgress.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">NFTs: </span>
                  <span className="text-white font-bold">{nftCount ?? sovereign.depositorCount}</span>
                </div>
              </div>
              <div className="text-[10px] text-[var(--faint)] mt-1">
                {sovereign.totalDepositedSol?.toFixed(2) || '0'} / {sovereign.bondTargetSol?.toFixed(2) || '0'} GOR
              </div>
            </>
          )}

          {(sovereign.status === 'Recovery') && (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[var(--muted)]">Recovery: </span>
                  <span className="text-[var(--hazard-orange)] font-bold">
                    {sovereign.recoveryProgress?.toFixed(1) || '0'}%
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Fees: </span>
                  <span className="text-white font-bold">
                    {(sovereign.totalFeesCollectedGor || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-[var(--faint)] mt-1">
                {nftCount ?? sovereign.depositorCount} NFTs
              </div>
            </>
          )}

          {sovereign.status === 'Active' && (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[var(--muted)]">Fees: </span>
                  <span className="text-[var(--money-green)] font-bold">
                    {(sovereign.totalFeesCollectedGor || 0).toFixed(2)} GOR
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">NFTs: </span>
                  <span className="text-white font-bold">{nftCount ?? sovereign.depositorCount}</span>
                </div>
              </div>
            </>
          )}

          {(sovereign.status === 'Unwinding' || sovereign.status === 'Unwound' || sovereign.activityCheckInitiated) && (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[var(--muted)]">Unwind: </span>
                  <span className="text-[var(--loss)] font-bold">
                    {(() => {
                      const UNWIND_MS = 90 * 24 * 60 * 60 * 1000;
                      const start = sovereign.activityCheckInitiatedAt
                        ? new Date(sovereign.activityCheckInitiatedAt).getTime()
                        : sovereign.lastActivity
                        ? new Date(sovereign.lastActivity).getTime()
                        : 0;
                      if (!start) return '90d left';
                      const days = Math.max(0, Math.ceil((start + UNWIND_MS - Date.now()) / (24 * 60 * 60 * 1000)));
                      return `${days}d left`;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">NFTs: </span>
                  <span className="text-white font-bold">{nftCount ?? sovereign.depositorCount}</span>
                </div>
              </div>
              <div className="text-[10px] text-[var(--faint)] mt-1">90-day inactivity period</div>
            </>
          )}

          {/* Fallback for other statuses */}
          {!['Bonding', 'Recovery', 'Active', 'Unwinding', 'Unwound'].includes(sovereign.status) && !sovereign.activityCheckInitiated && (
            <div className="flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[var(--muted)]">NFTs: </span>
                <span className="text-white font-bold">{nftCount ?? sovereign.depositorCount}</span>
              </div>
              <div className="text-[10px] text-[var(--faint)]">
                {sovereign.totalDepositedSol?.toFixed(2) || '0'} GOR
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
