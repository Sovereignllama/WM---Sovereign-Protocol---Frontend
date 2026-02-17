'use client';

import { useState, useMemo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereigns, useSovereign, useEnginePool, useTokenFeeStats } from '@/hooks/useSovereign';
import { useClaimPoolCreatorFees, useHarvestTransferFees, useEmergencyWithdrawCreator, useUpdateSellFee } from '@/hooks/useTransactions';
import { useTokenImage } from '@/hooks/useTokenImage';
import { StatusBadge } from '@/components/StatusBadge';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import { format } from 'date-fns';
import Link from 'next/link';

const POOL_PRICE_WORKER_URL = 'https://waste-management-pool-price-tracker.onrender.com';

interface PoolVolume {
  volume24h: number;
  volume7d: number;
  volume30d: number;
}

function usePoolVolume(poolAddress: string | null): { volume: PoolVolume | null; loading: boolean } {
  const [volume, setVolume] = useState<PoolVolume | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!poolAddress || poolAddress === '11111111111111111111111111111111') {
      setVolume(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${POOL_PRICE_WORKER_URL}/api/pools`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const pool = data.pools?.find((p: any) => p.poolAddress === poolAddress);
        if (pool) {
          setVolume({
            volume24h: pool.volume24h || 0,
            volume7d: pool.volume7d || 0,
            volume30d: pool.volume30d || 0,
          });
        } else {
          setVolume(null);
        }
      })
      .catch(() => { if (!cancelled) setVolume(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [poolAddress]);

  return { volume, loading };
}

export default function CreatorGovernancePage() {
  const { connected, publicKey } = useWallet();
  const [selectedSovereignId, setSelectedSovereignId] = useState<string | null>(null);

  // Fetch all sovereigns for selector
  const { data: allSovereigns, isLoading: sovLoading } = useSovereigns();

  // Filter to creator's sovereigns only (Active/Recovery/EmergencyUnlocked)
  const creatableSovereigns = useMemo(() => {
    if (!allSovereigns || !publicKey) return [];
    return allSovereigns.filter((s: any) =>
      s.creator === publicKey.toBase58() &&
      ['Active', 'Recovery', 'Unwinding', 'Unwound', 'EmergencyUnlocked'].includes(s.status)
    );
  }, [allSovereigns, publicKey]);

  // Selected sovereign data
  const { data: sovereign } = useSovereign(selectedSovereignId ?? undefined);
  const { data: imageUrl } = useTokenImage(sovereign?.metadataUri);
  const { data: enginePoolData } = useEnginePool(selectedSovereignId ?? undefined);
  const { data: tokenFeeStats } = useTokenFeeStats(selectedSovereignId ?? undefined);
  const { volume: poolVolume, loading: volumeLoading } = usePoolVolume(
    sovereign?.poolState && sovereign.poolState !== '11111111111111111111111111111111'
      ? sovereign.poolState
      : null
  );

  // Transaction hooks
  const claimCreatorFees = useClaimPoolCreatorFees();
  const harvestTransferFees = useHarvestTransferFees();
  const emergencyWithdrawCreator = useEmergencyWithdrawCreator();
  const updateSellFee = useUpdateSellFee();

  // Collect-all fee state
  const [collectAllStep, setCollectAllStep] = useState('');
  const [collectAllError, setCollectAllError] = useState<string | null>(null);
  const [collectAllDone, setCollectAllDone] = useState(false);

  // Fee control state
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState(false);

  // Solvency info popup
  const [solvencyInfoOpen, setSolvencyInfoOpen] = useState(false);

  const isCreator = sovereign?.creator === publicKey?.toBase58();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 text-white mb-2">Governance</h1>
        <p className="text-[var(--muted)] text-sm">
          Token creator dashboard — manage pool fees, view vault balances, and harvest creator revenue.
        </p>
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/governance"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all text-[var(--muted)] hover:text-white border border-[var(--border)] hover:border-[var(--money-green)]/40"
          >
            NFT Holders
          </Link>
          <Link
            href="/governance/creator"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[var(--money-green)]/20 text-[var(--money-green)] border border-[var(--money-green)]/40"
          >
            Token Creator
          </Link>
        </div>
      </div>

      {/* Not connected */}
      {!connected && (
        <div className="card card-clean text-center py-12">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-[var(--muted)]">
            Connect your wallet to view your created sovereigns.
          </p>
        </div>
      )}

      {/* Connected but no created sovereigns */}
      {connected && !sovLoading && creatableSovereigns.length === 0 && (
        <div className="card card-clean text-center py-12">
          <div className="text-4xl mb-3">👑</div>
          <p className="text-[var(--muted)]">
            You haven&apos;t created any sovereigns yet, or none are in an active state.
          </p>
          <Link
            href="/mint"
            className="inline-block mt-4 px-6 py-2 rounded-lg text-sm font-bold transition-all bg-[var(--money-green)]/20 text-[var(--money-green)] border border-[var(--money-green)]/40 hover:bg-[var(--money-green)]/30"
          >
            Create a $overeign →
          </Link>
        </div>
      )}

      {/* Sovereign Selector */}
      {connected && creatableSovereigns.length > 0 && (
        <>
          <div className="card card-clean p-4 mb-6">
            <label className="text-sm text-[var(--muted)] block mb-2">Select Your Sovereign</label>
            <select
              value={selectedSovereignId || ''}
              onChange={(e) => {
                setSelectedSovereignId(e.target.value || null);
                setCollectAllDone(false);
                setCollectAllError(null);
                setCollectAllStep('');
              }}
              className="w-full bg-[#1a1a2e] border border-[var(--border)] rounded px-3 py-2.5 text-white text-sm cursor-pointer focus:border-[var(--money-green)] focus:outline-none transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-[#1a1a2e] text-white">Choose a sovereign...</option>
              {creatableSovereigns.map((s: any) => (
                <option key={s.sovereignId} value={s.sovereignId} className="bg-[#1a1a2e] text-white">
                  {s.name} ({s.tokenSymbol || `#${s.sovereignId}`}) — {s.status}
                </option>
              ))}
            </select>
          </div>

          {selectedSovereignId && sovereign && isCreator && (
            <>
              {/* Sovereign Header Card */}
              <div className="card card-clean p-4 mb-4">
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={sovereign.tokenSymbol || sovereign.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[var(--border)]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--card-bg)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-lg font-bold">
                      {(sovereign.tokenSymbol || sovereign.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-white font-bold">{sovereign.name}</h2>
                      <StatusBadge status={sovereign.status as any} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--money-green)]/20 text-[var(--money-green)] font-bold">
                        Creator
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1">
                      {sovereign.tokenSymbol && (
                        <span className="text-[var(--money-green)]">{sovereign.tokenSymbol}</span>
                      )}
                      <span>Fee Mode: {sovereign.feeMode}</span>
                      <span>·</span>
                      <Link
                        href={`/sovereign/${sovereign.sovereignId}`}
                        className="text-[var(--money-green)] hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left column — Pool Info & Vault Balances */}
                <div className="md:col-span-1">
                  <div className="card card-clean p-4 mb-4 sticky top-4">
                    <h3 className="h3 text-white mb-4">Pool Information</h3>

                    {/* Pool Status */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Pool Status</div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          sovereign.status === 'Active' ? 'bg-[var(--money-green)]' :
                          sovereign.status === 'Recovery' ? 'bg-[var(--hazard-yellow)]' :
                          sovereign.status === 'Unwinding' ? 'bg-orange-400' :
                          sovereign.status === 'Unwound' ? 'bg-red-400' :
                          'bg-[var(--muted)]'
                        }`} />
                        <span className="text-white text-sm font-medium">{sovereign.status}</span>
                      </div>
                      {sovereign.finalizedAt && (
                        <p className="text-[10px] text-[var(--muted)] mt-1">
                          Pool live since {format(sovereign.finalizedAt, 'MMM d, yyyy')}
                        </p>
                      )}

                      {/* Solvency Status */}
                      {enginePoolData && (() => {
                        const initialGor = enginePoolData.initialGorReserveGor;
                        const gorReserve = enginePoolData.gorReserveGor;
                        const tokenLiquidationValue = Math.max(0, gorReserve - initialGor);
                        const rawVariance = gorReserve - tokenLiquidationValue - initialGor;
                        const variance = Math.abs(rawVariance) < 0.0001 ? 0 : rawVariance;
                        const isSolvent = variance >= -0.01;
                        const totalBinFees = enginePoolData.totalBinFeesDistributedGor;
                        const totalFees = enginePoolData.totalFeesCollectedGor;
                        const lpFees = Number(enginePoolData.lpFeesAccumulated) / LAMPORTS_PER_GOR;
                        const creatorFees = Number(enginePoolData.creatorFeesAccumulated) / LAMPORTS_PER_GOR;

                        return (
                          <>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`w-2 h-2 rounded-full ${isSolvent ? 'bg-[var(--slime)]' : 'bg-red-500'}`} />
                              <span className={`text-sm font-medium ${isSolvent ? 'text-[var(--slime)]' : 'text-red-500'}`}>
                                {isSolvent ? 'Solvent' : 'Under-Collateralized'}
                              </span>
                              <button
                                onClick={() => setSolvencyInfoOpen(true)}
                                className="ml-1 w-4 h-4 rounded-full bg-[var(--hazard-orange)] text-white text-[10px] font-bold flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="Solvency details"
                              >
                                i
                              </button>
                            </div>

                            {/* Solvency info modal */}
                            {solvencyInfoOpen && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setSolvencyInfoOpen(false)}>
                                <div className="bg-[#0d0d0d] border border-[var(--border)] rounded-xl p-5 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-white font-bold text-sm">Solvency &amp; Principal</h4>
                                    <button onClick={() => setSolvencyInfoOpen(false)} className="text-[var(--muted)] hover:text-white text-lg leading-none">&times;</button>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Status</span>
                                      <span className={`font-bold flex items-center gap-1.5 ${isSolvent ? 'text-[var(--slime)]' : 'text-red-500'}`}>
                                        <span className={`w-2 h-2 rounded-full ${isSolvent ? 'bg-[var(--slime)]' : 'bg-red-500'}`} />
                                        {isSolvent ? 'Solvent' : 'Under-Collateralized'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Initial Principal</span>
                                      <span className="text-white font-medium">{initialGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Current GOR Reserve</span>
                                      <span className="text-white font-medium">{gorReserve.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Token Liquidation</span>
                                      <span className="text-white font-medium">{tokenLiquidationValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Variance</span>
                                      <span className={`font-bold ${variance >= 0 ? 'text-[var(--slime)]' : 'text-red-500'}`}>
                                        {variance >= 0 ? '+' : ''}{variance.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                      </span>
                                    </div>
                                    <div className="border-t border-[var(--border)] my-1" />
                                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Fee Breakdown</div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">Total Swap Fees</span>
                                      <span className="text-white font-medium">{totalFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">→ LP Fees</span>
                                      <span className="text-white font-medium">{lpFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">→ Creator Fees</span>
                                      <span className="text-white font-medium">{creatorFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-[var(--muted)]">→ Bin Rewards</span>
                                      <span className="text-white font-medium">{totalBinFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                                    </div>
                                  </div>
                                  <p className="text-[var(--muted)] text-[10px] mt-3 leading-relaxed">
                                    In V3 (locked-rate sells), the pool always holds enough GOR to cover full sellback by construction.
                                    Token Liquidation = GOR Reserve − Initial Principal.
                                    Variance = what remains after paying all token obligations and returning investor principal.
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="border-t border-[var(--border)] my-3" />

                    {/* Pool Reserves */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Pool Reserves</div>
                      {enginePoolData ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">GOR Reserve</span>
                            <span className="text-[var(--money-green)] font-medium">
                              {enginePoolData.gorReserveGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">{sovereign.tokenSymbol || 'Token'} Reserve</span>
                            <span className="text-white font-medium">
                              {enginePoolData.tokenReserveFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Current Price</span>
                            <span className="text-white font-medium">
                              {enginePoolData.spotPrice
                                ? (enginePoolData.spotPrice / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 8 })
                                : '—'
                              } GOR/{sovereign.tokenSymbol || 'token'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--muted)] text-xs">Pool data unavailable</p>
                      )}
                    </div>

                    <div className="border-t border-[var(--border)] my-3" />

                    {/* Pool Volume */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Pool Volume</div>
                      {volumeLoading ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-5 bg-[var(--card-bg)] rounded w-3/4" />
                          <div className="h-5 bg-[var(--card-bg)] rounded w-3/4" />
                        </div>
                      ) : poolVolume ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">24h Volume</span>
                            <span className="text-white font-medium">
                              {poolVolume.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">7d Volume</span>
                            <span className="text-white font-medium">
                              {poolVolume.volume7d.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">30d Volume</span>
                            <span className="text-white font-medium">
                              {poolVolume.volume30d.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--muted)] text-xs">Volume data unavailable</p>
                      )}
                    </div>

                    <div className="border-t border-[var(--border)] my-3" />

                    {/* Vault Balances */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Vault Balances</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">GOR Vault</span>
                          <span className="text-[var(--money-green)] font-medium">
                            {enginePoolData
                              ? enginePoolData.gorReserveGor.toLocaleString(undefined, { maximumFractionDigits: 4 })
                              : '0'
                            } GOR
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">{sovereign.tokenSymbol || 'Token'} Vault</span>
                          <span className="text-white font-medium">
                            {enginePoolData
                              ? enginePoolData.tokenReserveFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })
                              : '0'
                            } {sovereign.tokenSymbol || 'tokens'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] my-3" />

                    {/* Fee Configuration */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Fee Configuration</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Swap Fee</span>
                          <span className="text-white font-medium">{(sovereign.swapFeeBps / 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Transfer Fee</span>
                          <span className="text-white font-medium flex items-center gap-2">
                            {tokenFeeStats
                              ? `${(tokenFeeStats.transferFeeBps / 100).toFixed(2)}%`
                              : `${(sovereign.sellFeeBps / 100).toFixed(1)}%`
                            }
                            {isCreator && !sovereign.feeControlRenounced && (
                              <button
                                onClick={() => { setFeeModalOpen(true); setFeeInput(''); setFeeError(null); setFeeSuccess(false); }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--hazard-orange)] text-white hover:opacity-90"
                              >
                                Update
                              </button>
                            )}
                          </span>
                        </div>

                        {/* Fee update modal */}
                        {feeModalOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setFeeModalOpen(false)}>
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
                              <h4 className="text-white font-bold text-sm mb-3">Update Transfer Fee</h4>
                              <p className="text-[var(--muted)] text-xs mb-3">Set a new transfer fee between 0% and 3%. Activates next epoch.</p>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="3"
                                placeholder="New fee %"
                                value={feeInput}
                                onChange={(e) => { setFeeInput(e.target.value); setFeeError(null); setFeeSuccess(false); }}
                                className="w-full px-3 py-2 rounded bg-[var(--surface)] border border-[var(--border)] text-white text-sm mb-3 focus:border-[var(--accent)] focus:outline-none"
                                autoFocus
                              />
                              {feeError && <p className="text-red-400 text-xs mb-2">{feeError}</p>}
                              {feeSuccess && <p className="text-[var(--slime)] text-xs mb-2">Fee updated — activates next epoch.</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setFeeModalOpen(false)}
                                  className="flex-1 px-3 py-2 rounded text-xs font-medium bg-[var(--surface)] text-[var(--muted)] hover:text-white border border-[var(--border)]"
                                >
                                  Cancel
                                </button>
                                <button
                                  className="flex-1 px-3 py-2 rounded text-xs font-medium bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40"
                                  disabled={updateSellFee.isPending || !feeInput}
                                  onClick={async () => {
                                    setFeeError(null);
                                    setFeeSuccess(false);
                                    const pct = parseFloat(feeInput);
                                    if (isNaN(pct) || pct < 0 || pct > 3) {
                                      setFeeError('Fee must be between 0% and 3%');
                                      return;
                                    }
                                    const bps = Math.round(pct * 100);
                                    try {
                                      await updateSellFee.mutateAsync({ sovereignId: sovereign.sovereignId, newFeeBps: bps });
                                      setFeeSuccess(true);
                                      setFeeInput('');
                                      setTimeout(() => setFeeModalOpen(false), 1500);
                                    } catch (err: any) {
                                      setFeeError(err?.message || 'Failed to update fee');
                                    }
                                  }}
                                >
                                  {updateSellFee.isPending ? 'Updating...' : 'Confirm'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Fee Mode</span>
                          <span className="text-white font-medium">{sovereign.feeMode}</span>
                        </div>
                        {sovereign.feeThresholdBps > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Creator Fee Share</span>
                            <span className="text-white font-medium">{(sovereign.feeThresholdBps / 100).toFixed(1)}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Fee Control</span>
                          <span className={`font-medium ${sovereign.feeControlRenounced ? 'text-red-400' : 'text-[var(--money-green)]'}`}>
                            {sovereign.feeControlRenounced ? 'Renounced' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] my-3" />

                    {/* Liquidity & Deposits */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Liquidity</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Total Deposited</span>
                          <span className="text-white font-medium">{sovereign.totalDepositedGor.toLocaleString()} GOR</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Depositors</span>
                          <span className="text-white font-medium">{sovereign.depositorCount}</span>
                        </div>
                        {sovereign.creatorEscrowGor > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Your Buy-in</span>
                            <span className="text-[var(--money-green)] font-medium">{sovereign.creatorEscrowGor.toLocaleString()} GOR</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recovery progress if applicable */}
                    {sovereign.status === 'Recovery' && (() => {
                      const recovered = enginePoolData
                        ? Number(enginePoolData.totalRecovered) / LAMPORTS_PER_GOR
                        : sovereign.totalRecoveredGor;
                      const target = enginePoolData
                        ? Number(enginePoolData.recoveryTarget) / LAMPORTS_PER_GOR
                        : sovereign.recoveryTargetGor;
                      const progress = target > 0 ? (recovered / target) * 100 : 0;
                      return (
                        <>
                          <div className="border-t border-[var(--border)] my-3" />
                          <div className="mb-1">
                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Recovery Progress</div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-[var(--muted)]">
                                {recovered.toLocaleString(undefined, { maximumFractionDigits: 4 })} / {target.toLocaleString()} GOR
                              </span>
                              <span className="text-white font-medium">{Math.min(progress, 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--card-bg)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-[var(--hazard-yellow)]"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>{/* End left column */}

                {/* Right column — Creator Fees & Actions */}
                <div className="md:col-span-2">

                  {/* Creator Fees */}
                  {(sovereign.status === 'Recovery' || sovereign.status === 'Active') && sovereign.tokenMint && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-4">Creator Fees</h3>

                      {(() => {
                        const pendingGorFees = enginePoolData
                          ? (Number(enginePoolData.creatorFeesAccumulated) - Number(enginePoolData.creatorFeesClaimed)) / LAMPORTS_PER_GOR
                          : 0;
                        const pendingTokenFees =
                          (tokenFeeStats?.totalHarvestable ?? 0) +
                          (tokenFeeStats?.vaultBalance ?? 0);
                        const hasTokenFees = sovereign.sovereignType === 'TokenLaunch' && pendingTokenFees > 0;

                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm text-[var(--muted)]">Pending GOR</span>
                              <span className={`text-lg font-bold ${pendingGorFees > 0 ? 'text-[var(--slime)]' : 'text-[var(--muted)]'}`}>
                                {pendingGorFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                              </span>
                            </div>
                            {hasTokenFees && (
                              <div className="flex justify-between items-baseline">
                                <span className="text-sm text-[var(--muted)]">Pending {sovereign.tokenSymbol || 'Token'}</span>
                                <span className="text-lg font-bold text-[var(--slime)]">
                                  {pendingTokenFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} {sovereign.tokenSymbol || 'tokens'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Claim Button */}
                      <button
                        onClick={async () => {
                          if (!selectedSovereignId || !sovereign?.tokenMint) return;
                          setCollectAllStep('');
                          setCollectAllError(null);
                          setCollectAllDone(false);
                          try {
                            setCollectAllStep('Claiming creator fees...');
                            await claimCreatorFees.mutateAsync({
                              sovereignId: selectedSovereignId,
                            });

                            if (tokenFeeStats && tokenFeeStats.totalHarvestable > 0 && tokenFeeStats.harvestableAccounts.length > 0) {
                              setCollectAllStep('Claiming token transfer fees...');
                              await harvestTransferFees.mutateAsync({
                                sovereignId: selectedSovereignId,
                                sourceTokenAccounts: tokenFeeStats.harvestableAccounts,
                              });
                            }

                            setCollectAllStep('');
                            setCollectAllDone(true);
                          } catch (err: any) {
                            console.error('Claim fees failed:', err);
                            setCollectAllError(err.message || 'Transaction failed');
                            setCollectAllStep('');
                          }
                        }}
                        disabled={claimCreatorFees.isPending || harvestTransferFees.isPending || !!collectAllStep}
                        className="btn-money px-6 py-2 w-full mt-4"
                      >
                        {collectAllStep || 'Claim'}
                      </button>

                      {collectAllError && (
                        <p className="text-red-400 text-sm mt-2">{collectAllError}</p>
                      )}
                      {collectAllDone && (
                        <p className="text-[var(--slime)] text-sm mt-2">All fees claimed successfully!</p>
                      )}
                    </div>
                  )}

                  {/* Emergency Withdrawal — Creator */}
                  {sovereign.status === 'EmergencyUnlocked' && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-2">⚠️ Emergency Withdrawal</h3>
                      <p className="text-[var(--muted)] text-sm mb-4">
                        This sovereign has been emergency unlocked. As the creator, you can withdraw your escrow, creation fee, and all remaining tokens.
                      </p>
                      <button
                        onClick={async () => {
                          if (!selectedSovereignId) return;
                          try {
                            await emergencyWithdrawCreator.mutateAsync({
                              sovereignId: selectedSovereignId,
                            });
                          } catch (err: any) {
                            console.error('Emergency withdraw creator failed:', err);
                          }
                        }}
                        disabled={emergencyWithdrawCreator.isPending}
                        className="btn-hazard px-6 py-2 w-full"
                      >
                        {emergencyWithdrawCreator.isPending ? 'Withdrawing...' : 'Withdraw Creator Funds'}
                      </button>
                      {emergencyWithdrawCreator.error && (
                        <p className="text-red-400 text-sm mt-2">{(emergencyWithdrawCreator.error as Error).message}</p>
                      )}
                      {emergencyWithdrawCreator.isSuccess && (
                        <p className="text-[var(--slime)] text-sm mt-2">
                          Withdrawal successful! Your funds have been returned.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pool Address */}
                  {sovereign.poolState && sovereign.poolState !== '11111111111111111111111111111111' && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-3">Pool Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-[var(--muted)]">Pool Address</span>
                          <a
                            href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.poolState}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--money-green)] hover:underline font-mono text-xs"
                          >
                            {sovereign.poolState.slice(0, 8)}...{sovereign.poolState.slice(-8)}
                          </a>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-[var(--muted)]">Token Mint</span>
                          <a
                            href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.tokenMint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--money-green)] hover:underline font-mono text-xs"
                          >
                            {sovereign.tokenMint.slice(0, 8)}...{sovereign.tokenMint.slice(-8)}
                          </a>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-[var(--muted)]">AMM Config</span>
                          <a
                            href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.ammConfig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--money-green)] hover:underline font-mono text-xs"
                          >
                            {sovereign.ammConfig.slice(0, 8)}...{sovereign.ammConfig.slice(-8)}
                          </a>
                        </div>
                        {enginePoolData && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-[var(--muted)]">Pool Restricted</span>
                            <span className={`font-medium ${sovereign.poolRestricted ? 'text-[var(--hazard-yellow)]' : 'text-[var(--money-green)]'}`}>
                              {sovereign.poolRestricted ? 'Yes (Genesis LP only)' : 'No (Open)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>{/* End right column */}
              </div>{/* End grid */}
            </>
          )}

          {/* Selected sovereign but not creator */}
          {selectedSovereignId && sovereign && !isCreator && (
            <div className="card card-clean text-center py-8">
              <div className="text-3xl mb-3">🚫</div>
              <p className="text-[var(--muted)]">
                You are not the creator of this sovereign.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
