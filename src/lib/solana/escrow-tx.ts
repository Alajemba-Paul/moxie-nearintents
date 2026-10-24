import { sha256 } from "@noble/hashes/sha2.js";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { DEVNET_USDC_MINT, SOLANA_ESCROW_PROGRAM_ID } from "@/config/constants";
import { withSolanaFailover, type SolanaProvider } from "@/lib/solana/wallet";

const textEncoder = new TextEncoder();

let cachedTokenProgramId: PublicKey | null = null;
let cachedProgramId: PublicKey | null = null;
let cachedMint: PublicKey | null = null;
let cachedAssociatedProgramId: PublicKey | null = null;

function getTokenProgramId(): PublicKey {
  cachedTokenProgramId ??= new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  return cachedTokenProgramId;
}

function getProgramId(): PublicKey {
  cachedProgramId ??= new PublicKey(SOLANA_ESCROW_PROGRAM_ID);
  return cachedProgramId;
}

function getMint(): PublicKey {
  cachedMint ??= new PublicKey(DEVNET_USDC_MINT);
  return cachedMint;
}

function getAssociatedProgramId(): PublicKey {
  cachedAssociatedProgramId ??= new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  return cachedAssociatedProgramId;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Confirmed on Devnet: seeds `["escrow", maker]` and `["vault", escrow]`. */
export function escrowPda(maker: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("escrow"), maker.toBytes()],
    getProgramId(),
  )[0];
}

export function vaultPda(escrow: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("vault"), escrow.toBytes()],
    getProgramId(),
  )[0];
}

export function makerTokenAccount(maker: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [maker.toBytes(), getTokenProgramId().toBytes(), getMint().toBytes()],
    getAssociatedProgramId(),
  )[0];
}

function initializeIntentData(amount: bigint, intentHash: Uint8Array, timeout: bigint): Buffer {
  if (intentHash.length !== 32) throw new Error("Intent hash must be 32 bytes");
  const disc = sha256(textEncoder.encode("global:initialize_intent")).subarray(0, 8);
  const raw = new Uint8Array(8 + 8 + 32 + 8);
  raw.set(disc, 0);
  const view = new DataView(raw.buffer);
  view.setBigUint64(8, amount, true);
  raw.set(intentHash, 16);
  view.setBigInt64(48, timeout, true);
  return Buffer.from(raw);
}

function discriminatorOf(instructionSnakeName: string): Buffer {
  return Buffer.from(
    sha256(textEncoder.encode(`global:${instructionSnakeName}`)).subarray(0, 8),
  );
}

/**
 * Matches IDL instruction `initializeIntent` in `src/idl/moxie_escrow.json`
 */
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
    programId: getProgramId(),
    keys: [
      { pubkey: input.maker, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: makerTokenAccount(input.maker), isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: getMint(), isSigner: false, isWritable: false },
      { pubkey: getTokenProgramId(), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initializeIntentData(input.amount, input.intentHash, input.timeout),
  });
  const transaction = new Transaction({ feePayer: input.maker, recentBlockhash: input.blockhash }).add(ix);
  return { transaction, escrow, vault };
}

/**
 * Matches IDL instruction `solverRelease` in `src/idl/moxie_escrow.json`
 */
export function solverReleaseTransaction(input: {
  solver: PublicKey;
  maker: PublicKey;
  solverTokenAccount: PublicKey;
  blockhash: string;
}): { transaction: Transaction; escrow: PublicKey; vault: PublicKey } {
  const escrow = escrowPda(input.maker);
  const vault = vaultPda(escrow);
  const ix = new TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: input.solver, isSigner: true, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: input.maker, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: input.solverTokenAccount, isSigner: false, isWritable: true },
      { pubkey: getTokenProgramId(), isSigner: false, isWritable: false },
    ],
    data: discriminatorOf("solver_release"),
  });
  const transaction = new Transaction({ feePayer: input.solver, recentBlockhash: input.blockhash }).add(ix);
  return { transaction, escrow, vault };
}

/**
 * Matches IDL instruction `userRefund` in `src/idl/moxie_escrow.json`
 */
export function userRefundTransaction(input: {
  maker: PublicKey;
  blockhash: string;
}): { transaction: Transaction; escrow: PublicKey; vault: PublicKey } {
  const escrow = escrowPda(input.maker);
  const vault = vaultPda(escrow);
  const ix = new TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: input.maker, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: makerTokenAccount(input.maker), isSigner: false, isWritable: true },
      { pubkey: getTokenProgramId(), isSigner: false, isWritable: false },
    ],
    data: discriminatorOf("user_refund"),
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
}): Promise<{ signature: string; escrowPda: string; usedFallback: boolean }> {
  if (!input.provider.signTransaction) throw new Error("This wallet cannot sign a Solana transaction.");
  const maker = new PublicKey(input.publicKey);
  const { result, usedFallback } = await withSolanaFailover(async (connection, endpoint) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const built = initializeIntentTransaction({
      maker,
      amount: input.amount,
      intentHash: input.intentHash,
      timeout: input.timeout,
      blockhash,
    });
    const raw = built.transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    const simulated = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: [
          bytesToBase64(raw),
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
    const signed = await input.provider.signTransaction!(built.transaction);
    const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return { signature, escrowPda: built.escrow.toBase58() };
  });
  return { ...result, usedFallback };
}

