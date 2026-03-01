'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { config } from '@/lib/config';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => config.rpcUrl, []);
  
  const wallets = useMemo(
    () => [
      // Only Backpack wallet is supported on Gorbagana
      new BackpackWalletAdapter(),
    ],
    []
  );

  // Use a dedicated WebSocket endpoint for tx confirmations.
  // The HTTP RPC may be proxied through a backend that doesn't support WS upgrades.
  const wsEndpoint = useMemo(() => config.wsRpcUrl, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ wsEndpoint }}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
