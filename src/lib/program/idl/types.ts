/**
 * Program IDL type definition for Sovereign Liquidity Protocol
 * Auto-generated from the Anchor IDL
 */

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { IdlAccounts, IdlTypes } from '@coral-xyz/anchor';

// Import the raw IDL
import SovereignLiquidityIDL from './sovereign_liquidity.json';

// Export the IDL
export type SovereignLiquidity = typeof SovereignLiquidityIDL;
export { SovereignLiquidityIDL };

// Extract account types from IDL
export type ProtocolStateAccount = {
  authority: PublicKey;
  treasury: PublicKey;
  creationFeeBps: number;
  minFeeLamports: BN;
  governanceUnwindFeeLamports: BN;
  unwindFeeBps: number;
  byoMinSupplyBps: number;
  minBondTarget: BN;
  minDeposit: BN;
  autoUnwindPeriod: BN;
  minFeeGrowthThreshold: BN;
  padFeeThresholdRenounced: number;
  paused: boolean;
  sovereignCount: BN;
  totalFeesCollected: BN;
  bump: number;
  votingPeriod: BN;
  observationPeriod: BN;
  governanceQuorumBps: number;
  governancePassThresholdBps: number;
  discussionPeriod: BN;
  keeper: PublicKey;
  pendingAuthority: PublicKey;
  defaultSwapFeeBps: number;
  collectionMint: PublicKey;
  creatorFeeShareBps: number;
};

export type SovereignStateAccount = {
  sovereignId: BN;
  creator: PublicKey;
  tokenMint: PublicKey;
  sovereignType: SovereignType;
  state: SovereignStatus;
  bondTarget: BN;
  bondDeadline: BN;
  bondDuration: BN;
  totalDeposited: BN;
  depositorCount: number;
  creatorEscrow: BN;
  tokenSupplyDeposited: BN;
  tokenTotalSupply: BN;
  sellFeeBps: number;
  feeMode: FeeMode;
  feeControlRenounced: boolean;
  creationFeeEscrowed: BN;
  ammConfig: PublicKey;
  swapFeeBps: number;
  presetParameter: PublicKey;
  binStep: number;
  activeIdAtLaunch: number;
  lowerBinId: number;
  upperBinId: number;
  positionBase: PublicKey;
  poolState: PublicKey;
  lbPair: PublicKey;
  positionMint: PublicKey;
  position: PublicKey;
  poolRestricted: boolean;
  recoveryTarget: BN;
  totalSolFeesDistributed: BN;
  totalTokenFeesDistributed: BN;
  recoveryComplete: boolean;
  activeProposalId: BN;
  proposalCount: BN;
  hasActiveProposal: boolean;
  feeThresholdBps: number;
  totalFeesCollected: BN;
  totalRecovered: BN;
  totalSupply: BN;
  genesisNftMint: PublicKey;
  unwoundAt: BN | null;
  lastActivity: BN;
  activityCheckInitiated: boolean;
  activityCheckInitiatedAt: BN | null;
  activityCheckTimestamp: BN;
  feeGrowthSnapshotA: BN;
  feeGrowthSnapshotB: BN;
  activityCheckLastCancelled: BN;
  unwindSolBalance: BN;
  unwindTokenBalance: BN;
  lastActivityTimestamp: BN;
  createdAt: BN;
  finalizedAt: BN;
  bump: number;
};

export type DepositRecordAccount = {
  sovereign: PublicKey;
  depositor: PublicKey;
  amount: BN;
  positionBps: number;
  genesisNftMint: PublicKey;
  /** Deprecated padding — fee vault was never funded */
  _padFeesClaimed: Uint8Array;
  nftMint: PublicKey | null;
  /** Deprecated padding — superseded by positionBps */
  _padVotingPowerBps: Uint8Array;
  nftMinted: boolean;
  unwindClaimed: boolean;
  refundClaimed: boolean;
  depositedAt: BN;
  bump: number;
};

export type CreatorFeeTrackerAccount = {
  sovereign: PublicKey;
  creator: PublicKey;
  totalEarned: BN;
  totalClaimed: BN;
  pendingWithdrawal: BN;
  thresholdRenounced: boolean;
  purchasedTokens: BN;
  tokensLocked: boolean;
  purchasedTokensClaimed: boolean;
  tokensClaimed: boolean;
  sellTaxAccumulated: BN;
  sellTaxClaimed: BN;
  failedReclaimed: boolean;
  purchasedAt: BN;
  bump: number;
};

export type PermanentLockAccount = {
  sovereign: PublicKey;
  lbPair: PublicKey;
  poolState: PublicKey;
  positionMint: PublicKey;
  position: PublicKey;
  positionBase: PublicKey;
  positionTokenAccount: PublicKey;
  liquidity: BN;
  tickLowerIndex: number;
  tickUpperIndex: number;
  lowerBinId: number;
  upperBinId: number;
  binStep: number;
  positionWidth: number;
  unwound: boolean;
  createdAt: BN;
  unwoundAt: BN;
  bump: number;
};

export type ProposalAccount = {
  sovereign: PublicKey;
  proposalId: BN;
  proposer: PublicKey;
  status: ProposalStatus;
  votesForBps: number;
  votesAgainstBps: number;
  totalVotedBps: number;
  voterCount: number;
  quorumBps: number;
  passThresholdBps: number;
  votingEndsAt: BN;
  votingStartsAt: BN;
  timelockEndsAt: BN;
  createdAt: BN;
  executedAt: BN;
  bump: number;
};

export type VoteRecordAccount = {
  proposal: PublicKey;
  voter: PublicKey;
  genesisNftMint: PublicKey;
  votingPowerBps: number;
  voteFor: boolean;
  votedAt: BN;
  bump: number;
};

export type CreationFeeEscrowAccount = {
  sovereign: PublicKey;
  amount: BN;
  released: boolean;
  bump: number;
};

// Enum types
export type SovereignStatus = 
  | { bonding: {} }
  | { finalizing: {} }
  | { poolCreated: {} }
  | { recovery: {} }
  | { active: {} }
  | { unwinding: {} }
  | { unwound: {} }
  | { failed: {} }
  | { halted: {} }
  | { retired: {} };

export type SovereignType = 
  | { tokenLaunch: {} }
  | { byoToken: {} };

export type FeeMode = 
  | { creatorRevenue: {} }
  | { recoveryBoost: {} }
  | { fairLaunch: {} };

export type ProposalStatus = 
  | { active: {} }
  | { passed: {} }
  | { failed: {} }
  | { executed: {} }
  | { cancelled: {} };

// Params types
export type CreateSovereignParams = {
  sovereignType: SovereignType;
  bondTarget: BN;
  bondDuration: BN;
  name: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenSupply: BN | null;
  sellFeeBps: number | null;
  feeMode: FeeMode | null;
  metadataUri: string | null;
  depositAmount: BN | null;
  swapFeeBps: number;
};

// Events
export type SovereignCreatedEvent = {
  sovereignId: BN;
  creator: PublicKey;
  tokenMint: PublicKey;
  sovereignType: SovereignType;
  bondTarget: BN;
  bondDeadline: BN;
  tokenSupplyDeposited: BN;
  creationFeeEscrowed: BN;
  sellFeeBps: number;
  feeMode: FeeMode;
  ammConfig: PublicKey;
  swapFeeBps: number;
};

export type InvestorDepositedEvent = {
  sovereignId: BN;
  depositor: PublicKey;
  amount: BN;
  totalDeposited: BN;
  depositorCount: number;
};

export type InvestorWithdrewEvent = {
  sovereignId: BN;
  depositor: PublicKey;
  amount: BN;
  remainingDeposit: BN;
  totalDeposited: BN;
};

export type SovereignFinalizedEvent = {
  sovereignId: BN;
  totalDeposited: BN;
  tokenSupply: BN;
  lpTokens: BN;
  recoveryTarget: BN;
  finalizedAt: BN;
};

export type BondingFailedEvent = {
  sovereignId: BN;
  totalDeposited: BN;
  bondTarget: BN;
  failedAt: BN;
};

export type RecoveryCompleteEvent = {
  sovereignId: BN;
  totalRecovered: BN;
  recoveryTarget: BN;
  completedAt: BN;
};

export type ProposalCreatedEvent = {
  sovereignId: BN;
  proposalId: BN;
  proposer: PublicKey;
  createdAt: BN;
  votingEndsAt: BN;
};

export type VoteCastEvent = {
  sovereignId: BN;
  proposalId: BN;
  voter: PublicKey;
  support: boolean;
  votingPower: BN;
  votesFor: BN;
  votesAgainst: BN;
};

export type GenesisNFTMintedEvent = {
  sovereignId: BN;
  depositor: PublicKey;
  nftMint: PublicKey;
  votingPowerBps: number;
  depositAmount: BN;
};

export type FeesClaimedEvent = {
  sovereignId: BN;
  solFees: BN;
  tokenFees: BN;
  creatorShare: BN;
  investorShare: BN;
  protocolShare: BN;
  totalRecovered: BN;
  recoveryTarget: BN;
};

// Error codes
export const SovereignLiquidityErrors = {
  InvalidState: 6000,
  InvalidAccountData: 6001,
  DeadlinePassed: 6002,
  DeadlineNotPassed: 6003,
  BondingNotComplete: 6004,
  BondingComplete: 6005,
  RecoveryNotComplete: 6006,
  RecoveryAlreadyComplete: 6007,
  CreatorDepositExceedsMax: 6008,
  ZeroDeposit: 6009,
  DepositTooSmall: 6010,
  NoDepositRecord: 6011,
  DepositExceedsBondTarget: 6012,
  InsufficientDeposit: 6013,
  ZeroWithdraw: 6014,
  InsufficientDepositBalance: 6015,
  CreatorCannotWithdrawDuringBonding: 6016,
  InsufficientVaultBalance: 6017,
  NothingToWithdraw: 6018,
  CreatorMustUseCreatorWithdraw: 6019,
  NotNFTOwner: 6020,
  NFTAlreadyUsed: 6021,
  NFTAlreadyMinted: 6022,
  WrongNFT: 6023,
  NFTNotMinted: 6024,
  NoGenesisNFT: 6025,
  CreatorCannotClaimDuringRecovery: 6026,
  CreatorCannotVote: 6027,
  CreatorTokensLocked: 6028,
  InsufficientInactivity: 6029,
  VotingNotEnded: 6030,
  VotingPeriodNotEnded: 6031,
  VotingEnded: 6032,
  VotingPeriodEnded: 6033,
  QuorumNotReached: 6034,
  ProposalNotPassed: 6035,
  ProposalNotActive: 6036,
  AlreadyVoted: 6037,
  GovernanceNotActive: 6038,
  NoVotingPower: 6039,
  TimelockNotExpired: 6040,
  ProposalAlreadyExecuted: 6041,
  ActiveProposalExists: 6042,
  CannotGovernanceUnwindInActivePhase: 6043,
  AutoUnwindConditionsNotMet: 6044,
  OnlyActivePhase: 6045,
  ActivityCheckAlreadyInProgress: 6046,
  ActivityCheckAlreadyPending: 6047,
  NoActivityCheckInProgress: 6048,
  NoActivityCheckPending: 6049,
  ActivityCheckTooEarly: 6050,
  ActivityCheckPeriodNotElapsed: 6051,
  ActivityCheckCooldownNotExpired: 6052,
  FeeThresholdRenounced: 6053,
  AlreadyRenounced: 6054,
  FeeThresholdAlreadyRenounced: 6055,
  CannotIncreaseFeeThreshold: 6056,
  InvalidFeeThreshold: 6057,
  InvalidPool: 6058,
  InvalidProgram: 6059,
  InvalidTreasury: 6060,
  InvalidBondTarget: 6061,
  InvalidBondDuration: 6062,
  InvalidSellFee: 6063,
  InvalidAmount: 6064,
  BondTargetNotMet: 6065,
  BondTargetMet: 6066,
  Unauthorized: 6067,
  FeeTooHigh: 6068,
  PoolRestricted: 6069,
  PoolNotRestricted: 6070,
  PositionAlreadyUnwound: 6071,
  InvalidPosition: 6072,
  SellFeeExceedsMax: 6073,
  CreationFeeExceedsMax: 6074,
  UnwindFeeExceedsMax: 6075,
  FeeControlRenounced: 6076,
  InsufficientCreationFee: 6077,
  NotProtocolAuthority: 6078,
  InvalidAutoUnwindPeriod: 6079,
  MetadataURITooLong: 6080,
  TokenNameTooLong: 6081,
  TokenSymbolTooLong: 6082,
  MissingTokenName: 6083,
  MissingTokenSymbol: 6084,
  MissingTokenSupply: 6085,
  MissingExistingMint: 6086,
  MissingDepositAmount: 6087,
  InsufficientTokenDeposit: 6088,
  FailedToReadTokenSupply: 6089,
  AlreadyClaimed: 6090,
  NothingToClaim: 6091,
  NotCreator: 6092,
  NotDepositor: 6093,
  Overflow: 6094,
  Underflow: 6095,
  DivisionByZero: 6096,
  NoDeposits: 6097,
  SlippageExceeded: 6098,
  ProtocolPaused: 6099,
  ActivityCheckCooldownNotElapsed: 6100,
  MissingSAMMAccounts: 6101,
  VotingPowerOverflow: 6102,
} as const;

export type SovereignLiquidityErrorCode = typeof SovereignLiquidityErrors[keyof typeof SovereignLiquidityErrors];
