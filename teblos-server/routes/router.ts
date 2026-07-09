import express, { Router } from "express"
import healthStatus from "../controllers/health.ts";
import { pay } from "./pay.ts";
import { balance } from "./balance.ts";
import { signal } from "./signal.ts";
import creditGate from "../middleware/creditGate.ts";


const router:Router = express.Router();



router.get("/api/v1/health",healthStatus)
router.post("/pay",pay)
router.get("/balance/:address", balance);
router.get("/signal/:address", creditGate, signal);

export default router