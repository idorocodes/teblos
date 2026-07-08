import express from "express"
import healthStatus from "../controllers/Health.ts";
import error404 from "../middleware/error404.ts";

const router = express.Router();



router.get("/api/v1/health",healthStatus)

 

export default router