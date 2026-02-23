'use client';

import { useMemo } from 'react';
import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { SovereignCard } from './SovereignCard';
import { useNftCounts } from '@/hooks/useNfts';
import type { PoolSnapshot } from '@/hooks';

type CategoryType = 'Bonding' | 'Recovery' | 'Active' | 'Unwind' | 'Archived';

interface SovereignListProps {
  sovereigns: SovereignDisplayData[];
  category: CategoryType;
  searchQuery?: string;
  sortBy?: string;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  poolSnapshots?: Record<number, PoolSnapshot>;
}

/** How many days remain in the 90-day unwind window */
function daysToUnwind(s: SovereignDisplayData): number {
  const UNWIND_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;
  const activityStart = s.activityCheckInitiatedAt
    ? new Date(s.activityCheckInitiatedAt).getTime()
    : s.lastActivity
    ? new Date(s.lastActivity).getTime()
    : 0;
  if (!activityStart) return 90;
  const deadline = activityStart + UNWIND_PERIOD_MS;
  return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function SovereignList({
  sovereigns,
  category,
  searchQuery = '',
  sortBy = 'newest',
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  emptyMessage,
  poolSnapshots,
}: SovereignListProps) {

  const { data: nftCounts } = useNftCounts();

  const filteredSovereigns = useMemo(() => {
    // 1. Category filter
    let result: SovereignDisplayData[];
    switch (category) {
      case 'Bonding':
        result = sovereigns.filter(s => s.status === 'Bonding');
        break;
      case 'Recovery':
        result = sovereigns.filter(s => s.status === 'Recovery');
        break;
      case 'Active':
        result = sovereigns.filter(s => s.status === 'Active');
        break;
      case 'Unwind':
        result = sovereigns.filter(s =>
          s.activityCheckInitiated || s.status === 'Unwinding'
        );
        break;
      case 'Archived':
        result = sovereigns.filter(s =>
          s.status === 'Unwound' || s.status === 'Halted'
        );
        break;
    }

    // 2. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const symbolMatch = s.tokenSymbol?.toLowerCase().includes(q);
        const mintMatch = s.tokenMint.toBase58().toLowerCase().includes(q);
        return nameMatch || symbolMatch || mintMatch;
      });
    }

    // 3. Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        // Bonding sorts
        case 'depositors':
          return b.depositorCount - a.depositorCount;
        case 'raiseSize':
          return (b.bondTargetSol || 0) - (a.bondTargetSol || 0);
        case 'bondPct':
          return b.bondProgress - a.bondProgress;
        // Recovery / Active sorts
        case 'fees':
          return (b.totalFeesCollectedGor || 0) - (a.totalFeesCollectedGor || 0);
        case 'raised':
          return (b.totalDepositedSol || 0) - (a.totalDepositedSol || 0);
        // Unwind sort
        case 'timeToUnwind':
          return daysToUnwind(a) - daysToUnwind(b); // soonest first
        // Default
        case 'newest':
        default:
          return Number(b.sovereignId - a.sovereignId);
      }
    });

    return result;
  }, [sovereigns, category, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSovereigns.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedSovereigns = filteredSovereigns.slice(startIdx, startIdx + pageSize);

  if (filteredSovereigns.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">👑</div>
        <p className="text-[var(--muted)] text-sm">
          {emptyMessage || 'No sovereigns found'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[var(--faint)]">
          {filteredSovereigns.length} result{filteredSovereigns.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {paginatedSovereigns.map((sovereign) => (
          <SovereignCard
            key={sovereign.sovereignId.toString()}
            sovereign={sovereign}
            priceChange24h={poolSnapshots?.[Number(sovereign.sovereignId)]?.priceChange24h}
            nftCount={nftCounts?.[sovereign.publicKey.toString()]}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange?.(safePage - 1)}
            disabled={safePage <= 1}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--landfill-black)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--hazard-yellow)] hover:text-[var(--text-light)]"
          >
            ← Prev
          </button>

          {/* Page number buttons */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => {
              // Show first, last, current ±1
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - safePage) <= 1) return true;
              return false;
            })
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`e-${i}`} className="text-[var(--faint)] text-xs px-1">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => onPageChange?.(item as number)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                    safePage === item
                      ? 'bg-[var(--hazard-yellow)] text-[var(--landfill-black)]'
                      : 'bg-[var(--landfill-black)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--hazard-yellow)]'
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => onPageChange?.(safePage + 1)}
            disabled={safePage >= totalPages}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--landfill-black)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--hazard-yellow)] hover:text-[var(--text-light)]"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
