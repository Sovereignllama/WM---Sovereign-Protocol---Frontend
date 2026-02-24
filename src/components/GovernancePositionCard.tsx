'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { GovernancePosition } from '@/hooks/useMyGovernancePositions';
import { useProposals, useVoteRecord, useProposeUnwind, useCastVote, useFinalizeVote, useClaimUnwind } from '@/hooks/useGovernance';
import { useClaimPoolLpFees, useEmergencyWithdraw, useMintNftFromPosition, useListNft, useTransferNft, useBurnNftIntoPosition } from '@/hooks/useTransactions';
import { usePendingEngineLpFees, useEnginePool, useSovereign, useProtocolState } from '@/hooks/useSovereign';
import { useMyNftsForSovereign } from '@/hooks/useNfts';
import { useTokenImage } from '@/hooks/useTokenImage';
import { MintNftModal } from '@/components/MintNftModal';
import { NftListingModal } from '@/components/NftListingModal';
import { MergeNftModal } from '@/components/MergeNftModal';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

interface Props {
  position: GovernancePosition;
}

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-[var(--money-green)]',
  Recovery: 'bg-[var(--money-green)]',
  Unwinding: 'bg-orange-400',
  Unwound: 'bg-red-400',
  Halted: 'bg-red-500',
};

export function GovernancePositionCard({ position }: Props) {
  const { connected, publicKey } = useWallet();
  const [expanded, setExpanded] = useState(false);
  const [mintNftModalOpen, setMintNftModalOpen] = useState(false);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [mergeNftMint, setMergeNftMint] = useState<string | null>(null);

  const { data: imageUrl } = useTokenImage(position.metadataUri);
  const { data: proposals } = useProposals(position.sovereignId);
  const { data: pendingLpFees } = usePendingEngineLpFees(position.sovereignId);
  const { data: enginePool } = useEnginePool(position.sovereignId);
  const { data: sovereign } = useSovereign(position.sovereignId);
  const { data: protocolState } = useProtocolState();
  const { data: myNfts } = useMyNftsForSovereign(position.sovereignPDA, publicKey?.toBase58());

  const claimLpFees = useClaimPoolLpFees();
  const proposeUnwind = useProposeUnwind();
  const emergencyWithdraw = useEmergencyWithdraw();
  const mintNft = useMintNftFromPosition();
  const listNft = useListNft();
  const transferNft = useTransferNft();
  const burnNft = useBurnNftIntoPosition();

  // Derived state
  const activeProposal = proposals?.find((p: any) => p.status === 'Active');
  const passedProposal = proposals?.find((p: any) => p.status === 'Passed');
  const hasActiveOrPassed = !!activeProposal || !!passedProposal;
  const isGovernanceEligible = position.status === 'Active' || position.status === 'Recovery';

  // Governance is DR-based — voting power and claims come from deposit_record.position_bps.
  // NFTs are just transferable slices of DR; they don't grant governance rights directly.
  const hasDR = position.depositAmountGor > 0;
  const canPropose = connected && hasDR && isGovernanceEligible && !hasActiveOrPassed && !position.hasActiveProposal;

  const claimableLpGor = pendingLpFees?.claimableGor ?? 0;
  const totalClaimable = claimableLpGor;

  // Count pending actions
  const pendingActions: string[] = [];
  if (activeProposal && !expanded) pendingActions.push('Vote');
  if (totalClaimable > 0.0001) pendingActions.push(`Claim ${totalClaimable.toFixed(4)} GOR`);
  if (position.status === 'Unwound' && !position.unwindClaimed) pendingActions.push('Claim unwind');
  if (position.status === 'Halted') pendingActions.push('$overeign Halted');

  return (
    <>
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
            <span>DR: {position.depositAmountGor.toLocaleString()} GOR</span>
            <span>·</span>
            <span>{position.votingPowerPercent.toFixed(1)}% share</span>
            {myNfts && myNfts.length > 0 && (
              <span className="text-[var(--money-green)]">· {myNfts.length} NFT{myNfts.length !== 1 ? 's' : ''}</span>
            )}
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
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Deposit Record</div>
              <div className="text-sm font-bold text-white">{position.depositAmountGor.toLocaleString()} GOR</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Share</div>
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

          {/* Fee Claiming — hidden for Halted/Unwound (pool drained, no fees to claim) */}
          {totalClaimable > 0.0001 && hasDR && position.status !== 'Halted' && position.status !== 'Unwound' && (
            <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">LP Fees ready to claim</div>
                  <div className="text-lg font-bold text-[var(--money-green)]">{totalClaimable.toFixed(4)} GOR</div>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await claimLpFees.mutateAsync({
                      sovereignId: position.sovereignId,
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

          {/* Fallback: sovereign says there's an active proposal but proposals query hasn't loaded it yet */}
          {!activeProposal && !passedProposal && position.hasActiveProposal && (
            <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[var(--money-green)]">🗳️ Active Proposal</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                An unwind proposal is active on this sovereign. Loading proposal details...
              </p>
            </div>
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
                    <span className={`text-lg font-black ${isHealthy ? 'text-[var(--money-green)]' : performancePct >= 50 ? 'text-[var(--money-green)]' : 'text-red-400'}`}>
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
                    className={`h-full rounded-full transition-all ${isHealthy ? 'bg-[var(--money-green)]' : performancePct >= 50 ? 'bg-[var(--money-green)]' : 'bg-red-400'}`}
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
                    : 'Volume below threshold. If this remains below 100% at observation end, the pool will be unwound.'}
                </p>
              </div>
            );
          })()}

          {/* Unwind claim */}
          {position.status === 'Unwound' && !position.unwindClaimed && (
            <UnwindClaimPanel position={position} />
          )}

          {/* Emergency Withdraw — shown when sovereign is Halted */}
          {position.status === 'Halted' && (
            <EmergencyWithdrawPanel position={position} emergencyWithdraw={emergencyWithdraw} />
          )}

          {/* ── NFT Management Section ── */}
          {isGovernanceEligible && (
            <div className="bg-white/[0.03] rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">$overeign NFTs</div>
                {/* Mint button — show if DR has balance */}
                {position.depositAmountGor > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMintNftModalOpen(true); }}
                    className="text-[var(--money-green)] text-xs font-bold hover:underline"
                  >
                    + Mint NFT
                  </button>
                )}
              </div>

              {/* User's NFTs */}
              {myNfts && myNfts.length > 0 ? (
                <div className="space-y-2">
                  {myNfts.map((nft) => {
                    const nftGor = Number(nft.depositAmount) / LAMPORTS_PER_GOR;
                    const nftSharePct = nft.sharesBps / 100;
                    const isTransferring = transferTarget === nft.mint;

                    return (
                      <div key={nft.mint} className="bg-[var(--landfill-black)] rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {nftGor.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOR
                            </span>
                            <span className="text-[10px] text-[var(--faint)]">
                              ({nftSharePct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setListingModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--money-green)]/10 text-[var(--money-green)] hover:bg-[var(--money-green)]/20 transition-colors"
                            >
                              List
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransferTarget(isTransferring ? null : nft.mint);
                                setTransferRecipient('');
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-[var(--muted)] hover:text-white transition-colors"
                            >
                              {isTransferring ? 'Cancel' : 'Transfer'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMergeNftMint(nft.mint);
                              }}
                              disabled={burnNft.isPending}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-40"
                            >
                              Merge
                            </button>
                          </div>
                        </div>
                        {/* Inline transfer input */}
                        {isTransferring && (
                          <div className="flex gap-1.5 mt-2">
                            <input
                              type="text"
                              value={transferRecipient}
                              onChange={(e) => setTransferRecipient(e.target.value)}
                              placeholder="Recipient wallet address"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--money-green)]"
                            />
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!transferRecipient) return;
                                try {
                                  await transferNft.mutateAsync({
                                    sovereignId: position.sovereignId,
                                    nftMint: nft.mint,
                                    recipient: transferRecipient,
                                  });
                                  setTransferTarget(null);
                                  setTransferRecipient('');
                                } catch (err) {
                                  console.error('Transfer failed:', err);
                                }
                              }}
                              disabled={!transferRecipient || transferNft.isPending}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--money-green)] text-black disabled:opacity-40"
                            >
                              {transferNft.isPending ? '...' : 'Send'}
                            </button>
                          </div>
                        )}
                        <div className="text-[9px] text-[var(--faint)] mt-1 truncate">
                          {nft.mint}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  No NFTs minted.
                </p>
              )}

              {/* Mint / transfer errors */}
              {mintNft.error && (
                <p className="text-red-400 text-[10px]">{(mintNft.error as Error).message}</p>
              )}
              {transferNft.error && (
                <p className="text-red-400 text-[10px]">{(transferNft.error as Error).message}</p>
              )}
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
                      p.status === 'Active' ? 'text-[var(--money-green)]' :
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

          {/* Propose Unwind — bottom of card so it doesn't dominate the view */}
          {canPropose && !proposeUnwind.isSuccess && (
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3">
              <div>
                <div className="text-sm font-bold text-white">Propose Unwind</div>
                <p className="text-[10px] text-[var(--muted)]">
                  Requires 67% quorum and 51% majority to pass
                </p>
              </div>
              <button
                onClick={async () => {
                  await proposeUnwind.mutateAsync({
                    sovereignId: position.sovereignId,
                  });
                }}
                disabled={proposeUnwind.isPending}
                className="btn-money px-4 py-2 text-xs"
              >
                {proposeUnwind.isPending ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          )}
          {proposeUnwind.isSuccess && (
            <div className="bg-[var(--money-green)]/10 border border-[var(--money-green)]/20 rounded-xl p-3">
              <p className="text-[var(--money-green)] text-xs font-bold">
                ✅ Proposal created successfully! Discussion period is now active.
              </p>
            </div>
          )}
          {proposeUnwind.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-xs">{(proposeUnwind.error as Error).message}</p>
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

    {/* ── Modals (rendered outside the card to avoid overflow-hidden clipping) ── */}

    {/* Mint NFT Modal */}
    {protocolState && (
      <MintNftModal
        open={mintNftModalOpen}
        onClose={() => setMintNftModalOpen(false)}
        onMint={async (amountLamports) => {
          try {
            await mintNft.mutateAsync({
              sovereignId: position.sovereignId,
              amountLamports: amountLamports.toString(),
            });
            setMintNftModalOpen(false);
          } catch (err) {
            console.error('Mint NFT failed:', err);
          }
        }}
        isMinting={mintNft.isPending}
        error={mintNft.error ? (mintNft.error as Error).message : null}
        depositAmountGor={position.depositAmountGor}
        depositAmountLamports={BigInt(position.depositAmountLamports)}
        sharesPercent={position.sharesPercent}
        mintFeeBps={protocolState.nftMintFeeBps ?? 500}
        minNftBacking={BigInt(protocolState.minNftBacking?.toString() ?? '50000000')}
        tokenSymbol={position.tokenSymbol || position.name}
      />
    )}

    {/* NFT Listing Modal */}
    {myNfts && myNfts.length > 0 && enginePool && (
      <NftListingModal
        open={listingModalOpen}
        onClose={() => setListingModalOpen(false)}
        onList={async (priceGor) => {
          try {
            const priceLamports = BigInt(Math.round(priceGor * LAMPORTS_PER_GOR));
            const nftMintAddr = myNfts[0].mint;
            await listNft.mutateAsync({
              sovereignId: position.sovereignId,
              nftMint: nftMintAddr,
              priceLamports,
            });
            setListingModalOpen(false);
          } catch (err) {
            console.error('Failed to list NFT:', err);
          }
        }}
        depositAmountGor={Number(myNfts[0].depositAmount) / LAMPORTS_PER_GOR}
        sharesPercent={myNfts[0].sharesBps / 100}
        lpFeesAccumulatedGor={Number(enginePool.lpFeesAccumulated ?? 0) / LAMPORTS_PER_GOR}
        totalFeesCollectedGor={enginePool.totalFeesCollectedGor ?? 0}
        recoveryComplete={enginePool.recoveryComplete ?? false}
        poolAgeSeconds={position.finalizedAt ? Math.floor((Date.now() - position.finalizedAt.getTime()) / 1000) : 0}
        gorReserveGor={enginePool.gorReserveGor ?? 0}
        tokenSymbol={position.tokenSymbol || position.name}
        nftMint={myNfts[0].mint}
      />
    )}

    {/* Merge NFT Modal */}
    {mergeNftMint && myNfts && (() => {
      const nft = myNfts.find(n => n.mint === mergeNftMint);
      if (!nft) return null;
      return (
        <MergeNftModal
          open={true}
          onClose={() => setMergeNftMint(null)}
          onMerge={() => {
            burnNft.mutate(
              { sovereignId: position.sovereignId, nftMint: mergeNftMint },
              { onSuccess: () => setMergeNftMint(null) },
            );
          }}
          isMerging={burnNft.isPending}
          error={burnNft.error ? (burnNft.error as Error).message : null}
          depositAmount={nft.depositAmount}
          sharesBps={nft.sharesBps}
          currentDrGor={position.depositAmountGor}
          currentDrSharesPct={position.sharesPercent}
          tokenSymbol={position.tokenSymbol || position.name}
          nftMint={mergeNftMint}
        />
      );
    })()}
    </>
  );
}

// ============================================================
// Active Proposal Panel — inline vote UI
// ============================================================

function ActiveProposalPanel({ proposal, position }: { proposal: any; position: GovernancePosition }) {
  const { data: voteRecord, isLoading } = useVoteRecord(position.sovereignId, proposal.proposalId);
  const castVote = useCastVote();
  const finalizeVote = useFinalizeVote();

  const now = new Date();
  const votingStarted = proposal.votingStartsAt ? proposal.votingStartsAt <= now : true;
  const votingEnded = proposal.votingEndsAt < now;
  const inDiscussion = proposal.votingStartsAt && !votingStarted && !votingEnded;
  const hasVoted = !!voteRecord;
  const canVote = !hasVoted && votingStarted && !votingEnded;
  const canFinalize = votingEnded;

  const quorumPct = (proposal.totalVotedBps / proposal.quorumBps) * 100;
  const forPct = proposal.totalVotedBps > 0
    ? ((proposal.votesForBps / proposal.totalVotedBps) * 100).toFixed(0)
    : '0';
  const againstPct = proposal.totalVotedBps > 0
    ? ((proposal.votesAgainstBps / proposal.totalVotedBps) * 100).toFixed(0)
    : '0';

  return (
    <div className="bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--money-green)]">🗳️ Proposal #{proposal.proposalId}</span>
          {inDiscussion && (
            <span className="text-[10px] text-[var(--hazard-orange)]">
              discussion period — voting opens {formatDistanceToNow(proposal.votingStartsAt, { addSuffix: true })}
            </span>
          )}
          {votingStarted && !votingEnded && (
            <span className="text-[10px] text-[var(--muted)]">
              ends {formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })}
            </span>
          )}
          {votingEnded && (
            <span className="text-[10px] text-[var(--money-green)]">voting ended — awaiting finalization</span>
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
                backgroundColor: quorumPct >= 100 ? 'var(--money-green)' : 'var(--money-green)',
              }}
            />
          </div>
          <span className="text-[10px] text-[var(--muted)]">
            {(proposal.totalVotedBps / 100).toFixed(0)}% / {(proposal.quorumBps / 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Vote status + actions */}
      {inDiscussion && (
        <div className="bg-[var(--hazard-orange)]/10 border border-[var(--hazard-orange)]/20 rounded-lg p-2.5 mb-2">
          <p className="text-xs text-[var(--hazard-orange)] font-medium">
            ⏳ Discussion Period Active
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">
            Voting opens {format(proposal.votingStartsAt, 'MMM d h:mm a')}. This grace period allows the creator to address community concerns before votes are cast.
          </p>
        </div>
      )}

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
                await castVote.mutateAsync({
                  sovereignId: position.sovereignId,
                  proposalId: proposal.proposalId,
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
                await castVote.mutateAsync({
                  sovereignId: position.sovereignId,
                  proposalId: proposal.proposalId,
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
            Sovereign has been unwound. Claim your proportional GOR share based on your deposit record.
            Merge any NFTs back into your DR first to maximise your claim.
          </p>
        </div>
        <button
          onClick={async () => {
            await claimUnwind.mutateAsync({
              sovereignId: position.sovereignId,
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

// ============================================================
// Emergency Withdraw Panel — shown when sovereign is Halted
// ============================================================

function EmergencyWithdrawPanel({
  position,
  emergencyWithdraw,
}: {
  position: GovernancePosition;
  emergencyWithdraw: ReturnType<typeof useEmergencyWithdraw>;
}) {
  const isPostFinalization = !!position.finalizedAt;
  const unwindGor = position.unwindSolBalanceGor || 0;
  const totalDepGor = position.totalDepositedGor || 1;
  const depositGor = position.depositAmountGor;
  const reclaimableGor =
    isPostFinalization && unwindGor > 0
      ? (unwindGor * depositGor) / totalDepGor
      : depositGor;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
      <div className="text-sm font-bold text-red-400 mb-2">⚠️ $overeign Halted</div>
      <div className="space-y-1 mb-3">
        <p className="text-xs text-[var(--muted)]">
          Original deposit: <span className="text-white font-bold">{depositGor.toLocaleString()} GOR</span>
        </p>
        {isPostFinalization && (
          <p className="text-xs text-[var(--muted)]">
            Reclaimable (your share):{' '}
            <span className="text-[var(--money-green)] font-bold">
              {reclaimableGor > 0
                ? reclaimableGor.toLocaleString(undefined, { maximumFractionDigits: 4 })
                : '—'}{' '}
              GOR
            </span>
            {unwindGor === 0 && (
              <span className="text-[var(--money-green)] ml-2">
                (LP not yet removed — awaiting admin action)
              </span>
            )}
          </p>
        )}
      </div>
      <button
        onClick={async () => {
          await emergencyWithdraw.mutateAsync({
            sovereignId: position.sovereignId,
            originalDepositor: position.depositor,
          });
        }}
        disabled={emergencyWithdraw.isPending}
        className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:opacity-90 disabled:opacity-40"
      >
        {emergencyWithdraw.isPending ? 'Withdrawing...' : 'Reclaim Deposited GOR'}
      </button>
      {emergencyWithdraw.isSuccess && (
        <p className="text-[var(--slime)] text-xs mt-2">Funds reclaimed successfully!</p>
      )}
      {emergencyWithdraw.error && (
        <p className="text-red-400 text-xs mt-2">{(emergencyWithdraw.error as Error).message}</p>
      )}
    </div>
  );
}
