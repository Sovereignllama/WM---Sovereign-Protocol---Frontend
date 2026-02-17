'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereigns, useSovereign, useDepositRecord, usePendingEngineLpFees, usePendingClaimableFees, useEnginePool } from '@/hooks/useSovereign';
import { useProposals, useVoteRecord, useProposeUnwind, useCastVote, useFinalizeVote, useClaimUnwind, getProposalStatusString } from '@/hooks/useGovernance';
import { useClaimDepositorFees, useClaimPoolLpFees, useEmergencyWithdraw } from '@/hooks/useTransactions';
import { useTokenImage } from '@/hooks/useTokenImage';
import { StatusBadge } from '@/components/StatusBadge';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

// ============================================================
// Proposal Card Component
// ============================================================

function ProposalCard({
  proposal,
  sovereignId,
  depositRecord,
  sovereign,
}: {
  proposal: any;
  sovereignId: string;
  depositRecord: any;
  sovereign: any;
}) {
  const { connected, publicKey } = useWallet();
  const { data: voteRecord, isLoading: voteLoading } = useVoteRecord(sovereignId, proposal.proposalId);
  const castVote = useCastVote();
  const finalizeVote = useFinalizeVote();
  const claimUnwind = useClaimUnwind();

  const isActive = proposal.status === 'Active';
  const isPassed = proposal.status === 'Passed';
  const isExecuted = proposal.status === 'Executed';
  const isFailed = proposal.status === 'Failed';
  const votingEnded = proposal.votingEndsAt < new Date();
  const timelockEnded = proposal.timelockEndsAt < new Date();
  const hasVoted = !!voteRecord;
  const hasNft = depositRecord?.nftMinted;
  const nftMint = depositRecord?.nftMint;
  const originalDepositor = depositRecord?.depositor;

  // Can vote: has NFT, proposal is active, hasn't voted yet, voting period not ended
  const canVote = connected && hasNft && isActive && !hasVoted && !votingEnded;
  // Can finalize: voting period ended, proposal is still active
  const canFinalize = connected && isActive && votingEnded;
  // Can claim: sovereign is unwound, has NFT, hasn't claimed
  const canClaim = connected && hasNft && sovereign?.status === 'Unwound' && !depositRecord?.unwindClaimed;

  const votesForPercent = proposal.totalVotedBps > 0
    ? ((proposal.votesForBps / proposal.totalVotedBps) * 100).toFixed(1)
    : '0';
  const votesAgainstPercent = proposal.totalVotedBps > 0
    ? ((proposal.votesAgainstBps / proposal.totalVotedBps) * 100).toFixed(1)
    : '0';
  const quorumProgress = ((proposal.totalVotedBps / proposal.quorumBps) * 100);

  const handleVote = async (support: boolean) => {
    if (!originalDepositor || !nftMint) return;
    try {
      await castVote.mutateAsync({
        sovereignId,
        proposalId: proposal.proposalId,
        originalDepositor,
        nftMint,
        support,
      });
    } catch (err: any) {
      console.error('Vote failed:', err);
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeVote.mutateAsync({
        sovereignId,
        proposalId: proposal.proposalId,
      });
    } catch (err: any) {
      console.error('Finalize failed:', err);
    }
  };

  const handleClaimUnwind = async () => {
    if (!originalDepositor || !nftMint) return;
    try {
      await claimUnwind.mutateAsync({
        sovereignId,
        originalDepositor,
        nftMint,
      });
    } catch (err: any) {
      console.error('Claim unwind failed:', err);
    }
  };

  const statusColors: Record<string, string> = {
    Active: 'text-[var(--hazard-yellow)]',
    Passed: 'text-[var(--money-green)]',
    Failed: 'text-red-400',
    Executed: 'text-[var(--slime)]',
    Cancelled: 'text-[var(--muted)]',
  };

  return (
    <div className="card card-clean p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">
            Proposal #{proposal.proposalId}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isActive ? 'bg-[var(--hazard-yellow)]/20' :
            isPassed ? 'bg-[var(--money-green)]/20' :
            isExecuted ? 'bg-[var(--slime)]/20' :
            isFailed ? 'bg-red-400/20' : 'bg-[var(--card-bg)]'
          } ${statusColors[proposal.status] || 'text-[var(--muted)]'}`}>
            {proposal.status}
          </span>
        </div>
        <span className="text-xs text-[var(--muted)]">
          {format(proposal.createdAt, 'MMM d, yyyy HH:mm')}
        </span>
      </div>

      {/* Proposer */}
      <div className="text-xs text-[var(--muted)] mb-3">
        Proposed by{' '}
        <a
          href={`${config.explorerUrl}${config.explorerAddressPath}${proposal.proposer}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--money-green)] hover:underline font-mono"
        >
          {proposal.proposer.slice(0, 4)}...{proposal.proposer.slice(-4)}
        </a>
        {publicKey?.toBase58() === proposal.proposer && (
          <span className="text-[var(--money-green)] ml-1">(you)</span>
        )}
      </div>

      {/* Vote Progress */}
      <div className="space-y-2 mb-3">
        {/* For */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--money-green)]">For</span>
            <span className="text-white">{(proposal.votesForBps / 100).toFixed(1)}% of total · {votesForPercent}% of voted</span>
          </div>
          <div className="w-full h-2 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(proposal.votesForBps / 100, 100)}%`, backgroundColor: 'var(--money-green)' }}
            />
          </div>
        </div>

        {/* Against */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400">Against</span>
            <span className="text-white">{(proposal.votesAgainstBps / 100).toFixed(1)}% of total · {votesAgainstPercent}% of voted</span>
          </div>
          <div className="w-full h-2 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(proposal.votesAgainstBps / 100, 100)}%`, backgroundColor: 'rgb(248, 113, 113)' }}
            />
          </div>
        </div>

        {/* Quorum */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--muted)]">Quorum</span>
            <span className="text-white">
              {(proposal.totalVotedBps / 100).toFixed(1)}% / {(proposal.quorumBps / 100).toFixed(1)}% required
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(quorumProgress, 100)}%`,
                backgroundColor: quorumProgress >= 100 ? 'var(--money-green)' : 'var(--hazard-yellow)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[var(--muted)] mb-3 flex-wrap">
        <span>Proposed {format(proposal.createdAt, 'MMM d, yyyy')}</span>
        <span>·</span>
        <span>{proposal.voterCount} voter{proposal.voterCount !== 1 ? 's' : ''}</span>
        <span>·</span>
        {isActive && !votingEnded && (
          <span>
            Voting ends {format(proposal.votingEndsAt, 'MMM d, yyyy h:mm a')} ({formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })})
          </span>
        )}
        {isActive && votingEnded && (
          <span className="text-[var(--hazard-yellow)]">Voting ended {format(proposal.votingEndsAt, 'MMM d, yyyy')} — awaiting finalization</span>
        )}
        {isPassed && !timelockEnded && (
          <span className="text-[var(--money-green)]">
            Timelock ends {format(proposal.timelockEndsAt, 'MMM d, yyyy h:mm a')} ({formatDistanceToNow(proposal.timelockEndsAt, { addSuffix: true })})
          </span>
        )}
        {isPassed && timelockEnded && (
          <span className="text-[var(--money-green)]">Timelock expired — ready for execution</span>
        )}
        {isExecuted && proposal.executedAt && (
          <span>Executed {format(proposal.executedAt, 'MMM d, yyyy h:mm a')}</span>
        )}
        {isFailed && <span className="text-red-400">Proposal failed</span>}
      </div>

      {/* Your vote status */}
      {hasNft && !voteLoading && (
        <div className="text-xs mb-3">
          {hasVoted ? (
            <>
              <span className={voteRecord.voteFor ? 'text-[var(--money-green)]' : 'text-red-400'}>
                You voted {voteRecord.voteFor ? 'FOR' : 'AGAINST'} with {(voteRecord.votingPowerBps / 100).toFixed(1)}% voting power
              </span>
              <span className="text-zinc-400 ml-2">
                on {format(voteRecord.votedAt, 'MMM d, yyyy')} at {format(voteRecord.votedAt, 'h:mm a')}
              </span>
            </>
          ) : isActive && !votingEnded ? (
            <span className="text-[var(--hazard-yellow)]">You haven&apos;t voted yet</span>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canVote && (
          <>
            <button
              onClick={() => handleVote(true)}
              disabled={castVote.isPending}
              className="px-4 py-2 rounded text-sm font-bold transition-all"
              style={{ backgroundColor: 'var(--money-green)', color: '#000' }}
            >
              {castVote.isPending ? 'Voting...' : 'Vote FOR'}
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={castVote.isPending}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold transition-all"
            >
              {castVote.isPending ? 'Voting...' : 'Vote AGAINST'}
            </button>
          </>
        )}

        {canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={finalizeVote.isPending}
            className="btn-money px-4 py-2 text-sm"
          >
            {finalizeVote.isPending ? 'Finalizing...' : 'Finalize Vote'}
          </button>
        )}

        {canClaim && (
          <button
            onClick={handleClaimUnwind}
            disabled={claimUnwind.isPending}
            className="btn-money px-4 py-2 text-sm"
          >
            {claimUnwind.isPending ? 'Claiming...' : 'Claim Unwind Proceeds'}
          </button>
        )}
      </div>

      {/* Error messages */}
      {castVote.error && (
        <p className="text-red-400 text-xs mt-2">{(castVote.error as Error).message}</p>
      )}
      {finalizeVote.error && (
        <p className="text-red-400 text-xs mt-2">{(finalizeVote.error as Error).message}</p>
      )}
      {claimUnwind.error && (
        <p className="text-red-400 text-xs mt-2">{(claimUnwind.error as Error).message}</p>
      )}
    </div>
  );
}

// ============================================================
// Main Governance Page
// ============================================================

export default function GovernancePage() {
  const { connected, publicKey } = useWallet();
  const [selectedSovereignId, setSelectedSovereignId] = useState<string | null>(null);

  // Fetch all sovereigns for selector
  const { data: allSovereigns, isLoading: sovLoading } = useSovereigns();

  // Filter to only Active/Recovery/Unwinding/Unwound/EmergencyUnlocked sovereigns (governance-eligible)
  const governableSovereigns = useMemo(() => {
    if (!allSovereigns) return [];
    return allSovereigns.filter((s: any) =>
      ['Active', 'Recovery', 'Unwinding', 'Unwound', 'EmergencyUnlocked'].includes(s.status)
    );
  }, [allSovereigns]);

  // Selected sovereign data
  const { data: sovereign } = useSovereign(selectedSovereignId ?? undefined);
  const { data: depositRecord } = useDepositRecord(selectedSovereignId ?? undefined);
  const { data: proposals, isLoading: proposalsLoading } = useProposals(selectedSovereignId ?? undefined);
  const { data: imageUrl } = useTokenImage(sovereign?.metadataUri);
  const proposeUnwind = useProposeUnwind();
  const claimFees = useClaimDepositorFees();
  const claimLpFees = useClaimPoolLpFees();
  const emergencyWithdraw = useEmergencyWithdraw();
  const { data: pendingLpFees } = usePendingEngineLpFees(selectedSovereignId ?? undefined);
  const { data: pendingClaim } = usePendingClaimableFees(selectedSovereignId ?? undefined);
  const { data: enginePool } = useEnginePool(selectedSovereignId ?? undefined);

  // Auth checks
  const hasDeposit = !!depositRecord;
  const hasNft = depositRecord?.nftMinted === true;
  const nftMint = depositRecord?.nftMint;
  const originalDepositor = depositRecord?.depositor;
  const isGovernanceEligible = sovereign?.status === 'Active' || sovereign?.status === 'Recovery';

  // Derive active/passed proposal from fetched proposals
  const activeOrPassedProposal = proposals?.find(
    (p: any) => p.status === 'Active' || p.status === 'Passed'
  );
  const hasActiveOrPassedProposal = !!activeOrPassedProposal;
  const canPropose = connected && hasNft && isGovernanceEligible && !hasActiveOrPassedProposal;

  const handlePropose = async () => {
    if (!selectedSovereignId || !originalDepositor || !nftMint) return;
    try {
      await proposeUnwind.mutateAsync({
        sovereignId: selectedSovereignId,
        originalDepositor,
        nftMint,
      });
    } catch (err: any) {
      console.error('Propose failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 text-white mb-2">Governance</h1>
        <p className="text-[var(--muted)] text-sm">
          $overeign NFT holders can propose and vote on sovereign unwind decisions.
        </p>
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/governance"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[var(--money-green)]/20 text-[var(--money-green)] border border-[var(--money-green)]/40"
          >
            NFT Holders
          </Link>
          <Link
            href="/governance/creator"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all text-[var(--muted)] hover:text-white border border-[var(--border)] hover:border-[var(--money-green)]/40"
          >
            Token Creator
          </Link>
        </div>
      </div>

      {/* Sovereign Selector */}
      <div className="card card-clean p-4 mb-6">
        <label className="text-sm text-[var(--muted)] block mb-2">Select Sovereign</label>
        {sovLoading ? (
          <div className="animate-pulse h-10 bg-[var(--card-bg)] rounded" />
        ) : governableSovereigns.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">
            No governable sovereigns found. Sovereigns must be in Active, Recovery, Unwinding, Unwound, or EmergencyUnlocked state.
          </p>
        ) : (
          <select
            value={selectedSovereignId || ''}
            onChange={(e) => setSelectedSovereignId(e.target.value || null)}
            className="w-full bg-[#1a1a2e] border border-[var(--border)] rounded px-3 py-2.5 text-white text-sm cursor-pointer focus:border-[var(--money-green)] focus:outline-none transition-colors"
            style={{ colorScheme: 'dark' }}
          >
            <option value="" className="bg-[#1a1a2e] text-white">Choose a sovereign...</option>
            {governableSovereigns.map((s: any) => (
              <option key={s.sovereignId} value={s.sovereignId} className="bg-[#1a1a2e] text-white">
                {s.name} ({s.tokenSymbol || `#${s.sovereignId}`}) — {s.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected Sovereign Info */}
      {selectedSovereignId && sovereign && (
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
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1">
                  {sovereign.tokenSymbol && (
                    <span className="text-[var(--money-green)]">{sovereign.tokenSymbol}</span>
                  )}
                  <span>{sovereign.depositorCount} depositor{sovereign.depositorCount !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{sovereign.proposalCount} proposal{Number(sovereign.proposalCount) !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <Link
                    href={`/sovereign/${sovereign.sovereignId}`}
                    className="text-[var(--money-green)] hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
                {/* Governance state summary based on active proposal */}
                {activeOrPassedProposal && (
                  <div className="mt-2 text-xs">
                    {activeOrPassedProposal.status === 'Active' && activeOrPassedProposal.votingEndsAt > new Date() && (
                      <span className="text-[var(--hazard-yellow)]">
                        ⏳ Unwind vote in progress — voting ends {format(activeOrPassedProposal.votingEndsAt, 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                    {activeOrPassedProposal.status === 'Active' && activeOrPassedProposal.votingEndsAt <= new Date() && (
                      <span className="text-[var(--hazard-yellow)]">
                        ⏳ Voting period ended — awaiting finalization
                      </span>
                    )}
                    {activeOrPassedProposal.status === 'Passed' && activeOrPassedProposal.timelockEndsAt > new Date() && (
                      <span className="text-[var(--money-green)]">
                        ✅ Vote passed — timelock ends {format(activeOrPassedProposal.timelockEndsAt, 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                    {activeOrPassedProposal.status === 'Passed' && activeOrPassedProposal.timelockEndsAt <= new Date() && (
                      <span className="text-[var(--money-green)]">
                        ✅ Vote passed — ready for execution
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-column layout: stats on left, governance on right */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left column — Sovereign Stats */}
            <div className="md:col-span-1">
              <div className="card card-clean p-4 mb-4 sticky top-4">
                <h3 className="h3 text-white mb-4">Sovereign Stats</h3>

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
                        <span className="text-[var(--muted)]">Creator Buy-in</span>
                        <span className="text-white font-medium">{sovereign.creatorEscrowGor.toLocaleString()} GOR</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] my-3" />

                {/* Fee Settings */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Fee Settings</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Swap Fee</span>
                      <span className="text-white font-medium">{(sovereign.swapFeeBps / 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Sell Fee</span>
                      <span className="text-white font-medium">{(sovereign.sellFeeBps / 100).toFixed(1)}%</span>
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
                  </div>
                </div>

                <div className="border-t border-[var(--border)] my-3" />

                {/* Fees Collected */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Fees Generated</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Total Collected</span>
                      <span className="text-white font-medium">{(enginePool?.totalFeesCollectedGor ?? sovereign.totalFeesCollectedGor).toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</span>
                    </div>
                    {enginePool && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Total Trades</span>
                        <span className="text-white font-medium">{enginePool.totalTrades}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] my-3" />

                {/* Volume / Observation Status */}
                <div className="mb-1">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Observation Period</div>
                  {sovereign.activityCheckInitiated ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-[var(--hazard-yellow)] animate-pulse" />
                        <span className="text-[var(--hazard-yellow)] font-medium">Observation Active</span>
                      </div>
                      {sovereign.activityCheckInitiatedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Started</span>
                          <span className="text-white font-medium">{format(sovereign.activityCheckInitiatedAt, 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {sovereign.activityCheckTimestamp && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Ends</span>
                            <span className="text-white font-medium">{format(sovereign.activityCheckTimestamp, 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">Remaining</span>
                            <span className="text-white font-medium">{formatDistanceToNow(sovereign.activityCheckTimestamp)}</span>
                          </div>
                        </>
                      )}
                      <p className="text-[10px] text-[var(--muted)] mt-1">
                        If volume stays below threshold for 90 days, unwind proceeds. Otherwise, the proposal is cancelled.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-[var(--muted)]" />
                        <span className="text-[var(--muted)]">No active observation</span>
                      </div>
                      {sovereign.activityCheckLastCancelled && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">Last Cancelled</span>
                          <span className="text-white font-medium">{format(sovereign.activityCheckLastCancelled, 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--muted)] mt-1">
                        After a vote passes, a 90-day observation period begins. Volume must stay below the fee growth threshold for the unwind to execute.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recovery progress if applicable */}
                {sovereign.status === 'Recovery' && (() => {
                  const recovered = enginePool
                    ? Number(enginePool.totalRecovered) / LAMPORTS_PER_GOR
                    : sovereign.totalRecoveredGor;
                  const target = enginePool
                    ? Number(enginePool.recoveryTarget) / LAMPORTS_PER_GOR
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
            </div>{/* End left column — stats */}

            {/* Right column — governance actions & proposals */}
            <div className="md:col-span-2">

          {/* Your Governance Status */}
          <div className="card card-clean p-4 mb-4">
            <h3 className="h3 text-white mb-3">Your Governance Status</h3>
            {!connected ? (
              <p className="text-[var(--muted)] text-sm">Connect your wallet to participate in governance.</p>
            ) : !hasDeposit ? (
              <div>
                <p className="text-[var(--muted)] text-sm mb-2">
                  You have no deposit in this sovereign.
                </p>
                <p className="text-xs text-[var(--muted)]">
                  To participate in governance, you need a $overeign NFT. Deposit during bonding phase, then mint your NFT after finalization.
                </p>
              </div>
            ) : !hasNft ? (
              <div>
                <p className="text-[var(--hazard-yellow)] text-sm mb-2">
                  You have a deposit but your $overeign NFT has not been minted yet.
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span>Deposit: <span className="text-white">{depositRecord?.amountGor.toLocaleString()} GOR</span></span>
                  <span>·</span>
                  <span>Share: <span className="text-white">{depositRecord?.sharesPercent.toFixed(2)}%</span></span>
                  <span>·</span>
                  <Link
                    href={`/sovereign/${selectedSovereignId}`}
                    className="text-[var(--money-green)] hover:underline"
                  >
                    Mint NFT on detail page →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[var(--money-green)] text-sm font-bold">$overeign NFT Active ✓</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span>Voting Power: <span className="text-white font-bold">{depositRecord?.votingPowerPercent.toFixed(2)}%</span></span>
                  <span>·</span>
                  <span>Deposit: <span className="text-white">{depositRecord?.amountGor.toLocaleString()} GOR</span></span>
                  <span>·</span>
                  <span>Share: <span className="text-white">{depositRecord?.sharesPercent.toFixed(2)}%</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Fee Harvesting — $overeign Fees (GOR from SAMM swaps) */}
          {connected && (sovereign?.status === 'Recovery' || sovereign?.status === 'Active') && sovereign?.tokenMint && (
            <div className="card card-clean p-4 mb-4">
              <h3 className="h3 text-white mb-2">$overeign Fees</h3>
              <p className="text-[var(--muted)] text-sm mb-4">
                Claim your share of engine pool swap fees.
              </p>

              {/* Pending LP fees */}
              <div className="mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Claimable LP Fees</span>
                  <span className="text-[var(--money-green)] font-medium">
                    {pendingLpFees && pendingLpFees.claimableGor > 0 
                      ? `${pendingLpFees.claimableGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR`
                      : '0 GOR'
                    }
                  </span>
                </div>
              </div>

              {hasDeposit && hasNft && (
                <button
                  onClick={async () => {
                    if (!selectedSovereignId || !nftMint || !originalDepositor) return;
                    try {
                      await claimLpFees.mutateAsync({
                        sovereignId: selectedSovereignId,
                        originalDepositor,
                        nftMint,
                      });
                    } catch (err: any) {
                      console.error('Claim LP fees failed:', err);
                    }
                  }}
                  disabled={claimLpFees.isPending}
                  className="btn-money px-6 py-2 w-full"
                >
                  {claimLpFees.isPending ? 'Claiming...' : 'Claim LP Fees'}
                </button>
              )}

              {claimLpFees.error && (
                <p className="text-red-400 text-sm mt-2">{(claimLpFees.error as Error).message}</p>
              )}
              {claimLpFees.isSuccess && (
                <p className="text-[var(--slime)] text-sm mt-2">LP fees claimed successfully!</p>
              )}

              {/* Claim Your Share — only when there are claimable fees and user has NFT */}
              {hasDeposit && hasNft && pendingClaim && pendingClaim.claimableGor > 0 && (
                <>
                  <div className="border-t border-[var(--border)] my-4" />
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-[var(--muted)]">Your Claimable Share</div>
                      <div className="text-lg font-bold text-[var(--money-green)]">{pendingClaim.claimableGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedSovereignId || !originalDepositor || !nftMint) return;
                      try {
                        await claimFees.mutateAsync({
                          sovereignId: selectedSovereignId,
                          originalDepositor,
                          nftMint,
                        });
                      } catch (err: any) {
                        console.error('Claim fees failed:', err);
                      }
                    }}
                    disabled={claimFees.isPending || !originalDepositor || !nftMint}
                    className="btn-money px-6 py-2 w-full"
                  >
                    {claimFees.isPending ? 'Claiming...' : 'Claim Your Share'}
                  </button>
                  {claimFees.error && (
                    <p className="text-red-400 text-sm mt-2">{(claimFees.error as Error).message}</p>
                  )}
                  {claimFees.isSuccess && (
                    <p className="text-[var(--slime)] text-sm mt-2">Fees claimed successfully!</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Emergency Withdrawal — shows when sovereign is EmergencyUnlocked */}
          {connected && sovereign?.status === 'EmergencyUnlocked' && (
            <div className="card card-clean p-4 mb-4">
              <h3 className="h3 text-white mb-2">⚠️ Emergency Withdrawal</h3>
              <p className="text-[var(--muted)] text-sm mb-4">
                This sovereign has been emergency unlocked. Liquidity must be removed from the pool before withdrawals can occur.
              </p>

              {/* For investors with NFT */}
              {hasNft && depositRecord && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-[var(--muted)]">Your Deposit</div>
                      <div className="text-lg font-bold text-[var(--money-green)]">{depositRecord.amountGor.toLocaleString()} GOR</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedSovereignId || !originalDepositor) return;
                      try {
                        await emergencyWithdraw.mutateAsync({
                          sovereignId: selectedSovereignId,
                          originalDepositor,
                        });
                      } catch (err: any) {
                        console.error('Emergency withdraw failed:', err);
                      }
                    }}
                    disabled={emergencyWithdraw.isPending || !originalDepositor}
                    className="btn-hazard px-6 py-2 w-full"
                  >
                    {emergencyWithdraw.isPending ? 'Withdrawing...' : 'Withdraw Your Deposit'}
                  </button>
                  {emergencyWithdraw.error && (
                    <p className="text-red-400 text-sm mt-2">{(emergencyWithdraw.error as Error).message}</p>
                  )}
                  {emergencyWithdraw.isSuccess && (
                    <p className="text-[var(--slime)] text-sm mt-2">
                      Withdrawal successful! Your deposit has been returned.
                    </p>
                  )}
                </div>
              )}

              {!hasNft && (
                <p className="text-[var(--muted)] text-sm">
                  You have no deposits in this sovereign.
                </p>
              )}
            </div>
          )}

          {/* Propose Unwind — only show when no active/passed proposal exists */}
          {connected && hasNft && !hasActiveOrPassedProposal && (
            <div className="card card-clean p-4 mb-4">
              <h3 className="h3 text-white mb-2">Propose Unwind</h3>
              {!isGovernanceEligible ? (
                <p className="text-[var(--muted)] text-sm">
                  Proposals can only be created when the sovereign is in Recovery or Active state (currently: {sovereign?.status}).
                </p>
              ) : (
                <div>
                  <p className="text-[var(--muted)] text-sm mb-3">
                    Propose an unwind vote to remove the sovereign&apos;s permanent liquidity lock and distribute GOR
                    back to NFT holders. Requires 67% quorum and 51% majority to pass.
                  </p>
                  <button
                    onClick={handlePropose}
                    disabled={proposeUnwind.isPending}
                    className="btn-money px-6 py-2"
                  >
                    {proposeUnwind.isPending ? 'Creating Proposal...' : 'Create Unwind Proposal'}
                  </button>
                  {proposeUnwind.error && (
                    <p className="text-red-400 text-sm mt-2">{(proposeUnwind.error as Error).message}</p>
                  )}
                  {proposeUnwind.isSuccess && (
                    <p className="text-[var(--slime)] text-sm mt-2">Proposal created successfully!</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Proposals List */}
          <div className="mb-4">
            <h3 className="h3 text-white mb-3">Proposals</h3>
            {proposalsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse h-48 bg-[var(--card-bg)] rounded-lg" />
                ))}
              </div>
            ) : !proposals || proposals.length === 0 ? (
              <div className="card card-clean text-center py-8">
                <div className="text-3xl mb-3">🏛️</div>
                <p className="text-[var(--muted)] text-sm">
                  No proposals yet for this sovereign.
                </p>
                {!hasNft && connected && hasDeposit && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    Mint your $overeign NFT to create the first proposal.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((proposal: any) => (
                  <ProposalCard
                    key={proposal.proposalId}
                    proposal={proposal}
                    sovereignId={selectedSovereignId!}
                    depositRecord={depositRecord}
                    sovereign={sovereign}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Claim Unwind - shown when sovereign is Unwound */}
          {sovereign?.status === 'Unwound' && connected && hasNft && !depositRecord?.unwindClaimed && (
            <div className="card card-clean p-4 border-2 border-[var(--money-green)]">
              <h3 className="h3 text-[var(--money-green)] mb-2">Claim Unwind Proceeds</h3>
              <p className="text-[var(--muted)] text-sm mb-3">
                The sovereign has been unwound. You can claim your proportional share of GOR.
                This will burn your $overeign NFT.
              </p>
              <div className="flex items-center gap-3 text-sm mb-3">
                <span className="text-[var(--muted)]">Your deposit:</span>
                <span className="text-white font-bold">{depositRecord?.amountGor.toLocaleString()} GOR</span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--muted)]">Unwind pool:</span>
                <span className="text-white font-bold">{sovereign.unwindSolBalanceGor.toLocaleString()} GOR</span>
              </div>
              <button
                onClick={async () => {
                  if (!originalDepositor || !nftMint) return;
                }}
                className="btn-money px-6 py-2"
                disabled
              >
                Use Claim button on the executed proposal above
              </button>
            </div>
          )}

            </div>{/* End right column — governance */}

          </div>{/* End grid */}
        </>
      )}

      {/* Not connected state */}
      {!selectedSovereignId && !sovLoading && governableSovereigns.length > 0 && (
        <div className="card card-clean text-center py-12">
          <div className="text-4xl mb-3">🏛️</div>
          <p className="text-[var(--muted)]">
            Select a sovereign above to view and participate in governance.
          </p>
        </div>
      )}
    </div>
  );
}
