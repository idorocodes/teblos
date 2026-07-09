/**
 * payments/testVerify.ts
 *
 * Watches your treasury wallet for a NEW incoming payment, then verifies
 * it automatically once it arrives. No need to pre-fill a signature —
 * just run this, then send SOL from Phantom to the treasury address
 * while it's running.
 *
 * Run with: node payments/testVerify.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { verifyPayment, TREASURY_WALLET } from "./verify.ts";

const RPC_URL = "https://api.devnet.solana.com";
const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000; // stop waiting after 5 minutes

async function waitForNewSignature(
  connection: Connection,
  address: PublicKey,
  knownSignatures: Set<string>
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const sigs = await connection.getSignaturesForAddress(address, {
      limit: 5,
    });

    for (const sigInfo of sigs) {
      if (!knownSignatures.has(sigInfo.signature)) {
        return sigInfo.signature;
      }
    }

    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out after ${TIMEOUT_MS / 1000}s waiting for a new payment.`
  );
}

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("Treasury pubkey:", TREASURY_WALLET.toBase58());

  // Snapshot existing signatures first, so we only react to a NEW one.
  console.log("Checking existing transaction history...");
  const existingSigs = await connection.getSignaturesForAddress(
    TREASURY_WALLET,
    { limit: 20 }
  );
  const knownSignatures = new Set(existingSigs.map((s) => s.signature));
  console.log(`Found ${knownSignatures.size} existing signature(s) — ignoring these.`);

  console.log(
    "\nWaiting for a NEW payment to arrive...\n" +
      "Send SOL now from Phantom (devnet) to:\n" +
      TREASURY_WALLET.toBase58() +
      "\n"
  );

  const newSignature = await waitForNewSignature(
    connection,
    TREASURY_WALLET,
    knownSignatures
  );

  console.log("\n\nNew payment detected! Signature:", newSignature);

  // Fetch the transaction to figure out who the sender was.
  const tx = await connection.getTransaction(newSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error("Could not fetch transaction details for the new signature.");
  }

  const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  // By Solana convention, the first account is the fee payer / transaction
  // sender for a simple transfer.
  const senderWallet = accountKeys[0].toBase58();

  console.log("Detected sender wallet:", senderWallet);

  // --- Test 1: should succeed ---
  console.log("\n--- Test 1: verifying the detected payment ---");
  const result1 = await verifyPayment(connection, newSignature, senderWallet);
  console.log("Result:", result1);
  if (!result1.success) {
    console.error("FAILED — expected success, got rejection:", result1.reason);
  } else {
    console.log(`PASSED — granted ${result1.creditsGranted} credit(s).`);
  }

  // --- Test 2: replay check ---
  console.log("\n--- Test 2: re-verifying the SAME signature ---");
  console.log(
    "NOTE: this only rejects once credits.ts has inserted this signature " +
      "into the transactions table. Until that's wired up, seeing 'success' " +
      "again here is expected, not a bug."
  );
  const result2 = await verifyPayment(connection, newSignature, senderWallet);
  console.log("Result:", result2);

  // --- Test 3: wrong claimed wallet ---
  console.log("\n--- Test 3: verifying with a WRONG wallet address ---");
  const fakeWallet = "11111111111111111111111111111111";
  const result3 = await verifyPayment(connection, newSignature, fakeWallet);
  console.log("Result:", result3);
  if (result3.success || result3.reason !== "sender_mismatch") {
    console.error("FAILED — expected sender_mismatch rejection.");
  } else {
    console.log("PASSED — correctly rejected mismatched sender.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Test script failed:", err);
  process.exit(1);
});