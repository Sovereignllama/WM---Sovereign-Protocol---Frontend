'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';

// ============================================================
// CONFIGURATION
// ============================================================

const TRADING_SERVICE_URL = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:3002';

// ============================================================
// TYPES
// ============================================================

export interface SwapQuote {
  poolAddress: string;
  tokenMint: string;
  amountIn: string;
  estimatedAmountOut: string;
  minimumAmountOut: string;
  priceImpact: string;
  slippage: number;
  fee: string;
  dexType: string;
  currentPrice: string;
  poolInfo: {
    tokenMint0: string;
    tokenMint1: string;
    tokenVault0: string;
    tokenVault1: string;
    liquidity: string;
    sqrtPriceX64: string;
    tickCurrent: number;
    status: number;
  };
}

export interface SwapResult {
  transaction: string;
  expectedOut: string;
  minimumOut: string;
  priceImpact: string;
  fee: string;
  blockhash: string;
  lastValidBlockHeight: number;
  poolType: string;
  direction: string;
}

export interface PoolInfo {
  poolAddress: string;
  tokenMint0: string;
  tokenMint1: string;
  gorReserve: number;
  tokenReserve: number;
  gorPerToken: number;
  tokenPerGor: number;
  tickCurrent: number;
  liquidity: string;
  status: number;
  dexType: string;
}

// ============================================================
// FETCH HELPERS
// ============================================================

async function fetchQuote(params: {
  poolAddress: string;
  tokenMint: string;
  amount: string;
  slippage: number;
  direction: 'buy' | 'sell';
}): Promise<SwapQuote> {
  const qs = new URLSearchParams({
    poolAddress: params.poolAddress,
    tokenMint: params.tokenMint,
    amount: params.amount,
    slippage: params.slippage.toString(),
    direction: params.direction,
  });

  const res = await fetch(`${TRADING_SERVICE_URL}/api/sovereign/swap/quote?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.details || err.error || `Quote failed: ${res.status}`);
  }
  return res.json();
}

async function fetchSwapTransaction(params: {
  poolAddress: string;
  walletAddress: string;
  tokenMint: string;
  amount: string;
  slippageBps: number;
  direction: 'buy' | 'sell';
}): Promise<SwapResult> {
  const res = await fetch(`${TRADING_SERVICE_URL}/api/sovereign/swap/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.details || err.error || `Transaction build failed: ${res.status}`);
  }
  return res.json();
}

async function sendSignedTransaction(signedTransaction: string): Promise<{ success: boolean; signature: string }> {
  const res = await fetch(`${TRADING_SERVICE_URL}/api/sovereign/swap/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.details || err.error || `Send failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchPoolInfo(poolAddress: string): Promise<PoolInfo> {
  const res = await fetch(`${TRADING_SERVICE_URL}/api/sovereign/pool/${poolAddress}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.details || err.error || `Pool info failed: ${res.status}`);
  }
  return res.json();
}

// ============================================================
// HOOK: useSwapQuote
// ============================================================

export function useSwapQuote(params: {
  poolAddress: string | null;
  tokenMint: string | null;
  amount: string;
  slippage: number;
  direction: 'buy' | 'sell';
  enabled?: boolean;
}) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchQuoteDebounced = useCallback(async () => {
    if (!params.poolAddress || !params.tokenMint || !params.amount || params.amount === '0') {
      setQuote(null);
      setError(null);
      return;
    }

    if (params.enabled === false) return;

    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuote({
        poolAddress: params.poolAddress,
        tokenMint: params.tokenMint,
        amount: params.amount,
        slippage: params.slippage,
        direction: params.direction,
      });
      setQuote(q);
    } catch (e: any) {
      setError(e.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [params.poolAddress, params.tokenMint, params.amount, params.slippage, params.direction, params.enabled]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchQuoteDebounced, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchQuoteDebounced]);

  return { quote, loading, error, refetch: fetchQuoteDebounced };
}

// ============================================================
// HOOK: useSwap
// ============================================================

export function useSwap() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const executeSwap = useCallback(async (params: {
    poolAddress: string;
    tokenMint: string;
    amount: string;
    slippageBps: number;
    direction: 'buy' | 'sell';
  }) => {
    if (!publicKey || !signTransaction || !connected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // 1. Build transaction via trading service
      const result = await fetchSwapTransaction({
        ...params,
        walletAddress: publicKey.toBase58(),
      });

      // 2. Deserialize and sign
      const txBuffer = Buffer.from(result.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);
      const signed = await signTransaction(transaction);

      // 3. Send via trading service (or directly)
      const serialized = signed.serialize().toString('base64');
      const sendResult = await sendSignedTransaction(serialized);

      setTxSignature(sendResult.signature);
      return sendResult;
    } catch (e: any) {
      console.error('[useSwap] Error:', e);
      setError(e.message || 'Swap failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connected]);

  const reset = useCallback(() => {
    setError(null);
    setTxSignature(null);
  }, []);

  return {
    executeSwap,
    loading,
    error,
    txSignature,
    reset,
  };
}

// ============================================================
// HOOK: usePoolInfo
// ============================================================

export function usePoolInfo(poolAddress: string | null) {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolAddress || poolAddress === '11111111111111111111111111111111') {
      setPoolInfo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPoolInfo(poolAddress)
      .then((info) => {
        if (!cancelled) setPoolInfo(info);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [poolAddress]);

  return { poolInfo, loading, error };
}
