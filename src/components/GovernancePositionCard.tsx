'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { GovernancePosition } from '@/hooks/useMyGovernancePositions';
import { useProposals, useVoteRecord, useProposeUnwind, useCastVote, useFinalizeVote, useClaimUnwind } from '@/hooks/useGovernance';
import { useClaimPoolLpFees } from '@/hooks/useTransactions';
import { usePendingEngineLpFees, useEnginePool } from '@/hooks/useSovereign';
import { useTokenImage } from '@/hooks/useTokenImage';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

interface Props {
  position: GovernancePosition;
}

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-[var(--money-green)]',
  Recovery: 'bg-[var(--hazard-yellow)]',
  Unwinding: 'bg-orange-400',
  Unwound: 'bg-red-400',
  EmergencyUnlocked: 'bg-red-500',
};

export function GovernancePositionCard({ position }: Props) {
  const { connected } = useWallet();
  const [expanded, setExpanded] = useState(false);

  const { data: imageUrl } = useTokenImage(position.metadataUri);
  const { data: proposals } = useProposals(position.sovereignId);
  const { data: pendingLpFees } = usePendingEngineLpFees(position.sovereignId);
  const { data: enginePool } = useEnginePool(position.sovereignId);

  const claimLpFees = useClaimPoolLpFees();
  const proposeUnwind = useProposeUnwind();

  // Derived state
  const activeProposal = proposals?.find((p: any) => p.status === 'Active');
  const passedProposal = proposals?.find((p: any) => p.status === 'Passed');
  const hasActiveOrPassed = !!activeProposal || !!passedProposal;
  const isGovernanceEligible = position.status === 'Active' || position.status === 'Recovery';
  const canPropose = connected && position.nftMinted && isGovernanceEligible && !hasActiveOrPassed;

  const claimableLpGor = pendingLpFees?.claimableGor ?? 0;
  const totalClaimable = claimableLpGor;

  // Count pending actions
  const pendingActions: string[] = [];
  if (activeProposal && !expanded) pendingActions.push('Vote');
  if (totalClaimable > 0.0001) pendingActions.push(`Claim ${totalClaimable.toFixed(4)} GOR`);
  if (position.status === 'Unwound' && !position.unwindClaimed) pendingActions.push('Claim unwind');

  return (
    <div className="card card-clean overflow-hidden">
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Token image */}
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--border)] flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-sm font-bold flex-shrink-0">
            {(position.tokenSymbol || '?').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm truncate">{position.name}</span>
            {position.tokenSymbol && (
              <span className="text-[var(--money-green)] text-xs font-medium">{position.tokenSymbol}</span>
            )}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[position.status] || 'bg-[var(--muted)]'}`} />
            <span className="text-[10px] text-[var(--muted)]">{position.status}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] mt-0.5">
            <span>{position.depositAmountGor.toLocaleString()} GOR deposited</span>
            <span>·</span>
            <span>{position.votingPowerPercent.toFixed(1)}% voting power</span>
            {position.nftMinted && <span className="text-[var(--money-green)]">· NFT ✓</span>}
          </div>
        </div>

        {/* Pending actions badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pendingActions.length > 0 && (
            <div className="flex gap-1">
              {pendingActions.map((action, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--money-green)]/15 text-[var(--money-green)]"
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
          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Your Deposit</div>
              <div className="text-sm font-bold text-white">{position.depositAmountGor.toLocaleString()} GOR</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Voting Power</div>
              <div className="text-sm font-bold text-white">{position.votingPowerPercent.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Claimable</div>
              <div className="text-sm font-bold text-[var(--money-green)]">
                {totalClaimable > 0.0001 ? `${totalClaimable.toFixed(4)} GOR` : '—'}
              </div>
            </div>
          </div>

          {/* === ACTION SECTION === */}

          {/* Fee Claiming */}
          {totalClaimable > 0.0001 && position.nftMinted && (
            <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">LP Fees ready to claim</div>
                  <div className="text-lg font-bold text-[var(--money-green)]">{totalClaimable.toFixed(4)} GOR</div>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!position.nftMint || !position.depositor) return;
                    await claimLpFees.mutateAsync({
                      sovereignId: position.sovereignId,
                      originalDepositor: position.depositor,
                      nftMint: position.nftMint,
                    });
                  }}
                  disabled={claimLpFees.isPending}
                  className="btn-money px-4 py-2 text-xs"
                >
                  {claimLpFees.isPending ? 'Claiming...' : 'Claim LP Fees'}
                </button>
              </div>
              {claimLpFees.error && (
                <p className="text-red-400 text-xs mt-2">
                  {(claimLpFees.error as Error)?.message}
                </p>
              )}
            </div>
          )}

          {/* Active Proposal — Vote */}
          {activeProposal && (
            <ActiveProposalPanel
              proposal={activeProposal}
              position={position}
            />
          )}

          {/* Passed Proposal — awaiting execution */}
          {passedProposal && !activeProposal && (
            <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[var(--money-green)]">✅ Proposal #{passedProposal.proposalId} Passed</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {passedProposal.timelockEndsAt > new Date()
                  ? `Timelock ends ${format(passedProposal.timelockEndsAt, 'MMM d h:mm a')} (${formatDistanceToNow(passedProposal.timelockEndsAt, { addSuffix: true })})`
                  : 'Timelock expired — ready for execution'}
              </p>
            </div>
          )}

          {/* Unwind claim */}
          {position.status === 'Unwound' && !position.unwindClaimed && position.nftMinted && (
            <UnwindClaimPanel position={position} />
          )}

          {/* Propose Unwind */}
          {canPropose && (
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3">
              <div>
                <div className="text-sm font-bold text-white">Propose Unwind</div>
                <p className="text-[10px] text-[var(--muted)]">
                  Requires 67% quorum and 51% majority to pass
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!position.nftMint || !position.depositor) return;
                  await proposeUnwind.mutateAsync({
                    sovereignId: position.sovereignId,
                    originalDepositor: position.depositor,
                    nftMint: position.nftMint,
                  });
                }}
                disabled={proposeUnwind.isPending}
                className="btn-money px-4 py-2 text-xs"
              >
                {proposeUnwind.isPending ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          )}

          {/* NFT not minted warning */}
          {!position.nftMinted && (
            <div className="bg-[var(--hazard-yellow)]/10 border border-[var(--hazard-yellow)]/20 rounded-xl p-3">
              <p className="text-xs text-[var(--hazard-yellow)]">
                Mint your $overeign NFT to participate in governance and claim fees.
              </p>
              <Link
                href={`/sovereign/${position.sovereignId}`}
                className="text-[var(--money-green)] text-xs hover:underline mt-1 inline-block"
              >
                Go to sovereign page to mint →
              </Link>
            </div>
          )}

          {/* Past proposals */}
          {proposals && proposals.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                Proposal History ({proposals.length})
              </div>
              <div className="space-y-1">
                {proposals.map((p: any) => (
                  <div key={p.proposalId} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/[0.02] text-xs">
                    <span className="text-white">#{p.proposalId}</span>
                    <span className={
                      p.status === 'Active' ? 'text-[var(--hazard-yellow)]' :
                      p.status === 'Passed' ? 'text-[var(--money-green)]' :
                      p.status === 'Executed' ? 'text-[var(--slime)]' :
                      p.status === 'Failed' ? 'text-red-400' : 'text-[var(--muted)]'
                    }>{p.status}</span>
                    <span className="text-[var(--muted)]">{p.voterCount} voter{p.voterCount !== 1 ? 's' : ''}</span>
                    <span className="text-[var(--muted)]">{format(p.createdAt, 'MMM d, yyyy')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to detail page */}
          <div className="text-center pt-1">
            <Link
              href={`/sovereign/${position.sovereignId}`}
              className="text-xs text-[var(--money-green)] hover:underline"
            >
              View full sovereign details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Active Proposal Panel — inline vote UI
// ============================================================

function ActiveProposalPanel({ proposal, position }: { proposal: any; position: GovernancePosition }) {
  const { data: voteRecord, isLoading } = useVoteRecord(position.sovereignId, proposal.proposalId);
  const castVote = useCastVote();
  const finalizeVote = useFinalizeVote();

  const votingEnded = proposal.votingEndsAt < new Date();
  const hasVoted = !!voteRecord;
  const canVote = position.nftMinted && !hasVoted && !votingEnded;
  const canFinalize = votingEnded;

  const quorumPct = (proposal.totalVotedBps / proposal.quorumBps) * 100;
  const forPct = proposal.totalVotedBps > 0
    ? ((proposal.votesForBps / proposal.totalVotedBps) * 100).toFixed(0)
    : '0';
  const againstPct = proposal.totalVotedBps > 0
    ? ((proposal.votesAgainstBps / proposal.totalVotedBps) * 100).toFixed(0)
    : '0';

  return (
    <div className="bg-[var(--hazard-yellow)]/5 border border-[var(--hazard-yellow)]/20 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--hazard-yellow)]">🗳️ Proposal #{proposal.proposalId}</span>
          {!votingEnded && (
            <span className="text-[10px] text-[var(--muted)]">
              ends {formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })}
            </span>
          )}
          {votingEnded && (
            <span className="text-[10px] text-[var(--hazard-yellow)]">voting ended — awaiting finalization</span>
          )}
        </div>
      </div>

      {/* Vote bars */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--money-green)] w-12">For {forPct}%</span>
          <div className="flex-1 h-1.5 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[var(--money-green)]" style={{ width: `${Math.min(proposal.votesForBps / 100, 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-red-400 w-12">Against {againstPct}%</span>
          <div className="flex-1 h-1.5 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(proposal.votesAgainstBps / 100, 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--muted)] w-12">Quorum</span>
          <div className="flex-1 h-1.5 bg-[var(--card-bg)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(quorumPct, 100)}%`,
                backgroundColor: quorumPct >= 100 ? 'var(--money-green)' : 'var(--hazard-yellow)',
              }}
            />
          </div>
          <span className="text-[10px] text-[var(--muted)]">
            {(proposal.totalVotedBps / 100).toFixed(0)}% / {(proposal.quorumBps / 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Vote status + actions */}
      {!isLoading && hasVoted && (
        <p className={`text-xs mb-2 ${voteRecord.voteFor ? 'text-[var(--money-green)]' : 'text-red-400'}`}>
          You voted {voteRecord.voteFor ? 'FOR' : 'AGAINST'} with {(voteRecord.votingPowerBps / 100).toFixed(1)}% power
        </p>
      )}

      <div className="flex gap-2">
        {canVote && (
          <>
            <button
              onClick={async () => {
                if (!position.nftMint || !position.depositor) return;
                await castVote.mutateAsync({
                  sovereignId: position.sovereignId,
                  proposalId: proposal.proposalId,
                  originalDepositor: position.depositor,
                  nftMint: position.nftMint,
                  support: true,
                });
              }}
              disabled={castVote.isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--money-green)] text-black"
            >
              {castVote.isPending ? 'Voting...' : 'Vote FOR'}
            </button>
            <button
              onClick={async () => {
                if (!position.nftMint || !position.depositor) return;
                await castVote.mutateAsync({
                  sovereignId: position.sovereignId,
                  proposalId: proposal.proposalId,
                  originalDepositor: position.depositor,
                  nftMint: position.nftMint,
                  support: false,
                });
              }}
              disabled={castVote.isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white"
            >
              {castVote.isPending ? 'Voting...' : 'Vote AGAINST'}
            </button>
          </>
        )}
        {canFinalize && (
          <button
            onClick={async () => {
              await finalizeVote.mutateAsync({
                sovereignId: position.sovereignId,
                proposalId: proposal.proposalId,
              });
            }}
            disabled={finalizeVote.isPending}
            className="btn-money px-4 py-1.5 text-xs"
          >
            {finalizeVote.isPending ? 'Finalizing...' : 'Finalize Vote'}
          </button>
        )}
      </div>

      {(castVote.error || finalizeVote.error) && (
        <p className="text-red-400 text-xs mt-2">
          {(castVote.error as Error)?.message || (finalizeVote.error as Error)?.message}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Unwind Claim Panel
// ============================================================

function UnwindClaimPanel({ position }: { position: GovernancePosition }) {
  const claimUnwind = useClaimUnwind();

  return (
    <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-[var(--money-green)]">Claim Unwind Proceeds</div>
          <p className="text-[10px] text-[var(--muted)]">
            Sovereign has been unwound. Claim your proportional GOR share (burns your NFT).
          </p>
        </div>
        <button
          onClick={async () => {
            if (!position.nftMint || !position.depositor) return;
            await claimUnwind.mutateAsync({
              sovereignId: position.sovereignId,
              originalDepositor: position.depositor,
              nftMint: position.nftMint,
            });
          }}
          disabled={claimUnwind.isPending}
          className="btn-money px-4 py-2 text-xs"
        >
          {claimUnwind.isPending ? 'Claiming...' : 'Claim'}
        </button>
      </div>
      {claimUnwind.error && (
        <p className="text-red-400 text-xs mt-2">{(claimUnwind.error as Error).message}</p>
      )}
    </div>
  );
}
