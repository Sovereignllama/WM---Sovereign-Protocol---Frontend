import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, getAccount, getTransferFeeAmount, getMint, getTransferFeeConfig } from '@solana/spl-token';
import { config } from '../config';
import { 
  getProtocolStatePDA, 
  getSovereignPDA, 
  getDepositRecordPDA, 
  getSolVaultPDA,
  getCreatorTrackerPDA,
  getTokenVaultPDA,
  getTokenMintPDA,
  getExtraAccountMetasPDA,
  getPermanentLockPDA,
  getGenesisNftMintPDA,
  getNftPositionPDA,
  getCollectionMintPDA,
  getProposalPDA,
  getVoteRecordPDA,
  getEnginePoolPDA,
  getEngineGorVaultPDA,
  getEngineTokenVaultPDA,
  getEngineLpClaimPDA,
  getEngineBinArrayPDA,
  getNftListingPDA,
} from './pdas';
import { 
  CreateSovereignParams as OnChainCreateSovereignParams, 
  SovereignType as OnChainSovereignType, 
} from './idl/types';

// Import the IDL
import { SovereignLiquidityIDL, SovereignEngineIDL } from './idl';

// Type alias for program (using any for Anchor 0.30+ compatibility)
export type SovereignLiquidityProgram = Program;
export type SovereignEngineProgram = Program;

// Engine program ID (V3 — BinArray settlement engine)
const ENGINE_PROGRAM_ID = new PublicKey(config.engineProgramId);

/**
 * Get the Anchor Program instance
 * Uses `as any` for Anchor 0.30+ TypeScript compatibility
 */
export function getProgram(provider: AnchorProvider): SovereignLiquidityProgram {
  return new Program(SovereignLiquidityIDL as Idl, provider);
}

/**
 * Get the Engine Program instance
 */
export function getEngineProgram(provider: AnchorProvider): SovereignEngineProgram {
  return new Program(SovereignEngineIDL as Idl, provider);
}

/**
 * Get engine program from an existing main program (shares the provider)
 */
function engineFromMain(mainProgram: SovereignLiquidityProgram): SovereignEngineProgram {
  return getEngineProgram(mainProgram.provider as AnchorProvider);
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

/**
 * Fetch all NftPosition accounts for a sovereign.
 * Uses gPA with memcmp on the sovereign field (offset 8, after discriminator).
 */
export async function fetchNftPositionsForSovereign(
  program: SovereignLiquidityProgram,
  sovereign: PublicKey
) {
  return (program.account as any).nftPosition.all([
    {
      memcmp: {
        offset: 8, // After discriminator → sovereign: Pubkey
        bytes: sovereign.toBase58(),
      },
    },
  ]);
}

/**
 * Fetch the NftPosition accounts owned by a specific wallet for a sovereign.
 *
 * Strategy:
 *  1. Fetch all NftPositions for the sovereign (gPA).
 *  2. Get the wallet's token accounts (both Token and Token-2022).
 *  3. Cross-reference: keep NftPositions whose nft_mint has
 *     a token account owned by the wallet with amount > 0.
 */
export async function fetchMyNftPositionsOnChain(
  program: SovereignLiquidityProgram,
  sovereign: PublicKey,
  wallet: PublicKey,
): Promise<
  Array<{
    publicKey: PublicKey;
    account: {
      sovereign: PublicKey;
      nftMint: PublicKey;
      amount: BN;
      positionBps: number;
      nftNumber: BN;
      mintedFrom: PublicKey;
      mintedAt: BN;
      bump: number;
    };
  }>
> {
  const connection = program.provider.connection;

  // 1. All NftPositions for this sovereign
  const allPositions = await fetchNftPositionsForSovereign(program, sovereign);
  if (allPositions.length === 0) return [];

  // 2. Get wallet's token accounts from BOTH token programs
  //    (NFT mints may use legacy Token or Token-2022)
  const [legacyAccounts, token2022Accounts] = await Promise.all([
    connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ID }),
    connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_2022_PROGRAM_ID }),
  ]);

  // Build a set of mints the wallet holds with balance > 0
  const { AccountLayout } = await import('@solana/spl-token');
  const heldMints = new Set<string>();
  for (const { account } of [...legacyAccounts.value, ...token2022Accounts.value]) {
    const parsed = AccountLayout.decode(account.data);
    if (parsed.amount > 0n) {
      heldMints.add(new PublicKey(parsed.mint).toBase58());
    }
  }

  // 3. Filter NftPositions to those the wallet actually holds
  return allPositions.filter((pos: any) =>
    heldMints.has(pos.account.nftMint.toBase58())
  );
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
  metadataUri?: string;
  // BYO Token fields
  existingMint?: PublicKey;
  depositAmount?: bigint;
  /** Token program that owns the BYO mint (SPL Token or Token-2022) */
  tokenProgramId?: PublicKey;
  // Recovery swap fee (1-3%, snaps to protocol default after recovery)
  swapFeeBps: number;
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
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  
  // Treasury from on-chain protocol state (already fetched above)
  const treasury: PublicKey = protocolState.treasury;
  
  // Convert frontend params to on-chain params
  const sovereignType: OnChainSovereignType = params.sovereignType === 'TokenLaunch' 
    ? { tokenLaunch: {} } 
    : { byoToken: {} };
  
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
    feeMode: null,
    metadataUri: params.metadataUri || null,
    depositAmount: params.depositAmount ? new BN(params.depositAmount.toString()) : null,
    swapFeeBps: params.swapFeeBps,
  };
  
  // Build accounts - some are optional based on sovereign type
  // For BYO, use the token program that owns the mint (SPL Token or Token-2022)
  const byoTokenProgram = params.tokenProgramId || TOKEN_PROGRAM_ID;
  const accounts: any = {
    creator,
    protocolState: protocolStatePDA,
    sovereign: sovereignPDA,
    creatorTracker: creatorTrackerPDA,
    treasury,
    tokenMint: params.existingMint || null,
    creatorTokenAccount: params.existingMint 
      ? getAssociatedTokenAddressSync(
          params.existingMint, creator, false,
          byoTokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID,
        )
      : null,
    tokenVault: params.existingMint ? tokenVaultPDA : null,
    tokenProgram: params.existingMint ? byoTokenProgram : TOKEN_PROGRAM_ID,
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

// ============================================================
// Engine Pool Constants
// ============================================================

const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function getMetaplexMetadataPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
}

// ============================================================
// Finalize: Create Engine Pool (single step)
// ============================================================

/**
 * Build a finalize_engine_pool transaction.
 * Single-step finalization: creates the engine pool, transfers GOR + tokens
 * from bonding vaults to engine vaults, transitions Finalizing → Recovery.
 */
export async function buildFinalizeEnginePoolTx(
  program: SovereignLiquidityProgram,
  payer: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);
  const [engineTokenVaultPDA] = getEngineTokenVaultPDA(sovereignPDA);
  const [binArrayPDA] = getEngineBinArrayPDA(sovereignPDA, 0); // page 0 initialized with pool

  // Fetch sovereign to get the token_mint and check creator escrow
  const sovereignAccount = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const tokenMint: PublicKey = sovereignAccount.tokenMint;
  const creatorEscrow: BN = sovereignAccount.creatorEscrow;

  // Determine the token program (Token-2022 for TokenLaunch, Token for BYO)
  const mintAccountInfo = await program.provider.connection.getAccountInfo(tokenMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_2022_PROGRAM_ID;

  // ── Pre-allocate BinArray page 0 via engine program ──
  // BinArray is 8,240 bytes (128 bins × 64 bytes + header) — fits in a
  // single prepare_bin_array call (under the 10,240-byte per-ix limit).
  const engineProg = engineFromMain(program);
  const binArrayAccounts = {
    payer,
    sovereign: sovereignPDA,
    binArray: binArrayPDA,
    systemProgram: SystemProgram.programId,
  };

  const prepareBinArrayIx = await (engineProg.methods as any)
    .prepareBinArray()
    .accounts(binArrayAccounts)
    .instruction();

  // ── Top-up sol_vault to cover rent-exempt gap ──
  // The vault holds exactly total_deposited + creator_escrow, but the on-chain
  // check subtracts rent_exempt(0) before comparing, causing a shortfall of
  // ~890,880 lamports. Prepend a small SOL transfer to cover the gap.
  const solVaultBalance = await program.provider.connection.getBalance(solVaultPDA);
  const rentExempt = await program.provider.connection.getMinimumBalanceForRentExemption(0);
  const totalNeeded = new BN(sovereignAccount.totalDeposited.toString())
    .add(new BN(creatorEscrow.toString()))
    .toNumber();
  const available = solVaultBalance - rentExempt;
  const preInstructions: any[] = [prepareBinArrayIx];
  if (available < totalNeeded) {
    const topUp = totalNeeded - available;
    preInstructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: solVaultPDA,
        lamports: topUp,
      })
    );
  }

  // If creator has escrowed SOL, we need to pass their token ATA for the buy-in
  let creatorTokenAccount: PublicKey | null = null;
  if (creatorEscrow && !creatorEscrow.isZero()) {
    const creator: PublicKey = sovereignAccount.creator;
    creatorTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      creator,
      true, // allowOwnerOffCurve
      tokenProgramId,
    );
    // Ensure the ATA exists (idempotent — no-op if already created)
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        creatorTokenAccount,
        creator,
        tokenMint,
        tokenProgramId,
      )
    );
  }

  const accounts: Record<string, PublicKey | null> = {
    payer,
    protocolState: protocolStatePDA,
    sovereign: sovereignPDA,
    enginePool: enginePoolPDA,
    binArray: binArrayPDA,
    tokenMint,
    solVault: solVaultPDA,
    tokenVault: tokenVaultPDA,
    engineGorVault: engineGorVaultPDA,
    engineTokenVault: engineTokenVaultPDA,
    creatorTokenAccount,
    engineProgram: ENGINE_PROGRAM_ID,
    tokenProgram: tokenProgramId,
    systemProgram: SystemProgram.programId,
  };

  const tx = await (program.methods as any)
    .finalizeEnginePool()
    .accounts(accounts)
    .preInstructions(preInstructions)
    .transaction();

  return tx;
}

// ============================================================
// Engine Pool Swap: Buy (GOR → Tokens)
// ============================================================

/**
 * Build a swap_buy transaction.
 * Trader sends GOR (native SOL), receives sovereign tokens from the engine pool.
 * Now routes directly to the sovereign-engine program.
 *
 * @param gorInput - Amount of GOR to spend (in lamports)
 * @param minTokensOut - Minimum tokens to receive (slippage protection)
 */
export async function buildSwapBuyTx(
  program: SovereignLiquidityProgram,
  trader: PublicKey,
  sovereignId: bigint | number,
  gorInput: bigint,
  minTokensOut: bigint,
): Promise<Transaction> {
  const engineProgram = engineFromMain(program);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);
  const [engineTokenVaultPDA] = getEngineTokenVaultPDA(sovereignPDA);

  // Fetch engine pool to get token_mint and active_bin page
  const poolAccount = await (engineProgram.account as any).enginePool.fetch(enginePoolPDA);
  const tokenMint: PublicKey = poolAccount.tokenMint;
  const activeBin: number = poolAccount.activeBin;
  const highestAllocatedPage: number = poolAccount.highestAllocatedPage;
  const activePage = Math.floor(activeBin / 128);
  const [binArrayPDA] = getEngineBinArrayPDA(sovereignPDA, activePage);

  // Determine the token program
  const mintAccountInfo = await program.provider.connection.getAccountInfo(tokenMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_2022_PROGRAM_ID;

  // Trader's token account
  const traderTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    trader,
    false,
    tokenProgramId,
  );

  // Ensure trader's ATA exists
  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      trader,
      traderTokenAccount,
      trader,
      tokenMint,
      tokenProgramId,
    ),
  );

  // Auto-allocate BinArray pages if needed (active page or overflow)
  // Pages must be allocated sequentially: highest_allocated_page + 1
  const pagesToAllocate: number[] = [];
  for (let p = highestAllocatedPage + 1; p <= activePage + 1; p++) {
    if (p * 128 < poolAccount.numBins) {
      pagesToAllocate.push(p);
    }
  }
  for (const pageIdx of pagesToAllocate) {
    const [newBinArrayPDA] = getEngineBinArrayPDA(sovereignPDA, pageIdx);
    const allocateIx = await (engineProgram.methods as any)
      .allocateBinPage(pageIdx)
      .accounts({
        payer: trader,
        sovereign: sovereignPDA,
        enginePool: enginePoolPDA,
        binArray: newBinArrayPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    tx.add(allocateIx);
  }

  // Overflow page for cross-boundary swaps (buys cross UP)
  const overflowPageIndex = activePage + 1;
  let remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [];
  const overflowAllocated = overflowPageIndex <= highestAllocatedPage + pagesToAllocate.length;
  if (overflowAllocated && overflowPageIndex * 128 < poolAccount.numBins) {
    const [overflowPDA] = getEngineBinArrayPDA(sovereignPDA, overflowPageIndex);
    remainingAccounts = [{ pubkey: overflowPDA, isWritable: true, isSigner: false }];
  }

  const swapBuilder = (engineProgram.methods as any)
    .swapBuy(new BN(gorInput.toString()), new BN(minTokensOut.toString()))
    .accounts({
      trader,
      sovereign: sovereignPDA,
      enginePool: enginePoolPDA,
      tokenMint,
      engineGorVault: engineGorVaultPDA,
      engineTokenVault: engineTokenVaultPDA,
      traderTokenAccount,
      binArray: binArrayPDA,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    });

  if (remainingAccounts.length > 0) {
    swapBuilder.remainingAccounts(remainingAccounts);
  }

  const mainIx = await swapBuilder.instruction();
  tx.add(mainIx);
  return tx;
}

// ============================================================
// Engine Pool Swap: Sell (Tokens → GOR)
// ============================================================

/**
 * Build a swap_sell transaction.
 * Trader sends sovereign tokens, receives GOR (native SOL) from the engine pool.
 * Now routes directly to the sovereign-engine program.
 *
 * @param tokenInput - Amount of tokens to sell
 * @param minGorOut - Minimum GOR to receive (slippage protection)
 */
export async function buildSwapSellTx(
  program: SovereignLiquidityProgram,
  trader: PublicKey,
  sovereignId: bigint | number,
  tokenInput: bigint,
  minGorOut: bigint,
): Promise<Transaction> {
  const engineProgram = engineFromMain(program);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);
  const [engineTokenVaultPDA] = getEngineTokenVaultPDA(sovereignPDA);

  // Fetch engine pool to get token_mint and active_bin page
  const poolAccount = await (engineProgram.account as any).enginePool.fetch(enginePoolPDA);
  const tokenMint: PublicKey = poolAccount.tokenMint;
  const activeBin: number = poolAccount.activeBin;
  const highestAllocatedPage: number = poolAccount.highestAllocatedPage;
  const activePage = Math.floor(activeBin / 128);
  const [binArrayPDA] = getEngineBinArrayPDA(sovereignPDA, activePage);

  // Determine the token program
  const mintAccountInfo = await program.provider.connection.getAccountInfo(tokenMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_2022_PROGRAM_ID;

  // Trader's token account
  const traderTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    trader,
    false,
    tokenProgramId,
  );

  const tx = new Transaction();

  // Auto-allocate BinArray pages if needed
  // Pages must be allocated sequentially: highest_allocated_page + 1
  const pagesToAllocate: number[] = [];
  for (let p = highestAllocatedPage + 1; p <= activePage; p++) {
    if (p * 128 < poolAccount.numBins) {
      pagesToAllocate.push(p);
    }
  }
  for (const pageIdx of pagesToAllocate) {
    const [newBinArrayPDA] = getEngineBinArrayPDA(sovereignPDA, pageIdx);
    const allocateIx = await (engineProgram.methods as any)
      .allocateBinPage(pageIdx)
      .accounts({
        payer: trader,
        sovereign: sovereignPDA,
        enginePool: enginePoolPDA,
        binArray: newBinArrayPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    tx.add(allocateIx);
  }

  // Overflow page for cross-boundary swaps (sells cross DOWN)
  const overflowPageIndex = activePage - 1;
  let remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [];
  if (overflowPageIndex >= 0) {
    const [overflowPDA] = getEngineBinArrayPDA(sovereignPDA, overflowPageIndex);
    // Page 0 always exists; other pages exist if <= highestAllocatedPage
    if (overflowPageIndex <= highestAllocatedPage) {
      remainingAccounts = [{ pubkey: overflowPDA, isWritable: true, isSigner: false }];
    }
  }

  const swapBuilder = (engineProgram.methods as any)
    .swapSell(new BN(tokenInput.toString()), new BN(minGorOut.toString()))
    .accounts({
      trader,
      sovereign: sovereignPDA,
      enginePool: enginePoolPDA,
      tokenMint,
      engineGorVault: engineGorVaultPDA,
      engineTokenVault: engineTokenVaultPDA,
      traderTokenAccount,
      binArray: binArrayPDA,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    });

  if (remainingAccounts.length > 0) {
    swapBuilder.remainingAccounts(remainingAccounts);
  }

  const swapIx = await swapBuilder.instruction();
  tx.add(swapIx);
  return tx;
}

// ============================================================
// Claim Engine Pool LP Fees (NFT bearer claims)
// ============================================================

/**
 * Build a claim_pool_lp_fees transaction.
 * NFT bearer (whoever holds the Genesis NFT) claims their proportional share
 * of accumulated swap fees from the engine pool.
 *
 * @param holder - Current NFT holder (signer)
 * @param originalDepositor - The wallet that originally deposited (for PDA derivation)
 * @param nftMint - The Genesis NFT mint pubkey
 */
export async function buildClaimPoolLpFeesTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);
  const [lpClaimPDA] = getEngineLpClaimPDA(enginePoolPDA, holder);

  const tx = await (program.methods as any)
    .claimPoolLpFees()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      originalDepositor: holder,
      depositRecord: depositRecordPDA,
      enginePool: enginePoolPDA,
      lpClaim: lpClaimPDA,
      engineGorVault: engineGorVaultPDA,
      engineProgram: ENGINE_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Claim Engine Pool Creator Fees
// ============================================================

/**
 * Build a claim_pool_creator_fees transaction.
 * Creator claims their share of engine pool swap fees.
 * Now routes directly to the sovereign-engine program.
 */
export async function buildClaimPoolCreatorFeesTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const engineProgram = engineFromMain(program);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);

  const tx = await (engineProgram.methods as any)
    .claimCreatorFees()
    .accounts({
      creator,
      sovereign: sovereignPDA,
      enginePool: enginePoolPDA,
      engineGorVault: engineGorVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Execute Engine Pool Unwind
// ============================================================

/**
 * Build an execute_engine_unwind transaction.
 * Drains all liquidity from the engine pool back to sovereign vaults,
 * takes protocol fee, sets up investor claim distribution.
 * State must be Unwinding (set by governance vote).
 * Permissionless — anyone can call after observation period ends.
 */
export async function buildExecuteEngineUnwindTx(
  program: SovereignLiquidityProgram,
  executor: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  const [engineGorVaultPDA] = getEngineGorVaultPDA(sovereignPDA);
  const [engineTokenVaultPDA] = getEngineTokenVaultPDA(sovereignPDA);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  // Fetch sovereign + protocol to get token_mint and treasury 
  const sovereignAccount = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const tokenMint: PublicKey = sovereignAccount.tokenMint;
  const protocolState = await (program.account as any).protocolState.fetch(protocolStatePDA);
  const treasury: PublicKey = protocolState.treasury;

  // Determine the token program
  const mintAccountInfo = await program.provider.connection.getAccountInfo(tokenMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_2022_PROGRAM_ID;

  const tx = await (program.methods as any)
    .executeEngineUnwind()
    .accounts({
      executor,
      sovereign: sovereignPDA,
      protocolState: protocolStatePDA,
      treasury,
      enginePool: enginePoolPDA,
      engineGorVault: engineGorVaultPDA,
      engineTokenVault: engineTokenVaultPDA,
      tokenMint,
      solVault: solVaultPDA,
      tokenVault: tokenVaultPDA,
      engineProgram: ENGINE_PROGRAM_ID,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Engine Pool Read Functions
// ============================================================

/**
 * Fetch the engine pool state for a sovereign.
 * Uses the engine program (account is owned by sovereign-engine).
 * Returns null if pool doesn't exist yet (pre-finalization).
 */
export async function fetchEnginePool(
  program: SovereignLiquidityProgram,
  sovereignId: bigint | number,
) {
  const engineProgram = engineFromMain(program);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);
  try {
    return await (engineProgram.account as any).enginePool.fetch(enginePoolPDA);
  } catch {
    return null;
  }
}

// ============================================================
// Emergency Functions
// ============================================================

/**
 * Build an emergency unlock transaction (protocol authority only)
 * Transitions sovereign to Halted from any state
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
  | 'Halted'
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
  if (status.halted) return 'Halted';
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
// ============================================================
// Claim Transfer Fees (harvest + claim in one call)
// ============================================================

export async function buildClaimTransferFeesTx(
  program: SovereignLiquidityProgram,
  creator: PublicKey,
  sovereignId: bigint | number,
  sourceTokenAccounts: PublicKey[] = [],
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [tokenVaultPDA] = getTokenVaultPDA(sovereignPDA, program.programId);

  const sovereign = await fetchSovereign(program, sovereignPDA);
  const tokenMint = new PublicKey(sovereign.tokenMint);

  // Creator's Token-2022 ATA
  const creatorTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    creator,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const tx = new Transaction();

  // Ensure creator ATA exists
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      creator,
      creatorTokenAccount,
      creator,
      tokenMint,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  const builder = (program.methods as any)
    .claimTransferFees()
    .accounts({
      creator,
      sovereign: sovereignPDA,
      tokenMint,
      tokenVault: tokenVaultPDA,
      creatorTokenAccount,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    });

  if (sourceTokenAccounts.length > 0) {
    builder.remainingAccounts(
      sourceTokenAccounts.map((pubkey) => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      }))
    );
  }

  const mainIx = await builder.transaction();

  tx.add(mainIx);
  return tx;
}

// ============================================================
// Mint NFT from Position (Reservoir Model)
// ============================================================

/**
 * Build a transaction to mint an NFT from a deposit record (reservoir model).
 * The depositor carves out `amount` lamports from their DR into a new NFT.
 * Each call increments sovereign.nftCounter and derives a fresh mint PDA.
 *
 * @param program - The Anchor program
 * @param holder - The wallet pubkey of the depositor (signer)
 * @param sovereignId - The sovereign's unique ID (u64)
 * @param amount - Amount in lamports to carve into the NFT (BN)
 */
export async function buildMintNftFromPositionTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
  amount: BN
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [collectionMintPDA] = getCollectionMintPDA(program.programId);

  // Fetch sovereign on-chain to get current nftCounter
  const sovereign = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const nftCounter = BigInt(sovereign.nftCounter.toString());

  // Derive the NFT mint PDA from sovereign + nftCounter
  const [nftMintPDA] = getGenesisNftMintPDA(sovereignPDA, nftCounter, program.programId);

  // Derive the NftPosition PDA from the NFT mint
  const [nftPositionPDA] = getNftPositionPDA(nftMintPDA, program.programId);

  // Fetch protocol state to get treasury
  const protocolState = await fetchProtocolState(program);
  const treasury: PublicKey = protocolState.treasury;

  // NFT uses legacy SPL Token (Metaplex CreateMetadataAccountV3 is
  // incompatible with Token-2022 ProgrammableNonFungible assets)
  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMintPDA,
    holder,
    false,
    TOKEN_PROGRAM_ID
  );

  // Metaplex metadata PDAs
  const [metadataAccount] = getMetaplexMetadataPDA(nftMintPDA);
  const [collectionMetadata] = getMetaplexMetadataPDA(collectionMintPDA);

  // Metaplex master edition PDA for the collection
  const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_PROGRAM_ID.toBuffer(),
      collectionMintPDA.toBuffer(),
      Buffer.from('edition'),
    ],
    METAPLEX_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .mintNftFromPosition(amount)
    .accountsPartial({
      holder,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      treasury,
      protocolState: protocolStatePDA,
      nftMint: nftMintPDA,
      nftTokenAccount,
      nftPosition: nftPositionPDA,
      metadataAccount,
      collectionMint: collectionMintPDA,
      collectionMetadata,
      collectionMasterEdition,
      metadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return tx;
}

// ============================================================
// NFT Marketplace — Transaction Builders
// ============================================================

/**
 * Build a list_nft transaction.
 * Seller lists their Genesis NFT on the marketplace at a given price.
 */
export async function buildListNftTx(
  program: SovereignLiquidityProgram,
  seller: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey,
  priceLamports: bigint | BN
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [nftListingPDA] = getNftListingPDA(nftMint, program.programId);
  const [nftPositionPDA] = getNftPositionPDA(nftMint, program.programId);

  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    seller,
    false,
    TOKEN_PROGRAM_ID
  );

  const escrowNftAccount = getAssociatedTokenAddressSync(
    nftMint,
    sovereignPDA,
    true, // allowOwnerOffCurve — sovereign is a PDA
    TOKEN_PROGRAM_ID
  );

  const price = new BN(priceLamports.toString());

  const tx = await (program.methods as any)
    .listNft(price, null)
    .accountsStrict({
      seller,
      sovereign: sovereignPDA,
      nftMint,
      nftTokenAccount,
      escrowNftAccount,
      nftPosition: nftPositionPDA,
      nftListing: nftListingPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a buy_nft transaction.
 * Buyer purchases a listed Genesis NFT, paying SOL (royalty enforced).
 */
export async function buildBuyNftTx(
  program: SovereignLiquidityProgram,
  buyer: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey,
  seller: PublicKey,
  royaltyWallet: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [nftListingPDA] = getNftListingPDA(nftMint, program.programId);

  const escrowNftAccount = getAssociatedTokenAddressSync(
    nftMint,
    sovereignPDA,
    true, // allowOwnerOffCurve — sovereign is a PDA
    TOKEN_PROGRAM_ID
  );

  const buyerNftAccount = getAssociatedTokenAddressSync(
    nftMint,
    buyer,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .buyNft()
    .accountsStrict({
      buyer,
      seller,
      sovereign: sovereignPDA,
      nftMint,
      escrowNftAccount,
      buyerNftAccount,
      nftListing: nftListingPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a delist_nft transaction.
 * Seller (or admin) removes their NFT listing.
 */
export async function buildDelistNftTx(
  program: SovereignLiquidityProgram,
  caller: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey,
  seller: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [protocolStatePDA] = getProtocolStatePDA(program.programId);
  const [nftListingPDA] = getNftListingPDA(nftMint, program.programId);

  const escrowNftAccount = getAssociatedTokenAddressSync(
    nftMint,
    sovereignPDA,
    true, // allowOwnerOffCurve — sovereign is a PDA
    TOKEN_PROGRAM_ID
  );

  const sellerNftAccount = getAssociatedTokenAddressSync(
    nftMint,
    seller,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .delistNft()
    .accountsStrict({
      caller,
      protocolState: protocolStatePDA,
      sovereign: sovereignPDA,
      seller,
      nftMint,
      escrowNftAccount,
      sellerNftAccount,
      nftListing: nftListingPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a burn_nft_into_position transaction ("Merge").
 * Burns the NFT and dissolves its NftPosition backing into the holder's DR.
 * If the holder has no DR, one is created (init_if_needed on-chain).
 * Free — no fee charged.
 */
export async function buildBurnNftIntoPositionTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);
  const [nftPositionPDA] = getNftPositionPDA(nftMint, program.programId);

  // Determine the correct token program for this mint
  const connection = program.provider.connection;
  const mintAccountInfo = await connection.getAccountInfo(nftMint);
  const tokenProgramId = mintAccountInfo?.owner || TOKEN_PROGRAM_ID;

  const nftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    holder,
    false,
    tokenProgramId
  );

  const tx = await (program.methods as any)
    .burnNftIntoPosition()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      nftMint,
      nftTokenAccount,
      nftPosition: nftPositionPDA,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Build a transfer_nft transaction.
 * Free peer-to-peer transfer (no royalty). NFT must not be listed.
 */
export async function buildTransferNftTx(
  program: SovereignLiquidityProgram,
  sender: PublicKey,
  recipient: PublicKey,
  sovereignId: bigint | number,
  nftMint: PublicKey
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [senderDepositRecordPDA] = getDepositRecordPDA(sovereignPDA, sender, program.programId);
  const [recipientDepositRecordPDA] = getDepositRecordPDA(sovereignPDA, recipient, program.programId);

  const senderNftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    sender,
    false,
    TOKEN_PROGRAM_ID
  );
  const recipientNftTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    recipient,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = await (program.methods as any)
    .transferNft()
    .accounts({
      sender,
      recipient,
      sovereign: sovereignPDA,
      nftMint,
      senderNftTokenAccount,
      recipientNftTokenAccount,
      senderDepositRecord: senderDepositRecordPDA,
      recipientDepositRecord: recipientDepositRecordPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

/**
 * Fetch an NftListing account. Returns null if the listing doesn't exist.
 */
export async function fetchNftListing(
  program: SovereignLiquidityProgram,
  nftMint: PublicKey
) {
  const [nftListingPDA] = getNftListingPDA(nftMint, program.programId);
  try {
    return await (program.account as any).nftListing.fetch(nftListingPDA);
  } catch {
    return null;
  }
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
 * Fetch a vote record for a proposal + voter wallet
 */
export async function fetchVoteRecord(
  program: SovereignLiquidityProgram,
  proposalPubkey: PublicKey,
  voter: PublicKey
) {
  const [voteRecordPDA] = getVoteRecordPDA(proposalPubkey, voter, program.programId);
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
 * DR-based: holder must have position_bps > 0 in their deposit record.
 * No NFT required.
 * 
 * @param holder - Deposit record owner (signer)
 * @param sovereignId - The sovereign's numeric ID
 */
export async function buildProposeUnwindTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
): Promise<{ tx: Transaction; proposalPDA: PublicKey }> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);

  // Fetch sovereign to get proposal count (next proposal ID)
  const sovereign = await (program.account as any).sovereignState.fetch(sovereignPDA);
  const proposalId = BigInt(sovereign.proposalCount.toString());
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);

  const tx = await (program.methods as any)
    .proposeUnwind()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      proposal: proposalPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return { tx, proposalPDA };
}

/**
 * Build a cast_vote transaction.
 * DR-based: holder must have position_bps > 0. No NFT required.
 * 
 * @param holder - Deposit record owner (signer)
 * @param sovereignId - The sovereign's numeric ID
 * @param proposalId - The proposal ID to vote on
 * @param support - true = vote FOR unwind, false = vote AGAINST
 */
export async function buildCastVoteTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
  proposalId: bigint | number,
  support: boolean
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);
  const [voteRecordPDA] = getVoteRecordPDA(proposalPDA, holder, program.programId);

  const tx = await (program.methods as any)
    .vote(support)
    .accounts({
      holder,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
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
 * 
 * @param caller - The signer (anyone)
 * @param sovereignId - The sovereign's numeric ID
 * @param proposalId - The proposal ID to finalize
 */
export async function buildFinalizeVoteTx(
  program: SovereignLiquidityProgram,
  caller: PublicKey,
  sovereignId: bigint | number,
  proposalId: bigint | number,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [proposalPDA] = getProposalPDA(sovereignPDA, proposalId, program.programId);
  const [permanentLockPDA] = getPermanentLockPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .finalizeVote()
    .accounts({
      caller,
      sovereign: sovereignPDA,
      proposal: proposalPDA,
      permanentLock: permanentLockPDA,
    })
    .transaction();

  return tx;
}

/**
 * Build a claim_unwind transaction.
 * DR-based: transfers proportional GOR from sol_vault based on deposit_record.position_bps.
 * Merge any NFTs back into DR first to maximise claim.
 * 
 * @param holder - Deposit record owner (signer)
 * @param sovereignId - The sovereign's numeric ID
 */
export async function buildClaimUnwindTx(
  program: SovereignLiquidityProgram,
  holder: PublicKey,
  sovereignId: bigint | number,
): Promise<Transaction> {
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, holder, program.programId);
  const [solVaultPDA] = getSolVaultPDA(sovereignPDA, program.programId);

  const tx = await (program.methods as any)
    .claimUnwind()
    .accounts({
      holder,
      sovereign: sovereignPDA,
      depositRecord: depositRecordPDA,
      solVault: solVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

// ============================================================
// Pending Fee Calculations (read-only)
// ============================================================

export interface PendingEngineLpFees {
  /** Claimable GOR in lamports */
  claimableLamports: bigint;
  /** Claimable GOR as a number */
  claimableGor: number;
  /** Total LP fees accumulated */
  totalLpFeesAccumulated: bigint;
  /** Total LP fees claimed */
  totalLpFeesClaimed: bigint;
}

/**
 * Calculate pending LP fees from the engine pool for a depositor.
 * Uses the same fee-per-share math as on-chain.
 * Pure read — engine pool + lp claim record.
 */
export async function fetchPendingEngineLpFees(
  program: SovereignLiquidityProgram,
  sovereignId: bigint | number,
  originalDepositor: PublicKey,
): Promise<PendingEngineLpFees | null> {
  const engineProgram = engineFromMain(program);
  const [sovereignPDA] = getSovereignPDA(sovereignId, program.programId);
  const [enginePoolPDA] = getEnginePoolPDA(sovereignPDA);

  // Fetch engine pool from engine program
  let pool;
  try {
    pool = await (engineProgram.account as any).enginePool.fetch(enginePoolPDA);
  } catch {
    return null;
  }

  // No claimable fees if pool is drained (unwound/paused after emergency drain)
  if (pool.poolStatus?.unwound || pool.poolStatus?.paused) {
    return null;
  }

  // Fetch deposit record from main program to get deposit amount
  const [depositRecordPDA] = getDepositRecordPDA(sovereignPDA, originalDepositor, program.programId);
  let depositRecord;
  try {
    depositRecord = await (program.account as any).depositRecord.fetch(depositRecordPDA);
  } catch {
    return null;
  }

  if (!depositRecord || Number(depositRecord.amount) === 0) return null;

  const depositAmount = BigInt(depositRecord.amount.toString());
  const lpFeePerShare = BigInt(pool.lpFeePerShare.toString());

  // Fetch LP claim record from engine program if it exists
  const [lpClaimPDA] = getEngineLpClaimPDA(enginePoolPDA, originalDepositor);
  let lastFeePerShare = 0n;
  let totalClaimed = 0n;
  try {
    const claimRecord = await (engineProgram.account as any).engineLpClaim.fetch(lpClaimPDA);
    lastFeePerShare = BigInt(claimRecord.lastFeePerShare.toString());
    totalClaimed = BigInt(claimRecord.totalClaimed.toString());
  } catch {
    // Claim record doesn't exist yet — first claim
  }

  // fee_per_share is scaled by FEE_PRECISION (1e12) on-chain
  const PRECISION = 1_000_000_000_000n; // 1e12 — must match FEE_PRECISION on-chain
  const pendingPerShare = lpFeePerShare - lastFeePerShare;
  const claimable = (depositAmount * pendingPerShare) / PRECISION;

  return {
    claimableLamports: claimable,
    claimableGor: Number(claimable) / 1_000_000_000,
    totalLpFeesAccumulated: BigInt(pool.lpFeesAccumulated.toString()),
    totalLpFeesClaimed: BigInt(pool.lpFeesClaimed.toString()),
  };
}

// ============================================================
// Token-2022 Transfer Fee Stats
// ============================================================

export interface TokenFeeStats {
  /** Transfer fee in basis points (e.g. 100 = 1%) */
  transferFeeBps: number;
  /** Pending (newer) transfer fee in bps, if different from active */
  pendingFeeBps: number | null;
  /** Epoch when pending fee activates */
  pendingFeeEpoch: number | null;
  /** Current epoch */
  currentEpoch: number;
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

    // Pending fee: if newer fee hasn't activated yet and differs from current
    const newerEpoch = Number(feeConfig.newerTransferFee.epoch);
    const newerBps = Number(feeConfig.newerTransferFee.transferFeeBasisPoints);
    const hasPendingFee = epoch.epoch < newerEpoch && newerBps !== transferFeeBps;
    const pendingFeeBps = hasPendingFee ? newerBps : null;
    const pendingFeeEpoch = hasPendingFee ? newerEpoch : null;

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
      pendingFeeBps,
      pendingFeeEpoch,
      currentEpoch: epoch.epoch,
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
