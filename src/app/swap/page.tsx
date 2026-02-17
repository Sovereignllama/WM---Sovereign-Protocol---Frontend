'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useSovereigns, useSovereign, useEnginePool } from '@/hooks/useSovereign';
import { useEngineSwap, computeBuyQuote, computeSellQuote, EngineQuote } from '@/hooks/useEngineSwap';
import { useTokenImage } from '@/hooks/useTokenImage';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import Link from 'next/link';

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const PRICE_PRECISION_N = 1_000_000_000; // 1e9 — matches on-chain

// ============================================================
// Utility Functions
// ============================================================

/** Format precision-scaled price to human-readable GOR per token */
function formatPrice(precisionPrice: bigint | number): string {
  const price = typeof precisionPrice === 'bigint'
    ? Number(precisionPrice) / PRICE_PRECISION_N
    : precisionPrice / PRICE_PRECISION_N;
  if (price === 0) return '0';
  if (price >= 0.01) return price.toFixed(6);
  if (price >= 0.000001) return price.toFixed(8);
  if (price >= 0.0000000001) return price.toFixed(10);
  return price.toExponential(4);
}

/** Format raw lamports / token units to human-readable */
function formatAmount(raw: bigint | string, decimals: number = 9): string {
  const val = typeof raw === 'string' ? BigInt(raw) : raw;
  const whole = val / BigInt(10 ** decimals);
  const frac = val % BigInt(10 ** decimals);
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  if (fracStr === '') return whole.toLocaleString();
  return `${whole.toLocaleString()}.${fracStr.slice(0, 6)}`;
}

/** Format lamports to GOR display */
function formatGor(lamports: bigint | string): string {
  const val = typeof lamports === 'string' ? Number(lamports) : Number(lamports);
  return (val / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ============================================================
// Token Image Component
// ============================================================

function TokenListImage({ metadataUri, symbol }: { metadataUri?: string; symbol?: string }) {
  const { data: imageUrl } = useTokenImage(metadataUri);
  if (imageUrl) {
    return <img src={imageUrl} alt={symbol || ''} className="w-8 h-8 rounded-full object-cover border border-[var(--border)]" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold">
      {(symbol || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ============================================================
// SWAP PAGE — Engine Pool
// ============================================================

export default function SwapPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  // Sovereign selector
  const { data: sovereigns, isLoading: sovereignsLoading } = useSovereigns();
  const [selectedSovereignId, setSelectedSovereignId] = useState<string | null>(null);
  const { data: sovereign } = useSovereign(selectedSovereignId || undefined);

  // Engine pool data
  const { data: enginePool, isLoading: poolLoading } = useEnginePool(selectedSovereignId || undefined);

  // Wallet token balances
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});

  // Swap state
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(100); // 1%
  const [showSettings, setShowSettings] = useState(false);

  // Token image
  const { data: tokenImage } = useTokenImage(sovereign?.metadataUri || undefined);

  // Engine swap hook
  const { executeSwap, loading: swapLoading, error: swapError, txSignature, reset: resetSwap } = useEngineSwap();

  // Filter for tradable sovereigns (Recovery/Active/Unwinding states = pool exists)
  const tradableSovereigns = useMemo(() => {
    if (!sovereigns) return [];
    return sovereigns.filter(
      (s: any) => ['Recovery', 'Active', 'Unwinding'].includes(s.status)
    );
  }, [sovereigns]);

  // Auto-select first tradable sovereign
  useEffect(() => {
    if (tradableSovereigns.length > 0 && !selectedSovereignId) {
      setSelectedSovereignId(tradableSovereigns[0].sovereignId);
    }
  }, [tradableSovereigns, selectedSovereignId]);

  // Fetch Token-2022 balances
  useEffect(() => {
    if (!connected || !publicKey || tradableSovereigns.length === 0) {
      setTokenBalances({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const accounts = await connection.getTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_2022_PROGRAM_ID },
          'confirmed'
        );
        const balances: Record<string, number> = {};
        for (const { account } of accounts.value) {
          let data: Buffer;
          if (Array.isArray(account.data)) {
            data = Buffer.from(account.data[0], 'base64');
          } else if (typeof account.data === 'string') {
            data = Buffer.from(account.data, 'base64');
          } else {
            data = account.data as Buffer;
          }
          const mint = new PublicKey(data.slice(0, 32)).toBase58();
          const rawAmount = data.readBigUInt64LE(64);
          balances[mint] = Number(rawAmount) / 1e9;
        }
        if (!cancelled) setTokenBalances(balances);
      } catch (err) {
        console.error('Failed to fetch token balances:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [connected, publicKey, connection, tradableSovereigns.length, txSignature]);

  // Compute raw input amount
  const rawAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return null;
    try {
      return BigInt(Math.floor(parseFloat(amount) * 1e9));
    } catch {
      return null;
    }
  }, [amount]);

  // Compute quote locally from engine pool state
  const quote: EngineQuote | null = useMemo(() => {
    if (!enginePool || !rawAmount) return null;
    return direction === 'buy'
      ? computeBuyQuote(enginePool, rawAmount, slippageBps)
      : computeSellQuote(enginePool, rawAmount, slippageBps);
  }, [enginePool, rawAmount, direction, slippageBps]);

  // Toggle direction
  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'buy' ? 'sell' : 'buy'));
    setAmount('');
    resetSwap();
  }, [resetSwap]);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!selectedSovereignId || !rawAmount || !quote) return;
    resetSwap();
    const result = await executeSwap({
      sovereignId: selectedSovereignId,
      direction,
      amount: rawAmount,
      minimumOut: quote.minimumOut,
    });
    if (result) {
      setAmount('');
    }
  }, [selectedSovereignId, rawAmount, quote, direction, executeSwap, resetSwap]);

  // Format outputs
  const estimatedOutput = useMemo(() => {
    if (!quote) return null;
    return formatAmount(quote.estimatedOut);
  }, [quote]);

  const minimumOutput = useMemo(() => {
    if (!quote) return null;
    return formatAmount(quote.minimumOut);
  }, [quote]);

  // Has engine pool?
  const hasPool = !!enginePool && !enginePool.isPaused;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-start justify-center pt-8 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="h1 text-2xl text-white">Swap</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Trade sovereign tokens on Engine pools</p>
        </div>

        {/* Sovereign Selector */}
        <div className="card card-clean p-4 mb-3">
          <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2 block">
            Select Sovereign
          </label>
          {sovereignsLoading ? (
            <div className="text-sm text-[var(--muted)]">Loading sovereigns...</div>
          ) : tradableSovereigns.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No sovereigns with active pools found</div>
          ) : (
            <select
              value={selectedSovereignId || ''}
              onChange={(e) => {
                setSelectedSovereignId(e.target.value || null);
                setAmount('');
                resetSwap();
              }}
              className="w-full bg-[#1a1a2e] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm cursor-pointer focus:outline-none focus:border-[var(--money-green)] transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-[#1a1a2e] text-white">Choose a sovereign...</option>
              {tradableSovereigns.map((s: any) => {
                const bal = tokenBalances[s.tokenMint];
                const balStr = connected && bal !== undefined && bal > 0
                  ? ` — ${bal < 0.001 ? '<0.001' : bal.toLocaleString(undefined, { maximumFractionDigits: 3 })} held`
                  : '';
                return (
                  <option key={s.sovereignId} value={s.sovereignId} className="bg-[#1a1a2e] text-white">
                    {s.name} ({s.tokenSymbol || `#${s.sovereignId}`}) — {s.status}{balStr}
                  </option>
                );
              })}
            </select>
          )}

          {/* Engine pool info summary */}
          {sovereign && enginePool && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                {tokenImage && (
                  <img src={tokenImage} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span className="text-white font-medium text-sm">
                  {sovereign.tokenSymbol || sovereign.tokenName || `Token #${sovereign.sovereignId}`}
                </span>
                <span className="text-[var(--muted)] text-xs">/ GOR</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--muted)]">Price: </span>
                  <span className="text-white">
                    {enginePool.spotPrice
                      ? `${formatPrice(BigInt(Math.round(enginePool.spotPrice)))} GOR`
                      : enginePool.lastPrice !== '0'
                        ? `${formatPrice(BigInt(enginePool.lastPrice))} GOR`
                        : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Reserve: </span>
                  <span className="text-white">{formatGor(enginePool.gorReserve)} GOR</span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Tokens: </span>
                  <span className="text-white">{enginePool.tokenReserveFormatted?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Trades: </span>
                  <span className="text-white">{enginePool.totalTrades.toLocaleString()}</span>
                </div>
              </div>
              {enginePool.isPaused && (
                <div className="mt-2 text-xs text-[var(--error-red,#ef4444)] font-medium">
                  Pool is paused
                </div>
              )}
            </div>
          )}

          {selectedSovereignId && poolLoading && (
            <div className="mt-2 text-xs text-[var(--muted)]">Loading pool data...</div>
          )}
        </div>

        {/* Swap Card */}
        {selectedSovereignId && hasPool && (
          <div className="card card-clean p-4">
            {/* Buy/Sell toggle + settings */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                <button
                  onClick={() => { setDirection('buy'); setAmount(''); resetSwap(); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    direction === 'buy'
                      ? 'text-white'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                  style={direction === 'buy' ? { background: 'var(--money-green)' } : {}}
                >
                  Buy
                </button>
                <button
                  onClick={() => { setDirection('sell'); setAmount(''); resetSwap(); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    direction === 'sell'
                      ? 'text-white'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                  style={direction === 'sell' ? { background: 'var(--error-red, #ef4444)' } : {}}
                >
                  Sell
                </button>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-[var(--muted)] hover:text-white text-sm"
                title="Settings"
              >
                ⚙️
              </button>
            </div>

            {/* Slippage settings */}
            {showSettings && (
              <div className="mb-4 p-3 bg-[var(--bg-main)] rounded-lg">
                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2 block">
                  Slippage Tolerance
                </label>
                <div className="flex gap-2">
                  {[50, 100, 200, 500, 1000].map((bps) => (
                    <button
                      key={bps}
                      onClick={() => setSlippageBps(bps)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        slippageBps === bps
                          ? 'bg-[var(--money-green)] text-white'
                          : 'bg-[var(--bg-card)] text-[var(--muted)] hover:text-white border border-[var(--border)]'
                      }`}
                    >
                      {bps / 100}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input: You Pay */}
            <div className="bg-[var(--bg-main)] rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--muted)]">You Pay</span>
                {direction === 'sell' && sovereign?.tokenMint && tokenBalances[sovereign.tokenMint] > 0 && (
                  <button
                    onClick={() => { setAmount(tokenBalances[sovereign.tokenMint].toString()); resetSwap(); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--money-green)]/15 text-[var(--money-green)] hover:bg-[var(--money-green)]/25 transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); resetSwap(); }}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl text-white font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  step="any"
                />
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-3 py-1.5 rounded-lg shrink-0">
                  {direction === 'buy' ? (
                    <span className="text-white text-sm font-medium">GOR</span>
                  ) : (
                    <>
                      {tokenImage && <img src={tokenImage} alt="" className="w-4 h-4 rounded-full" />}
                      <span className="text-white text-sm font-medium">
                        {sovereign?.tokenSymbol || 'TOKEN'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow divider */}
            <div className="flex justify-center -my-1.5 relative z-10">
              <button
                onClick={toggleDirection}
                className="w-8 h-8 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border)] flex items-center justify-center hover:border-[var(--money-green)] transition-colors"
              >
                <span className="text-[var(--muted)]">↕</span>
              </button>
            </div>

            {/* Output: You Receive */}
            <div className="bg-[var(--bg-main)] rounded-lg p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--muted)]">You Receive (est.)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-full text-2xl font-medium" style={{ color: estimatedOutput ? 'white' : 'var(--muted)' }}>
                  {estimatedOutput || '0.0'}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-3 py-1.5 rounded-lg shrink-0">
                  {direction === 'sell' ? (
                    <span className="text-white text-sm font-medium">GOR</span>
                  ) : (
                    <>
                      {tokenImage && <img src={tokenImage} alt="" className="w-4 h-4 rounded-full" />}
                      <span className="text-white text-sm font-medium">
                        {sovereign?.tokenSymbol || 'TOKEN'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quote details */}
            {quote && estimatedOutput && (
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Execution Price</span>
                  <span className="text-white">
                    {formatPrice(quote.executionPrice)} GOR / token
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Min. Received</span>
                  <span className="text-white">
                    {minimumOutput} {direction === 'buy' ? (sovereign?.tokenSymbol || 'TOKEN') : 'GOR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Fee</span>
                  <span className="text-white">
                    {formatGor(quote.fee)} GOR ({(quote.effectiveFeeBps / 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Slippage</span>
                  <span className="text-white">{slippageBps / 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Spot Price</span>
                  <span className="text-white">{formatPrice(quote.currentTierPrice)} GOR</span>
                </div>
              </div>
            )}

            {/* Sell solvency warning */}
            {direction === 'sell' && rawAmount && !quote && amount && parseFloat(amount) > 0 && (
              <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                Sell amount exceeds pool solvency limits or no tokens have been sold yet.
                Try a smaller amount.
              </div>
            )}

            {/* Swap button */}
            <button
              onClick={handleSwap}
              disabled={!connected || !amount || !quote || swapLoading}
              className="w-full mt-4 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: !connected ? 'var(--muted)' :
                  direction === 'buy' ? 'var(--money-green)' : 'var(--error-red, #ef4444)',
                color: 'white',
              }}
            >
              {!connected ? 'Connect Wallet' :
               swapLoading ? 'Swapping...' :
               !amount ? 'Enter Amount' :
               !quote ? 'Invalid Amount' :
               direction === 'buy' ? `Buy ${sovereign?.tokenSymbol || 'Token'}` :
               `Sell ${sovereign?.tokenSymbol || 'Token'}`}
            </button>

            {/* Swap error */}
            {swapError && (
              <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {swapError}
              </div>
            )}

            {/* Success */}
            {txSignature && (
              <div className="mt-3 p-3 rounded bg-[var(--money-green)]/10 border border-[var(--money-green)]/30">
                <p className="text-[var(--money-green)] text-sm font-medium mb-1">Swap successful!</p>
                <a
                  href={`${config.explorerUrl}${config.explorerTxPath}${txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--money-green)] text-xs hover:underline break-all"
                >
                  View transaction →
                </a>
              </div>
            )}
          </div>
        )}

        {/* No pool state */}
        {selectedSovereignId && !poolLoading && !enginePool && sovereign && (
          <div className="card card-clean p-4 text-center">
            <p className="text-[var(--muted)] text-sm">
              This sovereign doesn&apos;t have an engine pool yet.
            </p>
            <p className="text-[var(--muted)] text-xs mt-1">
              Status: <span className="text-white">{sovereign.status}</span>
            </p>
          </div>
        )}

        {/* Pool paused */}
        {selectedSovereignId && enginePool?.isPaused && (
          <div className="card card-clean p-4 text-center">
            <p className="text-[var(--muted)] text-sm">
              This pool is currently paused by the creator.
            </p>
          </div>
        )}

        {/* Not connected state */}
        {!connected && selectedSovereignId && hasPool && (
          <div className="card card-clean p-4 text-center mt-3">
            <p className="text-[var(--muted)] text-sm">
              Connect your wallet to start trading
            </p>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-[var(--muted)]">
            Sovereign pools run on the V3 Engine (CPAMM + BinArray Settlement)
          </p>
        </div>
      </div>
    </div>
  );
}
