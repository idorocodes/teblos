/**
 * db/index.ts
 *
 * Shared Postgres connection pool for Teblos, using Neon.
 * Import `pool` anywhere you need to run a query.
 */

import { Pool } from "pg";
import  dotenv from "dotenv" 

dotenv.config()
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env " +
      "(and to Render's environment variables for the deployed service)."
  );
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});