'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram, useReadOnlyProgram, useWalletAddress } from './useProgram';
import { QUERY_KEYS } from './useSovereign';
import {
  fetchProposal,
  fetchSovereignProposals,
  fetchVoteRecord,
  fetchDepositRecord,
  buildProposeUnwindTx,
  buildCastVoteTx,
  buildFinalizeVoteTx,
  buildClaimUnwindTx,
} from '@/lib/program/client';
import {
  getSovereignPDA,
  getDepositRecordPDA,
  getProposalPDA,
  getGenesisNftMintPDA,
} from '@/lib/program/pdas';
import { config } from '@/lib/config';
import { ProposalAccount, VoteRecordAccount, ProposalStatus } from '@/lib/program/idl/types';

// ============================================================
// Query Keys
// ============================================================

export const GOVERNANCE_KEYS = {
  proposals: (sovereignId: string) => ['proposals', sovereignId] as const,
  proposal: (sovereignId: string, proposalId: string) => ['proposal', sovereignId, proposalId] as const,
  voteRecord: (proposalId: string, nftMint: string) => ['voteRecord', proposalId, nftMint] as const,
};

// ============================================================
// Helper — resolve proposal status from Anchor enum
// ============================================================

export function getProposalStatusString(status: ProposalStatus): string {
  if ('active' in status) return 'Active';
  if ('passed' in status) return 'Passed';
  if ('failed' in status) return 'Failed';
  if ('executed' in status) return 'Executed';
  if ('cancelled' in status) return 'Cancelled';
  return 'Unknown';
}

// ============================================================
// Query Hooks
// ============================================================

/**
 * Fetch all proposals for a sovereign
 */
export function useProposals(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: GOVERNANCE_KEYS.proposals(sovereignId?.toString() ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId) throw new Error('Missing params');
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), new PublicKey(config.programId));
      const raw = await fetchSovereignProposals(program, sovereignPDA);

      return raw
        .map(({ publicKey, account }: { publicKey: PublicKey; account: any }) => ({
          publicKey: publicKey.toBase58(),
          sovereign: account.sovereign.toBase58(),
          proposalId: account.proposalId.toString(),
          proposer: account.proposer.toBase58(),
          status: getProposalStatusString(account.status),
          votesForBps: account.votesForBps,
          votesAgainstBps: account.votesAgainstBps,
          totalVotedBps: account.totalVotedBps,
          voterCount: account.voterCount,
          quorumBps: account.quorumBps,
          passThresholdBps: account.passThresholdBps,
          votingEndsAt: new Date(Number(account.votingEndsAt) * 1000),
          timelockEndsAt: new Date(Number(account.timelockEndsAt) * 1000),
          createdAt: new Date(Number(account.createdAt) * 1000),
          executedAt: account.executedAt.toNumber() > 0
            ? new Date(Number(account.executedAt) * 1000)
            : null,
        }))
        .sort((a: any, b: any) => Number(b.proposalId) - Number(a.proposalId)); // newest first
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId,
  });
}

/**
 * Fetch a single proposal
 */
export function useProposal(sovereignId: string | number | undefined, proposalId: string | number | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: GOVERNANCE_KEYS.proposal(sovereignId?.toString() ?? '', proposalId?.toString() ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId || proposalId === undefined) throw new Error('Missing params');
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), new PublicKey(config.programId));
      const account = await fetchProposal(program, sovereignPDA, BigInt(proposalId));
      if (!account) return null;

      return {
        sovereign: account.sovereign.toBase58(),
        proposalId: account.proposalId.toString(),
        proposer: account.proposer.toBase58(),
        status: getProposalStatusString(account.status),
        votesForBps: account.votesForBps,
        votesAgainstBps: account.votesAgainstBps,
        totalVotedBps: account.totalVotedBps,
        voterCount: account.voterCount,
        quorumBps: account.quorumBps,
        passThresholdBps: account.passThresholdBps,
        votingEndsAt: new Date(Number(account.votingEndsAt) * 1000),
        timelockEndsAt: new Date(Number(account.timelockEndsAt) * 1000),
        createdAt: new Date(Number(account.createdAt) * 1000),
        executedAt: account.executedAt.toNumber() > 0
          ? new Date(Number(account.executedAt) * 1000)
          : null,
      };
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId && proposalId !== undefined,
  });
}

/**
 * Check if the connected wallet's NFT has already voted on a proposal.
 * Uses the deposit record's nft_mint to derive the vote record PDA.
 */
export function useVoteRecord(
  sovereignId: string | number | undefined,
  proposalId: string | number | undefined
) {
  const program = useReadOnlyProgram();
  const { publicKey } = useWalletAddress();

  return useQuery({
    queryKey: GOVERNANCE_KEYS.voteRecord(
      proposalId?.toString() ?? '',
      publicKey?.toBase58() ?? ''
    ),
    queryFn: async () => {
      if (!program || !sovereignId || proposalId === undefined || !publicKey) {
        throw new Error('Missing params');
      }

      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), new PublicKey(config.programId));
      const [proposalPDA] = getProposalPDA(sovereignPDA, BigInt(proposalId), new PublicKey(config.programId));

      // First, get this wallet's deposit record to find their NFT mint
      const depositRecord = await fetchDepositRecord(program, sovereignPDA, publicKey);
      if (!depositRecord || !depositRecord.nftMinted) return null;

      const nftMint = depositRecord.nftMint as PublicKey;
      if (!nftMint) return null;

      const record = await fetchVoteRecord(program, proposalPDA, nftMint);
      if (!record) return null;

      return {
        proposal: record.proposal.toBase58(),
        voter: record.voter.toBase58(),
        genesisNftMint: record.genesisNftMint.toBase58(),
        votingPowerBps: record.votingPowerBps,
        voteFor: record.voteFor,
        votedAt: new Date(Number(record.votedAt) * 1000),
      };
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId && proposalId !== undefined && !!publicKey,
  });
}

// ============================================================
// Transaction result type
// ============================================================

interface TransactionResult {
  signature: string;
  success: boolean;
}

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * Hook to propose an unwind vote.
 * Requires the connected wallet to own a Genesis NFT for this sovereign.
 */
export function useProposeUnwind() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      originalDepositor,
      nftMint,
    }: {
      sovereignId: string | number;
      originalDepositor: string;
      nftMint: string;
    }): Promise<TransactionResult & { proposalPDA: string }> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const { tx, proposalPDA } = await buildProposeUnwindTx(
        program,
        publicKey,
        new PublicKey(originalDepositor),
        BigInt(sovereignId),
        new PublicKey(nftMint)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      return { signature, success: true, proposalPDA: proposalPDA.toBase58() };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.proposals(variables.sovereignId.toString()) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to cast a vote on an active proposal.
 */
export function useCastVote() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      proposalId,
      originalDepositor,
      nftMint,
      support,
    }: {
      sovereignId: string | number;
      proposalId: string | number;
      originalDepositor: string;
      nftMint: string;
      support: boolean;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const tx = await buildCastVoteTx(
        program,
        publicKey,
        new PublicKey(originalDepositor),
        BigInt(sovereignId),
        BigInt(proposalId),
        new PublicKey(nftMint),
        support
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.proposals(variables.sovereignId.toString()) });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.proposal(variables.sovereignId.toString(), variables.proposalId.toString()) });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.voteRecord(variables.proposalId.toString(), '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to finalize a vote after the voting period ends.
 * Anyone can call this — no NFT or deposit required.
 */
export function useFinalizeVote() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      proposalId,
      poolState,
    }: {
      sovereignId: string | number;
      proposalId: string | number;
      poolState?: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const tx = await buildFinalizeVoteTx(
        program,
        publicKey,
        BigInt(sovereignId),
        BigInt(proposalId),
        poolState ? new PublicKey(poolState) : undefined
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.proposals(variables.sovereignId.toString()) });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEYS.proposal(variables.sovereignId.toString(), variables.proposalId.toString()) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to claim unwind proceeds.
 * Burns the Genesis NFT and transfers proportional GOR to the holder.
 */
export function useClaimUnwind() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      originalDepositor,
      nftMint,
    }: {
      sovereignId: string | number;
      originalDepositor: string;
      nftMint: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const tx = await buildClaimUnwindTx(
        program,
        publicKey,
        new PublicKey(originalDepositor),
        BigInt(sovereignId),
        new PublicKey(nftMint)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.depositRecord(variables.sovereignId.toString(), publicKey.toBase58()),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.walletDeposits(publicKey.toBase58()),
        });
      }
    },
  });
}
