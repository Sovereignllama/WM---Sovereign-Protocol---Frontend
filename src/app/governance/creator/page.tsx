'use client';

import { useState, useMemo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereigns, useSovereign, useEnginePool, useTokenFeeStats } from '@/hooks/useSovereign';
import { useClaimPoolCreatorFees, useHarvestTransferFees, useEmergencyWithdrawCreator, useUpdateBinSize } from '@/hooks/useTransactions';
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
  const updateBinSize = useUpdateBinSize();

  // Collect-all fee state
  const [collectAllStep, setCollectAllStep] = useState('');
  const [collectAllError, setCollectAllError] = useState<string | null>(null);
  const [collectAllDone, setCollectAllDone] = useState(false);

  // Bin size control state
  const [binSizeInput, setBinSizeInput] = useState('');
  const [binSizeError, setBinSizeError] = useState<string | null>(null);
  const [binSizeSuccess, setBinSizeSuccess] = useState(false);

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
                            {sovereign.totalFeesCollectedGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">{sovereign.tokenSymbol || 'Token'} Vault</span>
                          <span className="text-white font-medium">
                            {tokenFeeStats
                              ? tokenFeeStats.vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })
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
                          <span className="text-white font-medium">
                            {tokenFeeStats
                              ? `${(tokenFeeStats.transferFeeBps / 100).toFixed(2)}%`
                              : `${(sovereign.sellFeeBps / 100).toFixed(1)}%`
                            }
                          </span>
                        </div>
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

                    {/* Bin Size / Price Granularity */}
                    {enginePoolData && (
                      <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Price Granularity</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Bin Size</span>
                            <span className="text-white font-medium">
                              {enginePoolData.binSizeFormatted?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'} tokens
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Token Reserve</span>
                            <span className="text-white font-medium">
                              {enginePoolData.tokenReserveFormatted?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'} tokens
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Active Bins</span>
                            <span className="text-white font-medium">
                              {enginePoolData.binSizeFormatted && enginePoolData.tokenReserveFormatted && enginePoolData.binSizeFormatted > 0
                                ? Math.ceil(enginePoolData.tokenReserveFormatted / enginePoolData.binSizeFormatted).toLocaleString()
                                : '—'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Spot Price</span>
                            <span className="text-[var(--money-green)] font-medium">
                              {enginePoolData.spotPrice
                                ? (enginePoolData.spotPrice / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 8 })
                                : '—'
                              } GOR/token
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

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

                  {/* Creator Fees & GOR Reserves */}
                  {(sovereign.status === 'Recovery' || sovereign.status === 'Active') && sovereign.tokenMint && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-2">Creator Fees</h3>
                      <p className="text-[var(--muted)] text-sm mb-4">
                        Claim pending fees, view reserves, and track withdrawable creator revenue.
                      </p>

                      {/* Pending Fees — split GOR + Token */}
                      {(() => {
                        const pendingGorFees = enginePoolData
                          ? (Number(enginePoolData.creatorFeesAccumulated) - Number(enginePoolData.creatorFeesClaimed)) / LAMPORTS_PER_GOR
                          : 0;
                        const pendingTokenFees =
                          (tokenFeeStats?.totalHarvestable ?? 0) +
                          (tokenFeeStats?.vaultBalance ?? 0);
                        return (
                          <div className="mb-4 space-y-2">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                Pending Swap Fees <span className="text-[var(--money-green)]">(GOR)</span>
                              </span>
                              <span className={`text-lg font-bold ${pendingGorFees > 0 ? 'text-[var(--slime)]' : 'text-[var(--muted)]'}`}>
                                {pendingGorFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                              </span>
                            </div>
                            {sovereign.sovereignType === 'TokenLaunch' && (
                              <div className="flex justify-between items-baseline">
                                <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                  Pending Transfer Fees <span className="text-[var(--money-green)]">({sovereign.tokenSymbol || 'Token'})</span>
                                </span>
                                <span className={`text-lg font-bold ${pendingTokenFees > 0 ? 'text-[var(--slime)]' : 'text-[var(--muted)]'}`}>
                                  {pendingTokenFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} {sovereign.tokenSymbol || 'tokens'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Lifetime Collected */}
                      <div className="mb-4 p-3 rounded-lg bg-[var(--card-bg)]">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Total Collected (Lifetime)</div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">GOR Swap Fees</span>
                            <span className="text-[var(--money-green)] font-medium">
                              {(enginePoolData ? enginePoolData.totalFeesCollectedGor : sovereign.totalFeesCollectedGor).toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                            </span>
                          </div>
                          {(() => {
                            const lpDistributed = enginePoolData
                              ? Number(enginePoolData.lpFeesAccumulated) / LAMPORTS_PER_GOR
                              : sovereign.totalSolFeesDistributedGor;
                            return lpDistributed > 0 ? (
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">LP Fees Distributed</span>
                                <span className="text-white font-medium">{lpDistributed.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* GOR Reserves Waterfall */}
                      {enginePoolData && (() => {
                        const gorReserve = enginePoolData.gorReserveGor;
                        const tokenReserve = enginePoolData.tokenReserveFormatted;
                        const totalSupply = enginePoolData.totalTokenSupplyFormatted;
                        const transferFeeBps = tokenFeeStats?.transferFeeBps ?? sovereign.sellFeeBps;
                        const swapFeeBps = sovereign.swapFeeBps;

                        const totalFeesGor = enginePoolData ? enginePoolData.totalFeesCollectedGor : sovereign.totalFeesCollectedGor;
                        const lpDistributedGor = enginePoolData
                          ? Number(enginePoolData.lpFeesAccumulated) / LAMPORTS_PER_GOR
                          : sovereign.totalSolFeesDistributedGor;
                        const investorFeesOwed = Math.max(0, totalFeesGor - lpDistributedGor);
                        const guaranteedPrincipal = sovereign.totalDepositedGor;

                        const creatorTokens =
                          (enginePoolData ? (Number(enginePoolData.creatorFeesAccumulated) - Number(enginePoolData.creatorFeesClaimed)) / 1e9 : 0) +
                          (tokenFeeStats?.totalHarvestable ?? 0) +
                          (tokenFeeStats?.vaultBalance ?? 0);

                        const outsidePool = Math.max(0, totalSupply - tokenReserve);
                        const holderTokens = Math.max(0, outsidePool - creatorTokens);

                        const holdersAfterTransfer = holderTokens * (1 - transferFeeBps / 10000);
                        const holdersAfterSwap = holdersAfterTransfer * (1 - swapFeeBps / 10000);
                        const holderLiquidationValue = (tokenReserve > 0 && gorReserve > 0 && holdersAfterSwap > 0)
                          ? gorReserve * holdersAfterSwap / (tokenReserve + holdersAfterSwap)
                          : 0;

                        const withdrawableCreatorFees = Math.max(0,
                          gorReserve - investorFeesOwed - guaranteedPrincipal - holderLiquidationValue
                        );

                        return (
                          <div className="mb-4 p-3 rounded-lg bg-[var(--card-bg)]">
                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">GOR Reserves Waterfall</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Current GOR Reserves</span>
                                <span className="text-[var(--money-green)] font-bold">
                                  {gorReserve.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Investor Fees Owed</span>
                                <span className="text-red-400 font-medium">
                                  {investorFeesOwed.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Guaranteed Principal</span>
                                <span className="text-red-400 font-medium">
                                  {guaranteedPrincipal.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Holder Liquidation Value</span>
                                <span className="text-red-400 font-medium">
                                  {holderLiquidationValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                </span>
                              </div>
                              <div className="border-t border-[var(--border)] my-1" />
                              <div className="flex justify-between text-sm">
                                <span className="text-white font-bold">Withdrawable Creator Fees</span>
                                <span className={`font-bold ${withdrawableCreatorFees > 0 ? 'text-[var(--money-green)]' : 'text-red-400'}`}>
                                  {withdrawableCreatorFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                                </span>
                              </div>
                              {withdrawableCreatorFees <= 0 && (
                                <p className="text-red-400 text-xs mt-1">
                                  ⚠ Obligations exceed reserves — no withdrawable creator fees at this time.
                                </p>
                              )}
                            </div>
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
                            // Claim creator's share of engine pool swap fees
                            setCollectAllStep('Claiming creator fees...');
                            await claimCreatorFees.mutateAsync({
                              sovereignId: selectedSovereignId,
                            });

                            // Also harvest Token-2022 transfer fees if applicable
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
                        className="btn-money px-6 py-2 w-full"
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

                  {/* Bin Size Control */}
                  {(sovereign.status === 'Recovery' || sovereign.status === 'Active') && enginePoolData && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-2">Price Granularity</h3>
                      <p className="text-[var(--muted)] text-sm mb-4">
                        Adjust the bin size to control price step granularity. Larger bins create bigger price jumps per trade, smaller bins create smoother pricing.
                      </p>

                      {/* Current values */}
                      <div className="mb-4 p-3 rounded-lg bg-[var(--card-bg)]">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Current Configuration</div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Bin Size</span>
                            <span className="text-white font-medium">
                              {enginePoolData.binSizeFormatted?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'} tokens
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Active Bins</span>
                            <span className="text-white font-medium">
                              {enginePoolData.binSizeFormatted && enginePoolData.tokenReserveFormatted && enginePoolData.binSizeFormatted > 0
                                ? Math.ceil(enginePoolData.tokenReserveFormatted / enginePoolData.binSizeFormatted).toLocaleString()
                                : '—'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Spot Price</span>
                            <span className="text-[var(--money-green)] font-medium">
                              {enginePoolData.spotPrice
                                ? (enginePoolData.spotPrice / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 8 })
                                : '—'
                              } GOR/token
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bin size input */}
                      <div className="mb-3">
                        <label className="text-sm text-[var(--muted)] block mb-1">New Bin Size (tokens)</label>
                        <input
                          type="number"
                          value={binSizeInput}
                          onChange={(e) => {
                            setBinSizeInput(e.target.value);
                            setBinSizeError(null);
                            setBinSizeSuccess(false);
                          }}
                          placeholder={enginePoolData.binSizeFormatted?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '50000'}
                          className="w-full bg-[#1a1a2e] border border-[var(--border)] rounded px-3 py-2.5 text-white text-sm focus:border-[var(--money-green)] focus:outline-none transition-colors"
                          min={1}
                        />
                        {binSizeInput && Number(binSizeInput) > 0 && enginePoolData.tokenReserveFormatted > 0 && (
                          <p className="text-xs text-[var(--muted)] mt-1">
                            ≈ {Math.ceil(enginePoolData.tokenReserveFormatted / Number(binSizeInput)).toLocaleString()} bins
                          </p>
                        )}
                      </div>

                      <button
                        onClick={async () => {
                          if (!selectedSovereignId || !binSizeInput) return;
                          const numTokens = Number(binSizeInput);
                          if (isNaN(numTokens) || numTokens <= 0) {
                            setBinSizeError('Enter a valid positive number');
                            return;
                          }
                          // Convert tokens to lamports (1 token = 1e9 lamports)
                          const binSizeLamports = BigInt(Math.round(numTokens * LAMPORTS_PER_GOR));
                          setBinSizeError(null);
                          setBinSizeSuccess(false);
                          try {
                            await updateBinSize.mutateAsync({
                              sovereignId: selectedSovereignId,
                              newBinSize: binSizeLamports.toString(),
                            });
                            setBinSizeSuccess(true);
                            setBinSizeInput('');
                          } catch (err: any) {
                            console.error('Update bin size failed:', err);
                            setBinSizeError(err.message || 'Transaction failed');
                          }
                        }}
                        disabled={updateBinSize.isPending || !binSizeInput}
                        className="btn-money px-6 py-2 w-full"
                      >
                        {updateBinSize.isPending ? 'Updating...' : 'Update Bin Size'}
                      </button>

                      {binSizeError && (
                        <p className="text-red-400 text-sm mt-2">{binSizeError}</p>
                      )}
                      {binSizeSuccess && (
                        <p className="text-[var(--slime)] text-sm mt-2">Bin size updated successfully!</p>
                      )}
                    </div>
                  )}

                  {/* Tokens in Circulation */}
                  {(sovereign.status === 'Recovery' || sovereign.status === 'Active') && enginePoolData && enginePoolData.totalTokenSupplyFormatted > 0 && (
                    <div className="card card-clean p-4 mb-4">
                      <h3 className="h3 text-white mb-2">Tokens in Circulation</h3>
                      <p className="text-[var(--muted)] text-sm mb-4">
                        Tokens held outside the liquidity pool and their true liquidation value.
                      </p>
                      {(() => {
                        const totalSupply = enginePoolData.totalTokenSupplyFormatted;
                        const inPool = enginePoolData.tokenReserveFormatted;
                        const gorReserve = enginePoolData.gorReserveGor;
                        const outsidePool = Math.max(0, totalSupply - inPool);
                        const pctOutside = totalSupply > 0 ? (outsidePool / totalSupply) * 100 : 0;

                        // Spot value (naive: outsidePool × current price, no impact)
                        const gorPerToken = enginePoolData.spotPrice ? enginePoolData.spotPrice / LAMPORTS_PER_GOR : 0;
                        const spotValue = gorPerToken > 0 ? outsidePool * gorPerToken : 0;

                        // True liquidation value using constant-product (x·y=k) with fees
                        // Full-range CLMM ≡ constant-product AMM
                        const transferFeeBps = tokenFeeStats?.transferFeeBps ?? sovereign.sellFeeBps;
                        const swapFeeBps = sovereign.swapFeeBps;

                        // 1) Transfer fee reduces tokens entering the pool
                        const afterTransferFee = outsidePool * (1 - transferFeeBps / 10000);
                        // 2) Swap fee reduces the effective input
                        const afterSwapFee = afterTransferFee * (1 - swapFeeBps / 10000);
                        // 3) Constant-product: gorOut = gorReserve × Δx / (tokenReserve + Δx)
                        const trueGorOut = (inPool > 0 && gorReserve > 0 && afterSwapFee > 0)
                          ? gorReserve * afterSwapFee / (inPool + afterSwapFee)
                          : 0;

                        // Price impact
                        const priceImpact = spotValue > 0 ? ((spotValue - trueGorOut) / spotValue) * 100 : 0;

                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Total Supply</span>
                              <span className="text-white font-medium">
                                {totalSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sovereign.tokenSymbol || 'tokens'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">In Pool</span>
                              <span className="text-white font-medium">
                                {inPool.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sovereign.tokenSymbol || 'tokens'}
                              </span>
                            </div>
                            <div className="border-t border-[var(--border)] my-1" />
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Outside Pool</span>
                              <span className="text-[var(--hazard-yellow)] font-bold">
                                {outsidePool.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sovereign.tokenSymbol || 'tokens'}
                                <span className="text-[var(--muted)] font-normal ml-1">
                                  ({pctOutside.toFixed(1)}%)
                                </span>
                              </span>
                            </div>

                            <div className="border-t border-[var(--border)] my-1" />

                            {/* Spot vs True value */}
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Spot Value</span>
                              <span className="text-white font-medium">
                                {spotValue > 0
                                  ? `${spotValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR`
                                  : '—'
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">True Liquidation Value</span>
                              <span className="text-[var(--money-green)] font-bold">
                                {trueGorOut > 0
                                  ? `${trueGorOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR`
                                  : '—'
                                }
                              </span>
                            </div>
                          </div>
                        );
                      })()}
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
