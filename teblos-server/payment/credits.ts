/**
 * payments/credits.ts
 *
 * Writes verified payments to the database and manages credit balances.
 * NOTE: now async throughout (Postgres via `pg`, not synchronous
 * node:sqlite). Transactions use a single checked-out client from the
 * pool so BEGIN/COMMIT/ROLLBACK apply to the same connection.
 */

import { pool } from "../db/index.ts";
import type { VerifyResult } from "./verify.ts";

export type GrantResult =
  | { success: true; newBalance: number }
  | { success: false; reason: "already_used" };

export async function grantCredits(
  walletAddress: string,
  txSignature: string,
  verifyResult: Extract<VerifyResult, { success: true }>
): Promise<GrantResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT DO NOTHING",
      [walletAddress]
    );

    // tx_signature is the primary key — a duplicate insert throws,
    // which is our replay protection.
    await client.query(
      `INSERT INTO transactions (tx_signature, wallet_address, amount_lamports, credits_granted)
       VALUES ($1, $2, $3, $4)`,
      [
        txSignature,
        walletAddress,
        verifyResult.amountLamports,
        verifyResult.creditsGranted,
      ]
    );

    await client.query(
      "INSERT INTO credits (wallet_address, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING",
      [walletAddress]
    );

    const updateResult = await client.query(
      `UPDATE credits
       SET balance = balance + $1, updated_at = now()
       WHERE wallet_address = $2
       RETURNING balance`,
      [verifyResult.creditsGranted, walletAddress]
    );

    await client.query("COMMIT");

    return { success: true, newBalance: updateResult.rows[0].balance };
  } catch (err: any) {
    await client.query("ROLLBACK");

    // Postgres unique_violation error code.
    if (err?.code === "23505") {
      return { success: false, reason: "already_used" };
    }

    throw err;
  } finally {
    client.release();
  }
}

export async function getBalance(walletAddress: string): Promise<number> {
  const result = await pool.query(
    "SELECT balance FROM credits WHERE wallet_address = $1",
    [walletAddress]
  );

  return result.rows[0]?.balance ?? 0;
}

export type DeductResult =
  | { success: true; newBalance: number }
  | { success: false; reason: "insufficient_balance" };

export async function deductCredit(
  walletAddress: string,
  endpoint: string
): Promise<DeductResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the row to prevent two concurrent requests from both reading
    // the same balance and both succeeding off the last credit.
    const balanceResult = await client.query(
      "SELECT balance FROM credits WHERE wallet_address = $1 FOR UPDATE",
      [walletAddress]
    );

    const currentBalance = balanceResult.rows[0]?.balance ?? 0;

    if (currentBalance < 1) {
      await client.query("ROLLBACK");
      return { success: false, reason: "insufficient_balance" };
    }

    const updateResult = await client.query(
      `UPDATE credits
       SET balance = balance - 1, updated_at = now()
       WHERE wallet_address = $1
       RETURNING balance`,
      [walletAddress]
    );

    await client.query(
      "INSERT INTO credit_usage (wallet_address, endpoint) VALUES ($1, $2)",
      [walletAddress, endpoint]
    );

    await client.query("COMMIT");

    return { success: true, newBalance: updateResult.rows[0].balance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}