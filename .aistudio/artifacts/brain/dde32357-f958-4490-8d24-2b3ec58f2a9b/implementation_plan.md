# Moxie Markets — UI, Branding, Jargon Removal & Testnet Faucet Hub Plan

This plan updates **Moxie Markets** with the attached brand logo (`/assets/aistudio/Moxie_logo_8a77754a.jfif`), streamlined header and authentication flows, zero technical jargon across all views, responsive mobile/desktop bottom navigation with proper footer clearance, and a real on-chain **Testnet Faucets & Setup** hub in the Portfolio view (`/api/faucet/usdc` and `/api/faucet/pol`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions incorporate your confirmed answers from Phase 1 and govern this update pass.

- **Confirmed Decision 1 — Strict On-Chain Faucet Execution (`/api/faucet/usdc` & `/api/faucet/pol`)**: Both server faucet routes require funded server faucet private keys (`SOLANA_FAUCET_SECRET_KEY` / `DEVNET_MINT_AUTHORITY_SECRET_KEY` for Solana Devnet SPL minting/transfer and `POLYGON_FAUCET_PRIVATE_KEY` / `POLYGON_SOLVER_PRIVATE_KEY` for Polygon Amoy POL transfer) and execute real on-chain transactions against Solana Devnet and Polygon Amoy RPCs, returning explicit error messages if keys are missing or unfunded.
- **Confirmed Decision 2 — Fixed Bottom Navigation Bar on Mobile & Desktop**: The bottom navigation bar (`Home`, `Markets`, `Portfolio`) stays fixed at the bottom of the screen across both mobile and desktop viewports, with generous bottom padding (`pb-28` / `pb-32`) on the main container and footer so footer links (`Terms`, `Privacy`, email, X) are never obscured.

---

## 1. Overview & Core Concept

- **What It Does**: Refines Moxie Markets into a clean, consumer-friendly prediction trading app where users sign in or connect a wallet, fund their account using the Portfolio Testnet Faucet Hub or USDC deposit controls, and trade live Polymarket outcomes privately in one click.
- **Target Audience / Persona**: Everyday prediction market traders and hackathon testers who want a clean, jargon-free trading experience backed by real Solana Devnet and Polygon Amoy testnet execution.
- **Key Value**: Eliminates backend/cryptographic clutter from the interface while centralizing all balance, deposit, withdrawal, and testnet faucet actions inside the Portfolio view.

---

## 2. User Experience & Visual Design

### 1. Branding & Header Navigation
- **Brand Identity**: Update the top header brand lockup from `"Moxie"` to `"Moxie Markets"` and render `/assets/aistudio/Moxie_logo_8a77754a.jfif` beside the brand title.
- **Auth Button (`Log in / Sign up`)**: Replace `"Connect Wallet"` with `"Log in / Sign up"`. Clicking opens the unified authentication modal where users can sign in with **Google**, **Email**, **X (Twitter)**, or connect an external Solana wallet (**Phantom**, **Solflare**, **Backpack**, or **Mobile Wallet Adapter**).
- **Portfolio-Only Fund Controls**: Remove the USDC Balance pill, `"Deposit"`, and `"Withdraw"` buttons from the top header so they live exclusively inside the **Portfolio** view.

### 2. Mobile Responsiveness, Bottom Navigation & Dev Console Removal
- **Fixed Bottom Navigation Bar**: Render the fixed bottom navigation bar (`Home`, `Markets`, `Portfolio`, plus quick search) on both mobile and desktop viewports.
- **Footer Clearance**: Add `pb-28` / `pb-32` clearance to the layout and footer container so the fixed bottom navigation bar never overlaps the footer links (`Terms`, `Privacy`, `moxiemarkets@gmail.com`, `@moxiedotmarkets`).
- **Complete Dev Console Removal**: Remove the collapsible Dev Console drawer and all toggle triggers from `/trade/$marketId` and across the app.

### 3. Hero Section & Home Page Cleanup (`/`)
- **Hero CTA**: Remove the secondary `"Add cash"` button next to `"Open Terminal"`. Enlarge `"Open Terminal"` with `px-8 py-4 text-lg` styling for clear visual prominence.
- **Hero Copy**:
  - Remove the top pill badges (`SOLANA USDC · NEAR INTENTS · POLYMARKET CLOB`).
  - Update the hero headline to replace `"Bet"` with `"Trade"`: **`Trade on global events privately.`** (with `privately.` in `#ffa16c`).
  - Set the hero subtitle to read: ***"Trade live Polymarket outcomes privately on Solana in one click."***
- **Market Preview Cards**: Remove the `1. Solana Lock`, `2. NEAR Solver`, and `3. Polygon Fill` (`ESCROW_LOCKED`, `SOLVER_BIDDING`, `SETTLED`) step indicators from the Home page showcase card, and change quick-action buttons from `"Lock YES"` / `"Lock NO"` to `"Trade YES"` / `"Trade NO"`.

### 4. Global Technical Jargon Removal
Across the Shell, Settings dropdown, Home page, Market Discovery (`/markets`), Trade Execution Desk (`/trade/$marketId`), Portfolio (`/portfolio`), and Receipt (`/thank-you`):
- Remove all mentions of `bps` and `basis points`.
- Remove the `Solana USDC + Polygon Shares` badge.
- Replace all `"Lock bet"` / `"Lock a Bet"` / `"Bet YES"` / `"Bet NO"` labels and buttons with `"Trade"` / `"Trade YES"` / `"Trade NO"`.
- Remove `Neon DB` and `Polymarket Gamma Live` / `Polymarket Verified Feed` status indicators.
- Remove `NEAR Chain Signer` and `Polygon Settlement` telemetry labels from the user-facing chrome.

### 5. "How Moxie Markets Works" Section (`/`)
Update the 3-up explanation cards on the Home page and strip the bottom `"Private routing active"` and `"Zero gas needed"` badges from all three cards:
- **Step 1**: Header `Sign up / Log in` — Description: `Connect your Solana wallet or sign in with Google, X, or Email. Moxie Markets derives your Polygon address automatically.`
- **Step 2**: Header `Fund your wallet` — Description: `Deposit USDC on Solana in one click.`
- **Step 3**: Header `Private Routing via NEAR` — Description: `Your order routes privately through Aurora Intents Connect and NEAR Intents so bots cannot copy or front-run your trade.` (with bottom badges removed).

### 6. Testnet / Devnet Trading & Portfolio Faucet Hub (`/portfolio`)
Inside `/portfolio`, render the **Balance**, **Deposit**, and **Withdraw** controls at the top, followed by a dedicated **"Testnet Faucets & Setup"** card featuring three actions:
1. **Get Devnet SOL**: Triggers a live `connection.requestAirdrop()` call (1 SOL on Solana Devnet) to the user's connected Solana address and provides a direct link to the official Solana Devnet Faucet (`https://faucet.solana.com`) in a new tab.
2. **One-Click Test USDC Mint**: Calls `POST /api/faucet/usdc` with the user's Solana address, which uses a server-side Devnet mint authority keypair (`SOLANA_FAUCET_SECRET_KEY` / `DEVNET_MINT_AUTHORITY_SECRET_KEY`) to mint Devnet Test USDC (`DEVNET_USDC_MINT`) on-chain to the user's associated token account.
3. **Airdrop Testnet POL**: Calls `POST /api/faucet/pol` with the user's derived Polygon Amoy address, which uses a server-side Polygon Amoy wallet (`POLYGON_FAUCET_PRIVATE_KEY` / `POLYGON_SOLVER_PRIVATE_KEY`) to transfer testnet POL on-chain via `https://rpc-amoy.polygon.technology`, alongside a direct link to `https://faucet.polygon.technology`.

---

## 3. Technical Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                   UPDATED HEADER & FIXED BOTTOM BAR                        │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Top Header:                       │  │ Fixed Bottom Navigation Bar:  │  │
│  │ • Logo (/assets/...Moxie_logo)    │  │ • Home (/)                    │  │
│  │ • "Moxie Markets"                 │  │ • Markets (/markets)          │  │
│  │ • "Log in / Sign up" + Settings   │  │ • Portfolio (/portfolio)      │  │
│  └─────────────────┬─────────────────┘  └───────────────┬───────────────┘  │
└────────────────────┼────────────────────────────────────┼──────────────────┘
                     │                                    │
       ┌─────────────┴──────────────────┬─────────────────┴─────────────┐
       ▼                                ▼                               ▼
┌─────────────────────┐      ┌──────────────────────┐      ┌─────────────────────────┐
│  / (Home Page)      │      │ /markets &           │      │ /portfolio              │
│                     │      │ /trade/$marketId     │      │                         │
│ • "Trade on global  │      │                      │      │ • Balance + Deposit &   │
│   events privately."│      │ • Jargon-free labels │      │   Withdraw Controls     │
│ • Prominent CTA     │      │ • "Trade YES / NO"   │      │ • Testnet Faucets Hub:  │
│   (px-8 py-4)       │      │ • Primary "Trade"    │      │   1. Get Devnet SOL     │
│ • 3-Step Cards      │      │   button             │      │   2. Mint Test USDC     │
│   (no bottom badges)│      │ • No Dev Console     │      │   3. Airdrop Amoy POL   │
└─────────────────────┘      └──────────────────────┘      └────────────┬────────────┘
                                                                        │
                                                                        ▼
                                                           ┌─────────────────────────┐
                                                           │  SERVER FAUCET ROUTES   │
                                                           │  • POST /api/faucet/usdc│
                                                           │  • POST /api/faucet/pol │
                                                           └─────────────────────────┘
```
