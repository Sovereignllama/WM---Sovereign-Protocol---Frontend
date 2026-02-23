'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { SovereignList } from '@/components/SovereignList';
import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { PublicKey } from '@solana/web3.js';
import { useSovereigns, useProtocolState, useAllPoolSnapshots } from '@/hooks';

type CategoryType = 'Bonding' | 'Recovery' | 'Active' | 'Unwind' | 'Archived';
type PageSize = 5 | 10 | 20;

// Per-category sort options
const categorySorts: Record<CategoryType, { value: string; label: string }[]> = {
  Bonding: [
    { value: 'depositors', label: 'Depositors' },
    { value: 'raiseSize', label: 'Size of Raise' },
    { value: 'bondPct', label: 'Bond %' },
  ],
  Recovery: [
    { value: 'fees', label: 'Fees' },
    { value: 'raised', label: 'Recovered' },
    { value: 'newest', label: 'Newest' },
  ],
  Active: [
    { value: 'fees', label: 'Fees' },
    { value: 'raised', label: 'Volume' },
    { value: 'newest', label: 'Newest' },
  ],
  Unwind: [
    { value: 'timeToUnwind', label: 'Time to Unwind' },
    { value: 'newest', label: 'Newest' },
  ],
  Archived: [
    { value: 'newest', label: 'Newest' },
    { value: 'fees', label: 'Fees' },
  ],
};

const categories: { value: CategoryType; label: string; icon: string }[] = [
  { value: 'Bonding', label: 'Bonding', icon: '🔥' },
  { value: 'Recovery', label: 'Recovery', icon: '📈' },
  { value: 'Active', label: 'Active', icon: '⚡' },
  { value: 'Unwind', label: 'Unwind', icon: '💀' },
  { value: 'Archived', label: 'Archived', icon: '🗄️' },
];

export default function SovereignsPage() {
  const [category, setCategory] = useState<CategoryType>('Bonding');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('depositors');
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch real data from on-chain
  const { data: sovereignsData, isLoading: sovereignsLoading, error: sovereignsError } = useSovereigns();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const { data: poolSnapshots } = useAllPoolSnapshots();

  // When switching categories, reset sort to first option for that category & reset page
  const handleCategoryChange = useCallback((cat: CategoryType) => {
    setCategory(cat);
    setSortBy(categorySorts[cat][0].value);
    setCurrentPage(1);
  }, []);

  // Transform on-chain data to display format
  const sovereigns: SovereignDisplayData[] = useMemo(() => {
    if (!sovereignsData) return [];
    
    return sovereignsData.map((s: any) => {
      // Use pool snapshot recovery data (engine tracks actual recovery progress)
      const snap = poolSnapshots?.[Number(s.sovereignId)];
      const snapshotRecoveryTarget = snap ? Number(snap.recoveryTarget) : 0;
      const snapshotTotalRecovered = snap ? Number(snap.totalRecovered) : 0;
      const recoveryProgress = snapshotRecoveryTarget > 0
        ? (snapshotTotalRecovered / snapshotRecoveryTarget) * 100
        : (s.recoveryProgress ?? 0);

      return {
      sovereignId: BigInt(s.sovereignId),
      publicKey: new PublicKey(s.publicKey),
      name: s.name || `Sovereign #${s.sovereignId}`,
      creator: new PublicKey(s.creator),
      tokenMint: new PublicKey(s.tokenMint),
      sovereignType: s.sovereignType as 'TokenLaunch' | 'BYOToken',
      tokenSymbol: s.tokenSymbol || undefined,
      tokenName: s.tokenName || undefined,
      tokenDecimals: 9,
      tokenSupplyDeposited: BigInt(0),
      tokenTotalSupply: BigInt(0),
      bondTarget: BigInt(s.bondTarget),
      bondDeadline: s.bondDeadline,
      bondDurationDays: 14,
      status: s.status as SovereignStatus,
      totalDeposited: BigInt(s.totalDeposited),
      depositorCount: s.depositorCount,
      sellFeeBps: s.sellFeeBps,
      swapFeeBps: s.swapFeeBps ?? 0,
      creationFeeEscrowed: BigInt(0),
      creatorEscrow: BigInt(0),
      creatorMaxBuyBps: 100,
      totalSolFeesCollected: BigInt(s.totalFeesCollected || 0),
      totalSolFeesDistributed: BigInt(s.totalRecovered || 0),
      totalTokenFeesCollected: BigInt(0),
      recoveryTarget: BigInt(s.recoveryTarget),
      recoveryComplete: snap ? snap.recoveryComplete : s.recoveryComplete,
      unwindSolBalance: BigInt(0),
      unwindTokenBalance: BigInt(0),
      activityCheckInitiated: s.activityCheckInitiated ?? false,
      activityCheckInitiatedAt: s.activityCheckInitiatedAt ?? null,
      lastActivity: s.lastActivity ?? null,
      autoUnwindPeriod: 90 * 24 * 60 * 60,
      metadataUri: s.metadataUri || undefined,
      bondProgress: s.bondingProgress,
      recoveryProgress,
      bondTargetSol: s.bondTargetGor,
      totalDepositedSol: s.totalDepositedGor,
      totalFeesCollectedGor: s.totalFeesCollectedGor ?? 0,
      recoveryTargetSol: s.recoveryTargetGor,
      };
    });
  }, [sovereignsData, poolSnapshots]);

  // Count by category
  const counts: Record<CategoryType, number> = useMemo(() => ({
    Bonding: sovereigns.filter(s => s.status === 'Bonding').length,
    Recovery: sovereigns.filter(s => s.status === 'Recovery').length,
    Active: sovereigns.filter(s => s.status === 'Active').length,
    Unwind: sovereigns.filter(s => s.activityCheckInitiated || s.status === 'Unwinding').length,
    Archived: sovereigns.filter(s => s.status === 'Unwound' || s.status === 'Halted').length,
  }), [sovereigns]);

  const isLoading = sovereignsLoading || protocolLoading;

  // Reset page when search changes
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  }, []);

  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* Top Bar: Search + Page Size + Launch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, symbol, or token address..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--landfill-black)] border border-[var(--border)] text-[var(--text-light)] placeholder-[var(--faint)] text-sm focus:outline-none focus:border-[var(--hazard-yellow)] transition-colors"
            />
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--faint)] uppercase tracking-wider">Show</span>
            {([5, 10, 20] as PageSize[]).map((size) => (
              <button
                key={size}
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  pageSize === size
                    ? 'bg-[var(--hazard-yellow)] text-[var(--landfill-black)]'
                    : 'bg-[var(--landfill-black)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--hazard-yellow)]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Launch CTA */}
          <Link href="/mint" className="btn btn-primary btn-sm whitespace-nowrap text-center">
            + Launch
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => handleCategoryChange(c.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                category === c.value
                  ? 'bg-[var(--hazard-yellow)] text-[var(--landfill-black)]'
                  : 'bg-[var(--landfill-black)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--hazard-yellow)] hover:text-[var(--text-light)]'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
              {counts[c.value] > 0 && (
                <span className={`ml-0.5 ${category === c.value ? 'opacity-70' : 'opacity-50'}`}>
                  {counts[c.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category-specific sort pills */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-[10px] text-[var(--faint)] uppercase tracking-wider mr-1">Sort</span>
          {categorySorts[category].map((s) => (
            <button
              key={s.value}
              onClick={() => { setSortBy(s.value); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                sortBy === s.value
                  ? 'bg-[var(--sovereign-green)] text-white'
                  : 'bg-transparent text-[var(--muted)] border border-[var(--border)] hover:border-[var(--sovereign-green)] hover:text-[var(--text-light)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[var(--landfill-black)] border border-[var(--border)] p-3 animate-pulse">
                <div className="w-full aspect-square rounded-lg bg-[var(--concrete)] mb-2" />
                <div className="h-3 bg-[var(--concrete)] rounded w-2/3 mb-1.5" />
                <div className="h-2.5 bg-[var(--concrete)] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {sovereignsError && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-[var(--loss)] font-bold">Failed to load sovereigns</p>
            <p className="text-[var(--muted)] text-sm mt-1">
              {sovereignsError instanceof Error ? sovereignsError.message : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Sovereign Grid */}
        {!isLoading && !sovereignsError && (
          <SovereignList 
            sovereigns={sovereigns} 
            category={category}
            searchQuery={searchQuery}
            sortBy={sortBy}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            poolSnapshots={poolSnapshots}
            emptyMessage={sovereigns.length === 0 
              ? 'No sovereigns created yet. Be the first to launch!' 
              : searchQuery
                ? `No sovereigns matching "${searchQuery}"`
                : `No ${category.toLowerCase()} sovereigns found`
            }
          />
        )}
      </div>
    </div>
  );
}
