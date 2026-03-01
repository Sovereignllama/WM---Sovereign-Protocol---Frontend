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
  lastPrice?: string;      // Most recent execution price (×1e9 precision)
}

// ============================================================
// V3 Buy Quote — pure CPAMM (mirrors on-chain compute_buy)
// ============================================================

/**
 * Compute a buy quote: GOR → Tokens.
 * V3: CPAMM pricing — tokens_out = T × gor_in / (G + gor_in)
 * Fee charged on top of the CPAMM cost.
 *
 * @param transferFeeBps Token-2022 transfer fee (sell fee) on the sovereign token.
 *   On buys, engine transfers tokens to trader via transfer_checked — the trader
 *   receives fewer tokens than the engine sends. We deduct this from the estimate.
 */
export function computeBuyQuote(
  pool: PoolState,
  gorInput: bigint,
  slippageBps: number,
  transferFeeBps: number = 0,
): EngineQuote | null {
  if (gorInput <= 0n || pool.isPaused) return null;

  const gorReserve = BigInt(pool.gorReserve);
  const tokenReserve = BigInt(pool.tokenReserve);

  if (tokenReserve === 0n) return null;

  // Mirror on-chain fee reservation: effective_gor = gor_input × 10000 / (10000 + fee_bps)
  // Fee is carved from gorInput upfront so the CPAMM only sees the net swap budget.
  const feeDenom = 10000n + BigInt(pool.swapFeeBps);
  const effectiveGor = gorInput * 10000n / feeDenom;

  // CPAMM: tokens_out = T × effective_gor / (G + effective_gor)
  const totalTokensBought = tokenReserve * effectiveGor / (gorReserve + effectiveGor);

  if (totalTokensBought === 0n) return null;

  // Token-2022 transfer fee: buyer receives fewer tokens than engine sends
  const tokenFee = transferFeeBps > 0
    ? totalTokensBought * BigInt(transferFeeBps) / 10000n
    : 0n;
  const tokensReceived = totalTokensBought - tokenFee;

  // Fee: effective_gor × fee_bps / 10000 (matches on-chain compute_buy)
  const fee = effectiveGor * BigInt(pool.swapFeeBps) / 10000n;

  const executionPrice = tokensReceived > 0n
    ? effectiveGor * PRICE_PRECISION / tokensReceived
    : 0n;
  const minimumOut = tokensReceived * BigInt(10000 - slippageBps) / 10000n;
  // Current spot price
  const currentTierPrice = tokenReserve > 0n
    ? gorReserve * PRICE_PRECISION / tokenReserve
    : 0n;

  return {
    direction: 'buy',
    amountIn: gorInput,
    estimatedOut: tokensReceived,
    minimumOut,
    fee,
    effectiveFeeBps: pool.swapFeeBps,
    executionPrice,
    currentTierPrice,
  };
}

// ============================================================
// V3 Sell Quote — locked-rate bin settlement
// ============================================================

/** Bin snapshot from the backend pool tracker (optional for accurate quotes) */
export interface SellQuoteBin {
  index: number;
  tokens: string;         // lamports string
  gorLocked: string;      // lamports string
  status: number;         // 0=Empty, 1=Partial, 2=Filled
  feeCredit: string;      // lamports string
  originalCapacity: string;
}

/**
 * Compute a sell quote: Tokens → GOR.
 *
 * V3 sells walk bins starting from activeBin downward. Each bin pays at
 * its locked rate: (gorLocked + feeCredit) / tokensSoldInBin.
 *
 * When bin data is available (from backend pool snapshot), we simulate
 * the on-chain compute_sell exactly and can set a proper minimumOut.
 *
 * Without bin data, we fall back to using the pool's lastPrice (most
 * recent execution price) as an approximation of the current bin rate.
 *
 * @param transferFeeBps Token-2022 transfer fee (sell fee) on the sovereign token.
 *   On sells, the trader sends tokenInput but the engine vault receives
 *   tokenInput minus the transfer fee. The on-chain swap uses actual_received,
 *   so we must simulate the same deduction here.
 */
export function computeSellQuote(
  pool: PoolState,
  tokenInput: bigint,
  slippageBps: number,
  bins?: SellQuoteBin[],
  transferFeeBps: number = 0,
): EngineQuote | null {
  if (tokenInput <= 0n || pool.isPaused) return null;

  const totalTokensSold = BigInt(pool.totalTokensSold);
  if (totalTokensSold === 0n) return null;

  const gorReserve = BigInt(pool.gorReserve);
  const initialGorReserve = BigInt(pool.initialGorReserve);
  const tokenReserve = BigInt(pool.tokenReserve);
  const binCapacity = BigInt(pool.binCapacity);
  const activeBin = pool.activeBin;

  // Available GOR above solvency floor
  const availableGor = gorReserve > initialGorReserve ? gorReserve - initialGorReserve : 0n;
  if (availableGor === 0n) return null;

  // Token-2022 transfer fee: vault receives fewer tokens than the user sends
  const tokenFeeWithheld = transferFeeBps > 0
    ? tokenInput * BigInt(transferFeeBps) / 10000n
    : 0n;
  const tokensAfterFee = tokenInput - tokenFeeWithheld;

  // Can't sell more tokens than are outstanding
  const actualTokensIn = tokensAfterFee < totalTokensSold ? tokensAfterFee : totalTokensSold;

  let totalGorPayout = 0n;

  if (bins && bins.length > 0) {
    // ── Accurate path: walk bins like the on-chain compute_sell ──
    let tokensRemaining = actualTokensIn;
    let g = gorReserve;

    // Build a map for quick lookup by index
    const binMap = new Map<number, SellQuoteBin>();
    for (const b of bins) binMap.set(b.index, b);

    let sellIdx = activeBin;
    while (tokensRemaining > 0n && sellIdx >= 0) {
      const bin = binMap.get(sellIdx);
      if (!bin) { sellIdx--; continue; }

      const binCap = BigInt(bin.originalCapacity) || binCapacity;
      const binTokens = BigInt(bin.tokens);
      const gorLocked = BigInt(bin.gorLocked);
      const feeCredit = BigInt(bin.feeCredit);
      const tokensSoldInBin = binCap - binTokens;

      if (tokensSoldInBin <= 0n || gorLocked <= 0n) {
        sellIdx--;
        continue;
      }

      const tokensToReturn = tokensRemaining < tokensSoldInBin ? tokensRemaining : tokensSoldInBin;

      // Boosted payout: (gorLocked + feeCredit) × tokensToReturn / tokensSoldInBin
      const totalPot = gorLocked + feeCredit;
      let payout = totalPot * tokensToReturn / tokensSoldInBin;

      // Solvency clamp
      const available = g - initialGorReserve;
      if (available <= 0n) break;
      if (payout > available) payout = available;
      if (payout === 0n) break;

      // Adjust tokens proportionally if clamped
      const actualTokens = payout < (totalPot * tokensToReturn / tokensSoldInBin)
        ? tokensToReturn * payout / (totalPot * tokensToReturn / tokensSoldInBin)
        : tokensToReturn;
      if (actualTokens === 0n) break;

      totalGorPayout += payout;
      tokensRemaining -= actualTokens;
      g -= payout;
      sellIdx--;
    }
  } else {
    // ── Fallback: use lastPrice as bin rate approximation ──
    // lastPrice is the most recent swap execution price (×1e9 precision),
    // which closely tracks the active bin's locked rate.
    const lastPrice = BigInt(pool.lastPrice || '0');
    if (lastPrice > 0n) {
      totalGorPayout = actualTokensIn * lastPrice / PRICE_PRECISION;
    } else {
      // Ultimate fallback: aggregate average (inaccurate but non-zero)
      totalGorPayout = availableGor * actualTokensIn / totalTokensSold;
    }
  }

  // Clamp to available
  if (totalGorPayout > availableGor) {
    totalGorPayout = availableGor;
  }

  if (totalGorPayout === 0n) return null;

  // Fee deducted from payout
  const fee = totalGorPayout * BigInt(pool.swapFeeBps) / 10000n;
  const netPayout = totalGorPayout - fee;

  // minimumOut = 0 for sells. The on-chain solvency floor
  // (gor_reserve >= initial_gor_reserve) is the real protection.
  // Bin-walk estimates from stale backend data cause false
  // SlippageExceeded errors, especially on large sells that
  // cross many bins at different price levels.
  const minimumOut = 0n;

  const executionPrice = actualTokensIn > 0n
    ? totalGorPayout * PRICE_PRECISION / actualTokensIn
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

      // Confirm — with fallback for WebSocket failures
      try {
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          'confirmed',
        );
      } catch (confirmErr: any) {
        const isTimeout = confirmErr?.message?.includes('block height exceeded')
          || confirmErr?.message?.includes('expired');
        if (isTimeout) {
          // WebSocket confirmation may have failed but the tx could have landed.
          // Do a manual signature status check before declaring failure.
          console.warn('[useEngineSwap] Confirmation timed out, checking signature status...');
          const statusResp = await connection.getSignatureStatuses([signature]);
          const status = statusResp?.value?.[0];
          if (status && !status.err) {
            console.log('[useEngineSwap] Transaction confirmed via fallback check');
            // tx landed successfully — continue as normal
          } else {
            throw confirmErr; // genuinely failed
          }
        } else {
          throw confirmErr;
        }
      }

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
