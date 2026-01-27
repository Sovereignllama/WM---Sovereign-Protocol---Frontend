'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SovereignList } from '@/components/SovereignList';
import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { PublicKey } from '@solana/web3.js';

// Mock data for display - will be replaced with actual blockchain data
const mockSovereigns: SovereignDisplayData[] = [
  {
    sovereignId: BigInt(1),
    publicKey: PublicKey.default,
    name: 'Degen Launch',
    creator: PublicKey.default,
    tokenMint: PublicKey.default,
    sovereignType: 'TokenLaunch',
    tokenSymbol: 'DEGEN',
    tokenName: 'Degen Token',
    tokenDecimals: 9,
    tokenSupplyDeposited: BigInt(1000000000000000),
    tokenTotalSupply: BigInt(1000000000000000),
    bondTarget: BigInt(100000000000), // 100 GOR
    bondDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    bondDurationDays: 14,
    status: 'Bonding',
    totalDeposited: BigInt(65000000000), // 65 GOR
    depositorCount: 23,
    sellFeeBps: 200,
    swapFeeBps: 30,
    creationFeeEscrowed: BigInt(500000000),
    creatorEscrow: BigInt(0),
    creatorMaxBuyBps: 100,
    totalSolFeesCollected: BigInt(0),
    totalSolFeesDistributed: BigInt(0),
    totalTokenFeesCollected: BigInt(0),
    recoveryTarget: BigInt(0),
    recoveryComplete: false,
    unwindSolBalance: BigInt(0),
    unwindTokenBalance: BigInt(0),
    activityCheckInitiated: false,
    autoUnwindPeriod: 90 * 24 * 60 * 60,
    bondProgress: 65,
    recoveryProgress: 0,
    bondTargetSol: 100,
    totalDepositedSol: 65,
    recoveryTargetSol: 0,
  },
  {
    sovereignId: BigInt(2),
    publicKey: PublicKey.default,
    name: 'Moon Protocol',
    creator: PublicKey.default,
    tokenMint: PublicKey.default,
    sovereignType: 'TokenLaunch',
    tokenSymbol: 'MOON',
    tokenName: 'Moon Protocol Token',
    tokenDecimals: 9,
    tokenSupplyDeposited: BigInt(500000000000000),
    tokenTotalSupply: BigInt(500000000000000),
    bondTarget: BigInt(200000000000), // 200 GOR
    bondDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    bondDurationDays: 21,
    status: 'Recovery',
    totalDeposited: BigInt(200000000000), // 200 GOR
    depositorCount: 87,
    sellFeeBps: 150,
    swapFeeBps: 30,
    creationFeeEscrowed: BigInt(0),
    creatorEscrow: BigInt(0),
    creatorMaxBuyBps: 100,
    totalSolFeesCollected: BigInt(85000000000),
    totalSolFeesDistributed: BigInt(85000000000),
    totalTokenFeesCollected: BigInt(1500000000000),
    recoveryTarget: BigInt(200000000000),
    recoveryComplete: false,
    unwindSolBalance: BigInt(0),
    unwindTokenBalance: BigInt(0),
    activityCheckInitiated: false,
    autoUnwindPeriod: 90 * 24 * 60 * 60,
    bondProgress: 100,
    recoveryProgress: 42.5,
    bondTargetSol: 200,
    totalDepositedSol: 200,
    recoveryTargetSol: 200,
  },
  {
    sovereignId: BigInt(3),
    publicKey: PublicKey.default,
    name: 'Based Token',
    creator: PublicKey.default,
    tokenMint: PublicKey.default,
    sovereignType: 'BYOToken',
    tokenSymbol: 'BASED',
    tokenName: 'Based Token',
    tokenDecimals: 9,
    tokenSupplyDeposited: BigInt(300000000000000),
    tokenTotalSupply: BigInt(1000000000000000),
    bondTarget: BigInt(75000000000), // 75 GOR
    bondDeadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    bondDurationDays: 14,
    status: 'Active',
    totalDeposited: BigInt(75000000000), // 75 GOR
    depositorCount: 42,
    sellFeeBps: 0,
    swapFeeBps: 30,
    creationFeeEscrowed: BigInt(0),
    creatorEscrow: BigInt(0),
    creatorMaxBuyBps: 100,
    totalSolFeesCollected: BigInt(90000000000),
    totalSolFeesDistributed: BigInt(90000000000),
    totalTokenFeesCollected: BigInt(2000000000000),
    recoveryTarget: BigInt(75000000000),
    recoveryComplete: true,
    unwindSolBalance: BigInt(0),
    unwindTokenBalance: BigInt(0),
    activityCheckInitiated: false,
    autoUnwindPeriod: 90 * 24 * 60 * 60,
    bondProgress: 100,
    recoveryProgress: 100,
    bondTargetSol: 75,
    totalDepositedSol: 75,
    recoveryTargetSol: 75,
  },
];

type FilterType = SovereignStatus | 'all' | 'lowVolume';

export default function SovereignsPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filters: { value: FilterType; label: string }[] = [
    { value: 'Bonding', label: 'Bonding' },
    { value: 'Recovery', label: 'Recovery' },
    { value: 'Active', label: 'Active' },
    { value: 'lowVolume', label: 'Low Volume' },
    { value: 'all', label: 'All' },
  ];

  // Count by status
  const counts: Record<FilterType, number> = {
    all: mockSovereigns.length,
    Bonding: mockSovereigns.filter(s => s.status === 'Bonding').length,
    Recovery: mockSovereigns.filter(s => s.status === 'Recovery').length,
    Active: mockSovereigns.filter(s => s.status === 'Active').length,
    lowVolume: mockSovereigns.filter(s => s.activityCheckInitiated).length,
    Failed: mockSovereigns.filter(s => s.status === 'Failed').length,
    Unwound: mockSovereigns.filter(s => s.status === 'Unwound').length,
  };

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
            <div className="v">340 GOR</div>
          </div>
          <div className="stat profit">
            <div className="k">Fees Distributed</div>
            <div className="v">175 GOR</div>
          </div>
          <div className="stat">
            <div className="k">Active Pools</div>
            <div className="v">{counts.Active + counts.Recovery}</div>
          </div>
          <div className="stat">
            <div className="k">Total Depositors</div>
            <div className="v">152</div>
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

        {/* Sovereign List */}
        <SovereignList 
          sovereigns={mockSovereigns} 
          filter={filter}
          emptyMessage={`No ${filter === 'all' ? '' : filter.toLowerCase()} sovereigns found`}
        />
      </div>
    </div>
  );
}
