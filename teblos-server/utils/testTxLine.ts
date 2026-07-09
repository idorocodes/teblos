
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const jwt = process.env.TXLINE_JWT;
const apiToken = process.env.TXLINE_API_TOKEN;
const network = process.env.TXLINE_NETWORK || "devnet";

if (!jwt || !apiToken) {
  console.error(
    "Missing TXLINE_JWT or TXLINE_API_TOKEN in .env — run utils/setUp.ts first."
  );
  process.exit(1);
}

const baseURL =
  network === "mainnet"
    ? "https://txline.txodds.com"
    : "https://txline-dev.txodds.com";

const httpClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
  },
  baseURL,
});

async function main() {
  console.log("Testing TxLINE API on:", baseURL);

  const allFixturesResponse = await httpClient.get("/api/fixtures/snapshot");
  const allFixtures = allFixturesResponse.data;

  console.log(`Retrieved ${allFixtures.length} total fixtures`);

  allFixtures.slice(0, 5).forEach((fixture: any, index: number) => {
    const homeTeam = fixture.Participant1IsHome
      ? fixture.Participant1
      : fixture.Participant2;
    const awayTeam = fixture.Participant1IsHome
      ? fixture.Participant2
      : fixture.Participant1;

    console.log(
      `${index + 1}. ${homeTeam} vs ${awayTeam} | FixtureId: ${fixture.FixtureId} | Start: ${new Date(
        fixture.StartTime
      ).toISOString()}`
    );
  });
}

main().catch((err) => {
  if (err.response) {
    console.error(
      "TxLINE API error:",
      err.response.status,
      err.response.data
    );
  } else {
    console.error("Request failed:", err.message);
  }
  process.exit(1);
});