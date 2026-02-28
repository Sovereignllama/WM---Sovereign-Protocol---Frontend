// Application configuration
export const config = {
  rpcUrl: process.env.NEXT_PUBLIC_GORBAGANA_RPC_URL || 'https://rpc.trashscan.io',
  backupRpcUrl: process.env.NEXT_PUBLIC_BACKUP_RPC_URL || 'https://rpc.trashscan.io',
  network: process.env.NEXT_PUBLIC_NETWORK || 'mainnet-beta',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'Sovo1wDfYPPJioeDmpokFehhiWTANgfGaK3qKp84hYc',
  engineProgramId: process.env.NEXT_PUBLIC_ENGINE_PROGRAM_ID || 'SovTXTTvFW3KDxaxBQ5jwL2wTzPQtdXBbwDr3PJgpmy',
  poolPriceWorkerUrl: process.env.NEXT_PUBLIC_POOL_PRICE_WORKER_URL || 'https://waste-management-pool-price-tracker.onrender.com',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Sovereign Protocol',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://trashscan.io',
  explorerAddressPath: process.env.NEXT_PUBLIC_EXPLORER_ADDRESS_PATH || '/address/',
  explorerTxPath: process.env.NEXT_PUBLIC_EXPLORER_TX_PATH || '/tx/',
} as const;

// Protocol constants matching SPEC
export const PROTOCOL_CONSTANTS = {
  // Fee defaults (in basis points)
  DEFAULT_CREATION_FEE_BPS: 50,  // 0.5%
  MAX_CREATION_FEE_BPS: 1000,    // 10%
  DEFAULT_UNWIND_FEE_BPS: 500,   // 5%
  MAX_SELL_FEE_BPS: 300,         // 3%
  
  // Lamport values
  MIN_FEE_LAMPORTS: 50_000_000,  // 0.05 GOR
  GOVERNANCE_UNWIND_FEE_LAMPORTS: 50_000_000, // 0.05 GOR
  MIN_BOND_TARGET_LAMPORTS: 50_000_000_000,   // 50 GOR
  MIN_DEPOSIT_LAMPORTS: 100_000_000,          // 0.1 GOR
  
  // BYO Token
  DEFAULT_BYO_MIN_SUPPLY_BPS: 3000, // 30%
  
  // Time periods
  MIN_BOND_DURATION_DAYS: 7,
  MAX_BOND_DURATION_DAYS: 30,
  AUTO_UNWIND_PERIOD_DAYS: 90,
  
  // Creator limits
  MAX_CREATOR_BUY_BPS: 100, // 1% of total supply
  
  // Governance
  QUORUM_BPS: 6700,        // 67%
  PASS_THRESHOLD_BPS: 5100, // 51%
  VOTING_PERIOD_DAYS: 7,
  TIMELOCK_DAYS: 2,
} as const;

// Lamports to GOR conversion
export const LAMPORTS_PER_GOR = 1_000_000_000;


