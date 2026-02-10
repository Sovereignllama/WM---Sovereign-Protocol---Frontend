import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, getAccount, getTransferFeeAmount, getMint, getTransferFeeConfig } from '@solana/spl-token';
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
  getProposalPDA,
  getVoteRecordPDA,
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
 * Build a claim depositor fees transaction.
 * The holder must own the Genesis NFT referenced in the deposit record.
 * 
 * @param holder - Current NFT holder (signer)
 * @param originalDepositor - The wallet that originally deposited (for PDA derivation)
 * @param sovereignId - The sovereign's numeric ID
 * @param nftMint - The Genesis NFT mint pubkey from deposit_record.nft_mint
 */
export async function buildClaimDepositorFeesTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  originalDepositor: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);
  const [feeVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  // NFT token account for the holder (legacy SPL Token)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    holder,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .claimDepositorFees()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      originalDepositor,
      depositRecord: depositRecordPDA,
      nftTokenAccount,
      feeVault: feeVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Claim Fees (SAMM Harvest)
// ============================================================

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Build a claim_fees transaction to harvest trading fees from the SAMM LP position.
 * This is step 1 of the fee flow: harvest fees from SAMM → fee vault.
 * Step 2 is claimDepositorFees which distributes from fee vault → individual depositor.
 *
 * Anyone can call this (claimer doesn't need to be a depositor).
 * Requires fetching the PermanentLock account to derive SAMM position accounts.
 * 
 * @param program - The Anchor program instance
 * @param claimer - The wallet paying for the transaction (signer)
 * @param sovereignId - The sovereign's numeric ID
 * @param tokenMint - The sovereign's token mint
 * @param connection - Solana connection (needed to fetch PermanentLock state)
 */
export async function buildClaimFeesTx(
  program: SovereignLiquidityProgram,
  claimer: PublicKey,
  sovereignId: bigint | number,
  tokenMint: PublicKey,
  connection: Connection,
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [permanentLockPDA] = getPermanentLockPDA(sovereignPDA, program.programId);
  const [feeVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [creatorFeeTrackerPDA] = getCreatorTrackerPDA(sovereignPDA, program.programId);

  // Fetch sovereign state (for fee_mode, state, ammConfig, creator)
  const sovereign = await fetchSovereign(program, sovereignPDA);

  // Fetch the PermanentLock account to get position details
  const lockAccount = await (program.account as any).permanentLock.fetch(permanentLockPDA);
  const poolState = new PublicKey(lockAccount.poolState);
  const positionMint = new PublicKey(lockAccount.positionMint);
  const positionAccount = new PublicKey(lockAccount.position);
  const positionTokenAccount = new PublicKey(lockAccount.positionTokenAccount);

  // Sort mints for canonical ordering
  const { mint0, mint1, wgorIs0 } = sortMints(WGOR_MINT, tokenMint);

  // Derive SAMM PDAs
  const [personalPosition] = getSammPersonalPositionPDA(positionMint);
  const [protocolPosition] = getSammProtocolPositionPDA(poolState, MIN_TICK, MAX_TICK);
  const [sammVault0] = getSammPoolVaultPDA(poolState, mint0);
  const [sammVault1] = getSammPoolVaultPDA(poolState, mint1);
  const tickArrayLowerStart = getTickArrayStartIndex(MIN_TICK);
  const tickArrayUpperStart = getTickArrayStartIndex(MAX_TICK);
  const [tickArrayLower] = getSammTickArrayPDA(poolState, tickArrayLowerStart);
  const [tickArrayUpper] = getSammTickArrayPDA(poolState, tickArrayUpperStart);
  const [tickArrayBitmapExtension] = getSammTickArrayBitmapPDA(poolState);

  // Recipient token accounts for permanent_lock PDA
  // Token 0 (WGOR): legacy SPL Token ATA
  // Token 1 (sovereign token): Token-2022 ATA
  // Need to determine which is which based on mint ordering
  const recipientAta0 = getAssociatedTokenAddressSync(
    mint0,
    permanentLockPDA,
    true, // allowOwnerOffCurve (PDA)
    mint0.equals(WGOR_MINT) ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
  );
  const recipientAta1 = getAssociatedTokenAddressSync(
    mint1,
    permanentLockPDA,
    true,
    mint1.equals(WGOR_MINT) ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
  );

  // Pre-instructions: ensure recipient ATAs exist
  const tx = new Transaction();

  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      claimer,
      recipientAta0,
      permanentLockPDA,
      mint0,
      mint0.equals(WGOR_MINT) ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
    ),
  );
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      claimer,
      recipientAta1,
      permanentLockPDA,
      mint1,
      mint1.equals(WGOR_MINT) ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
    ),
  );

  // Build remaining accounts for SAMM CPI (15 accounts in exact order)
  const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [
    { pubkey: positionTokenAccount, isWritable: false, isSigner: false },  // [0] nft_account
    { pubkey: personalPosition, isWritable: true, isSigner: false },       // [1] personal_position
    { pubkey: poolState, isWritable: true, isSigner: false },              // [2] pool_state
    { pubkey: protocolPosition, isWritable: true, isSigner: false },       // [3] protocol_position
    { pubkey: sammVault0, isWritable: true, isSigner: false },             // [4] token_vault_0
    { pubkey: sammVault1, isWritable: true, isSigner: false },             // [5] token_vault_1
    { pubkey: tickArrayLower, isWritable: true, isSigner: false },         // [6] tick_array_lower
    { pubkey: tickArrayUpper, isWritable: true, isSigner: false },         // [7] tick_array_upper
    { pubkey: recipientAta0, isWritable: true, isSigner: false },          // [8] recipient_token_account_0
    { pubkey: recipientAta1, isWritable: true, isSigner: false },          // [9] recipient_token_account_1
    { pubkey: TOKEN_2022_PROGRAM_ID, isWritable: false, isSigner: false }, // [10] token_program_2022
    { pubkey: MEMO_PROGRAM_ID, isWritable: false, isSigner: false },       // [11] memo_program
    { pubkey: mint0, isWritable: false, isSigner: false },                 // [12] vault_0_mint
    { pubkey: mint1, isWritable: false, isSigner: false },                 // [13] vault_1_mint
    { pubkey: tickArrayBitmapExtension, isWritable: true, isSigner: false }, // [14] tick_array_bitmap_extension
  ];

  // ---- Token fee routing accounts [15-18+] ----
  // Determine fee_mode and state to decide which routing path the on-chain handler will take
  const feeMode = Object.keys(sovereign.feeMode)[0]; // e.g. "recoveryBoost", "fairLaunch", "creatorRevenue"
  const sovState = Object.keys(sovereign.state)[0];   // e.g. "recovery", "active"
  const isRecovery = sovState === 'recovery';

  const needsSwap = isRecovery && (feeMode === 'recoveryBoost' || feeMode === 'fairLaunch');
  const needsBurn = !isRecovery && feeMode === 'fairLaunch';
  const needsCreatorTransfer = feeMode === 'creatorRevenue' || (!isRecovery && feeMode === 'recoveryBoost');

  if (needsSwap || needsBurn || needsCreatorTransfer) {
    const ammConfig = new PublicKey(sovereign.ammConfig);
    const [observationState] = getSammObservationPDA(poolState);
    const creator = new PublicKey(sovereign.creator);

    // Creator's Token-2022 ATA for the sovereign token (used in creator transfer path)
    const creatorTokenAta = getAssociatedTokenAddressSync(
      tokenMint,
      creator,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    // If creator transfer path, ensure creator ATA exists
    if (needsCreatorTransfer) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          claimer,
          creatorTokenAta,
          creator,
          tokenMint,
          TOKEN_2022_PROGRAM_ID,
        ),
      );
    }

    remainingAccounts.push(
      { pubkey: ammConfig, isWritable: false, isSigner: false },             // [15] amm_config
      { pubkey: observationState, isWritable: true, isSigner: false },       // [16] observation_state
      { pubkey: creatorTokenAta, isWritable: true, isSigner: false },        // [17] creator_token_ata
    );

    // Swap path needs tick arrays for token→WGOR swap [18+]
    if (needsSwap) {
      // Use the same tick arrays covering the full range
      remainingAccounts.push(
        { pubkey: tickArrayLower, isWritable: true, isSigner: false },       // [18] swap tick_array_0
        { pubkey: tickArrayUpper, isWritable: true, isSigner: false },       // [19] swap tick_array_1
      );
    }
  }

  // Main instruction
  const mainIx = await (program.methods as any)
    .claimFees()
    .accounts({
      claimer,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      permanentLock: permanentLockPDA,
      position: positionAccount,
      tokenVaultA: sammVault0,
      tokenVaultB: sammVault1,
      feeVault: feeVaultPDA,
      creatorFeeTracker: creatorFeeTrackerPDA,
      sammProgram: SAMM_PROGRAM_ID,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();

  tx.add(mainIx);

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
 * Collects withheld fees from token accounts and routes them based on FeeMode:
 *   - CreatorRevenue: fees → creatorTokenAccount
 *   - RecoveryBoost/FairLaunch during Recovery: fees → recoveryTokenVault
 *   - RecoveryBoost after Recovery: fees → creatorTokenAccount
 *
 * Remaining accounts = source Token-2022 accounts with withheld fees.
 */
export async function buildHarvestTransferFeesTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint | number,
  sourceTokenAccounts: PublicKey[]
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [creatorTrackerPDA] = getCreatorTrackerPDA(sovereignPDA, program.programId);
  const [recoveryTokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  
  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);
  const creatorWallet = new PublicKey(sovereign.creator);

  // Creator's Token-2022 ATA for the sovereign token
  const creatorTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    creatorWallet,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  // Pre-instruction: ensure creator ATA exists (in case fees go to creator)
  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      creatorTokenAccount,
      creatorWallet,
      tokenMint,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  const mainIx = await (program.methods as any)
    .harvestTransferFees()
    .accounts({
      payer,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      tokenMint,
      creatorTokenAccount,
      recoveryTokenVault: recoveryTokenVaultPDA,
      creatorFeeTracker: creatorTrackerPDA,
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

  tx.add(mainIx);
  return tx;
}

// ============================================================
// Swap Recovery Tokens (Token-2022 sell fees → GOR for investors)
// ============================================================

/**
 * Build a swap_recovery_tokens transaction.
 * Swaps tokens held in recovery_token_vault to SOL via SAMM CPI,
 * depositing SOL into fee_vault for investor recovery.
 * 
 * Only callable during Recovery with RecoveryBoost or FairLaunch fee mode.
 * Permissionless — anyone can call this to advance recovery.
 *
 * Remaining accounts (8+) = SAMM swap CPI accounts (excluding input_token_account,
 *   output_token_account, and input_vault_mint which are in named accounts):
 *   [0] amm_config, [1] pool_state, [2] input_vault (SAMM),
 *   [3] output_vault (SAMM), [4] observation_state,
 *   [5] token_program_2022, [6] memo_program, [7] wgor_mint,
 *   [8..N] tick_arrays
 */
export async function buildSwapRecoveryTokensTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint | number,
  connection: Connection,
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [permanentLockPDA] = getPermanentLockPDA(sovereignPDA, program.programId);
  const [feeVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [recoveryTokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  // Fetch sovereign to get token mint and amm config
  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);
  const ammConfig = new PublicKey(sovereign.ammConfig);

  // Fetch permanent lock to get pool state
  const lockAccount = await (program.account as any).permanentLock.fetch(permanentLockPDA);
  const poolState = new PublicKey(lockAccount.poolState);

  // Sort mints for canonical ordering
  const { mint0, mint1, wgorIs0 } = sortMints(WGOR_MINT, tokenMint);

  // SAMM PDAs
  const [sammVault0] = getSammPoolVaultPDA(poolState, mint0);
  const [sammVault1] = getSammPoolVaultPDA(poolState, mint1);
  const [observationState] = getSammObservationPDA(poolState);

  // Determine input/output based on which mint is the sovereign token
  // We're swapping sovereign token → WGOR
  const inputVault = wgorIs0 ? sammVault1 : sammVault0;   // token vault in SAMM
  const outputVault = wgorIs0 ? sammVault0 : sammVault1;  // WGOR vault in SAMM

  // Sovereign PDA's WGOR ATA (legacy SPL Token since WGOR = native wrapped SOL)
  const sovereignWgorAta = getAssociatedTokenAddressSync(
    WGOR_MINT,
    sovereignPDA,
    true, // allowOwnerOffCurve (PDA)
    TOKEN_PROGRAM_ID,
  );

  // Pre-instructions: ensure sovereign WGOR ATA exists
  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      sovereignWgorAta,
      sovereignPDA,
      WGOR_MINT,
      TOKEN_PROGRAM_ID,
    ),
  );

  // Tick arrays for the swap (covering current price range)
  // For a full-range pool, we need tick arrays covering the current tick
  const tickArrayLowerStart = getTickArrayStartIndex(MIN_TICK);
  const tickArrayUpperStart = getTickArrayStartIndex(MAX_TICK);
  const [tickArrayLower] = getSammTickArrayPDA(poolState, tickArrayLowerStart);
  const [tickArrayUpper] = getSammTickArrayPDA(poolState, tickArrayUpperStart);
  const [tickArrayBitmapExtension] = getSammTickArrayBitmapPDA(poolState);

  // Build remaining accounts for SAMM swap CPI
  // NOTE: input_token_account, output_token_account, and input_vault_mint are
  // already in named Anchor accounts (recoveryTokenVault, sovereignWgorAta, tokenMint),
  // so they must NOT be duplicated here. Indices must match the handler:
  //   ctx.remaining_accounts[0] = amm_config
  //   ctx.remaining_accounts[1] = pool_state
  //   ctx.remaining_accounts[2] = input_vault (SAMM token vault)
  //   ctx.remaining_accounts[3] = output_vault (SAMM WGOR vault)
  //   ctx.remaining_accounts[4] = observation_state
  //   ctx.remaining_accounts[5] = token_program_2022
  //   ctx.remaining_accounts[6] = memo_program
  //   ctx.remaining_accounts[7] = wgor_mint (output_vault_mint)
  //   ctx.remaining_accounts[8..N] = tick_arrays
  const remainingAccounts = [
    { pubkey: ammConfig, isWritable: false, isSigner: false },               // [0] amm_config
    { pubkey: poolState, isWritable: true, isSigner: false },                // [1] pool_state
    { pubkey: inputVault, isWritable: true, isSigner: false },               // [2] input_vault (SAMM)
    { pubkey: outputVault, isWritable: true, isSigner: false },              // [3] output_vault (SAMM)
    { pubkey: observationState, isWritable: true, isSigner: false },         // [4] observation_state
    { pubkey: TOKEN_2022_PROGRAM_ID, isWritable: false, isSigner: false },   // [5] token_program_2022
    { pubkey: MEMO_PROGRAM_ID, isWritable: false, isSigner: false },         // [6] memo_program
    { pubkey: WGOR_MINT, isWritable: false, isSigner: false },               // [7] output_vault_mint (WGOR)
    { pubkey: tickArrayLower, isWritable: true, isSigner: false },           // [8] tick_array_0
    { pubkey: tickArrayUpper, isWritable: true, isSigner: false },           // [9] tick_array_1
    { pubkey: tickArrayBitmapExtension, isWritable: true, isSigner: false }, // [10] tick_array_bitmap
  ];

  // Main instruction
  const mainIx = await (program.methods as any)
    .swapRecoveryTokens()
    .accounts({
      payer,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      permanentLock: permanentLockPDA,
      tokenMint,
      recoveryTokenVault: recoveryTokenVaultPDA,
      sovereignWgorAta,
      feeVault: feeVaultPDA,
      sammProgram: SAMM_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();

  tx.add(mainIx);
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

// ============================================================
// Governance — Fetch Functions
// ============================================================

/**
 * Fetch a proposal by sovereign and proposal ID
 */
export async function fetchProposal(
  program: SovereignLiquidityProgram,
  sovereignPubkey: PublicKey,
  proposalId: bigint | number
) {
  const [proposalPDA] = getProposalPDA(sovereignPubkey, proposalId, program.programId);
  try {
    return await (program.account as any).proposal.fetch(proposalPDA);
  } catch {
    return null;
  }
}

/**
 * Fetch all proposals for a sovereign
 */
export async function fetchSovereignProposals(
  program: SovereignLiquidityProgram,
  sovereignPubkey: PublicKey
) {
  return (program.account as any).proposal.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: sovereignPubkey.toBase58(),
      },
    },
  ]);
}

/**
 * Fetch a vote record for a proposal + NFT mint
 */
export async function fetchVoteRecord(
  program: SovereignLiquidityProgram,
  proposalPubkey: PublicKey,
  nftMint: PublicKey
) {
  const [voteRecordPDA] = getVoteRecordPDA(proposalPubkey, nftMint, program.programId);
  try {
    return await (program.account as any).voteRecord.fetch(voteRecordPDA);
  } catch {
    return null;
  }
}

// ============================================================
// Governance — Transaction Builders
// ============================================================

/**
 * Build a propose_unwind transaction.
 * The holder must own the Genesis NFT referenced in their deposit record.
 * 
 * @param holder - Current NFT holder (signer)
 * @param originalDepositor - The wallet that originally deposited (for PDA derivation)
 * @param sovereignId - The sovereign's numeric ID
 * @param nftMint - The Genesis NFT mint pubkey from deposit_record.nft_mint
 */
export async function buildProposeUnwindTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  originalDepositor: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey
): Promise<{ tx: Transaction; proposalPDA: PublicKey }> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);

  // Fetch sovereign to get proposal count (next proposal ID)
  const sovereign = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const proposalId = BigInt(sovereign.proposalCount.toString());
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);

  // NFT token account for the holder (legacy SPL Token)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    holder,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .proposeUnwind()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      originalDepositor,
      depositRecord: depositRecordPDA,
      nftTokenAccount,
      proposal: proposalPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return { tx, proposalPDA };
}

/**
 * Build a cast_vote transaction.
 * The holder must own the Genesis NFT referenced in their deposit record.
 * 
 * @param holder - Current NFT holder (signer)
 * @param originalDepositor - The wallet that originally deposited
 * @param sovereignId - The sovereign's numeric ID
 * @param proposalId - The proposal ID to vote on
 * @param nftMint - The Genesis NFT mint pubkey
 * @param support - true = vote FOR unwind, false = vote AGAINST
 */
export async function buildCastVoteTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  originalDepositor: PublicKey,
  sovereignId: bigint | number,
  proposalId: bigint | number,
  nftMint: PublicKey,
  support: boolean
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);
  const [voteRecordPDA] = getVoteRecordPDA(proposalPDA, nftMint, program.programId);

  // NFT token account for the holder (legacy SPL Token)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    holder,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .vote(support)
    .accounts({
      holder,
      sovereign: sovereignPDA,
      originalDepositor,
      depositRecord: depositRecordPDA,
      nftMint,
      nftTokenAccount,
      proposal: proposalPDA,
      voteRecord: voteRecordPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a finalize_vote transaction.
 * Anyone can call this after the voting period ends.
 * If the vote passes, remaining_accounts must include the SAMM pool_state.
 * 
 * @param caller - The signer (anyone)
 * @param sovereignId - The sovereign's numeric ID
 * @param proposalId - The proposal ID to finalize
 * @param poolState - The SAMM pool state (optional, required for passed proposals to snapshot fee growth)
 */
export async function buildFinalizeVoteTx(
  program: SovereignLiquidityProgram,
  caller: PublicKey,
  sovereignId: bigint | number,
  proposalId: bigint | number,
  poolState?: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);
  const [permanentLockPDA] = getPermanentLockPDA(sovereignPDA, program.programId);

  let builder = (program.methods as any)
    .finalizeVote()
    .accounts({
      caller,
      sovereign: sovereignPDA,
      proposal: proposalPDA,
      permanentLock: permanentLockPDA,
    });

  // If pool state is provided, add as remaining account for fee growth snapshot
  if (poolState) {
    builder = builder.remainingAccounts([
      { pubkey: poolState, isWritable: false, isSigner: false },
    ]);
  }

  const tx = await builder.transaction();
  return tx;
}

/**
 * Build a claim_unwind transaction.
 * Burns the Genesis NFT and transfers proportional GOR from sol_vault.
 * 
 * @param holder - Current NFT holder (signer)
 * @param originalDepositor - The wallet that originally deposited
 * @param sovereignId - The sovereign's numeric ID
 * @param nftMint - The Genesis NFT mint pubkey
 */
export async function buildClaimUnwindTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  originalDepositor: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  // NFT token account for the holder (legacy SPL Token)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    holder,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .claimUnwind()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      originalDepositor,
      depositRecord: depositRecordPDA,
      nftMint,
      nftTokenAccount,
      solVault: solVaultPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Pending Fee Calculations (read-only)
// ============================================================

/**
 * SAMM PoolState fee-related offsets (after 8-byte discriminator):
 *   273: padding_3 (u16)
 *   275: padding_4 (u16)
 *   277-292: fee_growth_global_0_x64 (u128 LE)
 *   293-308: fee_growth_global_1_x64 (u128 LE)
 *
 * SAMM PersonalPositionState offsets (after 8-byte discriminator):
 *   9:     bump (u8)
 *   10-41: nft_mint (Pubkey)
 *   42-73: pool_id (Pubkey)
 *   74-77: tick_lower_index (i32)
 *   78-81: tick_upper_index (i32)
 *   82-97: liquidity (u128 LE)
 *   98-113:  fee_growth_inside_0_last_x64 (u128 LE)
 *   114-129: fee_growth_inside_1_last_x64 (u128 LE)
 *   130-137: token_fees_owed_0 (u64 LE)
 *   138-145: token_fees_owed_1 (u64 LE)
 */

/** Read a u128 (little-endian) from a Buffer as BigInt */
function readU128LE(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return (hi << 64n) | lo;
}

/** Read a u64 (little-endian) from a Buffer as BigInt */
function readU64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

export interface PendingHarvestFees {
  /** Pending GOR fees in lamports (the WGOR side) */
  pendingGorLamports: bigint;
  /** Pending token fees in smallest units (the sovereign token side) */
  pendingTokenUnits: bigint;
  /** Pending GOR as a number (for display) */
  pendingGor: number;
  /** Pending tokens as a number (for display, adjusted by decimals) */
  pendingTokens: number;
  /** Which mint is token 0 vs 1 */
  wgorIs0: boolean;
}

/**
 * Calculate pending (unharvested) fees sitting in the SAMM position.
 * Pure read — two getAccountInfo calls, client-side math.
 *
 * For full-range positions: fee_growth_inside = fee_growth_global
 * so pending_i = (global_i - last_i) * liquidity / 2^64 + owed_i
 */
export async function fetchPendingHarvestFees(
  connection: Connection,
  poolState: PublicKey,
  positionMint: PublicKey,
  tokenMint: PublicKey,
  tokenDecimals: number,
): Promise<PendingHarvestFees | null> {
  const [personalPositionPDA] = getSammPersonalPositionPDA(positionMint);

  // Fetch both accounts in parallel
  const [poolInfo, positionInfo] = await Promise.all([
    connection.getAccountInfo(poolState),
    connection.getAccountInfo(personalPositionPDA),
  ]);

  if (!poolInfo || !positionInfo) return null;

  const poolData = poolInfo.data as Buffer;
  const posData = positionInfo.data as Buffer;

  if (poolData.length < 310 || posData.length < 146) return null;

  // Parse pool state fee growth globals
  const feeGrowthGlobal0 = readU128LE(poolData, 277);
  const feeGrowthGlobal1 = readU128LE(poolData, 293);

  // Parse personal position
  // Layout after 8-byte discriminator:
  //   8: bump (1), 9-40: nft_mint (32), 41-72: pool_id (32),
  //   73-76: tick_lower (4), 77-80: tick_upper (4),
  //   81-96: liquidity (16), 97-112: fee_growth_inside_0_last (16),
  //   113-128: fee_growth_inside_1_last (16),
  //   129-136: token_fees_owed_0 (8), 137-144: token_fees_owed_1 (8)
  const liquidity = readU128LE(posData, 81);
  const feeGrowthInside0Last = readU128LE(posData, 97);
  const feeGrowthInside1Last = readU128LE(posData, 113);
  const tokenFeesOwed0 = readU64LE(posData, 129);
  const tokenFeesOwed1 = readU64LE(posData, 137);

  // For full-range: fee_growth_inside = fee_growth_global
  // pending = (global - last) * liquidity / 2^64 + owed
  const Q64 = 1n << 64n;

  const delta0 = feeGrowthGlobal0 >= feeGrowthInside0Last
    ? feeGrowthGlobal0 - feeGrowthInside0Last
    : 0n;
  const delta1 = feeGrowthGlobal1 >= feeGrowthInside1Last
    ? feeGrowthGlobal1 - feeGrowthInside1Last
    : 0n;

  const pending0 = (delta0 * liquidity) / Q64 + tokenFeesOwed0;
  const pending1 = (delta1 * liquidity) / Q64 + tokenFeesOwed1;

  // Determine which is GOR vs token
  const { wgorIs0 } = sortMints(WGOR_MINT, tokenMint);

  const pendingGorLamports = wgorIs0 ? pending0 : pending1;
  const pendingTokenUnits = wgorIs0 ? pending1 : pending0;

  return {
    pendingGorLamports,
    pendingTokenUnits,
    pendingGor: Number(pendingGorLamports) / 1_000_000_000,
    pendingTokens: Number(pendingTokenUnits) / (10 ** tokenDecimals),
    wgorIs0,
  };
}

export interface PendingClaimableFees {
  /** Total claimable GOR in lamports */
  claimableLamports: bigint;
  /** Claimable GOR as a number */
  claimableGor: number;
  /** Fee vault total balance in lamports */
  vaultBalanceLamports: bigint;
  /** Fee vault balance as GOR */
  vaultBalanceGor: number;
}

/**
 * Calculate how much GOR a depositor can claim from the fee vault.
 * claimable = (totalFeesCollected * depositAmount / totalDeposited) - feesClaimed
 *
 * Pure read — sovereign state, deposit record, and fee vault balance.
 */
export async function fetchPendingClaimableFees(
  connection: Connection,
  program: SovereignLiquidityProgram,
  sovereignId: bigint | number,
  depositor: PublicKey,
): Promise<PendingClaimableFees | null> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [feeVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  // Fetch all in parallel
  const [sovereign, depositRecord, vaultBalance] = await Promise.all([
    fetchSovereignById(program, sovereignId),
    fetchDepositRecord(program, sovereignPDA, depositor),
    connection.getBalance(feeVaultPDA),
  ]);

  if (!sovereign || !depositRecord) return null;

  const totalFeesCollected = BigInt(sovereign.totalFeesCollected.toString());
  const depositAmount = BigInt(depositRecord.amount.toString());
  const totalDeposited = BigInt(sovereign.totalDeposited.toString());
  const feesClaimed = BigInt(depositRecord.feesClaimed.toString());

  if (totalDeposited === 0n) return null;

  // Same formula as on-chain: share_bps = amount * 10000 / totalDeposited
  // total_share = totalFeesCollected * share_bps / 10000
  // claimable = total_share - feesClaimed
  const shareBps = (depositAmount * 10000n) / totalDeposited;
  const totalShare = (totalFeesCollected * shareBps) / 10000n;
  const claimable = totalShare > feesClaimed ? totalShare - feesClaimed : 0n;

  return {
    claimableLamports: claimable,
    claimableGor: Number(claimable) / 1_000_000_000,
    vaultBalanceLamports: BigInt(vaultBalance),
    vaultBalanceGor: vaultBalance / 1_000_000_000,
  };
}

// ============================================================
// Token-2022 Transfer Fee Stats
// ============================================================

export interface TokenFeeStats {
  /** Transfer fee in basis points (e.g. 100 = 1%) */
  transferFeeBps: number;
  /** Recovery token vault balance (already harvested, waiting to be swapped) */
  vaultBalance: number;
  /** Raw vault balance */
  vaultBalanceRaw: bigint;
  /** Total withheld fees across all token accounts (harvestable) */
  totalHarvestable: number;
  /** Raw harvestable amount */
  totalHarvestableRaw: bigint;
  /** Number of token accounts with withheld fees */
  accountsWithFees: number;
  /** List of token account pubkeys that have withheld fees (for passing to harvestTransferFees) */
  harvestableAccounts: string[];
  /** Token decimals */
  decimals: number;
}

/**
 * Fetch Token-2022 transfer fee stats for a sovereign:
 *   - Vault balance (tokens already harvested into recovery_token_vault)
 *   - Total harvestable (withheld fees sitting in individual token accounts)
 *   - List of accounts with withheld fees (for calling harvestTransferFees)
 */
export async function fetchTokenFeeStats(
  connection: Connection,
  tokenMint: PublicKey,
  sovereignPDA: PublicKey,
  programId: PublicKey,
): Promise<TokenFeeStats | null> {
  try {
    // Get mint info with transfer fee extension
    const mintInfo = await getMint(connection, tokenMint, undefined, TOKEN_2022_PROGRAM_ID);
    const feeConfig = getTransferFeeConfig(mintInfo);
    const decimals = mintInfo.decimals;

    if (!feeConfig) return null;

    // Get active fee config
    const epoch = await connection.getEpochInfo();
    const activeFee = epoch.epoch >= Number(feeConfig.newerTransferFee.epoch)
      ? feeConfig.newerTransferFee
      : feeConfig.olderTransferFee;
    const transferFeeBps = Number(activeFee.transferFeeBasisPoints);

    // Get recovery_token_vault balance
    const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, programId);
    let vaultBalanceRaw = 0n;
    try {
      const vaultAcct = await getAccount(connection, tokenVaultPDA, undefined, TOKEN_2022_PROGRAM_ID);
      vaultBalanceRaw = vaultAcct.amount;
    } catch {
      // Vault may not exist yet
    }

    // Scan all token accounts for withheld fees
    const largestAccounts = await connection.getTokenLargestAccounts(tokenMint);
    let totalHarvestableRaw = 0n;
    let accountsWithFees = 0;
    const harvestableAccounts: string[] = [];

    for (const acct of largestAccounts.value) {
      try {
        const tokenAcct = await getAccount(connection, acct.address, undefined, TOKEN_2022_PROGRAM_ID);
        const withheld = getTransferFeeAmount(tokenAcct);
        const withheldAmount = withheld?.withheldAmount || 0n;
        if (withheldAmount > 0n) {
          totalHarvestableRaw += withheldAmount;
          accountsWithFees++;
          harvestableAccounts.push(acct.address.toBase58());
        }
      } catch {
        // Skip
      }
    }

    const divisor = 10 ** decimals;
    return {
      transferFeeBps,
      vaultBalance: Number(vaultBalanceRaw) / divisor,
      vaultBalanceRaw,
      totalHarvestable: Number(totalHarvestableRaw) / divisor,
      totalHarvestableRaw,
      accountsWithFees,
      harvestableAccounts,
      decimals,
    };
  } catch {
    return null;
  }
}
