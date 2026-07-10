import type { Request, Response, NextFunction } from "express";
import { deductCredit, getBalance } from "../payment/credits.ts";

const creditGate = async (req: Request, res: Response, next: NextFunction) => {
  const walletAddress: string = req.params.address as string;

  if (!walletAddress) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Wallet address is required.",
    });
  }

  const walletBalance = await getBalance(walletAddress);

  if (walletBalance < 1) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: "You have not made payment!",
    });
  }

  const deductResult = await deductCredit(walletAddress, req.originalUrl);

  if (!deductResult.success) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: "Insufficient balance.",
    });
  }

  (req as any).creditBalance = deductResult.newBalance;

  next();
};

export default creditGate;