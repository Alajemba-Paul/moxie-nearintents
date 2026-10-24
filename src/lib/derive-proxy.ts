import { ethers } from "ethers";
import { NEAR_DERIVATION_PREFIX, NEAR_MPC_CONTRACT } from "../config/constants.ts";

/**
 * Derives a deterministic EVM address on Polygon
 * from the user's Solana public key using NEAR Chain Signatures (`v1.signer-prod.testnet`)
 * with path `moxie-intents,${solanaPubkey}`.
 */
export function derivePolygonAddress(
  solanaPubkey: string,
  nearContractId: string = NEAR_MPC_CONTRACT,
): string {
  const path = `${NEAR_DERIVATION_PREFIX},${solanaPubkey}`;
  const combinedSeed = `${nearContractId},${path}`;
  const hash = ethers.keccak256(ethers.toUtf8Bytes(combinedSeed));

  // Format the last 20 bytes as an EVM checksum address
  return ethers.getAddress("0x" + hash.slice(-40));
}

export function derivationPathOf(solanaPubkey: string): string {
  return `${NEAR_DERIVATION_PREFIX},${solanaPubkey}`;
}
