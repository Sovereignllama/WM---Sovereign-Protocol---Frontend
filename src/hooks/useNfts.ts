import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from './useProgram';
import { fetchMyNftPositionsOnChain } from '@/lib/program/client';
import { LAMPORTS_PER_GOR } from '@/lib/config';

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

async function fetchMyNftsFromBackend(
  sovereignPubkey: string,
  ownerPubkey: string
): Promise<GenesisNftData[]> {
  const res = await fetch(
    `${API_URL}/api/nfts?sovereign=${sovereignPubkey}&owner=${ownerPubkey}&limit=100`
  );
  if (!res.ok) throw new Error(`Failed to fetch my NFTs: ${res.status}`);
  const json = await res.json();
  return json.data || [];
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

/**
 * Fetch NFTs owned by a specific wallet for a specific sovereign.
 *
 * Primary: backend API (fast, indexed).
 * Fallback: on-chain gPA + token ownership check (always accurate).
 *
 * If the backend returns results, use them. If it returns empty or fails,
 * try on-chain as a secondary source.
 */
export function useMyNftsForSovereign(
  sovereignPubkey: string | undefined,
  ownerPubkey: string | undefined
) {
  const program = useProgram();

  return useQuery({
    queryKey: ['myNftsForSovereign', sovereignPubkey, ownerPubkey],
    queryFn: async (): Promise<GenesisNftData[]> => {
      // ── Primary: backend API ──
      try {
        const backendResult = await fetchMyNftsFromBackend(sovereignPubkey!, ownerPubkey!);
        if (backendResult.length > 0) return backendResult;
      } catch (err) {
        console.warn('[useMyNftsForSovereign] Backend fetch failed, trying on-chain:', err);
      }

      // ── Secondary: on-chain ──
      if (!program) return [];

      try {
        const positions = await fetchMyNftPositionsOnChain(
          program,
          new PublicKey(sovereignPubkey!),
          new PublicKey(ownerPubkey!),
        );

        // Map on-chain NftPosition → GenesisNftData shape for UI compatibility
        return positions.map((pos: any) => ({
          _id: pos.publicKey.toBase58(),
          mint: pos.account.nftMint.toBase58(),
          owner: ownerPubkey!,
          sovereign: sovereignPubkey!,
          deposit: pos.account.mintedFrom.toBase58(),
          sharesBps: pos.account.positionBps,
          depositAmount: pos.account.amount.toString(),
          name: `$overeign NFT #${pos.account.nftNumber.toString()}`,
          symbol: 'GSLP',
          mintedAt: new Date(pos.account.mintedAt.toNumber() * 1000).toISOString(),
          createdAt: new Date(pos.account.mintedAt.toNumber() * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        } as GenesisNftData));
      } catch (err) {
        console.error('[useMyNftsForSovereign] On-chain fetch also failed:', err);
        return [];
      }
    },
    enabled: !!sovereignPubkey && !!ownerPubkey,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
