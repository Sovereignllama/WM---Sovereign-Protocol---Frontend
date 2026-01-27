# Sovereign Protocol Frontend

A Next.js frontend for the Sovereign Liquidity Protocol on Solana.

## Features

- **$overeigns Page**: Browse active liquidity pools with recovery-first mechanics
- **Mint Page**: Multi-step form to launch new sovereigns (Token Launch or BYO Token)
- **Wallet Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Responsive Design**: Mobile-first design matching the Waste Management aesthetic

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your configuration
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── globals.css       # Global styles & design system
│   ├── layout.tsx        # Root layout with providers
│   ├── page.tsx          # $overeigns listing page
│   └── mint/
│       └── page.tsx      # Sovereign creation wizard
├── components/
│   ├── Navbar.tsx        # Navigation header
│   ├── Footer.tsx        # Footer component
│   ├── ConnectWalletButton.tsx
│   ├── StatusBadge.tsx   # Sovereign status badges
│   ├── SovereignCard.tsx # Individual sovereign card
│   └── SovereignList.tsx # List of sovereigns
├── contexts/
│   ├── WalletProvider.tsx
│   └── QueryProvider.tsx
├── lib/
│   └── config.ts         # App & protocol configuration
└── types/
    └── sovereign.ts      # TypeScript type definitions
```

## Design System

The frontend uses a custom design system adapted from Waste Management:

### Colors
- **Brand Green**: `#0B5D3B`
- **Hazard Yellow**: `#F2B705`
- **Background**: `#0D1410`
- **Profit**: `#2EEB7F`
- **Loss**: `#E5484D`

### Components
- `.btn`, `.btn-primary`, `.btn-outline`
- `.card`, `.card-highlight`
- `.stat`, `.badge`
- `.input`, `.select`
- `.progress-bar`

## Protocol Integration

The frontend is designed to integrate with the Sovereign Liquidity Protocol Solana program:

1. **View Sovereigns**: Fetch on-chain SovereignState accounts
2. **Create Sovereign**: Initialize new sovereigns via `create_sovereign` instruction
3. **Deposit**: Allow investors to deposit SOL during bonding phase
4. **Claim Fees**: Enable Genesis NFT holders to claim LP fees

## Environment Variables

```env
# RPC URL
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Network (devnet, mainnet-beta)
NEXT_PUBLIC_NETWORK=devnet

# Program ID
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID

# App name
NEXT_PUBLIC_APP_NAME=Sovereign Protocol
```

## License

MIT
