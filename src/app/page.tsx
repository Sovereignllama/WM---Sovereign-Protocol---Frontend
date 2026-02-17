'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { SovereignList } from '@/components/SovereignList';
import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { PublicKey } from '@solana/web3.js';
import { useSovereigns, useProtocolState } from '@/hooks';
import { LAMPORTS_PER_GOR } from '@/lib/config';

type FilterType = SovereignStatus | 'all' | 'lowVolume';

export default function SovereignsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Fetch real data from on-chain
  const { data: sovereignsData, isLoading: sovereignsLoading, error: sovereignsError } = useSovereigns();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();

  const filters: { value: FilterType; label: string }[] = [
    { value: 'Bonding', label: 'Bonding' },
    { value: 'Recovery', label: 'Recovery' },
    { value: 'Active', label: 'Active' },
    { value: 'lowVolume', label: 'Low Volume' },
    { value: 'all', label: 'All' },
  ];

  // Transform on-chain data to display format
  const sovereigns: SovereignDisplayData[] = useMemo(() => {
    if (!sovereignsData) return [];
    
    return sovereignsData.map((s: any) => ({
      sovereignId: BigInt(s.sovereignId),
      publicKey: new PublicKey(s.publicKey),
      name: s.name || `Sovereign #${s.sovereignId}`,
      creator: new PublicKey(s.creator),
      tokenMint: new PublicKey(s.tokenMint),
      sovereignType: s.sovereignType as 'TokenLaunch' | 'BYOToken',
      tokenSymbol: s.tokenSymbol || undefined,
      tokenName: s.tokenName || undefined,
      tokenDecimals: 9,
      tokenSupplyDeposited: BigInt(0), // TODO: Add to query
      tokenTotalSupply: BigInt(0),
      bondTarget: BigInt(s.bondTarget),
      bondDeadline: s.bondDeadline,
      bondDurationDays: 14, // TODO: Calculate from on-chain
      status: s.status as SovereignStatus,
      totalDeposited: BigInt(s.totalDeposited),
      depositorCount: s.depositorCount,
      sellFeeBps: s.sellFeeBps,
      swapFeeBps: s.swapFeeBps ?? 30,
      creationFeeEscrowed: BigInt(0),
      creatorEscrow: BigInt(0),
      creatorMaxBuyBps: 100,
      totalSolFeesCollected: BigInt(s.totalFeesCollected || 0),
      totalSolFeesDistributed: BigInt(s.totalRecovered || 0),
      totalTokenFeesCollected: BigInt(0),
      recoveryTarget: BigInt(s.recoveryTarget),
      recoveryComplete: s.recoveryComplete,
      unwindSolBalance: BigInt(0),
      unwindTokenBalance: BigInt(0),
      activityCheckInitiated: false, // TODO: Add to query
      autoUnwindPeriod: 90 * 24 * 60 * 60,
      // Computed fields
      bondProgress: s.bondingProgress,
      recoveryProgress: s.recoveryProgress,
      bondTargetSol: s.bondTargetGor,
      totalDepositedSol: s.totalDepositedGor,
      recoveryTargetSol: s.recoveryTargetGor,
    }));
  }, [sovereignsData]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!sovereigns.length) {
      return {
        totalRaised: 0,
        feesDistributed: 0,
        activePools: 0,
        totalDepositors: 0,
      };
    }
    
    return {
      totalRaised: sovereigns.reduce((sum, s) => sum + s.totalDepositedSol, 0),
      feesDistributed: sovereigns.reduce((sum, s) => sum + Number(s.totalSolFeesDistributed) / LAMPORTS_PER_GOR, 0),
      activePools: sovereigns.filter(s => s.status === 'Active' || s.status === 'Recovery').length,
      totalDepositors: sovereigns.reduce((sum, s) => sum + s.depositorCount, 0),
    };
  }, [sovereigns]);

  // Count by status
  const counts: Record<FilterType, number> = useMemo(() => ({
    all: sovereigns.length,
    Bonding: sovereigns.filter(s => s.status === 'Bonding').length,
    Finalizing: sovereigns.filter(s => s.status === 'Finalizing').length,
    PoolCreated: sovereigns.filter(s => s.status === 'PoolCreated').length,
    Recovery: sovereigns.filter(s => s.status === 'Recovery').length,
    Active: sovereigns.filter(s => s.status === 'Active').length,
    Unwinding: sovereigns.filter(s => s.status === 'Unwinding').length,
    Unwound: sovereigns.filter(s => s.status === 'Unwound').length,
    Failed: sovereigns.filter(s => s.status === 'Failed').length,
    EmergencyUnlocked: sovereigns.filter(s => s.status === 'EmergencyUnlocked').length,
    Retired: sovereigns.filter(s => s.status === 'Retired').length,
    lowVolume: sovereigns.filter(s => s.activityCheckInitiated).length,
  }), [sovereigns]);

  const isLoading = sovereignsLoading || protocolLoading;

  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="h1 mb-2" style={{ color: 'var(--text-light)' }}>$overeigns</h1>
          <p className="text-[var(--muted)]">
            Browse bonding, active, and unwinding $overeigns.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat money">
            <div className="k">Total Raised</div>
            <div className="v">{isLoading ? '...' : `${stats.totalRaised.toFixed(2)} GOR`}</div>
          </div>
          <div className="stat profit">
            <div className="k">Fees Distributed</div>
            <div className="v">{isLoading ? '...' : `${stats.feesDistributed.toFixed(2)} GOR`}</div>
          </div>
          <div className="stat">
            <div className="k">Active Pools</div>
            <div className="v">{isLoading ? '...' : stats.activePools}</div>
          </div>
          <div className="stat">
            <div className="k">Total Depositors</div>
            <div className="v">{isLoading ? '...' : stats.totalDepositors}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`btn btn-sm whitespace-nowrap ${
                filter === f.value ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {f.label}
              {counts[f.value] > 0 && (
                <span className="ml-1 opacity-70">({counts[f.value]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="card card-clean text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">👑</div>
            <p className="text-[var(--muted)]">Loading sovereigns from chain...</p>
          </div>
        )}

        {/* Error State */}
        {sovereignsError && (
          <div className="card card-clean text-center py-12 border-[var(--loss)]">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-[var(--loss)]">Failed to load sovereigns</p>
            <p className="text-[var(--muted)] text-sm mt-2">
              {sovereignsError instanceof Error ? sovereignsError.message : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Sovereign List */}
        {!isLoading && !sovereignsError && (
          <SovereignList 
            sovereigns={sovereigns} 
            filter={filter}
            emptyMessage={sovereigns.length === 0 
              ? 'No sovereigns created yet. Be the first to launch!' 
              : `No ${filter === 'all' ? '' : filter.toLowerCase()} sovereigns found`
            }
          />
        )}
      </div>
    </div>
  );
}
