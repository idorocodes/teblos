/**
 * payments/testVerify.ts
 *
 * Watches your treasury wallet for a NEW incoming payment, verifies it,
 * grants credits, then proves replay protection actually works by trying
 * to verify the SAME signature again (should now be rejected for real).
 *
 * Run with: node payments/testVerify.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { verifyPayment, TREASURY_WALLET } from "./verify.ts";
import { grantCredits, getBalance } from "./credits.ts";

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
      "\n(remember: price is 0.001 SOL per credit — send at least 0.002 SOL)\n"
  );

  const newSignature = await waitForNewSignature(
    connection,
    TREASURY_WALLET,
    knownSignatures
  );

  console.log("\n\nNew payment detected! Signature:", newSignature);

  const tx = await connection.getTransaction(newSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error("Could not fetch transaction details for the new signature.");
  }

  const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  const senderWallet = accountKeys[0].toBase58();

  console.log("Detected sender wallet:", senderWallet);

  // --- Test 1: verify should succeed ---
  console.log("\n--- Test 1: verifying the detected payment ---");
  const result1 = await verifyPayment(connection, newSignature, senderWallet);
  console.log("Result:", result1);

  if (!result1.success) {
    console.error("FAILED — expected success, got rejection:", result1.reason);
    return;
  }
  console.log(`PASSED — verified ${result1.creditsGranted} credit(s) worth of payment.`);

  // --- Grant the credits (this is the new step) ---
  console.log("\n--- Granting credits ---");
  const grantResult = grantCredits(senderWallet, newSignature, result1);
  console.log("Grant result:", grantResult);

  if (!grantResult.success) {
    console.error("FAILED — grantCredits rejected a fresh signature unexpectedly.");
    return;
  }
  console.log(`PASSED — wallet balance is now ${grantResult.newBalance}.`);

  const confirmedBalance = getBalance(senderWallet);
  console.log("Confirmed via getBalance():", confirmedBalance);

  // --- Test 2: replay protection — should NOW actually reject ---
  console.log("\n--- Test 2: re-verifying the SAME signature (replay attempt) ---");
  const result2 = await verifyPayment(connection, newSignature, senderWallet);
  console.log("Result:", result2);
  if (result2.success || result2.reason !== "already_used") {
    console.error("FAILED — expected already_used rejection, replay protection is not working.");
  } else {
    console.log("PASSED — replay correctly rejected.");
  }

  // --- Test 3: wrong claimed wallet ---
  console.log("\n--- Test 3: verifying with a WRONG wallet address ---");
  const fakeWallet = "11111111111111111111111111111111";
  const result3 = await verifyPayment(connection, newSignature, fakeWallet);
  console.log("Result:", result3);
  if (result3.success || (result3.reason !== "sender_mismatch" && result3.reason !== "already_used")) {
    console.error("FAILED — expected a rejection.");
  } else {
    console.log(`PASSED — correctly rejected (${result3.reason}).`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Test script failed:", err);
  process.exit(1);
});