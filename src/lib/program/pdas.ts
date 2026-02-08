import { PublicKey } from '@solana/web3.js';
import { PDA_SEEDS } from './seeds';

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
 * Derive the Creation Fee Escrow PDA
 * @param sovereign - The sovereign's pubkey
 */
export function getCreationFeeEscrowPDA(
  sovereign: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.CREATION_FEE_ESCROW), sovereign.toBuffer()],
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
 * @param proposal - The proposal's pubkey
 * @param voter - The voter's wallet pubkey
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
 * Derive a Genesis NFT Mint PDA for a depositor
 * @param sovereign - The sovereign's pubkey
 * @param depositor - The depositor's wallet pubkey
 */
export function getGenesisNftMintPDA(
  sovereign: PublicKey,
  depositor: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const pid = programId || getProgramId();
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.GENESIS_NFT_MINT),
      sovereign.toBuffer(),
      depositor.toBuffer(),
    ],
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
