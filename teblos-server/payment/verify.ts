/**
 * payments/verify.ts
 *
 * Verifies that a Solana transaction signature represents a real,
 * confirmed payment to Teblos's treasury wallet, for at least the
 * expected amount, and hasn't already been redeemed for credits.
 *
 * This function does NOT write to the database — it only checks and
 * reports. credits.ts is responsible for actually granting credits
 * based on what this returns.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { db } from "../db/index.ts";

// Your treasury/receiving wallet — same keypair generated in utils/setUp.ts.
// Only the PUBLIC key is needed here; verify.ts never signs anything.
export const TREASURY_WALLET = new PublicKey(
  "3aqHiBkVSGtyK4NEPmkbENo1NY4H8TgCNHnuzgTKdxfH"
);

// Price per credit, in lamports. Adjust this to whatever Teblos charges
// per signal call. 1 SOL = 1_000_000_000 lamports.
export const CREDIT_PRICE_LAMPORTS = 1_000_000; // 0.0001 SOL per credit, placeholder

export type VerifyResult =
  | {
      success: true;
      amountLamports: number;
      creditsGranted: number;
    }
  | {
      success: false;
      reason:
        | "already_used"
        | "not_found"
        | "not_confirmed"
        | "wrong_destination"
        | "insufficient_amount"
        | "sender_mismatch";
    };

export async function verifyPayment(
  connection: Connection,
  txSignature: string,
  claimedWalletAddress: string
): Promise<VerifyResult> {
  // 1. Reject if this signature has already been redeemed.
  const existing = db
    .prepare("SELECT tx_signature FROM transactions WHERE tx_signature = ?")
    .get(txSignature);

  if (existing) {
    return { success: false, reason: "already_used" };
  }

  // 2. Fetch the transaction from Solana.
  const tx = await connection.getTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    return { success: false, reason: "not_found" };
  }

  // 3. Check it didn't fail on-chain.
  if (tx.meta?.err) {
    return { success: false, reason: "not_confirmed" };
  }

  // 4. Extract balance changes to figure out who sent what to whom.
  // accountKeys tells us the order of accounts involved; preBalances/
  // postBalances are parallel arrays of lamport balances before/after.
  const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];

  const treasuryIndex = accountKeys.findIndex((key) =>
    key.equals(TREASURY_WALLET)
  );

  if (treasuryIndex === -1) {
    // Treasury wallet isn't even part of this transaction.
    return { success: false, reason: "wrong_destination" };
  }

  const treasuryDelta =
    postBalances[treasuryIndex] - preBalances[treasuryIndex];

  // 5. Destination check: treasury balance must have increased.
  if (treasuryDelta <= 0) {
    return { success: false, reason: "wrong_destination" };
  }

  // 6. Amount check: must cover at least one credit's price.
  if (treasuryDelta < CREDIT_PRICE_LAMPORTS) {
    return { success: false, reason: "insufficient_amount" };
  }

  // 7. Sender check: confirm the claimed wallet is the one whose balance
  // actually decreased (i.e. they were the payer), not just any signer.
  const claimedPubkey = new PublicKey(claimedWalletAddress);
  const senderIndex = accountKeys.findIndex((key) =>
    key.equals(claimedPubkey)
  );

  if (senderIndex === -1) {
    return { success: false, reason: "sender_mismatch" };
  }

  const senderDelta = postBalances[senderIndex] - preBalances[senderIndex];

  // Sender's balance should have gone down (allowing for fees, so just
  // check it's negative, not an exact match).
  if (senderDelta >= 0) {
    return { success: false, reason: "sender_mismatch" };
  }

  // 8. All checks passed — compute how many credits this payment buys.
  const creditsGranted = Math.floor(treasuryDelta / CREDIT_PRICE_LAMPORTS);

  return {
    success: true,
    amountLamports: treasuryDelta,
    creditsGranted,
  };
}