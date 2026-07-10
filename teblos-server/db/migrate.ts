/**
 * db/migrate.ts
 *
 * Run once (and safely re-runnable) to create Teblos's Postgres tables
 * on Neon. Run with: node db/migrate.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { pool } from "./index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const schemaPath = path.resolve(__dirname, "./schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  console.log("Applying schema from", schemaPath);
  await pool.query(schema);
  console.log("Migration complete. Tables ready.");

  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log("Current tables:", result.rows.map((r) => r.table_name).join(", "));

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});