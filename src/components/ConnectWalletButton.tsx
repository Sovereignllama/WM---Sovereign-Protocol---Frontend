'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function ConnectWalletButton() {
  return (
    <WalletMultiButton
      style={{
        backgroundColor: 'var(--hazard-yellow)',
        color: '#14110A',
        borderRadius: 'var(--r-md)',
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        border: '1px solid rgba(242,183,5,0.55)',
        boxShadow: 'var(--shadow-soft)',
        transition: 'all 0.2s',
      }}
    />
  );
}
