import { hexToBytes } from "@noble/hashes/utils.js";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { DEVNET_USDC_MINT } from "@/config/constants";
import { escrowPda, vaultPda } from "@/lib/solana/escrow-tx";
import {
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
 * Executes a genuine on-chain Solana Devnet SPL Token transfer from user ATA to Vault ATA
 * using the SPL Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA).
 */
export async function executeSolanaCollateralLock(
  input: LockSolanaCollateralInput,
): Promise<LockSolanaCollateralResult> {
  const makerKey = new PublicKey(input.walletAddress);
  const mintPubkey = new PublicKey(DEVNET_USDC_MINT);
  const targetEscrow = escrowPda(makerKey);
  const targetVault = vaultPda(targetEscrow);

  const extProvider = input.extWalletName ? injectedProvider(input.extWalletName) : null;
  const fallbackWindowSolana =
    typeof window !== "undefined"
      ? (window as Window & { solana?: SolanaProvider }).solana
      : undefined;
  const activeProvider = extProvider ?? (input.extWalletName ? fallbackWindowSolana : null);

  const { result, usedFallback } = await withSolanaFailover(async (connection) => {
    const userAta = await getAssociatedTokenAddress(
      mintPubkey,
      makerKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const vaultAta = await getAssociatedTokenAddress(
      mintPubkey,
      targetVault,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Verify user ATA exists
    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      throw new Error("No USDC token account found. Please claim Devnet USDC from the faucet first.");
    }

    const transaction = new Transaction();
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
    );

    // Check if vault ATA exists, if not prepend creation instruction
    const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
    if (!vaultAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          makerKey,
          vaultAta,
          targetVault,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    const transferIx = createTransferInstruction(
      userAta,
      vaultAta,
      makerKey,
      BigInt(input.amountMicro),
      [],
      TOKEN_PROGRAM_ID,
    );
    transaction.add(transferIx);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = makerKey;

    let signature: string;

    if (activeProvider && activeProvider.publicKey) {
      input.onPendingSignature?.();
      try {
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
      } catch (err) {
        if (isUserRejection(err)) {
          throw new UserRejectedWalletError("Transaction rejected by user in wallet extension.");
        }
        throw err;
      }
    } else {
      // Fallback to embedded session keypair
      const seed = hexToBytes(input.secretKeyHex);
      const keypair = Keypair.fromSeed(seed.subarray(0, 32));
      transaction.sign(keypair);
      signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
      });
    }

    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
    }

    return {
      signature,
      escrowPdaAddress: targetEscrow.toBase58(),
      onChain: true,
    };
  }, 35000);

  return result;
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
