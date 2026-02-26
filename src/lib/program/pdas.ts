import { PublicKey } from '@solana/web3.js';
import { PDA_SEEDS } from './seeds';
import { config } from '../config';

/**
 * Encode a u64 (bigint) as a little-endian 8-byte Uint8Array.
 * Browser-safe alternative to Buffer.writeBigUInt64LE.
 */
function encodeBigintLE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

/**
 * Get the Engine Program ID
 */
export function getEngineProgramId(): PublicKey {
  return new PublicKey(config.engineProgramId);
}

/**
 * Get the Program ID from environment
 */
export function getProgramId(): PublicKey {
  const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!programId) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID not set in environment');
  }
  return new PublicKey(programId);
}

/**
 * Derive the Protocol State PDA
 */
export function getProtocolStatePDA(programId?: PublicKey): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PROTOCOL_STATE)],
    pid
  );
}

/**
 * Derive a Sovereign State PDA
 * @param sovereignId - The sovereign's unique ID (u64)
 */
export function getSovereignPDA(
  sovereignId: bigint | number,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  const idBuffer = encodeBigintLE(BigInt(sovereignId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.SOVEREIGN), idBuffer],
    pid
  );
}

/**
 * Derive a Deposit Record PDA
 * @param sovereign - The sovereign's pubkey
 * @param depositor - The depositor's wallet pubkey
 */
export function getDepositRecordPDA(
  sovereign: PublicKey,
  depositor: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.DEPOSIT_RECORD),
      sovereign.toBuffer(),
      depositor.toBuffer(),
    ],
    pid
  );
}

/**
 * Derive the SOL Vault PDA for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getSolVaultPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.SOL_VAULT), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Token Vault PDA for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getTokenVaultPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.TOKEN_VAULT), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Permanent Lock PDA for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getPermanentLockPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PERMANENT_LOCK), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Creator Fee Tracker PDA
 * @param sovereign - The sovereign's pubkey
 */
export function getCreatorTrackerPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.CREATOR_TRACKER), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive a Proposal PDA
 * @param sovereign - The sovereign's pubkey
 * @param proposalId - The proposal's unique ID within the sovereign
 */
export function getProposalPDA(
  sovereign: PublicKey,
  proposalId: bigint | number,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  const idBuffer = encodeBigintLE(BigInt(proposalId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PROPOSAL), sovereign.toBuffer(), idBuffer],
    pid
  );
}

/**
 * Derive a Vote Record PDA
 * On-chain the vote record is keyed by NFT mint (not voter wallet),
 * so each Genesis NFT position can only vote once per proposal.
 * @param proposal - The proposal's pubkey
 * @param nftMint - The Genesis NFT mint pubkey for this position
 */
export function getVoteRecordPDA(
  proposal: PublicKey,
  voter: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.VOTE_RECORD),
      proposal.toBuffer(),
      voter.toBuffer(),
    ],
    pid
  );
}

/**
 * Derive the Genesis Collection Mint PDA (global, one per protocol)
 */
export function getCollectionMintPDA(
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.GENESIS_COLLECTION)],
    pid
  );
}

/**
 * Derive a Genesis NFT Mint PDA for a sovereign + nft counter.
 * New reservoir model: each NFT is keyed by [genesis_nft_mint, sovereign, nft_counter_le_bytes].
 * @param sovereign - The sovereign's pubkey
 * @param nftCounter - The sovereign's current nftCounter (u64)
 */
export function getGenesisNftMintPDA(
  sovereign: PublicKey,
  nftCounter: bigint | number,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  const counterBytes = encodeBigintLE(BigInt(nftCounter));
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.GENESIS_NFT_MINT),
      sovereign.toBuffer(),
      counterBytes,
    ],
    pid
  );
}

/**
 * Derive the NftPosition PDA for a Genesis NFT mint.
 * Seeds: ["nft_position", nft_mint]
 * @param nftMint - The Genesis NFT mint pubkey
 */
export function getNftPositionPDA(
  nftMint: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.NFT_POSITION), nftMint.toBuffer()],
    pid
  );
}

/**
 * Derive the Token Mint PDA for a TokenLaunch sovereign
 * This is the Token-2022 mint address for the launched token
 * @param sovereign - The sovereign's pubkey
 */
export function getTokenMintPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.TOKEN_MINT), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Extra Account Metas PDA for transfer hook
 * @param tokenMint - The token mint pubkey
 */
export function getExtraAccountMetasPDA(
  tokenMint: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.EXTRA_ACCOUNT_METAS), tokenMint.toBuffer()],
    pid
  );
}

// ============================================================
// NFT Marketplace PDAs
// ============================================================

/**
 * Derive the NftListing PDA for a Genesis NFT mint.
 * Seeds: ["nft_listing", nft_mint]
 * @param nftMint - The Genesis NFT mint pubkey
 */
export function getNftListingPDA(
  nftMint: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.NFT_LISTING), nftMint.toBuffer()],
    pid
  );
}

// ============================================================
// Engine Pool PDAs
// ============================================================

/**
 * Derive the Engine Pool PDA for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getEnginePoolPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getEngineProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ENGINE_POOL), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Engine GOR Vault PDA (native SOL) for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getEngineGorVaultPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getEngineProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ENGINE_GOR_VAULT), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Engine Token Vault PDA for a sovereign
 * @param sovereign - The sovereign's pubkey
 */
export function getEngineTokenVaultPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getEngineProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ENGINE_TOKEN_VAULT), sovereign.toBuffer()],
    pid
  );
}

/**
 * Derive the Engine LP Claim PDA for a depositor
 * @param enginePool - The engine pool's pubkey
 * @param originalDepositor - The original depositor's wallet pubkey
 */
export function getEngineLpClaimPDA(
  enginePool: PublicKey,
  originalDepositor: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getEngineProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ENGINE_LP_CLAIM), enginePool.toBuffer(), originalDepositor.toBuffer()],
    pid
  );
}

/**
 * Derive the Engine BinArray PDA for a sovereign + page index.
 * V3 engine stores bins in pages of 512 bins each.
 * @param sovereign - The sovereign's pubkey
 * @param pageIndex - The page index (0-based, u32)
 */
export function getEngineBinArrayPDA(
  sovereign: PublicKey,
  pageIndex: number,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getEngineProgramId();
  const pageBuffer = new Uint8Array(4);
  new DataView(pageBuffer.buffer).setUint32(0, pageIndex, true); // little-endian u32
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ENGINE_BIN_ARRAY), sovereign.toBuffer(), pageBuffer],
    pid
  );
}
