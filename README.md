# Moxie Markets

> Private, one-click prediction market trading on Solana, settled via NEAR Intents and Polymarket.

## Overview
Moxie Markets allows users to trade live Polymarket outcomes directly using Solana USDC. By leveraging NEAR Intents and NEAR Chain Signatures, user orders execute without public mempool exposure, bridging friction, or manual cross-chain gas management.

## Key Features
- **One-Click Cross-Chain Execution:** Deposit USDC on Solana; trades route and settle on Polygon automatically.
- **Privacy-Preserving Intent Routing:** Order details route through the NEAR Intent solver network, preventing MEV frontrunning and orderbook snooping.
- **Deterministic Key Derivation:** User Polygon settlement addresses derive deterministically from their Solana public key using NEAR Chain Signatures (MPC).
- **Embedded Account Abstraction:** Smooth onboarding with support for Solana browser wallets (Phantom, Solflare, Backpack) and Web2 social logins (Privy).

## Architecture & Data Flow
1. **Source Layer (Solana):** User locks USDC collateral into a non-custodial escrow vault.
2. **Coordination Layer (NEAR Intents & Solvers):**
   - NEAR Intent solver network consumes the signed execution intent.
   - NEAR Chain Signatures derive and sign transactions for the user's Polygon Safe proxy.
3. **Execution Layer (Polygon):**
   - The solver executes the trade on the Polymarket CLOB.
   - ERC-1155 Conditional Tokens (outcome shares) are minted to the user's derived address.
4. **Settlement Release:** Proof of fill on Polygon unlocks the escrowed Solana funds to the solver.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, TanStack Router / Nitro SSR
- **Wallets & Auth:** Solana Wallet Adapter, Privy
- **Cross-Chain Layer:** NEAR Intents, Chain Defuser API, NEAR MPC Chain Signatures
- **Settlement:** Polymarket CLOB, Polygon Amoy / Mainnet

## Local Development
```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

## Environment Variables
See `.env.example` for required keys:
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_POLYGON_RPC_URL`
- `AURORA_INTENTS_API_KEY`
- `DATABASE_URL`
