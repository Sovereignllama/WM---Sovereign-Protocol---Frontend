'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function ConnectWalletButton() {
  return (
    <WalletMultiButton
      style={{
        backgroundColor: 'rgba(46,235,127,0.12)',
        color: '#d4ffe6',
        borderRadius: 'var(--r-md)',
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        border: '1px solid rgba(46,235,127,0.4)',
        boxShadow: '0 0 8px rgba(46,235,127,0.15)',
        textShadow: '0 0 6px rgba(200,255,220,0.5)',
        transition: 'all 0.2s',
      }}
    />
  );
}
