/**
 * payments/credits.ts
 *
 * Writes verified payments to the database and manages credit balances.
 * This is the ONLY module that should ever mutate credits/transactions —
 * keeping all balance changes here makes it easy to reason about where
 * bugs could live if a balance ever looks wrong.
 *
 * grantCredits() is called after verify.ts confirms a payment is real.
 * deductCredit() is called by creditGate.ts when a paid request is served.
 */

import { db } from "../db/index.ts";
import type { VerifyResult } from "./verify";

export type GrantResult =
  | { success: true; newBalance: number }
  | { success: false; reason: "already_used" };

/**
 * Records a verified payment and credits the wallet's balance.
 * Wrapped in a DB transaction so a crash mid-write can never leave the
 * transactions ledger and the credits balance out of sync with each other.
 */
export function grantCredits(
  walletAddress: string,
  txSignature: string,
  verifyResult: Extract<VerifyResult, { success: true }>
): GrantResult {
  db.exec("BEGIN");

  try {
    // Ensure the wallet has a users row (needed for the foreign keys below).
    db.prepare(
      "INSERT OR IGNORE INTO users (wallet_address) VALUES (?)"
    ).run(walletAddress);

    // Record the payment. tx_signature is the primary key, so this throws
    // if the signature was already recorded — that's our replay protection.
    db.prepare(
      `INSERT INTO transactions (tx_signature, wallet_address, amount_lamports, credits_granted)
       VALUES (?, ?, ?, ?)`
    ).run(
      txSignature,
      walletAddress,
      verifyResult.amountLamports,
      verifyResult.creditsGranted
    );

    // Ensure a credits row exists, then bump the balance.
    db.prepare(
      "INSERT OR IGNORE INTO credits (wallet_address, balance) VALUES (?, 0)"
    ).run(walletAddress);

    db.prepare(
      `UPDATE credits
       SET balance = balance + ?, updated_at = datetime('now')
       WHERE wallet_address = ?`
    ).run(verifyResult.creditsGranted, walletAddress);

    const row = db
      .prepare("SELECT balance FROM credits WHERE wallet_address = ?")
      .get(walletAddress) as { balance: number };

    db.exec("COMMIT");

    return { success: true, newBalance: row.balance };
  } catch (err: any) {
    db.exec("ROLLBACK");

    // SQLite's constraint violation error message contains this text when
    // a duplicate primary key insert is attempted.
    if (
      typeof err?.message === "string" &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return { success: false, reason: "already_used" };
    }

    // Any other error is unexpected — rethrow so it surfaces properly
    // rather than being silently swallowed as "already_used".
    throw err;
  }
}

/**
 * Returns the current credit balance for a wallet. Returns 0 if the
 * wallet has never been credited (not an error — just a fresh wallet).
 */
export function getBalance(walletAddress: string): number {
  const row = db
    .prepare("SELECT balance FROM credits WHERE wallet_address = ?")
    .get(walletAddress) as { balance: number } | undefined;

  return row?.balance ?? 0;
}

export type DeductResult =
  | { success: true; newBalance: number }
  | { success: false; reason: "insufficient_balance" };

/**
 * Deducts one credit for a single gated API call. Used by creditGate.ts.
 * Checks balance and decrements atomically so two simultaneous requests
 * can't both succeed off the same last credit.
 */
export function deductCredit(
  walletAddress: string,
  endpoint: string
): DeductResult {
  db.exec("BEGIN");

  try {
    const row = db
      .prepare("SELECT balance FROM credits WHERE wallet_address = ?")
      .get(walletAddress) as { balance: number } | undefined;

    const currentBalance = row?.balance ?? 0;

    if (currentBalance < 1) {
      db.exec("ROLLBACK");
      return { success: false, reason: "insufficient_balance" };
    }

    db.prepare(
      `UPDATE credits
       SET balance = balance - 1, updated_at = datetime('now')
       WHERE wallet_address = ?`
    ).run(walletAddress);

    db.prepare(
      "INSERT INTO credit_usage (wallet_address, endpoint) VALUES (?, ?)"
    ).run(walletAddress, endpoint);

    db.exec("COMMIT");

    return { success: true, newBalance: currentBalance - 1 };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}