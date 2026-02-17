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
  // Engine pool PDAs
  ENGINE_POOL: 'engine_pool',
  ENGINE_GOR_VAULT: 'engine_gor_vault',
  ENGINE_TOKEN_VAULT: 'engine_token_vault',
  ENGINE_LP_CLAIM: 'engine_lp_claim',
  ENGINE_BIN_ARRAY: 'bin_array',
} as const;

export type PdaSeed = typeof PDA_SEEDS[keyof typeof PDA_SEEDS];
