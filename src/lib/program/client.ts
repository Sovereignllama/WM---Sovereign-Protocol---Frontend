import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
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
  getPermanentLockPDA,
  getGenesisNftMintPDA,
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
 * Skips accounts that fail to deserialize (e.g. legacy struct layout)
 */
export async function fetchAllSovereigns(program: SovereignLiquidityProgram) {
  // Fetch all program accounts and decode individually to skip corrupted ones
  const allAccounts = await program.provider.connection.getProgramAccounts(program.programId);
  const results: { publicKey: PublicKey; account: any }[] = [];
  
  for (const { pubkey, account: raw } of allAccounts) {
    try {
      const decoded = (program as any).coder.accounts.decode(
        'sovereignState',
        raw.data
      );
      results.push({ publicKey: pubkey, account: decoded });
    } catch {
      // Skip accounts that can't be decoded (legacy layout, other account types)
    }
  }
  return results;
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
  // Swap fee tier
  swapFeeBps: number;
  // AMM config address for the chosen fee tier
  ammConfig: PublicKey;
  // Creator buy-in (lamports) - deposited as creator escrow after creation
  creatorBuyIn?: bigint;
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
  // On-chain uses sovereign_count + 1 (1-indexed) as the PDA seed
  const sovereignId = BigInt(protocolState.sovereignCount.toString()) + 1n;
  
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
    ammConfig: params.ammConfig,
    swapFeeBps: params.swapFeeBps,
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

// Metaplex Token Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * Derive the Metaplex metadata PDA for a mint
 */
function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * Build a create_token transaction for TokenLaunch sovereigns
 * Must be called after create_sovereign
 */
export async function buildCreateTokenTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint,
  params: { name: string; symbol: string; uri: string }
): Promise<{ tx: Transaction; tokenMintPDA: PublicKey }> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [tokenMintPDA] = getTokenMintPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .createToken({
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
    })
    .accounts({
      creator,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      tokenMint: tokenMintPDA,
      tokenVault: tokenVaultPDA,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return { tx, tokenMintPDA };
}

/**
 * Build a transaction to initialize extra account metas for the transfer hook.
 * Must be called after create_token so Token-2022 knows which extra accounts
 * the transfer hook requires.
 */
export async function buildInitializeExtraAccountMetasTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [tokenMintPDA] = getTokenMintPDA(sovereignPDA, program.programId);
  const [extraAccountMetasPDA] = getExtraAccountMetasPDA(tokenMintPDA, program.programId);

  const tx = await (program.methods as any)
    .initializeExtraAccountMetas()
    .accounts({
      payer,
      mint: tokenMintPDA,
      sovereign: sovereignPDA,
      extraAccountMetas: extraAccountMetasPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
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
// SAMM Constants and PDA Derivation
// ============================================================

const SAMM_PROGRAM_ID = new PublicKey('WTzkPUoprVx7PDc1tfKA5sS7k1ynCgU89WtwZhksHX5');
const WGOR_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Full-range tick constants (aligned to tick_spacing=10)
const MIN_TICK = -443630;
const MAX_TICK = 443630;
const DEFAULT_TICK_SPACING = 10;

/** Sort two mints into canonical order (lower pubkey bytes first) */
function sortMints(mintA: PublicKey, mintB: PublicKey): { mint0: PublicKey; mint1: PublicKey; wgorIs0: boolean } {
  const cmp = Buffer.compare(mintA.toBuffer(), mintB.toBuffer());
  const mint0 = cmp < 0 ? mintA : mintB;
  const mint1 = cmp < 0 ? mintB : mintA;
  return { mint0, mint1, wgorIs0: mint0.equals(WGOR_MINT) };
}

function getSammPoolStatePDA(ammConfig: PublicKey, mint0: PublicKey, mint1: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), ammConfig.toBuffer(), mint0.toBuffer(), mint1.toBuffer()],
    SAMM_PROGRAM_ID,
  );
}

function getSammPoolVaultPDA(poolState: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool_vault'), poolState.toBuffer(), tokenMint.toBuffer()],
    SAMM_PROGRAM_ID,
  );
}

function getSammObservationPDA(poolState: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('observation'), poolState.toBuffer()],
    SAMM_PROGRAM_ID,
  );
}

function getSammTickArrayBitmapPDA(poolState: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool_tick_array_bitmap_extension'), poolState.toBuffer()],
    SAMM_PROGRAM_ID,
  );
}

function getSammTickArrayPDA(poolState: PublicKey, startIndex: number): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(startIndex); // Raydium CLMM uses big-endian for tick array PDA seeds
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tick_array'), poolState.toBuffer(), buf],
    SAMM_PROGRAM_ID,
  );
}

function getSammPersonalPositionPDA(nftMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('position'), nftMint.toBuffer()],
    SAMM_PROGRAM_ID,
  );
}

function getSammProtocolPositionPDA(poolState: PublicKey, tickLower: number, tickUpper: number): [PublicKey, number] {
  const lBuf = Buffer.alloc(4);
  lBuf.writeInt32BE(tickLower); // Raydium CLMM uses big-endian for protocol position PDA seeds
  const uBuf = Buffer.alloc(4);
  uBuf.writeInt32BE(tickUpper);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('protocol_position'), poolState.toBuffer(), lBuf, uBuf],
    SAMM_PROGRAM_ID,
  );
}

function getMetaplexMetadataPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
}

function getTickArrayStartIndex(tick: number): number {
  const ticksPerArray = 60 * DEFAULT_TICK_SPACING; // 600
  return Math.floor(tick / ticksPerArray) * ticksPerArray;
}

// ============================================================
// Finalize Step 1: Create Pool
// ============================================================

/**
 * Build the finalize_create_pool transaction (Finalizing -> PoolCreated).
 * Creates the SAMM CLMM pool with initial price derived from SOL/token ratio.
 *
 * @param ammConfig - The SAMM AMM config account (e.g. fee-tier config)
 */
export async function buildFinalizeCreatePoolTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint | number,
  tokenMint: PublicKey,
  ammConfig: PublicKey,
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  // Sort mints for canonical ordering
  const { mint0, mint1 } = sortMints(WGOR_MINT, tokenMint);

  // Derive SAMM PDAs
  const [poolStatePDA] = getSammPoolStatePDA(ammConfig, mint0, mint1);
  const [sammVault0PDA] = getSammPoolVaultPDA(poolStatePDA, mint0);
  const [sammVault1PDA] = getSammPoolVaultPDA(poolStatePDA, mint1);
  const [observationPDA] = getSammObservationPDA(poolStatePDA);
  const [tickArrayBitmapPDA] = getSammTickArrayBitmapPDA(poolStatePDA);

  const tx = await (program.methods as any)
    .finalizeCreatePool()
    .accounts({
      payer,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      tokenMint,
      wgorMint: WGOR_MINT,
      solVault: solVaultPDA,
      tokenVault: tokenVaultPDA,
      sammProgram: SAMM_PROGRAM_ID,
      ammConfig,
      poolState: poolStatePDA,
      sammTokenVault0: sammVault0PDA,
      sammTokenVault1: sammVault1PDA,
      observationState: observationPDA,
      tickArrayBitmap: tickArrayBitmapPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return tx;
}

// ============================================================
// Finalize Step 2: Add Liquidity
// ============================================================

/**
 * Build the finalize_add_liquidity transaction (PoolCreated -> Recovery).
 * Wraps SOL to WGOR, transfers tokens, opens full-range position on SAMM.
 *
 * Returns both the Transaction and the positionNftMint Keypair.
 * The Keypair MUST be included as a signer when sending the transaction.
 */
export async function buildFinalizeAddLiquidityTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint | number,
  tokenMint: PublicKey,
  poolState: PublicKey,
): Promise<{ tx: Transaction; positionNftMint: Keypair }> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  const [permanentLockPDA] = getPermanentLockPDA(sovereignPDA, program.programId);

  // Generate fresh keypair for position NFT mint
  const positionNftMint = Keypair.generate();

  // Position NFT ATA for permanent_lock
  const positionNftAccount = getAssociatedTokenAddressSync(
    positionNftMint.publicKey,
    permanentLockPDA,
    true, // allowOwnerOffCurve (PDA owner)
  );

  // WGOR ATA for permanent_lock (native SOL wrapper, uses legacy SPL Token)
  const lockWgorAccount = getAssociatedTokenAddressSync(
    WGOR_MINT,
    permanentLockPDA,
    true,
  );

  // Sovereign token ATA for permanent_lock (Token-2022)
  const lockTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    permanentLockPDA,
    true,
    TOKEN_2022_PROGRAM_ID,
  );

  // Metaplex metadata PDA for position NFT
  const [metadataAccount] = getMetaplexMetadataPDA(positionNftMint.publicKey);

  // SAMM PDAs
  const [personalPosition] = getSammPersonalPositionPDA(positionNftMint.publicKey);
  const [protocolPosition] = getSammProtocolPositionPDA(poolState, MIN_TICK, MAX_TICK);

  // Tick arrays for full range
  const tickArrayLowerStart = getTickArrayStartIndex(MIN_TICK);
  const tickArrayUpperStart = getTickArrayStartIndex(MAX_TICK);
  const [tickArrayLower] = getSammTickArrayPDA(poolState, tickArrayLowerStart);
  const [tickArrayUpper] = getSammTickArrayPDA(poolState, tickArrayUpperStart);

  // SAMM pool vaults
  const { mint0, mint1 } = sortMints(WGOR_MINT, tokenMint);
  const [sammVault0] = getSammPoolVaultPDA(poolState, mint0);
  const [sammVault1] = getSammPoolVaultPDA(poolState, mint1);

  // Observation state
  const [observationState] = getSammObservationPDA(poolState);

  // Tick array bitmap extension (required for full-range positions)
  const [tickArrayBitmapExtension] = getSammTickArrayBitmapPDA(poolState);

  // Pre-instructions: create ATAs for the permanent lock PDA
  const tx = new Transaction();

  // Create WGOR ATA for permanent_lock
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      lockWgorAccount,
      permanentLockPDA,
      WGOR_MINT,
    ),
  );

  // Create sovereign token ATA for permanent_lock (Token-2022)
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      lockTokenAccount,
      permanentLockPDA,
      tokenMint,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  // Main instruction
  const mainIx = await (program.methods as any)
    .finalizeAddLiquidity()
    .accounts({
      payer,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      tokenMint,
      wgorMint: WGOR_MINT,
      solVault: solVaultPDA,
      tokenVault: tokenVaultPDA,
      permanentLock: permanentLockPDA,
      lockWgorAccount,
      lockTokenAccount,
      sammProgram: SAMM_PROGRAM_ID,
      poolState,
      positionNftMint: positionNftMint.publicKey,
      positionNftAccount,
      metadataAccount,
      protocolPosition,
      tickArrayLower,
      tickArrayUpper,
      personalPosition,
      sammTokenVault0: sammVault0,
      sammTokenVault1: sammVault1,
      observationState,
      vault0Mint: mint0,
      vault1Mint: mint1,
      tickArrayBitmapExtension,
      metadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  tx.add(mainIx);

  return { tx, positionNftMint };
}

// ============================================================
// Emergency Functions
// ============================================================

/**
 * Build an emergency unlock transaction (protocol authority only)
 * Transitions sovereign to EmergencyUnlocked from any state
 */
export async function buildEmergencyUnlockTx(
  program: SovereignLiquidityProgram,
  caller: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);

  const tx = await (program.methods as any)
    .emergencyUnlock()
    .accounts({
      caller,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
    })
    .transaction();

  return tx;
}

/**
 * Build an emergency withdraw transaction (investors)
 * Reclaims deposited GOR from sol_vault, closes deposit record
 */
export async function buildEmergencyWithdrawTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  originalDepositor: PublicKey,
  sovereignId: bigint | number,
  nftMint?: PublicKey,
  nftTokenAccount?: PublicKey,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  const builder = (program.methods as any)
    .emergencyWithdraw()
    .accounts({
      holder,
      originalDepositor,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      solVault: solVaultPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });

  // Post-finalization: pass NFT mint + token account as remaining accounts for burn
  if (nftMint && nftTokenAccount) {
    builder.remainingAccounts([
      { pubkey: nftMint, isWritable: true, isSigner: false },
      { pubkey: nftTokenAccount, isWritable: true, isSigner: false },
    ]);
  }

  return builder.transaction();
}

/**
 * Build an emergency withdraw transaction for creator
 * Reclaims escrow GOR and creation fee, plus either recovers or burns tokens
 * @param burnTokens - If true, burns the token supply. If false, transfers tokens to creator.
 */
export async function buildEmergencyWithdrawCreatorTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number,
  burnTokens: boolean = false,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [creationFeeEscrowPDA] = getCreationFeeEscrowPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  // Fetch sovereign to get the token_mint
  const sovereignAccount = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const tokenMint: PublicKey = sovereignAccount.tokenMint;

  // Determine the token program (Token-2022 for TokenLaunch, Token for BYO)
  const mintAccountInfo = await program.provider.connection.getAccountInfo(tokenMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_2022_PROGRAM_ID;

  // Get or create the creator's associated token account for this mint
  const creatorTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    creator,
    false,
    tokenProgramId
  );

  const tx = new Transaction();

  // Ensure creator's ATA exists (idempotent - needed even for burn since account is in struct)
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      creator,           // payer
      creatorTokenAccount, // ata
      creator,           // owner
      tokenMint,         // mint
      tokenProgramId,    // token program
    )
  );

  // Build the emergency withdraw creator instruction
  const withdrawTx = await (program.methods as any)
    .emergencyWithdrawCreator(burnTokens)
    .accounts({
      creator,
      sovereign: sovereignPDA,
      solVault: solVaultPDA,
      creationFeeEscrow: creationFeeEscrowPDA,
      tokenVault: tokenVaultPDA,
      creatorTokenAccount,
      tokenMint,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  // Append program instructions to our tx
  tx.add(...withdrawTx.instructions);

  return tx;
}

// ============================================================
// Helper Types
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
  | 'EmergencyUnlocked'
  | 'Retired';

export type SovereignType = 'TokenLaunch' | 'BYOToken';

export type FeeMode = 'CreatorRevenue' | 'RecoveryBoost' | 'FairLaunch';

/**
 * Convert on-chain status to string
 */
export function getSovereignStatusString(status: any): SovereignStatus {
  if (status.bonding) return 'Bonding';
  if (status.finalizing) return 'Finalizing';
  if (status.poolCreated) return 'PoolCreated';
  if (status.recovery) return 'Recovery';
  if (status.active) return 'Active';
  if (status.unwinding) return 'Unwinding';
  if (status.unwound) return 'Unwound';
  if (status.failed) return 'Failed';
  if (status.emergencyUnlocked) return 'EmergencyUnlocked';
  if (status.retired) return 'Retired';
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

// ============================================================
// Mint Genesis NFT
// ============================================================

/**
 * Build a transaction to mint the Genesis NFT for a depositor.
 * Must be called after finalization (Recovery or Active state).
 * Each depositor can only mint once.
 */
export async function buildMintGenesisNftTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  depositor: PublicKey,
  sovereignId: bigint | number
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, depositor, program.programId);
  const [nftMintPDA] = getGenesisNftMintPDA(sovereignPDA, depositor, program.programId);

  // NFT token account for the depositor (legacy SPL Token ATA since NFT mint is not Token-2022)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMintPDA,
    depositor,
    false,
    TOKEN_PROGRAM_ID
  );

  // Metaplex metadata PDA
  const [metadataAccount] = getMetaplexMetadataPDA(nftMintPDA);

  const tx = await (program.methods as any)
    .mintGenesisNft()
    .accounts({
      payer,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      depositor,
      nftMint: nftMintPDA,
      nftTokenAccount,
      metadataAccount,
      metadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
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
