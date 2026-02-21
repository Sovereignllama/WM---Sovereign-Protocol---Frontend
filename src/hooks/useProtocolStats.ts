import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LAMPORTS_PER_GOR = 1_000_000_000;

export interface ProtocolStats {
  totalSovereigns: number;
  byStatus: {
    bonding: number;
    recovery: number;
    active: number;
    failed: number;
    unwound: number;
  };
  totalRaisedLamports: string;
  totalFeesDistributedLamports: string;
  totalTradingVolumeLamports: string;
  totalTradeCount: number;
  // Formatted
  totalRaisedGor: number;
  totalFeesDistributedGor: number;
  totalTradingVolumeGor: number;
}

async function fetchProtocolStats(): Promise<ProtocolStats> {
  const res = await fetch(`${API_URL}/api/sovereigns/stats`);
  if (!res.ok) throw new Error(`Failed to fetch protocol stats: ${res.status}`);
  const data = await res.json();
  return {
    ...data,
    totalRaisedGor: Number(data.totalRaisedLamports || '0') / LAMPORTS_PER_GOR,
    totalFeesDistributedGor: Number(data.totalFeesDistributedLamports || '0') / LAMPORTS_PER_GOR,
    totalTradingVolumeGor: Number(data.totalTradingVolumeLamports || '0') / LAMPORTS_PER_GOR,
  };
}

export function useProtocolStats() {
  return useQuery({
    queryKey: ['protocolStats'],
    queryFn: fetchProtocolStats,
    staleTime: 15_000, // 15 seconds
    refetchInterval: 30_000, // Auto-refresh every 30s
  });
}
