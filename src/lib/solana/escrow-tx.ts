import { sha256 } from "@noble/hashes/sha2.js";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { DEVNET_USDC_MINT, SOLANA_DEVNET_RPC, SOLANA_ESCROW_PROGRAM_ID } from "@/config/constants";
import type { SolanaProvider } from "@/lib/solana/wallet";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const PROGRAM_ID = new PublicKey(SOLANA_ESCROW_PROGRAM_ID);
const MINT = new PublicKey(DEVNET_USDC_MINT);

/** Confirmed on Devnet: seeds `["escrow", maker]` and `["vault", escrow]`. */
export function escrowPda(maker: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.toBuffer()], PROGRAM_ID)[0];
}

export function vaultPda(escrow: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), escrow.toBuffer()], PROGRAM_ID)[0];
}

export function makerTokenAccount(maker: PublicKey): PublicKey {
  const associated = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  return PublicKey.findProgramAddressSync(
    [maker.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), MINT.toBuffer()],
    associated,
  )[0];
}

function instructionData(amount: bigint, intentHash: Uint8Array, timeout: bigint): Buffer {
  if (intentHash.length !== 32) throw new Error("Intent hash must be 32 bytes");
  const disc = Buffer.from(sha256(new TextEncoder().encode("global:initialize_intent"))).subarray(0, 8);
  const data = Buffer.alloc(8 + 8 + 32 + 8);
  disc.copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  Buffer.from(intentHash).copy(data, 16);
  data.writeBigInt64LE(timeout, 48);
  return data;
}

export function initializeIntentTransaction(input: {
  maker: PublicKey;
  amount: bigint;
  intentHash: Uint8Array;
  timeout: bigint;
  blockhash: string;
}): { transaction: Transaction; escrow: PublicKey; vault: PublicKey } {
  const escrow = escrowPda(input.maker);
  const vault = vaultPda(escrow);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: input.maker, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: makerTokenAccount(input.maker), isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(input.amount, input.intentHash, input.timeout),
  });
  const transaction = new Transaction({ feePayer: input.maker, recentBlockhash: input.blockhash }).add(ix);
  return { transaction, escrow, vault };
}

function logMessage(logs: string[] | null | undefined): string | null {
  const line = logs?.find((item) => item.includes("Error Message:"));
  return line?.split("Error Message:")[1]?.trim() || null;
}

export async function lockDevnetIntent(input: {
  provider: SolanaProvider;
  publicKey: string;
  amount: bigint;
  intentHash: Uint8Array;
  timeout: bigint;
}): Promise<{ signature: string; escrowPda: string }> {
  if (!input.provider.signTransaction) throw new Error("This wallet cannot sign a Solana transaction.");
  const connection = new Connection(SOLANA_DEVNET_RPC, "confirmed");
  const maker = new PublicKey(input.publicKey);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const built = initializeIntentTransaction({
    maker,
    amount: input.amount,
    intentHash: input.intentHash,
    timeout: input.timeout,
    blockhash,
  });
  const raw = built.transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  const simulated = await fetch(SOLANA_DEVNET_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: [
        Buffer.from(raw).toString("base64"),
        { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true },
      ],
    }),
  });
  const preview = (await simulated.json()) as {
    error?: { message?: string };
    result?: { value?: { err: unknown; logs?: string[] } };
  };
  if (preview.error?.message) throw new Error(preview.error.message);
  if (preview.result?.value?.err) {
    throw new Error(logMessage(preview.result.value.logs) ?? "Devnet rejected the lock before signing.");
  }
  const signed = await input.provider.signTransaction(built.transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return { signature, escrowPda: built.escrow.toBase58() };
}
