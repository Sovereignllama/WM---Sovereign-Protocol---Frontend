'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SovereignDisplayData } from '@/types/sovereign';
import { PublicKey } from '@solana/web3.js';
import { useSovereigns, useProtocolState, useProtocolStats, useAllPoolSnapshots } from '@/hooks';
import { useTokenImage } from '@/hooks/useTokenImage';
import { LAMPORTS_PER_GOR } from '@/lib/config';

/** Tiny image component for the ticker — fetches token image from metadata URI */
function TickerTokenImage({ metadataUri, symbol }: { metadataUri?: string; symbol?: string }) {
  const { data: imageUrl } = useTokenImage(metadataUri);
  if (imageUrl) {
    return <img src={imageUrl} alt={symbol || ''} className="w-8 h-8 rounded-full object-cover border border-[var(--border)] flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold flex-shrink-0">
      {(symbol || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function LandingPage() {
  const { data: sovereignsData, isLoading: sovereignsLoading } = useSovereigns();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const { data: backendStats } = useProtocolStats();
  const { data: poolSnapshots } = useAllPoolSnapshots();

  // Transform to display format
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
      tokenSupplyDeposited: BigInt(0),
      tokenTotalSupply: BigInt(0),
      bondTarget: BigInt(s.bondTarget),
      bondDeadline: s.bondDeadline,
      bondDurationDays: 14,
      status: s.status,
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
      recoveryComplete: s.recoveryComplete,
      unwindSolBalance: BigInt(0),
      unwindTokenBalance: BigInt(0),
      activityCheckInitiated: false,
      autoUnwindPeriod: 90 * 24 * 60 * 60,
      metadataUri: s.metadataUri || '',
      bondProgress: s.bondingProgress,
      recoveryProgress: s.recoveryProgress,
      bondTargetSol: s.bondTargetGor,
      totalDepositedSol: s.totalDepositedGor,
      recoveryTargetSol: s.recoveryTargetGor,
    }));
  }, [sovereignsData]);

  // Trending: Active/Recovery first, sorted by depositor count, then by total raised
  const trending = useMemo(() => {
    if (!sovereigns.length) return [];
    const excludedStatuses = ['Halted', 'Unwound', 'Retired'];
    return [...sovereigns]
      .filter(s => !excludedStatuses.includes(s.status))
      .sort((a, b) => {
        const statusOrder = (s: string) => {
          if (s === 'Active') return 0;
          if (s === 'Recovery') return 1;
          if (s === 'Bonding') return 2;
          return 3;
        };
        const diff = statusOrder(a.status) - statusOrder(b.status);
        if (diff !== 0) return diff;
        if (b.depositorCount !== a.depositorCount) return b.depositorCount - a.depositorCount;
        return b.totalDepositedSol - a.totalDepositedSol;
      })
      .slice(0, 6);
  }, [sovereigns]);

  // Protocol-wide stats — engine pool snapshots are the authoritative source for volume/fees
  const stats = useMemo(() => {
    const totalSovereigns = sovereigns.length;
    const LAMPORTS = LAMPORTS_PER_GOR;

    // Aggregate from engine pool snapshots (polled every 30s, straight from on-chain)
    let totalVolumeGor = 0;
    let totalFeesGor = 0;

    if (poolSnapshots) {
      for (const snap of Object.values(poolSnapshots)) {
        totalVolumeGor += (Number(snap.totalVolumeBuy || '0') + Number(snap.totalVolumeSell || '0')) / LAMPORTS;
        totalFeesGor += Number(snap.totalFeesCollected || '0') / LAMPORTS;
      }
    }

    // Fallback: use backend stats if pool snapshots aren't loaded yet
    if (!poolSnapshots && backendStats) {
      totalVolumeGor = backendStats.totalTradingVolumeGor;
      totalFeesGor = backendStats.totalFeesDistributedGor;
    }

    return { totalSovereigns, totalVolumeGor, totalFeesGor };
  }, [sovereigns, poolSnapshots, backendStats]);

  const isLoading = sovereignsLoading || protocolLoading;

  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="h-10 md:h-14" aria-hidden="true" />
          <p
            className="text-lg max-w-2xl mx-auto mb-6"
            style={{
              color: '#8fbfa8',
              textShadow: '0 0 12px rgba(46,235,127,0.15)',
            }}
          >
            Vibe the Dream. Liquidify the Token. Become <span style={{ color: 'var(--money-green)', textShadow: '0 0 8px rgba(46,235,127,0.7), 0 0 20px rgba(46,235,127,0.4)' }}>$</span>overeign.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/mint" className="btn btn-primary btn-lg">
              Launch a $overeign
            </Link>
            <Link href="/sovereigns" className="btn btn-outline btn-lg">
              Browse All
            </Link>
          </div>
        </div>

        {/* Trending Sovereigns Ticker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="h2" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>Trending $overeigns</h2>
            <Link href="/sovereigns" className="text-sm text-[var(--money-green)] hover:underline">
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="card card-clean text-center py-12">
              <p className="text-[var(--muted)]">Loading from chain...</p>
            </div>
          ) : trending.length > 0 ? (
            <div className="relative overflow-hidden rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10" style={{ background: 'linear-gradient(to right, var(--surface), transparent)' }} />
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10" style={{ background: 'linear-gradient(to left, var(--surface), transparent)' }} />
              {/* Scrolling ticker */}
              <div className="ticker-track py-3">
                {/* Duplicate items for seamless loop */}
                {[...trending, ...trending].map((sovereign, i) => (
                  <Link
                    key={`${sovereign.sovereignId}-${i}`}
                    href={`/sovereign/${sovereign.sovereignId}`}
                    className="flex items-center gap-3 px-5 flex-shrink-0 hover:opacity-80 transition-opacity"
                    style={{ minWidth: '280px' }}
                  >
                    <TickerTokenImage metadataUri={sovereign.metadataUri} symbol={sovereign.tokenSymbol} />
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm truncate max-w-[160px]">
                        {sovereign.name}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        #{sovereign.sovereignId.toString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end ml-auto">
                      {['Recovery', 'Active'].includes(sovereign.status) ? (
                        <>
                          {(() => {
                            const change = poolSnapshots?.[Number(sovereign.sovereignId)]?.priceChange24h;
                            if (change != null && change !== 0) {
                              return (
                                <span className={`text-sm font-bold ${change > 0 ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
                                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                </span>
                              );
                            }
                            return <span className="text-sm font-bold text-[var(--muted)]">—</span>;
                          })()}
                          <span className="text-[10px] text-[var(--muted)]">
                            {(() => {
                              const snap = poolSnapshots?.[Number(sovereign.sovereignId)];
                              const fees = snap ? Number(snap.totalFeesCollected) / LAMPORTS_PER_GOR : 0;
                              return `${fees.toFixed(2)} GOR fees`;
                            })()}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold" style={{ color: 'var(--money-green)' }}>
                            {sovereign.totalDepositedSol.toFixed(2)} GOR
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">
                            {sovereign.bondProgress?.toFixed(0) || '0'}% bonded
                          </span>
                        </>
                      )}
                      <span className={`text-xs font-semibold ${
                        sovereign.status === 'Active' ? 'text-[var(--profit)]' :
                        sovereign.status === 'Recovery' ? 'text-[var(--money-green)]' :
                        sovereign.status === 'Bonding' ? 'text-[var(--slime)]' :
                        'text-[var(--muted)]'
                      }`}>
                        {sovereign.status}
                      </span>
                    </div>
                    {/* Separator */}
                    <span className="text-[var(--border)] ml-2">│</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="card card-clean text-center py-12">
              <p className="text-[var(--muted)]">No sovereigns yet. Be the first to launch!</p>
              <Link href="/mint" className="btn btn-primary mt-4">
                Launch Now
              </Link>
            </div>
          )}
        </div>

        {/* Protocol Stats Counters */}
        <div className="mb-8">
          <h2 className="h2 mb-4 text-center" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>Protocol Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card card-clean text-center py-6">
              <div className="text-3xl md:text-4xl font-black mb-1" style={{ color: 'var(--money-green)' }}>
                {isLoading ? '...' : stats.totalSovereigns}
              </div>
              <div className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider">
                $overeigns Launched
              </div>
            </div>
            <div className="card card-clean text-center py-6">
              <div className="text-3xl md:text-4xl font-black mb-1" style={{ color: 'var(--profit)' }}>
                {isLoading ? '...' : `${stats.totalVolumeGor.toLocaleString(undefined, { maximumFractionDigits: 1 })} GOR`}
              </div>
              <div className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider">
                Trading Volume
              </div>
            </div>
            <div className="card card-clean text-center py-6">
              <div className="text-3xl md:text-4xl font-black mb-1" style={{ color: 'var(--slime)' }}>
                {isLoading ? '...' : `${stats.totalFeesGor.toFixed(2)} GOR`}
              </div>
              <div className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider">
                Fees Generated
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card card-clean mb-8">
          <h2 className="h2 mb-6 text-center" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="text-white font-bold mb-2">1. Launch</h3>
              <p className="text-[var(--muted)] text-sm">
                Create your token or bring your own, set your funding goal, and rally Liquidity Providers behind your vision.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold mb-2">2. Recover</h3>
              <p className="text-[var(--muted)] text-sm">
                LPers deposit GOR, establish the price floor, and collect 100% of trading fees until your principal is fully returned.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold mb-2">3. Earn</h3>
              <p className="text-[var(--muted)] text-sm">
                Once fully repaid, fees split between Liquidity Providers and creators. Passive income for all.
              </p>
            </div>
          </div>
        </div>

        {/* Read Docs CTA */}
        <div className="text-center mb-8">
          <Link href="/docs" className="text-[var(--money-green)] hover:underline font-bold">
            Read our docs to learn more →
          </Link>
        </div>

      </div>
    </div>
  );
}
