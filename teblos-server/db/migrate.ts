 /**
 * db/migrate.ts
 *
 * Run once (and safely re-runnable) to create Teblos's SQLite tables.
 * Run with: node db/migrate.ts
 *
 * Uses Node's built-in node:sqlite — requires Node 22.5+ (24.x is fine).
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { db } from "./index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const schemaPath = path.resolve(__dirname, "./schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  console.log("Applying schema from", schemaPath);
  db.exec(schema);
  console.log("Migration complete. Tables ready.");

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log("Current tables:", tables.map((t: any) => t.name).join(", "));
}

main();