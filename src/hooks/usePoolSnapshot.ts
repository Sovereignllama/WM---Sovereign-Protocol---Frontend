import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const POOL_API_URL = process.env.NEXT_PUBLIC_POOL_PRICE_SERVICE_URL || 'http://localhost:3015';

// ============================================================
// Types matching backend SovereignPoolSnapshot
// ============================================================

export interface BinSnapshot {
  index: number;
  tokens: string;
  gorLocked: string;
  status: number;      // 0=Empty, 1=Partial, 2=Filled
  feeCredit: string;
  originalCapacity: string;
}

export interface PoolSnapshot {
  sovereignId: number;
  sovereignPubkey: string;
  poolPubkey: string;

  poolStatus: string;
  isPaused: boolean;

  gorReserve: string;
  tokenReserve: string;
  initialGorReserve: string;
  totalTokenSupply: string;
  totalTokensSold: string;

  numBins: number;
  binCapacity: string;
  activeBin: number;
  highestAllocatedPage: number;

  swapFeeBps: number;
  creatorFeeShareBps: number;
  binFeeShareBps: number;
  totalFeesCollected: string;
  lpFeesAccumulated: string;
  creatorFeesAccumulated: string;
  lpFeesClaimed: string;
  creatorFeesClaimed: string;
  totalBinFeesDistributed: string;

  recoveryTarget: string;
  totalRecovered: string;
  recoveryComplete: boolean;

  lastPrice: string;
  totalVolumeBuy: string;
  totalVolumeSell: string;
  totalTrades: number;

  initialNumBins: number;
  extensionDivisor: number;
  extensionEnabled: boolean;

  spotPrice: number;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  priceChange24h: number;

  fetchedAt: string;
}

export interface PoolBinsResponse {
  sovereignId: number;
  poolPubkey: string;
  activeBin: number;
  numBins: number;
  spotPrice: number;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  fetchedAt: string;
  totalBins: number;
  bins: BinSnapshot[];
}

// ============================================================
// Fetchers
// ============================================================

async function fetchPoolSnapshot(sovereignId: number): Promise<PoolSnapshot> {
  const res = await fetch(`${POOL_API_URL}/api/sovereign-pools/${sovereignId}`);
  if (!res.ok) throw new Error(`Failed to fetch pool snapshot: ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function fetchPoolBins(
  sovereignId: number,
  options?: { status?: number; from?: number; to?: number },
): Promise<PoolBinsResponse> {
  const params = new URLSearchParams();
  if (options?.status !== undefined) params.set('status', options.status.toString());
  if (options?.from !== undefined) params.set('from', options.from.toString());
  if (options?.to !== undefined) params.set('to', options.to.toString());

  const qs = params.toString();
  const url = `${POOL_API_URL}/api/sovereign-pools/${sovereignId}/bins${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pool bins: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/** Fetch all pool snapshots (summary, no bins). Returns a map keyed by sovereignId. */
async function fetchAllPoolSnapshots(): Promise<Record<number, PoolSnapshot>> {
  const res = await fetch(`${POOL_API_URL}/api/sovereign-pools`);
  if (!res.ok) throw new Error(`Failed to fetch pool snapshots: ${res.status}`);
  const json = await res.json();
  const map: Record<number, PoolSnapshot> = {};
  for (const snap of (json.data || [])) {
    map[snap.sovereignId] = snap;
  }
  return map;
}

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch the latest pool snapshot for a sovereign (excludes bins).
 * Auto-refreshes every 30s to match the backend polling interval.
 */
export function usePoolSnapshot(sovereignId: number | undefined) {
  return useQuery({
    queryKey: ['poolSnapshot', sovereignId],
    queryFn: () => fetchPoolSnapshot(sovereignId!),
    enabled: !!sovereignId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/**
 * Fetch bin-level data for a sovereign's engine pool.
 * Supports optional filters: status (0/1/2), from/to bin index.
 */
export function usePoolBins(
  sovereignId: number | undefined,
  options?: { status?: number; from?: number; to?: number },
) {
  return useQuery({
    queryKey: ['poolBins', sovereignId, options],
    queryFn: () => fetchPoolBins(sovereignId!, options),
    enabled: !!sovereignId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/**
 * Fetch all pool snapshots as a map keyed by sovereignId.
 * Used by list/landing pages to show 24hr price change for every pool at once.
 */
export function useAllPoolSnapshots() {
  return useQuery({
    queryKey: ['allPoolSnapshots'],
    queryFn: fetchAllPoolSnapshots,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
