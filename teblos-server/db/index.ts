/**
 * db/index.ts
 *
 * Single shared SQLite connection for Teblos, using Node's BUILT-IN
 * node:sqlite module. No native compilation, no Visual Studio, no
 * node-gyp — this ships inside Node itself (stable in recent Node 22/24).
 */

import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "../teblos.db");

export const db = new DatabaseSync(DB_PATH);

// Foreign key constraints are off by default in SQLite unless enabled.
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");