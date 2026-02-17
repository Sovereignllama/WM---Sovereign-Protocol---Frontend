'use client';

import { useSovereigns, useProtocolState } from '@/hooks';
import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { PublicKey } from '@solana/web3.js';

interface SovereignDataProviderProps {
  children: (data: {
    sovereigns: SovereignDisplayData[];
    protocolState: ReturnType<typeof useProtocolState>['data'] | null;
    isLoading: boolean;
    error: Error | null;
  }) => React.ReactNode;
}

/**
 * Converts chain data to display format
 */
function toDisplayData(chainSovereign: NonNullable<ReturnType<typeof useSovereigns>['data']>[number]): SovereignDisplayData {
  return {
    sovereignId: BigInt(chainSovereign.sovereignId),
    publicKey: new PublicKey(chainSovereign.publicKey),
    name: chainSovereign.name || `Sovereign #${chainSovereign.sovereignId}`,
    creator: new PublicKey(chainSovereign.creator),
    tokenMint: new PublicKey(chainSovereign.tokenMint),
    sovereignType: chainSovereign.sovereignType as 'TokenLaunch' | 'BYOToken',
    tokenSymbol: chainSovereign.tokenSymbol || undefined,
    tokenName: chainSovereign.tokenName || undefined,
    tokenDecimals: 9,
    tokenSupplyDeposited: BigInt(0),
    tokenTotalSupply: BigInt(0),
    bondTarget: BigInt(chainSovereign.bondTarget),
    bondDeadline: chainSovereign.bondDeadline,
    bondDurationDays: 14, // Default
    status: chainSovereign.status as SovereignStatus,
    totalDeposited: BigInt(chainSovereign.totalDeposited),
    depositorCount: chainSovereign.depositorCount,
    sellFeeBps: chainSovereign.sellFeeBps,
    swapFeeBps: chainSovereign.swapFeeBps ?? 30,
    creationFeeEscrowed: BigInt(0),
    creatorEscrow: BigInt(0),
    creatorMaxBuyBps: 100,
    totalSolFeesCollected: BigInt(0),
    totalSolFeesDistributed: BigInt(0),
    totalTokenFeesCollected: BigInt(0),
    recoveryTarget: BigInt(chainSovereign.recoveryTarget),
    recoveryComplete: chainSovereign.recoveryComplete,
    unwindSolBalance: BigInt(0),
    unwindTokenBalance: BigInt(0),
    activityCheckInitiated: false,
    autoUnwindPeriod: 90 * 24 * 60 * 60,
    metadataUri: chainSovereign.metadataUri || undefined,
    // Calculated display values
    bondProgress: chainSovereign.bondingProgress,
    recoveryProgress: chainSovereign.recoveryProgress,
    bondTargetSol: chainSovereign.bondTargetGor,
    totalDepositedSol: chainSovereign.totalDepositedGor,
    recoveryTargetSol: chainSovereign.recoveryTargetGor,
  };
}

/**
 * Provider component that fetches sovereign data from the blockchain
 */
export function SovereignDataProvider({ children }: SovereignDataProviderProps) {
  const { data: sovereigns, isLoading: sovereignsLoading, error: sovereignsError } = useSovereigns();
  const { data: protocolState, isLoading: protocolLoading, error: protocolError } = useProtocolState();

  const displayData = sovereigns?.map(toDisplayData) ?? [];
  const isLoading = sovereignsLoading || protocolLoading;
  const error = sovereignsError || protocolError || null;

  return (
    <>
      {children({
        sovereigns: displayData,
        protocolState: protocolState ?? null,
        isLoading,
        error: error as Error | null,
      })}
    </>
  );
}

/**
 * Loading skeleton for sovereign list
 */
export function SovereignListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card card-clean animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="h-6 w-32 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-24 bg-[var(--border)] rounded" />
            </div>
            <div className="h-6 w-20 bg-[var(--border)] rounded" />
          </div>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-24 bg-[var(--border)] rounded" />
              <div className="h-4 w-12 bg-[var(--border)] rounded" />
            </div>
            <div className="h-2 w-full bg-[var(--border)] rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat">
              <div className="h-4 w-16 bg-[var(--border)] rounded mb-1" />
              <div className="h-6 w-20 bg-[var(--border)] rounded" />
            </div>
            <div className="stat">
              <div className="h-4 w-16 bg-[var(--border)] rounded mb-1" />
              <div className="h-6 w-20 bg-[var(--border)] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error display for sovereign list
 */
export function SovereignListError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="card card-clean text-center py-12">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="h3 text-[var(--hazard-yellow)] mb-2">Failed to Load Sovereigns</h3>
      <p className="text-[var(--muted)] mb-4">
        {error.message || 'An error occurred while fetching data from the blockchain.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline">
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state when no sovereigns exist
 */
export function NoSovereigns() {
  return (
    <div className="card card-clean text-center py-12">
      <div className="text-4xl mb-4">👑</div>
      <h3 className="h3 text-white mb-2">No Sovereigns Yet</h3>
      <p className="text-[var(--muted)] mb-4">
        Be the first to create a sovereign and launch your token!
      </p>
      <a href="/mint" className="btn btn-primary">
        Create Sovereign
      </a>
    </div>
  );
}
