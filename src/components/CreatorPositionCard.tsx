'use client';

import { useState } from 'react';
import { CreatorPosition } from '@/hooks/useMyGovernancePositions';
import { useSovereign, useEnginePool, useTokenFeeStats, useProtocolState } from '@/hooks/useSovereign';
import { useClaimPoolCreatorFees, useClaimTransferFees, useUpdateSellFee, useRenounceSellFee, useEmergencyWithdrawCreator } from '@/hooks/useTransactions';
import { useProposals } from '@/hooks/useGovernance';
import { useTokenImage } from '@/hooks/useTokenImage';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Props {
  position: CreatorPosition;
}

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-[var(--money-green)]',
  Recovery: 'bg-[var(--hazard-yellow)]',
  Unwinding: 'bg-orange-400',
  Unwound: 'bg-red-400',
  Halted: 'bg-red-500',
};

export function CreatorPositionCard({ position }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: imageUrl } = useTokenImage(position.metadataUri);
  const { data: sovereign } = useSovereign(position.sovereignId);
  const { data: enginePool } = useEnginePool(position.sovereignId);
  const { data: tokenFeeStats } = useTokenFeeStats(position.sovereignId);
  const { data: protocolState } = useProtocolState();

  const claimCreatorFees = useClaimPoolCreatorFees();
  const { data: proposals } = useProposals(position.sovereignId);

  const claimTransferFees = useClaimTransferFees();
  const updateSellFee = useUpdateSellFee();
  const renounceSellFee = useRenounceSellFee();
  const emergencyWithdrawCreator = useEmergencyWithdrawCreator();

  const [swapClaimStep, setSwapClaimStep] = useState('');
  const [swapClaimError, setSwapClaimError] = useState<string | null>(null);
  const [swapClaimDone, setSwapClaimDone] = useState(false);
  const [transferClaimStep, setTransferClaimStep] = useState('');
  const [transferClaimError, setTransferClaimError] = useState<string | null>(null);
  const [transferClaimDone, setTransferClaimDone] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [renounceConfirmOpen, setRenounceConfirmOpen] = useState(false);
  const [renounceError, setRenounceError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState(false);

  // Pending fees
  const pendingGorFees = enginePool
    ? (Number(enginePool.creatorFeesAccumulated) - Number(enginePool.creatorFeesClaimed)) / LAMPORTS_PER_GOR
    : 0;
  const pendingTokenFees =
    (tokenFeeStats?.totalHarvestable ?? 0) +
    (tokenFeeStats?.vaultBalance ?? 0);
  const canClaimSwapFees = pendingGorFees > 0.0001 && enginePool?.recoveryComplete;
  const canClaimTransferFees = pendingTokenFees > 0.0001;

  const handleClaimSwapFees = async () => {
    setSwapClaimStep('Claiming swap fees...');
    setSwapClaimError(null);
    setSwapClaimDone(false);
    try {
      await claimCreatorFees.mutateAsync({ sovereignId: position.sovereignId });
      setSwapClaimStep('');
      setSwapClaimDone(true);
    } catch (err: any) {
      setSwapClaimError(err.message || 'Transaction failed');
      setSwapClaimStep('');
    }
  };

  const handleClaimTransferFees = async () => {
    setTransferClaimStep('');
    setTransferClaimError(null);
    setTransferClaimDone(false);
    try {
      // Harvest + claim in one transaction
      setTransferClaimStep('Claiming transfer fees...');
      const sourceAccounts = (tokenFeeStats && tokenFeeStats.totalHarvestable > 0)
        ? tokenFeeStats.harvestableAccounts
        : [];
      await claimTransferFees.mutateAsync({
        sovereignId: position.sovereignId,
        sourceTokenAccounts: sourceAccounts,
      });
      setTransferClaimStep('');
      setTransferClaimDone(true);
    } catch (err: any) {
      setTransferClaimError(err.message || 'Transaction failed');
      setTransferClaimStep('');
    }
  };

  // Pending actions badge
  const pendingActions: string[] = [];
  if (canClaimSwapFees) pendingActions.push(`${pendingGorFees.toFixed(2)} GOR`);
  if (canClaimTransferFees) pendingActions.push(`${pendingTokenFees.toFixed(2)} ${position.tokenSymbol}`);
  if (position.status === 'Halted') pendingActions.push('$overeign Halted');

  // Active / passed unwind proposals
  const activeProposal = proposals?.find((p: any) => p.status === 'Active');
  const passedProposal = proposals?.find((p: any) => p.status === 'Passed');
  const unwindProposal = activeProposal || passedProposal;
  if (unwindProposal && !expanded) pendingActions.push('⚠️ Unwind Vote');

  return (
    <div className="card card-clean overflow-hidden">
      {/* Compact header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--border)] flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-sm font-bold flex-shrink-0">
            {(position.tokenSymbol || '?').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm truncate">{position.name}</span>
            {position.tokenSymbol && (
              <span className="text-[var(--money-green)] text-xs font-medium">{position.tokenSymbol}</span>
            )}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[position.status] || 'bg-[var(--muted)]'}`} />
            <span className="text-[10px] text-[var(--muted)]">{position.status}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--hazard-orange)]/15 text-[var(--hazard-orange)] font-bold">Creator</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] mt-0.5">
            <span>Swap: {((enginePool?.swapFeeBps ?? position.swapFeeBps) / 100).toFixed(1)}%</span>
            <span>·</span>
            <span>Sell: {(position.sellFeeBps / 100).toFixed(1)}%</span>
            <span>·</span>
            <span>{position.depositorCount} NFTs</span>
            <span>·</span>
            <span>{position.totalFeesCollectedGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR fees</span>
          </div>
        </div>

        {/* Pending actions badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pendingActions.length > 0 && (
            <div className="flex gap-1">
              {pendingActions.map((action, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--hazard-orange)]/15 text-[var(--hazard-orange)]"
                >
                  {action}
                </span>
              ))}
            </div>
          )}
          <span className={`text-[var(--muted)] text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">GOR Reserve</div>
              <div className="text-sm font-bold text-[var(--money-green)]">
                {enginePool ? enginePool.gorReserveGor.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} GOR
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Total Trades</div>
              <div className="text-sm font-bold text-white">{enginePool?.totalTrades.toLocaleString() ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Total Fees</div>
              <div className="text-sm font-bold text-white">
                {position.totalFeesCollectedGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Solvency</div>
              {enginePool ? (() => {
                const isSolvent = enginePool.gorReserveGor >= enginePool.initialGorReserveGor - 0.01;
                return (
                  <div className={`text-sm font-bold flex items-center gap-1 ${isSolvent ? 'text-[var(--slime)]' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isSolvent ? 'bg-[var(--slime)]' : 'bg-red-500'}`} />
                    {isSolvent ? 'Solvent' : 'Under'}
                  </div>
                );
              })() : <div className="text-sm text-[var(--muted)]">—</div>}
            </div>
          </div>

          {/* === ACTIONS === */}

          {/* Active Unwind Proposal Warning */}
          {activeProposal && (() => {
            const now = new Date();
            const votingStarted = activeProposal.votingStartsAt ? activeProposal.votingStartsAt <= now : true;
            const votingEnded = activeProposal.votingEndsAt < now;
            const inDiscussion = activeProposal.votingStartsAt && !votingStarted && !votingEnded;
            const quorumPct = (activeProposal.totalVotedBps / activeProposal.quorumBps) * 100;
            const forPct = activeProposal.totalVotedBps > 0
              ? ((activeProposal.votesForBps / activeProposal.totalVotedBps) * 100).toFixed(0)
              : '0';
            return (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-red-400">🗳️ Unwind Proposal #{activeProposal.proposalId}</span>
                  {inDiscussion && (
                    <span className="text-[10px] text-[var(--hazard-orange)]">
                      discussion period — voting opens {formatDistanceToNow(activeProposal.votingStartsAt, { addSuffix: true })}
                    </span>
                  )}
                  {votingStarted && !votingEnded && (
                    <span className="text-[10px] text-[var(--muted)]">
                      ends {formatDistanceToNow(activeProposal.votingEndsAt, { addSuffix: true })}
                    </span>
                  )}
                  {votingEnded && (
                    <span className="text-[10px] text-[var(--hazard-yellow)]">voting ended — awaiting finalization</span>
                  )}
                </div>
                {inDiscussion ? (
                  <p className="text-xs text-[var(--hazard-orange)] mb-2">
                    Your $overeign&apos;s LP holders have initiated a vote to unwind this pool.
                    You have a <strong>3-day discussion period</strong> to address their concerns before voting opens
                    on {format(activeProposal.votingStartsAt, 'MMM d h:mm a')}.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--muted)] mb-2">
                    Your $overeign&apos;s LP holders are voting to unwind this pool.
                    If the vote passes ({(activeProposal.quorumBps / 100).toFixed(0)}% quorum,{' '}
                    {(activeProposal.passThresholdBps / 100).toFixed(0)}% majority required), the pool will enter unwinding.
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[var(--money-green)]">For: {forPct}%</span>
                  <span className="text-red-400">Against: {activeProposal.totalVotedBps > 0 ? (100 - Number(forPct)).toFixed(0) : '0'}%</span>
                  <span className="text-[var(--muted)]">
                    Quorum: {(activeProposal.totalVotedBps / 100).toFixed(0)}% / {(activeProposal.quorumBps / 100).toFixed(0)}%
                  </span>
                  <span className="text-[var(--muted)]">{activeProposal.voterCount} voter{activeProposal.voterCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })()}

          {/* Passed Unwind Proposal Warning */}
          {passedProposal && !activeProposal && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-red-400">⚠️ Unwind Vote Passed — Proposal #{passedProposal.proposalId}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {passedProposal.timelockEndsAt > new Date()
                  ? `Timelock active — execution available ${format(passedProposal.timelockEndsAt, 'MMM d h:mm a')} (${formatDistanceToNow(passedProposal.timelockEndsAt, { addSuffix: true })})`
                  : 'Timelock expired — this pool can be unwound at any time.'}
              </p>
            </div>
          )}

          {/* Observation Period Performance — shown when sovereign is Unwinding */}
          {position.status === 'Unwinding' && sovereign && enginePool && (() => {
            const DEFAULT_THRESHOLD_BPS = 125;
            const BPS_DENOM = 10000;
            const thresholdBps = (protocolState?.minFeeGrowthThreshold ?? 0) > 0
              ? protocolState!.minFeeGrowthThreshold
              : DEFAULT_THRESHOLD_BPS;
            const totalDeposited = Number(sovereign.totalDeposited);
            const requiredFees = (totalDeposited * thresholdBps) / BPS_DENOM;
            const currentFees = Number(enginePool.totalFeesCollected);
            const snapshotFees = Number(sovereign.feeGrowthSnapshotA);
            const feeDelta = Math.max(0, currentFees - snapshotFees);
            const performancePct = requiredFees > 0 ? (feeDelta / requiredFees) * 100 : 0;
            const feeDeltaGor = feeDelta / LAMPORTS_PER_GOR;
            const requiredFeesGor = requiredFees / LAMPORTS_PER_GOR;
            const isHealthy = performancePct >= 100;
            const observationEnd = sovereign.activityCheckTimestamp;

            return (
              <div className={`border rounded-xl p-3 ${isHealthy ? 'bg-[var(--money-green)]/5 border-[var(--money-green)]/20' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isHealthy ? 'text-[var(--money-green)]' : 'text-red-400'}`}>
                      {isHealthy ? '✅' : '📉'} Observation Performance
                    </span>
                    <span className={`text-lg font-black ${isHealthy ? 'text-[var(--money-green)]' : performancePct >= 50 ? 'text-[var(--hazard-yellow)]' : 'text-red-400'}`}>
                      {performancePct.toFixed(1)}%
                    </span>
                  </div>
                  {observationEnd && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {observationEnd > new Date()
                        ? `ends ${formatDistanceToNow(observationEnd, { addSuffix: true })}`
                        : 'observation ended'}
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-[var(--card-bg)] rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${isHealthy ? 'bg-[var(--money-green)]' : performancePct >= 50 ? 'bg-[var(--hazard-yellow)]' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(performancePct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[var(--muted)]">
                  <span>Fees earned: {feeDeltaGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                  <span>Required: {requiredFeesGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR ({(thresholdBps / 100).toFixed(2)}% of TVL)</span>
                </div>
                <p className="text-[10px] mt-1.5 text-[var(--muted)]">
                  {isHealthy
                    ? 'Volume threshold met — unwind will be cancelled when executed.'
                    : 'Volume below threshold. Increase trading activity to save this pool before the observation period ends.'}
                </p>
              </div>
            );
          })()}

          {/* Swap Fee Claiming (GOR — requires recovery complete) */}
          {(position.status === 'Recovery' || position.status === 'Active') && (
            <div className="bg-[var(--hazard-orange)]/5 border border-[var(--hazard-orange)]/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">Swap fees (GOR)</div>
                  <div className="text-lg font-bold text-[var(--hazard-orange)]">
                    {pendingGorFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                  </div>
                  {!enginePool?.recoveryComplete && (
                    <div className="text-[10px] text-[var(--hazard-yellow)]">
                      🔒 Locked until recovery completes
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClaimSwapFees}
                  disabled={!canClaimSwapFees || claimCreatorFees.isPending || !!swapClaimStep}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--hazard-orange)] text-white hover:opacity-90 disabled:opacity-40"
                >
                  {swapClaimStep || 'Claim GOR'}
                </button>
              </div>
              {swapClaimError && <p className="text-red-400 text-xs mt-2">{swapClaimError}</p>}
              {swapClaimDone && <p className="text-[var(--slime)] text-xs mt-2">Swap fees claimed!</p>}
            </div>
          )}

          {/* Transfer Fee Claiming (Tokens — no restriction) */}
          {(position.status === 'Recovery' || position.status === 'Active') && !(position.feeControlRenounced && pendingTokenFees < 0.0001) && (
            <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">Transfer fees ({position.tokenSymbol})</div>
                  <div className="text-lg font-bold text-[var(--money-green)]">
                    {pendingTokenFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} {position.tokenSymbol}
                  </div>
                </div>
                <button
                  onClick={handleClaimTransferFees}
                  disabled={!canClaimTransferFees || claimTransferFees.isPending || !!transferClaimStep}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--money-green)] text-black hover:opacity-90 disabled:opacity-40"
                >
                  {transferClaimStep || `Claim ${position.tokenSymbol}`}
                </button>
              </div>
              {transferClaimError && <p className="text-red-400 text-xs mt-2">{transferClaimError}</p>}
              {transferClaimDone && <p className="text-[var(--slime)] text-xs mt-2">Transfer fees claimed!</p>}
            </div>
          )}

          {/* Fee Control */}
          {!position.feeControlRenounced && (position.status === 'Recovery' || position.status === 'Active') && (
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3">
              <div>
                <div className="text-sm font-bold text-white">Transfer Fee Control</div>
                <p className="text-[10px] text-[var(--muted)]">
                  Current: {tokenFeeStats ? `${(tokenFeeStats.transferFeeBps / 100).toFixed(2)}%` : `${(position.sellFeeBps / 100).toFixed(1)}%`}
                  {tokenFeeStats?.pendingFeeBps != null && (
                    <span className="text-[var(--hazard-orange)] ml-2">
                      Pending: {(tokenFeeStats.pendingFeeBps / 100).toFixed(2)}% (epoch {tokenFeeStats.pendingFeeEpoch})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => { setFeeModalOpen(true); setFeeInput(''); setFeeError(null); setFeeSuccess(false); }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--hazard-orange)] text-white hover:opacity-90"
              >
                Update Fee
              </button>
            </div>
          )}

          {/* Renounce Transfer Fee */}
          {!position.feeControlRenounced && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-400">Renounce Transfer Fee</div>
                  <p className="text-[10px] text-[var(--muted)]">
                    Irreversible — permanently sets to 0%, removes authority
                  </p>
                </div>
                <button
                  onClick={() => { setRenounceConfirmOpen(true); setRenounceError(null); }}
                  disabled={renounceSellFee.isPending}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:opacity-90 disabled:opacity-40"
                >
                  Renounce
                </button>
              </div>
              {renounceError && <p className="text-red-400 text-xs mt-2">{renounceError}</p>}
            </div>
          )}

          {position.feeControlRenounced && (
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-3 text-xs text-red-400">
              🔒 Fee control renounced — fees are permanently fixed at 0%
            </div>
          )}

          {/* $overeign Halted */}
          {position.status === 'Halted' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-400">⚠️ $overeign Halted</div>
                  <p className="text-[10px] text-[var(--muted)]">
                    Withdraw your escrow, creation fee, and remaining tokens.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await emergencyWithdrawCreator.mutateAsync({ sovereignId: position.sovereignId });
                  }}
                  disabled={emergencyWithdrawCreator.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:opacity-90 disabled:opacity-40"
                >
                  {emergencyWithdrawCreator.isPending ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
              {emergencyWithdrawCreator.error && (
                <p className="text-red-400 text-xs mt-2">{(emergencyWithdrawCreator.error as Error).message}</p>
              )}
            </div>
          )}

          {/* Recovery progress */}
          {position.status === 'Recovery' && enginePool && (() => {
            const recovered = Number(enginePool.totalRecovered) / LAMPORTS_PER_GOR;
            const target = Number(enginePool.recoveryTarget) / LAMPORTS_PER_GOR;
            const progress = target > 0 ? (recovered / target) * 100 : 0;
            return (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--muted)]">Recovery: {recovered.toFixed(2)} / {target.toLocaleString()} GOR</span>
                  <span className="text-white font-bold">{Math.min(progress, 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--card-bg)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--hazard-yellow)]" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Links */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <Link
              href={`/sovereign/${position.sovereignId}/edit`}
              className="text-xs text-[var(--hazard-orange)] hover:underline"
            >
              ✏️ Edit Landing Page
            </Link>
            <Link
              href={`/sovereign/${position.sovereignId}`}
              className="text-xs text-[var(--money-green)] hover:underline"
            >
              View Details →
            </Link>
          </div>

          {/* Fee update modal */}
          {feeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setFeeModalOpen(false)}>
              <div className="bg-[var(--dark-green-bg)] border border-[var(--border)] rounded-xl p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                  className="w-full px-3 py-2 rounded bg-[var(--landfill-black)] border border-[var(--border)] text-white text-sm mb-3 focus:border-[var(--money-green)] focus:outline-none"
                  autoFocus
                />
                {feeError && <p className="text-red-400 text-xs mb-2">{feeError}</p>}
                {feeSuccess && <p className="text-[var(--slime)] text-xs mb-2">Fee updated — activates next epoch.</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeeModalOpen(false)}
                    className="flex-1 px-3 py-2 rounded text-xs font-medium bg-[var(--card-bg)] text-[var(--muted)] hover:text-white border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded text-xs font-medium bg-[var(--money-green)] text-black hover:opacity-90 disabled:opacity-40"
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
                        await updateSellFee.mutateAsync({ sovereignId: position.sovereignId, newFeeBps: bps });
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

          {/* Renounce confirmation modal */}
          {renounceConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRenounceConfirmOpen(false)}>
              <div className="bg-[var(--dark-green-bg)] border border-red-500/30 rounded-xl p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-red-400 font-bold text-sm mb-2">⚠️ Renounce Transfer Fee</h4>
                <p className="text-[var(--muted)] text-xs mb-4">
                  This is <span className="text-red-400 font-bold">irreversible</span>. The transfer fee will be permanently set to 0% and no one — including you — will ever be able to change it again.
                </p>
                {renounceError && <p className="text-red-400 text-xs mb-3">{renounceError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setRenounceConfirmOpen(false)}
                    className="flex-1 px-3 py-2 rounded text-xs font-medium bg-[var(--card-bg)] text-[var(--muted)] hover:text-white border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded text-xs font-medium bg-red-500 text-white hover:opacity-90 disabled:opacity-40"
                    disabled={renounceSellFee.isPending}
                    onClick={async () => {
                      setRenounceError(null);
                      try {
                        await renounceSellFee.mutateAsync({ sovereignId: position.sovereignId });
                        setRenounceConfirmOpen(false);
                      } catch (err: any) {
                        setRenounceError(err?.message || 'Failed to renounce');
                      }
                    }}
                  >
                    {renounceSellFee.isPending ? 'Renouncing...' : 'Confirm Renounce'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
