'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReadOnlyProgram, useProgram, useWalletAddress } from './useProgram';
import { 
  fetchProtocolState, 
  fetchSovereignById, 
  fetchAllSovereigns,
  fetchDepositRecord,
  fetchSovereignDepositors,
  fetchWalletDeposits,
  getSovereignStatusString,
  getSovereignTypeString,
  getFeeModeString,
  SovereignLiquidityProgram,
} from '@/lib/program/client';
import { getProtocolStatePDA, getSovereignPDA, getDepositRecordPDA } from '@/lib/program/pdas';
import { PublicKey } from '@solana/web3.js';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';

// Query keys
export const QUERY_KEYS = {
  protocolState: ['protocolState'],
  sovereigns: ['sovereigns'],
  sovereign: (id: string | number) => ['sovereign', id.toString()],
  depositRecord: (sovereign: string, depositor: string) => ['depositRecord', sovereign, depositor],
  sovereignDepositors: (sovereign: string) => ['sovereignDepositors', sovereign],
  walletDeposits: (wallet: string) => ['walletDeposits', wallet],
} as const;

/**
 * Hook to fetch protocol state
 */
export function useProtocolState() {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: QUERY_KEYS.protocolState,
    queryFn: async () => {
      if (!program) throw new Error('Program not initialized');
      const state = await fetchProtocolState(program);
      return {
        ...state,
        creationFeeBps: state.creationFeeBps,
        minFeeLamports: state.minFeeLamports.toString(),
        minBondTarget: state.minBondTarget.toString(),
        minDeposit: state.minDeposit.toString(),
        sovereignCount: state.sovereignCount.toString(),
        totalFeesCollected: state.totalFeesCollected.toString(),
        autoUnwindPeriod: state.autoUnwindPeriod.toString(),
        paused: state.paused,
        // Formatted values
        minFeeGor: Number(state.minFeeLamports) / LAMPORTS_PER_GOR,
        minBondTargetGor: Number(state.minBondTarget) / LAMPORTS_PER_GOR,
        minDepositGor: Number(state.minDeposit) / LAMPORTS_PER_GOR,
        totalFeesCollectedGor: Number(state.totalFeesCollected) / LAMPORTS_PER_GOR,
      };
    },
    staleTime: 30_000, // 30 seconds
    enabled: !!program,
  });
}

/**
 * Hook to fetch all sovereigns
 */
export function useSovereigns() {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: QUERY_KEYS.sovereigns,
    queryFn: async () => {
      if (!program) throw new Error('Program not initialized');
      const sovereigns = await fetchAllSovereigns(program);
      
      return sovereigns.map(({ publicKey, account }: { publicKey: PublicKey; account: any }) => ({
        publicKey: publicKey.toBase58(),
        sovereignId: account.sovereignId.toString(),
        name: account.name || `Sovereign #${account.sovereignId}`,
        tokenName: account.tokenName || '',
        tokenSymbol: account.tokenSymbol || '',
        metadataUri: account.metadataUri || '',
        creator: account.creator.toBase58(),
        tokenMint: account.tokenMint.toBase58(),
        status: getSovereignStatusString(account.state),
        sovereignType: getSovereignTypeString(account.sovereignType),
        feeMode: getFeeModeString(account.feeMode),
        bondTarget: account.bondTarget.toString(),
        bondTargetGor: Number(account.bondTarget) / LAMPORTS_PER_GOR,
        totalDeposited: account.totalDeposited.toString(),
        totalDepositedGor: Number(account.totalDeposited) / LAMPORTS_PER_GOR,
        depositorCount: account.depositorCount,
        bondDeadline: new Date(Number(account.bondDeadline) * 1000),
        sellFeeBps: account.sellFeeBps,
        swapFeeBps: account.swapFeeBps,
        ammConfig: account.ammConfig.toBase58(),
        recoveryTarget: account.recoveryTarget.toString(),
        recoveryTargetGor: Number(account.recoveryTarget) / LAMPORTS_PER_GOR,
        totalRecovered: account.totalRecovered.toString(),
        totalRecoveredGor: Number(account.totalRecovered) / LAMPORTS_PER_GOR,
        recoveryComplete: account.recoveryComplete,
        createdAt: new Date(Number(account.createdAt) * 1000),
        // Progress calculations
        bondingProgress: account.bondTarget.toNumber() > 0 
          ? (account.totalDeposited.toNumber() / account.bondTarget.toNumber()) * 100 
          : 0,
        recoveryProgress: account.recoveryTarget.toNumber() > 0
          ? (account.totalRecovered.toNumber() / account.recoveryTarget.toNumber()) * 100
          : 0,
      }));
    },
    staleTime: 10_000, // 10 seconds
    enabled: !!program,
  });
}

/**
 * Hook to fetch a specific sovereign by ID
 */
export function useSovereign(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: QUERY_KEYS.sovereign(sovereignId ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId) throw new Error('Program or sovereignId not initialized');
      const account = await fetchSovereignById(program, BigInt(sovereignId));
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), new PublicKey(config.programId));
      
      return {
        publicKey: sovereignPDA.toBase58(),
        sovereignId: account.sovereignId.toString(),
        name: account.name || `Sovereign #${account.sovereignId}`,
        tokenName: account.tokenName || '',
        tokenSymbol: account.tokenSymbol || '',
        metadataUri: account.metadataUri || '',
        creator: account.creator.toBase58(),
        tokenMint: account.tokenMint.toBase58(),
        status: getSovereignStatusString(account.state),
        sovereignType: getSovereignTypeString(account.sovereignType),
        feeMode: getFeeModeString(account.feeMode),
        bondTarget: account.bondTarget.toString(),
        bondTargetGor: Number(account.bondTarget) / LAMPORTS_PER_GOR,
        totalDeposited: account.totalDeposited.toString(),
        totalDepositedGor: Number(account.totalDeposited) / LAMPORTS_PER_GOR,
        depositorCount: account.depositorCount,
        bondDeadline: new Date(Number(account.bondDeadline) * 1000),
        bondDuration: account.bondDuration.toString(),
        sellFeeBps: account.sellFeeBps,
        swapFeeBps: account.swapFeeBps,
        ammConfig: account.ammConfig.toBase58(),
        feeControlRenounced: account.feeControlRenounced,
        creatorEscrow: account.creatorEscrow.toString(),
        creatorEscrowGor: Number(account.creatorEscrow) / LAMPORTS_PER_GOR,
        tokenSupplyDeposited: account.tokenSupplyDeposited.toString(),
        poolState: account.poolState.toBase58(),
        positionMint: account.positionMint.toBase58(),
        poolRestricted: account.poolRestricted,
        recoveryTarget: account.recoveryTarget.toString(),
        recoveryTargetGor: Number(account.recoveryTarget) / LAMPORTS_PER_GOR,
        totalRecovered: account.totalRecovered.toString(),
        totalRecoveredGor: Number(account.totalRecovered) / LAMPORTS_PER_GOR,
        recoveryComplete: account.recoveryComplete,
        hasActiveProposal: account.hasActiveProposal,
        activeProposalId: account.activeProposalId.toString(),
        proposalCount: account.proposalCount.toString(),
        feeThresholdBps: account.feeThresholdBps,
        totalFeesCollected: account.totalFeesCollected.toString(),
        totalFeesCollectedGor: Number(account.totalFeesCollected) / LAMPORTS_PER_GOR,
        genesisNftMint: account.genesisNftMint.toBase58(),
        lastActivity: new Date(Number(account.lastActivity) * 1000),
        activityCheckInitiated: account.activityCheckInitiated,
        createdAt: new Date(Number(account.createdAt) * 1000),
        finalizedAt: account.finalizedAt.toNumber() > 0 
          ? new Date(Number(account.finalizedAt) * 1000) 
          : null,
        // Progress calculations
        bondingProgress: account.bondTarget.toNumber() > 0 
          ? (account.totalDeposited.toNumber() / account.bondTarget.toNumber()) * 100 
          : 0,
        recoveryProgress: account.recoveryTarget.toNumber() > 0
          ? (account.totalRecovered.toNumber() / account.recoveryTarget.toNumber()) * 100
          : 0,
        // Time remaining
        bondingTimeRemaining: Math.max(0, Number(account.bondDeadline) * 1000 - Date.now()),
        // Unwind balances (set after emergency_remove_liquidity)
        unwindSolBalance: account.unwindSolBalance.toString(),
        unwindSolBalanceGor: Number(account.unwindSolBalance) / LAMPORTS_PER_GOR,
        unwindTokenBalance: account.unwindTokenBalance.toString(),
      };
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId,
  });
}

/**
 * Hook to fetch a user's deposit record for a sovereign
 */
export function useDepositRecord(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();
  const { publicKey } = useWalletAddress();

  return useQuery({
    queryKey: QUERY_KEYS.depositRecord(
      sovereignId?.toString() ?? '', 
      publicKey?.toBase58() ?? ''
    ),
    queryFn: async () => {
      if (!program || !sovereignId || !publicKey) {
        throw new Error('Missing required parameters');
      }
      
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), new PublicKey(config.programId));
      const record = await fetchDepositRecord(program, sovereignPDA, publicKey);
      
      if (!record) return null;
      
      return {
        sovereign: record.sovereign.toBase58(),
        depositor: record.depositor.toBase58(),
        amount: record.amount.toString(),
        amountGor: Number(record.amount) / LAMPORTS_PER_GOR,
        sharesBps: record.sharesBps,
        sharesPercent: record.sharesBps / 100,
        genesisNftMint: record.genesisNftMint.toBase58(),
        feesClaimed: record.feesClaimed.toString(),
        feesClaimedGor: Number(record.feesClaimed) / LAMPORTS_PER_GOR,
        nftMint: record.nftMint?.toBase58() ?? null,
        votingPowerBps: record.votingPowerBps,
        votingPowerPercent: record.votingPowerBps / 100,
        nftMinted: record.nftMinted,
        unwindClaimed: record.unwindClaimed,
        refundClaimed: record.refundClaimed,
        depositedAt: new Date(Number(record.depositedAt) * 1000),
      };
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId && !!publicKey,
  });
}

/**
 * Hook to fetch all deposits for the connected wallet
 */
export function useWalletDeposits() {
  const program = useReadOnlyProgram();
  const { publicKey } = useWalletAddress();

  return useQuery({
    queryKey: QUERY_KEYS.walletDeposits(publicKey?.toBase58() ?? ''),
    queryFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Missing required parameters');
      }
      
      const deposits = await fetchWalletDeposits(program, publicKey);
      
      return deposits.map(({ publicKey: recordPubkey, account }: { publicKey: PublicKey; account: any }) => ({
        publicKey: recordPubkey.toBase58(),
        sovereign: account.sovereign.toBase58(),
        depositor: account.depositor.toBase58(),
        amount: account.amount.toString(),
        amountGor: Number(account.amount) / LAMPORTS_PER_GOR,
        sharesBps: account.sharesBps,
        sharesPercent: account.sharesBps / 100,
        feesClaimed: account.feesClaimed.toString(),
        feesClaimedGor: Number(account.feesClaimed) / LAMPORTS_PER_GOR,
        nftMinted: account.nftMinted,
        depositedAt: new Date(Number(account.depositedAt) * 1000),
      }));
    },
    staleTime: 10_000,
    enabled: !!program && !!publicKey,
  });
}
