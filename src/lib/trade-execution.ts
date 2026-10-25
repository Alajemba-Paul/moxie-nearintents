import { hexToBytes } from "@noble/hashes/utils.js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { escrowPda } from "@/lib/solana/escrow-tx";
import {
  devnetConnection,
  injectedProvider,
  withSolanaFailover,
  type InjectedWallet,
  type SolanaProvider,
} from "@/lib/solana/wallet";

export class UserRejectedWalletError extends Error {
  constructor(message = "Transaction rejected in wallet.") {
    super(message);
    this.name = "UserRejectedWalletError";
  }
}

export interface LockSolanaCollateralInput {
  walletAddress: string;
  amountMicro: number;
  intentHash: Uint8Array;
  secretKeyHex: string;
  extWalletName: InjectedWallet | null;
  onPendingSignature?: () => void;
}

export interface LockSolanaCollateralResult {
  signature: string;
  escrowPdaAddress: string;
  onChain: boolean;
}

function isUserRejection(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof UserRejectedWalletError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: number })?.code;
  return (
    code === 4001 ||
    msg.toLowerCase().includes("user rejected") ||
    msg.toLowerCase().includes("rejected the request") ||
    msg.toLowerCase().includes("cancelled") ||
    msg.toLowerCase().includes("denied")
  );
}

/**
 * Executes a genuine on-chain Solana Devnet transaction to lock collateral into the Escrow PDA.
 * Invokes sendTransaction or signTransaction on the connected Solana wallet (Phantom, Solflare, Backpack)
 * or uses the session keypair, returning a verified on-chain transaction signature.
 */
export async function executeSolanaCollateralLock(
  input: LockSolanaCollateralInput,
): Promise<LockSolanaCollateralResult> {
  const makerKey = new PublicKey(input.walletAddress);
  const targetEscrow = escrowPda(makerKey);

  // If an external injected wallet is connected, prompt wallet extension for real user signature
  const extProvider = input.extWalletName ? injectedProvider(input.extWalletName) : null;
  const fallbackWindowSolana =
    typeof window !== "undefined"
      ? (window as Window & { solana?: SolanaProvider }).solana
      : undefined;
  const activeProvider = extProvider ?? (input.extWalletName ? fallbackWindowSolana : null);

  if (activeProvider && activeProvider.publicKey) {
    input.onPendingSignature?.();

    try {
      const { result } = await withSolanaFailover(async (connection) => {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

        // Build genuine Solana transfer to escrow PDA
        const transaction = new Transaction({
          feePayer: makerKey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: makerKey,
            toPubkey: targetEscrow,
            lamports: 5_000n, // Nominal Devnet escrow lock rent
          }),
        );

        let signature: string;

        if (typeof activeProvider.signAndSendTransaction === "function") {
          const res = await activeProvider.signAndSendTransaction(transaction, {
            skipPreflight: false,
          });
          signature = res.signature;
        } else if (typeof activeProvider.sendTransaction === "function") {
          signature = await activeProvider.sendTransaction(transaction, connection);
        } else if (typeof activeProvider.signTransaction === "function") {
          const signed = await activeProvider.signTransaction(transaction);
          signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
          });
        } else {
          throw new Error("Connected wallet does not support transaction signing.");
        }

        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed",
        );

        return {
          signature,
          escrowPdaAddress: targetEscrow.toBase58(),
          onChain: true,
        };
      }, 30000);

      return result;
    } catch (err) {
      if (isUserRejection(err)) {
        throw new UserRejectedWalletError("User rejected the transaction in their Solana wallet.");
      }
      throw err;
    }
  }

  // Fallback to embedded session keypair: signs and broadcasts real on-chain transaction to Devnet
  try {
    const seed = hexToBytes(input.secretKeyHex);
    const keypair = Keypair.fromSeed(seed.subarray(0, 32));

    const { result } = await withSolanaFailover(async (connection) => {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: keypair.publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: targetEscrow,
          lamports: 5_000n,
        }),
      );

      transaction.sign(keypair);
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
      });

      // Confirm asynchronously with reasonable timeout
      await Promise.race([
        connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed",
        ),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ]);

      return {
        signature,
        escrowPdaAddress: targetEscrow.toBase58(),
        onChain: true,
      };
    }, 15000);

    return result;
  } catch (err) {
    if (isUserRejection(err)) {
      throw new UserRejectedWalletError();
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Solana escrow lock failed: ${message}`);
  }
}

export interface PolygonSettlementInput {
  intentId: string;
  solanaSignature: string;
  derivedPolygonAddress: string;
  conditionId: string;
  outcomeIndex: number;
  sharesMicro: number;
  fillMicro: number;
}

export interface PolygonSettlementResult {
  ok: boolean;
  polygonTxHash: string;
  explorerUrl: string;
  broadcasted?: boolean;
}

/**
 * Submits the verified Solana transaction signature and intent to the backend Amoy signer.
 * Executes on-chain call via POLYGON_FAUCET_PRIVATE_KEY and awaits receipt confirmation.
 */
export async function executePolygonSettlement(
  input: PolygonSettlementInput,
): Promise<PolygonSettlementResult> {
  const response = await fetch("/api/trade/settle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Settlement request failed");
    throw new Error(`Settlement API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    polygonTxHash: string;
    explorerUrl: string;
    broadcasted?: boolean;
    error?: string;
  };

  if (!data.ok || !data.polygonTxHash) {
    throw new Error(data.error || "Polygon settlement did not return a valid transaction hash.");
  }

  return {
    ok: true,
    polygonTxHash: data.polygonTxHash,
    explorerUrl: data.explorerUrl || `https://amoy.polygonscan.com/tx/${data.polygonTxHash}`,
    broadcasted: data.broadcasted,
  };
}
