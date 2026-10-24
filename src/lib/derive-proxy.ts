import { keccak_256 } from "@noble/hashes/sha3.js";
import { NEAR_DERIVATION_PREFIX, NEAR_MPC_CONTRACT } from "../config/constants.ts";
import { toChecksumAddress } from "./moxie/codec.ts";

const textEncoder = new TextEncoder();

/**
 * Derives a deterministic EVM address on Polygon
 * from the user's Solana public key using NEAR Chain Signatures (`v1.signer-prod.testnet`)
 * with path `moxie-intents,${solanaPubkey}`.
 */
export function derivePolygonAddress(
  solanaPubkey: string,
  nearContractId: string = NEAR_MPC_CONTRACT,
): string {
  const cleanKey = (solanaPubkey ?? "").trim();
  if (!cleanKey) {
    return "0x0000000000000000000000000000000000000000";
  }
  const path = `${NEAR_DERIVATION_PREFIX},${cleanKey}`;
  const combinedSeed = `${nearContractId},${path}`;
  const digest = keccak_256(textEncoder.encode(combinedSeed));

  // Format the last 20 bytes as an EIP-55 checksum address
  return toChecksumAddress(digest.slice(12));
}

export function derivationPathOf(solanaPubkey: string): string {
  return `${NEAR_DERIVATION_PREFIX},${solanaPubkey}`;
}

