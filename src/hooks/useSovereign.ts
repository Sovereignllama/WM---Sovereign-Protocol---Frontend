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
  fetchPendingEngineLpFees,
  fetchTokenFeeStats,
  fetchEnginePool,
  SovereignLiquidityProgram,
} from '@/lib/program/client';
import { getProtocolStatePDA, getSovereignPDA, getDepositRecordPDA, getTokenVaultPDA } from '@/lib/program/pdas';
import { PublicKey } from '@solana/web3.js';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';

/** Safely convert BN to number without throwing on >53-bit values */
const safeNum = (bn: any): number => Number(bn.toString());

// Query keys
export const QUERY_KEYS = {
  protocolState: ['protocolState'],
  sovereigns: ['sovereigns'],
  sovereign: (id: string | number) => ['sovereign', id.toString()],
  depositRecord: (sovereign: string, depositor: string) => ['depositRecord', sovereign, depositor],
  sovereignDepositors: (sovereign: string) => ['sovereignDepositors', sovereign],
  walletDeposits: (wallet: string) => ['walletDeposits', wallet],
  pendingHarvestFees: (sovereignId: string) => ['pendingHarvestFees', sovereignId],
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
        minFeeGrowthThreshold: Number(state.minFeeGrowthThreshold?.toString() ?? '0'),
        observationPeriod: Number(state.observationPeriod?.toString() ?? '0'),
        discussionPeriod: Number(state.discussionPeriod?.toString() ?? '0'),
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
        ammConfig: '11111111111111111111111111111111', // legacy padding
        presetParameter: '11111111111111111111111111111111', // legacy padding
        recoveryTarget: account.recoveryTarget.toString(),
        recoveryTargetGor: Number(account.recoveryTarget) / LAMPORTS_PER_GOR,
        totalRecovered: account.totalRecovered.toString(),
        totalRecoveredGor: Number(account.totalRecovered) / LAMPORTS_PER_GOR,
        recoveryComplete: account.recoveryComplete,
        createdAt: new Date(Number(account.createdAt) * 1000),
        // Fees & activity fields for list-level filtering
        totalFeesCollected: account.totalFeesCollected?.toString() || '0',
        totalFeesCollectedGor: Number(account.totalFeesCollected || 0) / LAMPORTS_PER_GOR,
        activityCheckInitiated: !!account.activityCheckInitiated,
        activityCheckInitiatedAt: Number(account.activityCheckInitiatedAt || 0) > 0
          ? new Date(Number(account.activityCheckInitiatedAt) * 1000)
          : null,
        lastActivity: Number(account.lastActivity || 0) > 0
          ? new Date(Number(account.lastActivity) * 1000)
          : null,
        feeControlRenounced: !!account.feeControlRenounced,
        finalizedAt: safeNum(account.finalizedAt) > 0
          ? new Date(safeNum(account.finalizedAt) * 1000)
          : null,
        unwindSolBalanceGor: Number(account.unwindSolBalance || 0) / LAMPORTS_PER_GOR,
        hasActiveProposal: !!account.hasActiveProposal,
        // Progress calculations
        bondingProgress: safeNum(account.bondTarget) > 0 
          ? (safeNum(account.totalDeposited) / safeNum(account.bondTarget)) * 100 
          : 0,
        recoveryProgress: safeNum(account.recoveryTarget) > 0
          ? (safeNum(account.totalRecovered) / safeNum(account.recoveryTarget)) * 100
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
        ammConfig: '11111111111111111111111111111111', // legacy padding
        presetParameter: '11111111111111111111111111111111', // legacy padding
        feeControlRenounced: account.feeControlRenounced,
        creatorEscrow: account.creatorEscrow.toString(),
        creatorEscrowGor: Number(account.creatorEscrow) / LAMPORTS_PER_GOR,
        tokenSupplyDeposited: account.tokenSupplyDeposited.toString(),
        tokenTotalSupply: account.tokenTotalSupply.toString(),
        tokenTotalSupplyFormatted: Number(account.tokenTotalSupply) / LAMPORTS_PER_GOR,
        totalSupply: '0', // legacy padding
        totalSupplyFormatted: 0, // legacy padding
        poolState: '11111111111111111111111111111111',       // legacy padding
        positionMint: '11111111111111111111111111111111', // legacy padding
        lbPair: '11111111111111111111111111111111',             // legacy padding
        position: '11111111111111111111111111111111',         // legacy padding
        poolRestricted: false, // legacy padding
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
        totalTokenFeesDistributed: '0', // legacy padding
        unwoundAt: account.unwoundAt && Number(account.unwoundAt) > 0
          ? new Date(Number(account.unwoundAt) * 1000)
          : null,
        createdAt: new Date(Number(account.createdAt) * 1000),
        finalizedAt: safeNum(account.finalizedAt) > 0 
          ? new Date(safeNum(account.finalizedAt) * 1000) 
          : null,
        // Progress calculations
        bondingProgress: safeNum(account.bondTarget) > 0 
          ? (safeNum(account.totalDeposited) / safeNum(account.bondTarget)) * 100 
          : 0,
        recoveryProgress: safeNum(account.recoveryTarget) > 0
          ? (safeNum(account.totalRecovered) / safeNum(account.recoveryTarget)) * 100
          : 0,
        // Time remaining
        bondingTimeRemaining: Math.max(0, Number(account.bondDeadline) * 1000 - Date.now()),
        // Unwind balances (set after emergency_remove_liquidity)
        unwindSolBalance: account.unwindSolBalance.toString(),
        unwindSolBalanceGor: Number(account.unwindSolBalance) / LAMPORTS_PER_GOR,
        unwindTokenBalance: account.unwindTokenBalance.toString(),
        // Token redemption pool (surplus GOR for external token holders)
        tokenRedemptionPool: account.tokenRedemptionPool?.toString() ?? '0',
        tokenRedemptionPoolGor: Number(account.tokenRedemptionPool || 0) / LAMPORTS_PER_GOR,
        circulatingTokensAtUnwind: account.circulatingTokensAtUnwind?.toString() ?? '0',
        tokenRedemptionDeadline: Number(account.tokenRedemptionDeadline || 0) > 0
          ? new Date(Number(account.tokenRedemptionDeadline) * 1000)
          : null,
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

      // Compute shares client-side as fallback when on-chain position_bps is 0
      // (position_bps is set at NFT mint time; before that, compute from deposits)
      const sovereign = await fetchSovereignById(program, BigInt(sovereignId));
      const totalDeposited = Number(sovereign.totalDeposited);
      const depositAmount = Number(record.amount);
      const computedSharesBps = totalDeposited > 0
        ? Math.round((depositAmount / totalDeposited) * 10000)
        : 0;
      // IDL field: position_bps (camelCase: positionBps) — replaces old shares_bps + voting_power_bps
      const onChainBps = record.positionBps ?? 0;
      const sharesBps = onChainBps > 0 ? onChainBps : computedSharesBps;
      const votingPowerBps = sharesBps; // unified: position_bps covers both
      
      return {
        sovereign: record.sovereign.toBase58(),
        depositor: record.depositor.toBase58(),
        amount: record.amount.toString(),
        amountGor: Number(record.amount) / LAMPORTS_PER_GOR,
        sharesBps,
        sharesPercent: sharesBps / 100,
        genesisNftMint: record.genesisNftMint.toBase58(),
        feesClaimed: '0', // deprecated: fee vault was never funded
        feesClaimedGor: 0,
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
      
      return deposits.map(({ publicKey: recordPubkey, account }: { publicKey: PublicKey; account: any }) => {
        // IDL field: position_bps (camelCase: positionBps) — replaces old shares_bps + voting_power_bps
        const bps = account.positionBps ?? 0;
        return {
          publicKey: recordPubkey.toBase58(),
          sovereign: account.sovereign.toBase58(),
          depositor: account.depositor.toBase58(),
          amount: account.amount.toString(),
          amountGor: Number(account.amount) / LAMPORTS_PER_GOR,
          sharesBps: bps,
          sharesPercent: bps / 100,
          votingPowerBps: bps,
          votingPowerPercent: bps / 100,
          feesClaimed: '0', // deprecated: fee vault was never funded
          feesClaimedGor: 0,
          nftMinted: account.nftMinted,
          nftMint: account.nftMint?.toBase58() ?? null,
          unwindClaimed: account.unwindClaimed,
          refundClaimed: account.refundClaimed,
          depositedAt: new Date(Number(account.depositedAt) * 1000),
        };
      });
    },
    staleTime: 10_000,
    enabled: !!program && !!publicKey,
  });
}

/**
 * Hook to fetch pending LP fees from the engine pool for the connected wallet.
 * Shows how much GOR the depositor can claim from swap fee accumulation.
 */
export function usePendingEngineLpFees(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();
  const { publicKey } = useWalletAddress();

  return useQuery({
    queryKey: QUERY_KEYS.pendingHarvestFees(sovereignId?.toString() ?? ''),
    queryFn: async () => {
      if (!program || !sovereignId || !publicKey) return null;
      return fetchPendingEngineLpFees(program, BigInt(sovereignId), publicKey);
    },
    staleTime: 15_000, // 15 seconds — fees accumulate with trades
    refetchInterval: 30_000, // Auto-refresh every 30s
    enabled: !!program && !!sovereignId && !!publicKey,
  });
}

/**
 * Hook to fetch the engine pool state for a sovereign.
 * Returns pool stats: prices, volumes, fees, tier info, etc.
 */
export function useEnginePool(sovereignId: string | number | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['enginePool', sovereignId?.toString() ?? ''],
    queryFn: async () => {
      if (!program || !sovereignId) return null;
      const pool = await fetchEnginePool(program, BigInt(sovereignId));
      if (!pool) return null;

      return {
        poolStatus: pool.poolStatus?.trading ? 'Trading'
          : pool.poolStatus?.paused ? 'Paused'
          : pool.poolStatus?.unwound ? 'Unwound'
          : 'Uninitialized',
        authority: pool.authority.toBase58(),
        creator: pool.creator.toBase58(),
        sovereign: pool.sovereign.toBase58(),
        tokenMint: pool.tokenMint.toBase58(),
        gorVault: pool.gorVault.toBase58(),
        tokenVault: pool.tokenVault.toBase58(),
        totalTokenSupply: pool.totalTokenSupply.toString(),
        totalTokenSupplyFormatted: Number(pool.totalTokenSupply) / LAMPORTS_PER_GOR,
        tokenReserve: pool.tokenReserve.toString(),
        tokenReserveFormatted: Number(pool.tokenReserve) / LAMPORTS_PER_GOR,
        gorReserve: pool.gorReserve.toString(),
        gorReserveGor: Number(pool.gorReserve) / LAMPORTS_PER_GOR,
        initialGorReserve: pool.initialGorReserve.toString(),
        initialGorReserveGor: Number(pool.initialGorReserve) / LAMPORTS_PER_GOR,
        totalTokensSold: pool.totalTokensSold.toString(),
        totalTokensSoldFormatted: Number(pool.totalTokensSold) / LAMPORTS_PER_GOR,
        // V3: BinArray fields
        numBins: pool.numBins,
        binCapacity: pool.binCapacity.toString(),
        binCapacityFormatted: Number(pool.binCapacity) / LAMPORTS_PER_GOR,
        activeBin: pool.activeBin,
        highestAllocatedPage: pool.highestAllocatedPage,
        swapFeeBps: pool.swapFeeBps,
        creatorFeeShareBps: pool.creatorFeeShareBps,
        binFeeShareBps: pool.binFeeShareBps,
        // V3: spot price = gor_reserve / token_reserve (precision-scaled ×1e9)
        spotPrice: Number(pool.tokenReserve) > 0
          ? (Number(pool.gorReserve) / Number(pool.tokenReserve)) * 1_000_000_000
          : 0,
        lastPrice: pool.lastPrice.toString(),
        totalFeesCollected: pool.totalFeesCollected.toString(),
        totalFeesCollectedGor: Number(pool.totalFeesCollected) / LAMPORTS_PER_GOR,
        lpFeesAccumulated: pool.lpFeesAccumulated.toString(),
        creatorFeesAccumulated: pool.creatorFeesAccumulated.toString(),
        lpFeesClaimed: pool.lpFeesClaimed.toString(),
        creatorFeesClaimed: pool.creatorFeesClaimed.toString(),
        recoveryTarget: pool.recoveryTarget.toString(),
        totalRecovered: pool.totalRecovered.toString(),
        recoveryComplete: pool.recoveryComplete,
        totalTrades: Number(pool.totalTrades),
        isPaused: pool.isPaused,
        // V3: bin fee accounting
        totalEligibleWeight: pool.totalEligibleWeight.toString(),
        totalBinFeesDistributed: pool.totalBinFeesDistributed.toString(),
        totalBinFeesDistributedGor: Number(pool.totalBinFeesDistributed) / LAMPORTS_PER_GOR,
      };
    },
    staleTime: 10_000,
    enabled: !!program && !!sovereignId,
  });
}

/**
 * Hook to fetch how much GOR a depositor can claim from the fee vault.
 * Shows the depositor's unclaimed share of already-harvested fees.
 */
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
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), program.programId);

      return fetchTokenFeeStats(connection, tokenMint, sovereignPDA, program.programId);
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: !!program && !!sovereignId && !!sovereign.data &&
      sovereign.data.sovereignType === 'TokenLaunch' &&
      (sovereign.data.status === 'Recovery' || sovereign.data.status === 'Active'),
  });
}
