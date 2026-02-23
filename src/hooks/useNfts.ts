import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================
// Types matching backend GenesisNFT model
// ============================================================

export interface GenesisNftData {
  _id: string;
  mint: string;
  owner: string;
  sovereign: string;
  deposit: string;
  sharesBps: number;
  depositAmount: string;
  name: string;
  symbol: string;
  uri?: string;
  mintedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Fetchers
// ============================================================

async function fetchNftsBySovereign(sovereignPubkey: string): Promise<GenesisNftData[]> {
  const res = await fetch(`${API_URL}/api/nfts?sovereign=${sovereignPubkey}&limit=100`);
  if (!res.ok) throw new Error(`Failed to fetch NFTs: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

async function fetchNftCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API_URL}/api/nfts/counts`);
  if (!res.ok) throw new Error(`Failed to fetch NFT counts: ${res.status}`);
  return res.json();
}

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch all Genesis NFTs for a sovereign.
 * Returns the list of minted NFT positions.
 */
export function useSovereignNfts(sovereignPubkey: string | undefined) {
  return useQuery({
    queryKey: ['sovereignNfts', sovereignPubkey],
    queryFn: () => fetchNftsBySovereign(sovereignPubkey!),
    enabled: !!sovereignPubkey,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch NFT minted counts for ALL sovereigns (batch).
 * Returns a map of { sovereignPubkey: nftCount }.
 */
export function useNftCounts() {
  return useQuery({
    queryKey: ['nftCounts'],
    queryFn: fetchNftCounts,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
