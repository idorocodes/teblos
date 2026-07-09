 import type { Request, Response, NextFunction } from "express";
import { deductCredit, getBalance } from "../payment/credits";

const creditGate = (req: Request, res: Response, next: NextFunction) => {
  const walletAddress: string = req.params.address as string;

  if (!walletAddress) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Wallet address is required.",
    });
  }

  const walletBalance = getBalance(walletAddress);

  if (walletBalance < 1) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: "You have not made payment!",
    });
  }

  // Balance is sufficient — actually deduct the credit before letting
  // the request through. req.originalUrl gives us the endpoint for
  // the credit_usage log.
  const deductResult = deductCredit(walletAddress, req.originalUrl);

  if (!deductResult.success) {
    // Rare race condition: balance was >=1 above but got spent by a
    // concurrent request before this deduction ran.
    return res.status(403).json({
      code: 403,
      success: false,
      message: "Insufficient balance.",
    });
  }

  // Attach the remaining balance to the request in case the route
  // handler wants to include it in its response.
  (req as any).creditBalance = deductResult.newBalance;

  next();
};

export default creditGate;