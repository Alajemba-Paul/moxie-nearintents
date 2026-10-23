import { Connection, PublicKey } from "@solana/web3.js";
import type { Transaction } from "@solana/web3.js";
import { DEVNET_USDC_MINT, SOLANA_DEVNET_RPC } from "@/config/constants";

export interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey: { toString(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

export function devnetConnection(): Connection {
  return new Connection(SOLANA_DEVNET_RPC, "confirmed");
}

export function injectedProvider(which: "Phantom" | "Solflare"): SolanaProvider | null {
  const host = window as Window & {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    solana?: SolanaProvider;
  };
  if (which === "Phantom") {
    return host.phantom?.solana ?? (host.solana?.isPhantom ? host.solana : null);
  }
  return host.solflare ?? (host.solana?.isSolflare ? host.solana : null);
}

export async function readDevnetBalance(owner: string): Promise<{ amount: bigint; decimals: number }> {
  const connection = devnetConnection();
  const mint = new PublicKey(DEVNET_USDC_MINT);
  const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint });
  const info = accounts.value[0]?.account.data.parsed.info.tokenAmount as
    | { amount: string; decimals: number }
    | undefined;
  if (!info) {
    const mintInfo = await connection.getParsedAccountInfo(mint);
    const decimals =
      mintInfo.value && "parsed" in mintInfo.value.data
        ? Number(mintInfo.value.data.parsed.info.decimals)
        : 9;
    return { amount: 0n, decimals };
  }
  return { amount: BigInt(info.amount), decimals: info.decimals };
}

export function formatToken(amount: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const frac = amount % scale;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0n) return grouped;
  const digits = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${grouped}.${digits}`;
}
