import assert from "node:assert/strict";
import test from "node:test";
import { PublicKey } from "@solana/web3.js";
import { SOLANA_ESCROW_PROGRAM_ID } from "../config/constants.ts";
import { derivePolygonAddress } from "./derive-proxy.ts";

test("proxy address matches the NEAR MPC v1 signer path", () => {
  assert.equal(
    derivePolygonAddress("56UdLRmQvDnpJFSKcZGNBXuzHMcnZcfkfxrP6sBvfPXx"),
    "0x038b01E2bB97E317d8B9dEa21BdE7CdCF5D11902",
  );
});

test("devnet escrow pda is escrow+maker and the vault hangs off it", () => {
  const program = new PublicKey(SOLANA_ESCROW_PROGRAM_ID);
  const maker = new PublicKey("HHJinXabG11cVa86Fx9xrvjTz3P9yR3TZ54uYBsBidni");
  const [escrow] = PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.toBuffer()], program);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), escrow.toBuffer()], program);
  assert.equal(escrow.toBase58(), "AQGuqsAX2YQU7NEGa8kBMFXonizA4r99SEKSutx3bfaE");
  assert.equal(vault.toBase58(), "EntxaxWWmu1RibuSEyQinXqMEeH17sz2ehVQ2jAozbSS");
});
