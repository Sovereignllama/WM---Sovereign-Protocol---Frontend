'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReadOnlyProgram, useProgram, useWalletAddress } from './useProgram';
import { useConnection } from '@solana/wallet-adapter-react';
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
  fetchPendingHarvestFees,
  fetchPendingClaimableFees,
  fetchTokenFeeStats,
  SovereignLiquidityProgram,
} from '@/lib/program/client';
import { getProtocolStatePDA, getSovereignPDA, getDepositRecordPDA, getTokenVaultPDA } from '@/lib/program/pdas';
import { PublicKey } from '@solana/web3.js';
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
  pendingHarvestFees: (sovereignId: string) => ['pendingHarvestFees', sovereignId],
  pendingClaimableFees: (sovereignId: string, depositor: string) => ['pendingClaimableFees', sovereignId, depositor],
  tokenFeeStats: (sovereignId: string) => ['tokenFeeStats', sovereignId],
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
        lastActivityTimestamp: Number(account.lastActivityTimestamp),
        activityCheckInitiated: account.activityCheckInitiated,
        activityCheckInitiatedAt: account.activityCheckInitiatedAt
          ? new Date(Number(account.activityCheckInitiatedAt) * 1000)
          : null,
        activityCheckTimestamp: Number(account.activityCheckTimestamp) > 0
          ? new Date(Number(account.activityCheckTimestamp) * 1000)
          : null,
        feeGrowthSnapshotA: account.feeGrowthSnapshotA.toString(),
        feeGrowthSnapshotB: account.feeGrowthSnapshotB.toString(),
        activityCheckLastCancelled: Number(account.activityCheckLastCancelled) > 0
          ? new Date(Number(account.activityCheckLastCancelled) * 1000)
          : null,
        totalSolFeesDistributed: account.totalSolFeesDistributed.toString(),
        totalSolFeesDistributedGor: Number(account.totalSolFeesDistributed) / LAMPORTS_PER_GOR,
        totalTokenFeesDistributed: account.totalTokenFeesDistributed.toString(),
        unwoundAt: account.unwoundAt && Number(account.unwoundAt) > 0
          ? new Date(Number(account.unwoundAt) * 1000)
          : null,
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
      
      // Creator's deposit creates the PDA via init_if_needed but stores
      // amount in creator_escrow, not in the deposit record.  An empty
      // record (amount === 0) means no real investor deposit exists.
      if (Number(record.amount) === 0) return null;

      // Compute shares client-side as fallback when on-chain shares_bps is 0
      // (shares_bps was not set on-chain prior to the fix)
      const sovereign = await fetchSovereignById(program, BigInt(sovereignId));
      const totalDeposited = Number(sovereign.totalDeposited);
      const depositAmount = Number(record.amount);
      const computedSharesBps = totalDeposited > 0
        ? Math.round((depositAmount / totalDeposited) * 10000)
        : 0;
      const sharesBps = record.sharesBps > 0 ? record.sharesBps : computedSharesBps;
      const votingPowerBps = record.votingPowerBps > 0 ? record.votingPowerBps : computedSharesBps;
      
      return {
        sovereign: record.sovereign.toBase58(),
        depositor: record.depositor.toBase58(),
        amount: record.amount.toString(),
        amountGor: Number(record.amount) / LAMPORTS_PER_GOR,
        sharesBps,
        sharesPercent: sharesBps / 100,
        genesisNftMint: record.genesisNftMint.toBase58(),
        feesClaimed: record.feesClaimed.toString(),
        feesClaimedGor: Number(record.feesClaimed) / LAMPORTS_PER_GOR,
        nftMint: record.nftMint?.toBase58() ?? null,
        votingPowerBps,
        votingPowerPercent: votingPowerBps / 100,
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

/**
 * Hook to fetch pending (unharvested) fees sitting in the SAMM position.
 * Shows how much GOR + tokens can be harvested by calling Harvest Fees.
 */
export function usePendingHarvestFees(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();
  const { connection } = useConnection();
  const sovereign = useSovereign(sovereignId);

  return useQuery({
    queryKey: QUERY_KEYS.pendingHarvestFees(sovereignId?.toString() ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId || !sovereign.data) return null;

      const poolState = new PublicKey(sovereign.data.poolState);
      const positionMint = new PublicKey(sovereign.data.positionMint);
      const tokenMint = new PublicKey(sovereign.data.tokenMint);

      // Default to 9 decimals for sovereign tokens (Token-2022 with default decimals)
      const tokenDecimals = 9;

      return fetchPendingHarvestFees(connection, poolState, positionMint, tokenMint, tokenDecimals);
    },
    staleTime: 15_000, // 15 seconds — fees accumulate slowly
    refetchInterval: 30_000, // Auto-refresh every 30s
    enabled: !!program && !!sovereignId && !!sovereign.data && 
      (sovereign.data.status === 'Recovery' || sovereign.data.status === 'Active'),
  });
}

/**
 * Hook to fetch how much GOR a depositor can claim from the fee vault.
 * Shows the depositor's unclaimed share of already-harvested fees.
 */
export function usePendingClaimableFees(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();
  const { connection } = useConnection();
  const { publicKey } = useWalletAddress();

  return useQuery({
    queryKey: QUERY_KEYS.pendingClaimableFees(
      sovereignId?.toString() ?? '',
      publicKey?.toBase58() ?? '',
    ),
    queryFn: async () => {
      if (!program || !sovereignId || !publicKey) return null;
      return fetchPendingClaimableFees(connection, program, BigInt(sovereignId), publicKey);
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    enabled: !!program && !!sovereignId && !!publicKey,
  });
}

/**
 * Hook to fetch Token-2022 transfer fee stats for a sovereign.
 * Shows vault balance, harvestable withheld fees, and fee rate.
 */
export function useTokenFeeStats(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();
  const { connection } = useConnection();
  const sovereign = useSovereign(sovereignId);

  return useQuery({
    queryKey: QUERY_KEYS.tokenFeeStats(sovereignId?.toString() ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId || !sovereign.data) return null;

      const tokenMint = new PublicKey(sovereign.data.tokenMint);
      const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);

      return fetchTokenFeeStats(connection, tokenMint, sovereignPDA, program.programId);
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: !!program && !!sovereignId && !!sovereign.data &&
      sovereign.data.sovereignType === 'TokenLaunch' &&
      (sovereign.data.status === 'Recovery' || sovereign.data.status === 'Active'),
  });
}
