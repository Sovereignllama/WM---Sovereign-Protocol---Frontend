import { PublicKey } from '@solana/web3.js';

// ============================================================
// Display types used across components and pages
// ============================================================

export type SovereignStatus =
  | 'Bonding'
  | 'Finalizing'
  | 'PoolCreated'
  | 'Recovery'
  | 'Active'
  | 'Unwinding'
  | 'Unwound'
  | 'Failed'
  | 'Halted'
  | 'Retired';

export interface SovereignDisplayData {
  sovereignId: bigint;
  publicKey: PublicKey;
  name: string;
  creator: PublicKey;
  tokenMint: PublicKey;
  sovereignType: 'TokenLaunch' | 'BYOToken';
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals: number;
  tokenSupplyDeposited: bigint;
  tokenTotalSupply: bigint;
  bondTarget: bigint;
  bondDeadline: Date;
  bondDurationDays: number;
  status: SovereignStatus | string;
  totalDeposited: bigint;
  depositorCount: number;
  sellFeeBps: number;
  swapFeeBps: number;
  creationFeeEscrowed: bigint;
  creatorEscrow: bigint;
  creatorMaxBuyBps: number;
  totalSolFeesCollected: bigint;
  totalSolFeesDistributed: bigint;
  totalTokenFeesCollected: bigint;
  totalFeesCollectedGor?: number;
  recoveryTarget: bigint;
  recoveryComplete: boolean;
  unwindSolBalance: bigint;
  unwindTokenBalance: bigint;
  activityCheckInitiated: boolean;
  activityCheckInitiatedAt?: Date | null;
  lastActivity?: Date | null;
  autoUnwindPeriod: number;
  metadataUri?: string;
  // Calculated display values
  bondProgress: number;
  recoveryProgress: number;
  bondTargetSol: number;
  totalDepositedSol: number;
  recoveryTargetSol?: number;
}

// ============================================================
// IDL Type — re-exported from canonical source
// ============================================================
export type { SovereignLiquidity } from '@/lib/program/idl/sovereign_liquidity';
