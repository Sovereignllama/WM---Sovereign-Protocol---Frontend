'use client';

import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { config } from '@/lib/config';

// ============================================================
// Types
// ============================================================

export interface TrackedToken {
  poolAddress: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImage: string;
  tokenDecimals: number;
  currentPrice: number;
  isVerified: boolean;
  /** Wallet balance in human-readable units (set by cross-referencing on-chain data) */
  walletBalance?: number;
  /** Raw balance in token base units */
  walletBalanceRaw?: bigint;
}

// SPL Token & Token-2022 program IDs for fetching wallet balances
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// ============================================================
// Fetch tracked pools from the pool-price-worker
// ============================================================

async function fetchTrackedPools(): Promise<TrackedToken[]> {
  const res = await fetch(`${config.poolPriceWorkerUrl}/api/pools`);
  if (!res.ok) throw new Error('Failed to fetch tracked pools');
  const data = await res.json();

  // The API returns an array of pool objects
  const pools: any[] = Array.isArray(data) ? data : data.pools ?? data.data ?? [];

  return pools
    .filter((p: any) => p.tokenMint && p.isActive !== false)
    .map((p: any) => ({
      poolAddress: p.poolAddress || '',
      tokenMint: p.tokenMint,
      tokenSymbol: p.tokenSymbol || '',
      tokenName: p.tokenName || '',
      tokenImage: p.tokenImage || '',
      tokenDecimals: p.tokenDecimals ?? 9,
      currentPrice: p.currentPrice ?? 0,
      isVerified: !!p.isVerified,
    }));
}

// ============================================================
// Hook: useTrackedTokens
// ============================================================

/**
 * Fetches all tokens tracked by the pool-price-worker and
 * cross-references with the connected wallet's token balances.
 */
export function useTrackedTokens() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  // 1. Fetch the tracked pool list (cached 60s)
  const poolsQuery = useQuery({
    queryKey: ['trackedPools'],
    queryFn: fetchTrackedPools,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // 2. Fetch wallet token balances for both SPL and Token-2022
  const balancesQuery = useQuery({
    queryKey: ['walletTokenBalances', publicKey?.toBase58()],
    queryFn: async (): Promise<Record<string, { raw: bigint; decimals: number }>> => {
      if (!publicKey) return {};

      const balances: Record<string, { raw: bigint; decimals: number }> = {};

      // Helper to parse token account data from raw bytes
      const parseAccounts = (accounts: readonly { account: { data: any } }[]) => {
        for (const { account } of accounts) {
          let data: Buffer;
          if (Array.isArray(account.data)) {
            data = Buffer.from(account.data[0], 'base64');
          } else if (typeof account.data === 'string') {
            data = Buffer.from(account.data, 'base64');
          } else {
            data = account.data as Buffer;
          }
          if (data.length < 72) continue;
          const mint = new PublicKey(data.slice(0, 32)).toBase58();
          const rawAmount = data.readBigUInt64LE(64);
          if (rawAmount > 0n) {
            balances[mint] = { raw: rawAmount, decimals: 0 }; // decimals filled later
          }
        }
      };

      try {
        const [splAccounts, t22Accounts] = await Promise.all([
          connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
          connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed'),
        ]);
        parseAccounts(splAccounts.value);
        parseAccounts(t22Accounts.value);
      } catch (err) {
        console.error('Failed to fetch wallet token balances:', err);
      }

      return balances;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: connected && !!publicKey,
  });

  // 3. Merge pools + balances
  const tokens: TrackedToken[] = (poolsQuery.data ?? []).map((token) => {
    const bal = balancesQuery.data?.[token.tokenMint];
    if (bal) {
      const decimals = token.tokenDecimals || 9;
      return {
        ...token,
        walletBalance: Number(bal.raw) / 10 ** decimals,
        walletBalanceRaw: bal.raw,
      };
    }
    return token;
  });

  return {
    tokens,
    isLoading: poolsQuery.isLoading,
    error: poolsQuery.error,
    /** All wallet token balances (including ones not in the tracker) */
    walletBalances: balancesQuery.data ?? {},
  };
}
