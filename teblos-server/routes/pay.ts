import type { Request, Response } from "express";
import { Connection } from "@solana/web3.js";
import { verifyPayment } from "../payment/verify.ts";
import { grantCredits } from "../payment/credits.ts";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

export async function pay(req: Request, res: Response) {
  const { txSignature, walletAddress } = req.body ?? {};

  if (!txSignature || typeof txSignature !== "string") {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "txSignature is required.",
    });
  }

  if (!walletAddress || typeof walletAddress !== "string") {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "walletAddress is required.",
    });
  }

  let verifyResult;
  try {
    verifyResult = await verifyPayment(connection, txSignature, walletAddress);
  } catch (err) {
    console.error("verifyPayment threw an unexpected error:", err);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Failed to verify transaction. Try again shortly.",
    });
  }

  if (!verifyResult.success) {
    const statusByReason: Record<string, number> = {
      already_used: 409,
      not_found: 404,
      not_confirmed: 402,
      wrong_destination: 402,
      insufficient_amount: 402,
      sender_mismatch: 403,
    };

    return res.status(statusByReason[verifyResult.reason] ?? 402).json({
      code: statusByReason[verifyResult.reason] ?? 402,
      success: false,
      message: `Payment verification failed: ${verifyResult.reason}`,
    });
  }

  let grantResult;
  try {
    grantResult = await grantCredits(walletAddress, txSignature, verifyResult);
  } catch (err) {
    console.error("grantCredits threw an unexpected error:", err);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Payment was verified but crediting failed. Contact support.",
    });
  }

  if (!grantResult.success) {
    return res.status(409).json({
      code: 409,
      success: false,
      message: "This payment has already been redeemed.",
    });
  }

  return res.status(200).json({
    code: 200,
    success: true,
    creditsGranted: verifyResult.creditsGranted,
    newBalance: grantResult.newBalance,
  });
}