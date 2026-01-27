import { PublicKey } from '@solana/web3.js';

// Sovereign Type
export type SovereignType = 'TokenLaunch' | 'BYOToken';

// Sovereign Status matching on-chain enum
export type SovereignStatus = 'Bonding' | 'Recovery' | 'Active' | 'Failed' | 'Unwound';

// Main Sovereign data structure
export interface Sovereign {
  // Identity
  sovereignId: bigint;
  publicKey: PublicKey;
  name: string;
  
  // Creator
  creator: PublicKey;
  
  // Token info
  tokenMint: PublicKey;
  sovereignType: SovereignType;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals: number;
  tokenSupplyDeposited: bigint;
  tokenTotalSupply: bigint;
  
  // Bond configuration
  bondTarget: bigint;           // in lamports
  bondDeadline: Date;
  bondDurationDays: number;
  
  // Current state
  status: SovereignStatus;
  totalDeposited: bigint;       // investor GOR deposited
  depositorCount: number;
  
  // Fee configuration
  sellFeeBps: number;
  swapFeeBps: number;
  creationFeeEscrowed: bigint;
  
  // Creator escrow
  creatorEscrow: bigint;
  creatorMaxBuyBps: number;
  
  // Recovery tracking
  totalSolFeesCollected: bigint;
  totalSolFeesDistributed: bigint;
  totalTokenFeesCollected: bigint;
  recoveryTarget: bigint;
  recoveryComplete: boolean;
  
  // LP info
  whirlpool?: PublicKey;
  positionMint?: PublicKey;
  permanentLock?: PublicKey;
  
  // Unwind state
  unwindSolBalance: bigint;
  unwindTokenBalance: bigint;
  
  // Activity check
  activityCheckInitiated: boolean;
  activityCheckTimestamp?: Date;
  autoUnwindPeriod: number;     // in seconds
}

// Deposit record for an investor
export interface DepositRecord {
  publicKey: PublicKey;
  sovereign: PublicKey;
  depositor: PublicKey;
  amount: bigint;               // in lamports
  sharesBps: number;
  genesisNft?: PublicKey;
  solFeesClaimed: bigint;
  tokenFeesClaimed: bigint;
  unwindClaimed: boolean;
}

// Genesis NFT metadata
export interface GenesisNFT {
  mint: PublicKey;
  owner: PublicKey;
  sovereign: PublicKey;
  sharesBps: number;
  depositAmount: bigint;
  metadata?: {
    name: string;
    symbol: string;
    uri: string;
  };
}

// Protocol state
export interface ProtocolState {
  authority: PublicKey;
  treasury: PublicKey;
  creationFeeBps: number;
  minFeeLamports: bigint;
  governanceUnwindFeeLamports: bigint;
  unwindFeeBps: number;
  byoMinSupplyBps: number;
  minBondTarget: bigint;
  minDeposit: bigint;
  autoUnwindPeriod: number;
  minFeeGrowthThreshold: bigint;
  feeThresholdRenounced: boolean;
  sovereignCount: bigint;
  totalFeesCollected: bigint;
  paused: boolean;
}

// Create Sovereign params
export interface CreateSovereignParams {
  name: string;
  sovereignType: SovereignType;
  bondTarget: bigint;
  bondDurationDays: number;
  
  // Token Launcher only
  tokenName?: string;
  tokenSymbol?: string;
  tokenSupply?: bigint;
  tokenDecimals?: number;
  sellFeeBps?: number;
  
  // BYO Token only
  existingMint?: PublicKey;
  depositAmount?: bigint;
  
  // Optional creator buy-in
  creatorBuyInAmount?: bigint;
}

// Governance proposal
export interface Proposal {
  publicKey: PublicKey;
  sovereign: PublicKey;
  proposalId: bigint;
  proposer: PublicKey;
  forVotes: bigint;
  againstVotes: bigint;
  endTime: Date;
  timelockEnd?: Date;
  executed: boolean;
}

// Display helpers
export interface SovereignDisplayData extends Sovereign {
  // Computed display values
  bondProgress: number;           // 0-100 percentage
  recoveryProgress: number;       // 0-100 percentage
  timeRemaining?: string;         // formatted time string
  bondTargetSol: number;          // in GOR
  totalDepositedSol: number;      // in GOR
  recoveryTargetSol: number;      // in GOR
}
