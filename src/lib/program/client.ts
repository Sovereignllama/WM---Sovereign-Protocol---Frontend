import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { config } from '../config';
import { 
  getProtocolStatePDA, 
  getSovereignPDA, 
  getDepositRecordPDA, 
  getSolVaultPDA,
  getCreatorTrackerPDA,
  getCreationFeeEscrowPDA,
  getTokenVaultPDA,
  getTokenMintPDA,
  getExtraAccountMetasPDA,
} from './pdas';
import { 
  CreateSovereignParams as OnChainCreateSovereignParams, 
  SovereignType as OnChainSovereignType, 
  FeeMode as OnChainFeeMode 
} from './idl/types';

// Import the IDL
import { SovereignLiquidityIDL } from './idl';

// Type alias for program (using any for Anchor 0.30+ compatibility)
export type SovereignLiquidityProgram = Program;

/**
 * Get the Anchor Program instance
 * Uses `as any` for Anchor 0.30+ TypeScript compatibility
 */
export function getProgram(provider: AnchorProvider): SovereignLiquidityProgram {
  return new Program(SovereignLiquidityIDL as Idl, provider);
}

/**
 * Get a read-only connection for fetching data
 */
export function getConnection(): Connection {
  return new Connection(config.rpcUrl, 'confirmed');
}

/**
 * Fetch the protocol state
 */
export async function fetchProtocolState(program: SovereignLiquidityProgram) {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  return (program.account as any).protocolState.fetch(protocolStatePDA);
}

/**
 * Fetch a sovereign state by ID
 */
export async function fetchSovereignById(
  program: SovereignLiquidityProgram,
  sovereignId: bigint | number
) {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  return (program.account as any).sovereignState.fetch(sovereignPDA);
}

/**
 * Fetch a sovereign state by pubkey
 */
export async function fetchSovereign(
  program: SovereignLiquidityProgram,
  sovereignPubkey: PublicKey
) {
  return (program.account as any).sovereignState.fetch(sovereignPubkey);
}

/**
 * Fetch all sovereigns (with optional filters)
 */
export async function fetchAllSovereigns(program: SovereignLiquidityProgram) {
  return (program.account as any).sovereignState.all();
}

/**
 * Fetch a deposit record for a depositor
 */
export async function fetchDepositRecord(
  program: SovereignLiquidityProgram,
  sovereign: PublicKey,
  depositor: PublicKey
) {
  const [depositRecordPDA] = getDepositRecordPDA(sovereign, depositor, program.programId);
  try {
    return await (program.account as any).depositRecord.fetch(depositRecordPDA);
  } catch {
    return null; // No deposit record exists
  }
}

/**
 * Fetch all deposit records for a sovereign
 */
export async function fetchSovereignDepositors(
  program: SovereignLiquidityProgram,
  sovereign: PublicKey
) {
  return (program.account as any).depositRecord.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: sovereign.toBase58(),
      },
    },
  ]);
}

/**
 * Fetch all deposits for a wallet
 */
export async function fetchWalletDeposits(
  program: SovereignLiquidityProgram,
  wallet: PublicKey
) {
  return (program.account as any).depositRecord.all([
    {
      memcmp: {
        offset: 8 + 32, // After discriminator + sovereign pubkey
        bytes: wallet.toBase58(),
      },
    },
  ]);
}

// ============================================================
// Transaction Builders
// ============================================================

/**
 * Parameters for creating a sovereign from the frontend
 */
export interface CreateSovereignFrontendParams {
  sovereignType: 'TokenLaunch' | 'BYOToken';
  bondTarget: bigint;
  bondDurationDays: number;
  name: string;
  // Token Launch fields
  tokenName?: string;
  tokenSymbol?: string;
  tokenSupply?: bigint;
  sellFeeBps?: number;
  feeMode?: 'CreatorRevenue' | 'RecoveryBoost' | 'FairLaunch';
  metadataUri?: string;
  // BYO Token fields
  existingMint?: PublicKey;
  depositAmount?: bigint;
}

/**
 * Build a create sovereign transaction
 */
export async function buildCreateSovereignTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  params: CreateSovereignFrontendParams
): Promise<{ tx: Transaction; sovereignPDA: PublicKey; sovereignId: bigint }> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  
  // Fetch protocol state to get current sovereign count
  const protocolState = await fetchProtocolState(program);
  const sovereignId = BigInt(protocolState.sovereignCount.toString());
  
  // Derive the sovereign PDA using the next ID
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [creatorTrackerPDA] = getCreatorTrackerPDA(sovereignPDA, program.programId);
  const [creationFeeEscrowPDA] = getCreationFeeEscrowPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  
  // Convert frontend params to on-chain params
  const sovereignType: OnChainSovereignType = params.sovereignType === 'TokenLaunch' 
    ? { tokenLaunch: {} } 
    : { byoToken: {} };
  
  const feeMode: OnChainFeeMode | null = params.feeMode 
    ? params.feeMode === 'CreatorRevenue' 
      ? { creatorRevenue: {} }
      : params.feeMode === 'RecoveryBoost'
        ? { recoveryBoost: {} }
        : { fairLaunch: {} }
    : null;
  
  // Convert bond duration from days to seconds
  const bondDurationSeconds = params.bondDurationDays * 24 * 60 * 60;
  
  const createParams: OnChainCreateSovereignParams = {
    sovereignType,
    bondTarget: new BN(params.bondTarget.toString()),
    bondDuration: new BN(bondDurationSeconds),
    name: params.name,
    tokenName: params.tokenName || null,
    tokenSymbol: params.tokenSymbol || null,
    tokenSupply: params.tokenSupply ? new BN(params.tokenSupply.toString()) : null,
    sellFeeBps: params.sellFeeBps ?? null,
    feeMode,
    metadataUri: params.metadataUri || null,
    depositAmount: params.depositAmount ? new BN(params.depositAmount.toString()) : null,
  };
  
  // Build accounts - some are optional based on sovereign type
  const accounts: any = {
    creator,
    protocolState: protocolStatePDA,
    sovereign: sovereignPDA,
    creatorTracker: creatorTrackerPDA,
    creationFeeEscrow: creationFeeEscrowPDA,
    tokenMint: params.existingMint || null,
    creatorTokenAccount: params.existingMint 
      ? getAssociatedTokenAddressSync(params.existingMint, creator)
      : null,
    tokenVault: params.existingMint ? tokenVaultPDA : null,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };

  const tx = await (program.methods as any)
    .createSovereign(createParams)
    .accounts(accounts)
    .transaction();

  return { tx, sovereignPDA, sovereignId };
}

/**
 * Build a deposit transaction
 */
export async function buildDepositTx(
  program: SovereignLiquidityProgram,
  depositor: PublicKey,
  sovereignId: bigint | number,
  amount: bigint
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, depositor, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .deposit(new BN(amount.toString()))
    .accounts({
      depositor,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      solVault: solVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a withdraw transaction (during bonding phase)
 */
export async function buildWithdrawTx(
  program: SovereignLiquidityProgram,
  depositor: PublicKey,
  sovereignId: bigint | number,
  amount: bigint
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, depositor, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .withdraw(new BN(amount.toString()))
    .accounts({
      depositor,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      solVault: solVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a claim depositor fees transaction
 */
export async function buildClaimDepositorFeesTx(
  program: SovereignLiquidityProgram,
  depositor: PublicKey,
  sovereignId: bigint | number
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, depositor, program.programId);
  const [feeVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .claimDepositorFees()
    .accounts({
      depositor,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      feeVault: feeVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Helper Types
// ============================================================

export type SovereignStatus = 
  | 'Bonding'
  | 'Finalizing' 
  | 'Recovery'
  | 'Active'
  | 'Unwinding'
  | 'Unwound'
  | 'Failed';

export type SovereignType = 'TokenLaunch' | 'BYOToken';

export type FeeMode = 'CreatorRevenue' | 'RecoveryBoost' | 'FairLaunch';

/**
 * Convert on-chain status to string
 */
export function getSovereignStatusString(status: any): SovereignStatus {
  if (status.bonding) return 'Bonding';
  if (status.finalizing) return 'Finalizing';
  if (status.recovery) return 'Recovery';
  if (status.active) return 'Active';
  if (status.unwinding) return 'Unwinding';
  if (status.unwound) return 'Unwound';
  if (status.failed) return 'Failed';
  return 'Bonding'; // Default
}

/**
 * Convert on-chain sovereign type to string
 */
export function getSovereignTypeString(sovereignType: any): SovereignType {
  if (sovereignType.tokenLaunch) return 'TokenLaunch';
  if (sovereignType.byoToken) return 'BYOToken';
  return 'TokenLaunch'; // Default
}

/**
 * Convert on-chain fee mode to string
 */
export function getFeeModeString(feeMode: any): FeeMode {
  if (feeMode.creatorRevenue) return 'CreatorRevenue';
  if (feeMode.recoveryBoost) return 'RecoveryBoost';
  if (feeMode.fairLaunch) return 'FairLaunch';
  return 'FairLaunch'; // Default
}

// ============================================================
// Token-2022 Token Launch Functions
// ============================================================

/**
 * Parameters for creating a Token-2022 token
 */
export interface CreateTokenParams {
  name: string;
  symbol: string;
  uri: string;
  totalSupply: bigint;
  sellFeeBps: number; // 0-300 (0-3%)
}

/**
 * Build a create token transaction for TokenLaunch sovereigns
 * Creates a Token-2022 mint with TransferFeeConfig and TransferHook extensions
 */
export async function buildCreateTokenTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number,
  params: CreateTokenParams
): Promise<{ tx: Transaction; tokenMintPDA: PublicKey }> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [tokenMintPDA] = getTokenMintPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  const [extraAccountMetasPDA] = getExtraAccountMetasPDA(tokenMintPDA, program.programId);
  const [creatorTrackerPDA] = getCreatorTrackerPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .createToken(
      params.name,
      params.symbol,
      params.uri,
      new BN(params.totalSupply.toString()),
      params.sellFeeBps
    )
    .accounts({
      creator,
      sovereign: sovereignPDA,
      tokenMint: tokenMintPDA,
      tokenVault: tokenVaultPDA,
      extraAccountMetas: extraAccountMetasPDA,
      creatorFeeTracker: creatorTrackerPDA,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return { tx, tokenMintPDA };
}

/**
 * Build an update sell fee transaction
 * Creator can adjust fee between 0-3%
 */
export async function buildUpdateSellFeeTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number,
  newFeeBps: number
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);

  const tx = await (program.methods as any)
    .updateSellFee(newFeeBps)
    .accounts({
      creator,
      sovereign: sovereignPDA,
      tokenMint,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  return tx;
}

/**
 * Build a renounce sell fee transaction
 * Permanently sets fee to 0% and removes authority - IRREVERSIBLE
 */
export async function buildRenounceSellFeeTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);

  const tx = await (program.methods as any)
    .renounceSellFee()
    .accounts({
      creator,
      sovereign: sovereignPDA,
      tokenMint,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  return tx;
}

/**
 * Build a harvest transfer fees transaction
 * Collects withheld fees from token accounts and routes them based on FeeMode
 */
export async function buildHarvestTransferFeesTx(
  program: SovereignLiquidityProgram,
  caller: PublicKey,
  sovereignId: bigint | number,
  sourceTokenAccounts: PublicKey[]
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [creatorTrackerPDA] = getCreatorTrackerPDA(sovereignPDA, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  
  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);
  const creatorWallet = new PublicKey(sovereign.creator);

  const tx = await (program.methods as any)
    .harvestTransferFees()
    .accounts({
      caller,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      tokenMint,
      creatorFeeTracker: creatorTrackerPDA,
      creatorWallet,
      solVault: solVaultPDA,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    })
    .remainingAccounts(
      sourceTokenAccounts.map((pubkey) => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .transaction();

  return tx;
}

/**
 * Get Token-2022 associated token address
 */
export function getToken2022ATA(
  mint: PublicKey,
  owner: PublicKey
): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
}
