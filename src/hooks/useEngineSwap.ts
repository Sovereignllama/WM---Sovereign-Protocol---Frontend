'use client';

import { useState, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from './useProgram';
import { buildSwapBuyTx, buildSwapSellTx } from '@/lib/program/client';
import { config } from '@/lib/config';

// ============================================================
// On-chain constants (match engine/math.rs V3)
// ============================================================

const PRICE_PRECISION = BigInt('1000000000');       // 1e9

// ============================================================
// Quote types
// ============================================================

export interface EngineQuote {
  /** Direction of the swap */
  direction: 'buy' | 'sell';
  /** Amount in (lamports for buy, token units for sell) */
  amountIn: bigint;
  /** Estimated output (token units for buy, lamports for sell) */
  estimatedOut: bigint;
  /** Minimum output after slippage */
  minimumOut: bigint;
  /** Fee in GOR lamports */
  fee: bigint;
  /** Effective fee in basis points */
  effectiveFeeBps: number;
  /** Weighted execution price (precision-scaled) */
  executionPrice: bigint;
  /** Current spot price for display (precision-scaled) */
  currentTierPrice: bigint;
}

// ============================================================
// V3 Pool State — CPAMM + BinArray settlement
// ============================================================

export interface PoolState {
  totalTokenSupply: string;
  tokenReserve: string;
  gorReserve: string;
  initialGorReserve: string;
  totalTokensSold: string;
  numBins: number;
  binCapacity: string;
  activeBin: number;
  swapFeeBps: number;
  binFeeShareBps: number;
  isPaused: boolean;
}

// ============================================================
// V3 Buy Quote — pure CPAMM (mirrors on-chain compute_buy)
// ============================================================

/**
 * Compute a buy quote: GOR → Tokens.
 * V3: CPAMM pricing — tokens_out = T × gor_in / (G + gor_in)
 * Fee charged on top of the CPAMM cost.
 */
export function computeBuyQuote(
  pool: PoolState,
  gorInput: bigint,
  slippageBps: number,
): EngineQuote | null {
  if (gorInput <= 0n || pool.isPaused) return null;

  const gorReserve = BigInt(pool.gorReserve);
  const tokenReserve = BigInt(pool.tokenReserve);

  if (tokenReserve === 0n) return null;

  // Pure CPAMM: tokens_out = T × gor_in / (G + gor_in)
  const totalTokensBought = tokenReserve * gorInput / (gorReserve + gorInput);

  if (totalTokensBought === 0n) return null;

  // GOR spent = gorInput (all GOR goes into the CPAMM)
  const gorSpent = gorInput;

  // Fee on GOR spent, charged on top
  const fee = gorSpent * BigInt(pool.swapFeeBps) / 10000n;
  const totalGorIn = gorSpent + fee;

  const executionPrice = totalTokensBought > 0n
    ? gorSpent * PRICE_PRECISION / totalTokensBought
    : 0n;
  const minimumOut = totalTokensBought * BigInt(10000 - slippageBps) / 10000n;
  // Current spot price
  const currentTierPrice = tokenReserve > 0n
    ? gorReserve * PRICE_PRECISION / tokenReserve
    : 0n;

  return {
    direction: 'buy',
    amountIn: totalGorIn,
    estimatedOut: totalTokensBought,
    minimumOut,
    fee,
    effectiveFeeBps: pool.swapFeeBps,
    executionPrice,
    currentTierPrice,
  };
}

// ============================================================
// V3 Sell Quote — locked-rate bin settlement (approximated)
// ============================================================

/**
 * Compute a sell quote: Tokens → GOR.
 * V3: Sells use locked flat rates from bins. On-chain, each bin has
 * its own average purchase rate. Without bin data on the frontend,
 * we approximate using the aggregate average locked rate:
 *
 *   payout ≈ tokens_in × (gor_reserve - initial_gor_reserve) / total_tokens_sold
 *
 * WHY minimumOut = 0 for V3 sells:
 *
 * The aggregate average OVERESTIMATES because gorReserve includes
 * accumulated bin fees that inflate (gorReserve - initialGorReserve)
 * above the actual sum of gor_locked in bins.  The gap grows with
 * trading volume and varies unpredictably, making any fixed discount
 * unreliable.
 *
 * V3 sells are NOT subject to AMM curve slippage — each bin pays at
 * its fixed locked rate. The only "slippage" scenario is someone
 * frontrunning your sell, but adjacent bin rates differ by < 0.03%.
 * The on-chain solvency floor (gor_reserve >= initial_gor_reserve)
 * already prevents catastrophic drain.
 *
 * We still display estimatedOut for the user's reference, but do not
 * enforce it as a hard on-chain minimum.
 */

export function computeSellQuote(
  pool: PoolState,
  tokenInput: bigint,
  _slippageBps: number,
): EngineQuote | null {
  if (tokenInput <= 0n || pool.isPaused) return null;

  const totalTokensSold = BigInt(pool.totalTokensSold);
  if (totalTokensSold === 0n) return null;

  const gorReserve = BigInt(pool.gorReserve);
  const initialGorReserve = BigInt(pool.initialGorReserve);
  const tokenReserve = BigInt(pool.tokenReserve);

  // Available GOR above solvency floor
  const availableGor = gorReserve > initialGorReserve ? gorReserve - initialGorReserve : 0n;
  if (availableGor === 0n) return null;

  // Can't sell more tokens than are outstanding
  const actualTokensIn = tokenInput < totalTokensSold ? tokenInput : totalTokensSold;

  // Approximate payout using aggregate average locked rate
  let totalGorPayout = availableGor * actualTokensIn / totalTokensSold;

  // Clamp to available (shouldn't exceed, but safety)
  if (totalGorPayout > availableGor) {
    totalGorPayout = availableGor;
  }

  const tokensSold = actualTokensIn;
  if (tokensSold === 0n || totalGorPayout === 0n) return null;

  // Fee deducted from payout
  const fee = totalGorPayout * BigInt(pool.swapFeeBps) / 10000n;
  const netPayout = totalGorPayout - fee;

  // V3 sells: minimumOut = 0 — aggregate estimate is unreliable
  // (gorReserve includes accumulated fees that inflate the estimate).
  // Locked-rate bins have no AMM slippage; solvency floor is the guard.
  const minimumOut = 0n;

  const executionPrice = tokensSold > 0n
    ? totalGorPayout * PRICE_PRECISION / tokensSold
    : 0n;

  const currentTierPrice = tokenReserve > 0n
    ? gorReserve * PRICE_PRECISION / tokenReserve
    : 0n;

  return {
    direction: 'sell',
    amountIn: tokenInput,
    estimatedOut: netPayout,
    minimumOut,
    fee,
    effectiveFeeBps: pool.swapFeeBps,
    executionPrice,
    currentTierPrice,
  };
}

// ============================================================
// Hook: useEngineSwap
// ============================================================

export function useEngineSwap() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const program = useProgram();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const executeSwap = useCallback(async (params: {
    sovereignId: string | number;
    direction: 'buy' | 'sell';
    amount: bigint;         // lamports (buy) or token units (sell)
    minimumOut: bigint;     // slippage-protected minimum
  }) => {
    if (!publicKey || !signTransaction || !connected || !program) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const sovereignId = BigInt(params.sovereignId);

      // Build the appropriate transaction
      const tx = params.direction === 'buy'
        ? await buildSwapBuyTx(program, publicKey, sovereignId, params.amount, params.minimumOut)
        : await buildSwapSellTx(program, publicKey, sovereignId, params.amount, params.minimumOut);

      // Set recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = publicKey;

      // Sign
      const signed = await signTransaction(tx);

      // Send
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed',
      );

      setTxSignature(signature);
      return { signature };
    } catch (e: any) {
      console.error('[useEngineSwap] Error:', e?.message || e?.logs || e);
      // Parse Anchor/RPC errors — extract message from various error shapes
      const msg = e?.message || e?.logs?.join?.('\n') || JSON.stringify(e) || 'Swap failed';
      if (msg.includes('SlippageExceeded')) {
        setError('Slippage exceeded — price moved. Try increasing slippage tolerance.');
      } else if (msg.includes('SolvencyViolation')) {
        setError('Sell exceeds reserve solvency floor. Try a smaller amount.');
      } else if (msg.includes('PoolPaused')) {
        setError('Pool is currently paused.');
      } else if (msg.includes('InsufficientTokens')) {
        setError('Not enough tokens available at current price.');
      } else {
        setError(msg);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connected, program, connection]);

  const reset = useCallback(() => {
    setError(null);
    setTxSignature(null);
  }, []);

  return { executeSwap, loading, error, txSignature, reset };
}
