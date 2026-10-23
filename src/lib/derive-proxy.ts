import { ethers } from "ethers";

/**
 * Derives a deterministic EVM address on Polygon Amoy
 * from the user's Solana public key using the NEAR MPC derivation path standard.
 */
export function derivePolygonAddress(
  solanaPubkey: string,
  nearContractId: string = "v1.signer-prod.testnet",
): string {
  const path = `moxie-intents,${solanaPubkey}`;
  const combinedSeed = `${nearContractId},${path}`;
  const hash = ethers.keccak256(ethers.toUtf8Bytes(combinedSeed));

  // Format the last 20 bytes as an EVM checksum address
  return ethers.getAddress("0x" + hash.slice(-40));
}
