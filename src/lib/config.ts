// Application configuration
export const config = {
  rpcUrl: process.env.NEXT_PUBLIC_GORBAGANA_RPC_URL || 'https://rpc.trashscan.io',
  network: process.env.NEXT_PUBLIC_NETWORK || 'mainnet-beta',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '',
  engineProgramId: process.env.NEXT_PUBLIC_ENGINE_PROGRAM_ID || 'Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt',
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

/**
 * SAMM AMM Config mapping: swap fee BPS → AmmConfig pubkey on Trashbin.
 * 
 * Each AmmConfig is a pre-deployed account on SAMM that defines the swap fee rate,
 * tick spacing, and pool creation fee for that tier.
 * 
 * TODO: Replace placeholder addresses with actual Trashbin SAMM AmmConfig pubkeys
 * once they are known. Query with: getProgramAccounts(SAMM_PROGRAM_ID) filtering
 * for the ammConfig discriminator.
 */
export const AMM_FEE_TIERS: { bps: number; label: string; address: string }[] = [
  { bps: 20,  label: '0.2%',  address: '91nMHS1bpAqcMwkAJdfBEXvAhRUQdVpi4tpVwQkYHXnB' },
  { bps: 50,  label: '0.5%',  address: '14jJBJ8D2P7Vwxmy3ZWADMktcutDrTPzZ3cwSzzBu4nW' },
  { bps: 100, label: '1%',    address: '5Faie8JPMMTdpgeVByZg4za1pfbvWLsndWhqPtsEibf3' },
  { bps: 200, label: '2%',    address: 'FQ6KT4TVcAx6znm3dW8gmnfvxEeiGszLv82rn2G1BRs8' },
];

/**
 * Get the AMM config address for a given swap fee BPS.
 * Falls back to nearest available tier if exact match not found.
 */
export function getAmmConfigForFee(swapFeeBps: number): { bps: number; address: string } | null {
  // Exact match first
  const exact = AMM_FEE_TIERS.find(t => t.bps === swapFeeBps);
  if (exact && exact.address) return exact;
  
  // Find nearest tier that has a valid address
  const validTiers = AMM_FEE_TIERS.filter(t => t.address);
  if (validTiers.length === 0) return null;
  
  validTiers.sort((a, b) => Math.abs(a.bps - swapFeeBps) - Math.abs(b.bps - swapFeeBps));
  return validTiers[0];
}
