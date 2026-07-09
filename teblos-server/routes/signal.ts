import type { Request, Response } from "express";

/**
 * GET /signal/:address
 * Gated behind creditGate middleware — only reachable if the wallet
 * has a credit, which creditGate already deducted before this runs.
 *
 * STUB: returns a hardcoded fake signal. Replace the body of this
 * handler with real TxLINE-based detection logic once ingestion and
 * the detection engine are built. Keeping this stub lets the whole
 * pay -> gate -> access chain be demoed/tested right now.
 */
export function signal(req: Request, res: Response) {
  const remainingBalance = (req as any).creditBalance;

  return res.status(200).json({
    code: 200,
    success: true,
    signal: {
      type: "odds_swing",
      fixtureId: 18209181,
      match: "France vs Morocco",
      description: "Win-odds shifted 9% following a 61st-minute substitution.",
      detectedAt: new Date().toISOString(),
    },
    remainingBalance,
  });
}