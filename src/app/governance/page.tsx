'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMyGovernancePositions } from '@/hooks/useMyGovernancePositions';
import { GovernancePositionCard } from '@/components/GovernancePositionCard';
import { CreatorPositionCard } from '@/components/CreatorPositionCard';
import Link from 'next/link';

const ACTIVE_STATUSES = ['Recovery', 'Active', 'Unwinding', 'Bonding', 'Finalizing'];
const ARCHIVED_STATUSES = ['Unwound', 'Halted', 'Failed'];

type Filter = 'active' | 'archived' | 'all';

export default function GovernancePage() {
  const { connected } = useWallet();
  const {
    positions,
    creatorPositions,
    isLoading,
    hasPositions,
    hasCreatorPositions,
  } = useMyGovernancePositions();

  const [posFilter, setPosFilter] = useState<Filter>('active');
  const [creatorFilter, setCreatorFilter] = useState<Filter>('active');

  const filteredPositions = useMemo(() => {
    const filtered = posFilter === 'all' ? positions
      : posFilter === 'archived' ? positions.filter(p => ARCHIVED_STATUSES.includes(p.status))
      : positions.filter(p => ACTIVE_STATUSES.includes(p.status));
    return [...filtered].sort((a, b) => b.depositAmountGor - a.depositAmountGor);
  }, [positions, posFilter]);

  const filteredCreator = useMemo(() => {
    if (creatorFilter === 'all') return creatorPositions;
    if (creatorFilter === 'archived') return creatorPositions.filter(p => ARCHIVED_STATUSES.includes(p.status));
    return creatorPositions.filter(p => ACTIVE_STATUSES.includes(p.status));
  }, [creatorPositions, creatorFilter]);

  const posArchivedCount = positions.filter(p => ARCHIVED_STATUSES.includes(p.status)).length;
  const posActiveCount = positions.length - posArchivedCount;
  const creatorArchivedCount = creatorPositions.filter(p => ARCHIVED_STATUSES.includes(p.status)).length;
  const creatorActiveCount = creatorPositions.length - creatorArchivedCount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8" />

      {/* Not connected */}
      {!connected && (
        <div className="card card-clean p-10 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Connect your wallet</h3>
          <p className="text-[var(--muted)] text-sm">
            Connect your wallet to see your governance positions and creator dashboards.
          </p>
        </div>
      )}

      {/* Loading */}
      {connected && isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card card-clean p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--card-bg)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[var(--card-bg)] rounded" />
                  <div className="h-3 w-48 bg-[var(--card-bg)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connected, no positions at all */}
      {connected && !isLoading && !hasPositions && !hasCreatorPositions && (
        <div className="card card-clean p-10 text-center">
          <h3 className="font-bold text-lg mb-2" style={{ color: '#d4ffe6' }}>No governance positions</h3>
          <p className="text-[var(--muted)] text-sm max-w-md mx-auto mb-4">
            Deposit into a sovereign to participate in governance.
          </p>
          <Link
            href="/sovereigns"
            className="inline-block px-6 py-2 rounded-lg text-sm font-bold bg-[var(--money-green)] text-black hover:opacity-90"
          >
            Browse Sovereigns
          </Link>
        </div>
      )}

      {/* LP / NFT Holder Positions */}
      {connected && !isLoading && hasPositions && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-bold text-lg">My Positions</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--money-green)]/15 text-[var(--money-green)] font-bold">
                {filteredPositions.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(['active', 'archived', 'all'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPosFilter(f)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    posFilter === f
                      ? 'bg-[var(--money-green)]/20 text-[var(--money-green)]'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  {f === 'active' ? `Active (${posActiveCount})` : f === 'archived' ? `Archived (${posArchivedCount})` : `All (${positions.length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filteredPositions.length > 0 ? filteredPositions.map((pos) => (
              <GovernancePositionCard key={pos.sovereignId} position={pos} />
            )) : (
              <div className="card card-clean p-6 text-center text-[var(--muted)] text-sm">
                No {posFilter === 'archived' ? 'archived' : 'active'} positions
              </div>
            )}
          </div>
        </section>
      )}

      {/* Creator Positions */}
      {connected && !isLoading && hasCreatorPositions && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-bold text-lg">Creator Dashboard</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--hazard-orange)]/15 text-[var(--hazard-orange)] font-bold">
                {filteredCreator.length}
              </span>
            </div>
            {creatorArchivedCount > 0 && (
              <div className="flex items-center gap-1">
                {(['active', 'archived', 'all'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCreatorFilter(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      creatorFilter === f
                        ? 'bg-[var(--hazard-orange)]/20 text-[var(--hazard-orange)]'
                        : 'text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    {f === 'active' ? `Active (${creatorActiveCount})` : f === 'archived' ? `Archived (${creatorArchivedCount})` : `All (${creatorPositions.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {filteredCreator.length > 0 ? filteredCreator.map((pos) => (
              <CreatorPositionCard key={pos.sovereignId} position={pos} />
            )) : (
              <div className="card card-clean p-6 text-center text-[var(--muted)] text-sm">
                No {creatorFilter === 'archived' ? 'archived' : 'active'} sovereigns
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
