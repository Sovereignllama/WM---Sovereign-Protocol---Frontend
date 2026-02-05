// PDA Seeds - must match on-chain constants
export const PDA_SEEDS = {
  PROTOCOL_STATE: 'protocol_state',
  SOVEREIGN: 'sovereign',
  DEPOSIT_RECORD: 'deposit_record',
  SOL_VAULT: 'sol_vault',
  TOKEN_VAULT: 'token_vault',
  PERMANENT_LOCK: 'permanent_lock',
  CREATOR_TRACKER: 'creator_tracker',
  CREATION_FEE_ESCROW: 'creation_fee_escrow',
  PROPOSAL: 'proposal',
  VOTE_RECORD: 'vote_record',
  GENESIS_NFT_MINT: 'genesis_nft_mint',
  TOKEN_MINT: 'token_mint', // Token-2022 mint for TokenLaunch
  EXTRA_ACCOUNT_METAS: 'extra-account-metas', // Transfer hook metas
} as const;

export type PdaSeed = typeof PDA_SEEDS[keyof typeof PDA_SEEDS];
