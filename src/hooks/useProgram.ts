'use client';

import { useMemo } from 'react';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { config } from '@/lib/config';
import { getProgram, getEngineProgram, SovereignLiquidityProgram, SovereignEngineProgram } from '@/lib/program/client';
import { SovereignLiquidityIDL, SovereignEngineIDL } from '@/lib/program/idl';

/**
 * Hook to get the Anchor Provider
 */
export function useAnchorProvider() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!anchorWallet) {
      return null;
    }
    return new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
  }, [connection, anchorWallet]);

  return provider;
}

/**
 * Hook to get the Sovereign Liquidity Program instance
 */
export function useProgram(): SovereignLiquidityProgram | null {
  const provider = useAnchorProvider();

  const program = useMemo(() => {
    if (!provider) {
      return null;
    }
    return getProgram(provider);
  }, [provider]);

  return program;
}

/**
 * Hook to get the Sovereign Engine Program instance
 */
export function useEngineProgram(): SovereignEngineProgram | null {
  const provider = useAnchorProvider();

  const program = useMemo(() => {
    if (!provider) {
      return null;
    }
    return getEngineProgram(provider);
  }, [provider]);

  return program;
}

/**
 * Hook to get read-only program (doesn't require wallet connection)
 */
export function useReadOnlyProgram(): SovereignLiquidityProgram {
  const { connection } = useConnection();

  const program = useMemo(() => {
    // Create a read-only provider with a dummy wallet
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async <T extends Transaction>(tx: T): Promise<T> => tx,
      signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => txs,
    };

    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: 'confirmed',
    });

    return new Program(SovereignLiquidityIDL as Idl, provider);
  }, [connection]);

  return program;
}

/**
 * Hook to get read-only engine program (doesn't require wallet connection)
 */
export function useReadOnlyEngineProgram(): SovereignEngineProgram {
  const { connection } = useConnection();

  const program = useMemo(() => {
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async <T extends Transaction>(tx: T): Promise<T> => tx,
      signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => txs,
    };

    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: 'confirmed',
    });

    return new Program(SovereignEngineIDL as Idl, provider);
  }, [connection]);

  return program;
}

/**
 * Hook that provides the connected wallet's public key
 */
export function useWalletAddress() {
  const { publicKey, connected } = useWallet();
  
  return {
    publicKey,
    connected,
    address: publicKey?.toBase58() ?? null,
  };
}

/**
 * Hook to check if wallet is connected and ready to sign
 */
export function useWalletReady() {
  const { publicKey, connected, signTransaction } = useWallet();
  
  return {
    ready: connected && !!publicKey && !!signTransaction,
    publicKey,
  };
}
