 /**
 * payments/verify.ts
 *
 * Verifies that a Solana transaction signature represents a real,
 * confirmed payment to Teblos's treasury wallet, for at least the
 * expected amount, and hasn't already been redeemed for credits.
 *
 * NOTE: now async throughout, since Postgres queries are async
 * (unlike the previous node:sqlite version, which was synchronous).
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { pool } from "../db/index.ts";

export const TREASURY_WALLET = new PublicKey(
  "3aqHiBkVSGtyK4NEPmkbENo1NY4H8TgCNHnuzgTKdxfH"
);

export const CREDIT_PRICE_LAMPORTS = 1_000_000; // 0.001 SOL per credit

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
  const existing = await pool.query(
    "SELECT tx_signature FROM transactions WHERE tx_signature = $1",
    [txSignature]
  );

  if (existing.rows.length > 0) {
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

  // 4. Extract balance changes.
  const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];

  const treasuryIndex = accountKeys.findIndex((key) =>
    key.equals(TREASURY_WALLET)
  );

  if (treasuryIndex === -1) {
    return { success: false, reason: "wrong_destination" };
  }

  const treasuryDelta =
    postBalances[treasuryIndex] - preBalances[treasuryIndex];

  // 5. Destination check.
  if (treasuryDelta <= 0) {
    return { success: false, reason: "wrong_destination" };
  }

  // 6. Amount check.
  if (treasuryDelta < CREDIT_PRICE_LAMPORTS) {
    return { success: false, reason: "insufficient_amount" };
  }

  // 7. Sender check.
  const claimedPubkey = new PublicKey(claimedWalletAddress);
  const senderIndex = accountKeys.findIndex((key) =>
    key.equals(claimedPubkey)
  );

  if (senderIndex === -1) {
    return { success: false, reason: "sender_mismatch" };
  }

  const senderDelta = postBalances[senderIndex] - preBalances[senderIndex];

  if (senderDelta >= 0) {
    return { success: false, reason: "sender_mismatch" };
  }

  // 8. All checks passed.
  const creditsGranted = Math.floor(treasuryDelta / CREDIT_PRICE_LAMPORTS);

  return {
    success: true,
    amountLamports: treasuryDelta,
    creditsGranted,
  };
}