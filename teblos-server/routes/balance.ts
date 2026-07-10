import type { Request, Response } from "express";
import { getBalance } from "../payment/credits.ts";

export async function balance(req: Request, res: Response) {
  const walletAddress = req.params.address;

  if (!walletAddress) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Wallet address is required.",
    });
  }

  const currentBalance = await getBalance(walletAddress as string);

  return res.status(200).json({
    code: 200,
    success: true,
    walletAddress,
    balance: currentBalance,
  });
}