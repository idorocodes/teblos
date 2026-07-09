/**
 * scripts/setup-txline.ts
 *
 * One-time TxLINE devnet setup for Teblos.
 * Run once with: npx ts-node scripts/setup-txline.ts
 *
 * What this does:
 * 1. Loads (or creates) a local devnet keypair
 * 2. Airdrops devnet SOL for gas (skip if you're using the web faucet manually)
 * 3. Subscribes to TxLINE's free World Cup tier on-chain
 * 4. Activates API access (guest JWT + signed message)
 * 5. Appends TXLINE_JWT and TXLINE_API_TOKEN to your .env file
 *
 * PREREQUISITE: You need TxLINE's devnet IDL + types before this will compile.
 * Get them from TxLINE's "IDL & Types (Devnet)" docs page and place at:
 *   - ./idl/txoracle.json
 *   - ./types/txoracle.ts
 */

import * as anchor from "@coral-xyz/anchor";
import type { Txoracle } from "../types/txoracle";
import txoracleIdl from "../idl/txoracle.json" with { type: "json" };
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NETWORK: "mainnet" | "devnet" = "devnet";

const CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com", // swap to your Helius devnet URL if you have one
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
const apiBaseUrl = `${apiOrigin}/api`;

const KEYPAIR_PATH = path.resolve(__dirname, "../keypair.json");
const ENV_PATH = path.resolve(__dirname, "../.env");

// Free tier: service level 1 = World Cup & Int Friendlies, 60-second delay
const SERVICE_LEVEL_ID = 1;
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = []; // empty = standard bundle

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadOrCreateKeypair(): Keypair {
  if (fs.existsSync(KEYPAIR_PATH)) {
    const secret = Uint8Array.from(
      JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"))
    );
    console.log("Loaded existing keypair from", KEYPAIR_PATH);
    return Keypair.fromSecretKey(secret);
  }

  const kp = Keypair.generate();
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)));
  console.log("Generated new keypair, saved to", KEYPAIR_PATH);
  return kp;
}

async function ensureFunded(connection: Connection, pubkey: PublicKey) {
  const balance = await connection.getBalance(pubkey);
  console.log("Current balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance > 0) {
    console.log("Wallet already funded, skipping airdrop.");
    return;
  }

  console.log("Requesting devnet airdrop...");
  try {
    const sig = await connection.requestAirdrop(pubkey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop confirmed:", sig);
  } catch (err) {
    console.error(
      "Airdrop failed — this is common on the public devnet faucet.\n" +
        "Fund this pubkey manually instead, then re-run this script:\n" +
        pubkey.toBase58() +
        "\n\nOptions:\n" +
        "  - https://faucet.solana.com\n" +
        "  - `solana airdrop 1 " +
        pubkey.toBase58() +
        " --url https://api.devnet.solana.com`\n" +
        "  - A Helius devnet RPC key/faucet\n"
    );
    throw err;
  }
}

function appendToEnv(vars: Record<string, string>) {
  let existing = "";
  if (fs.existsSync(ENV_PATH)) {
    existing = fs.readFileSync(ENV_PATH, "utf-8");
  }

  const lines = existing.split("\n").filter(Boolean);
  const keys = Object.keys(vars);

  // Remove any existing lines for the keys we're about to set
  const filtered = lines.filter(
    (line) => !keys.some((k) => line.startsWith(`${k}=`))
  );

  for (const key of keys) {
    filtered.push(`${key}=${vars[key]}`);
  }

  fs.writeFileSync(ENV_PATH, filtered.join("\n") + "\n");
  console.log("Updated", ENV_PATH, "with:", keys.join(", "));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Keypair + connection + provider
  const keypair = loadOrCreateKeypair();
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("Using pubkey:", keypair.publicKey.toBase58());
  console.log("Network:", NETWORK, "| RPC:", rpcUrl);

  await ensureFunded(connection, keypair.publicKey);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program<Txoracle>(
    txoracleIdl as Txoracle,
    provider
  );

  if (!program.programId.equals(programId)) {
    throw new Error(
      `Loaded IDL program ${program.programId.toBase58()} does not match ${NETWORK} program ${programId.toBase58()}`
    );
  }

  // 2. Subscribe on-chain (free tier)
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // The program expects userTokenAccount to already exist on-chain, even
  // though the free tier needs no token balance. Create it idempotently
  // (no-op if it already exists) before calling subscribe.
  console.log("Ensuring user token account exists...");
  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    provider.wallet.publicKey, // payer
    userTokenAccount,          // ata address
    provider.wallet.publicKey, // owner
    txlTokenMint,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const ataTx = new anchor.web3.Transaction().add(createAtaIx);
  const ataTxSig = await provider.sendAndConfirm(ataTx);
  console.log("User token account ready:", ataTxSig);

  console.log("Subscribing to TxLINE free tier...");
  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: provider.wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Subscription transaction:", txSig);

  // 3. Activate API access
  console.log("Requesting guest JWT...");
  const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
  const jwt = authResponse.data.token;

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);

  async function signActivationMessage(msg: Uint8Array): Promise<Uint8Array> {
    const localPayer = (provider.wallet as anchor.Wallet).payer;
    if (localPayer) {
      return nacl.sign.detached(msg, localPayer.secretKey);
    }
    throw new Error("No local payer keypair available to sign with.");
  }

  const signatureBytes = await signActivationMessage(message);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  console.log("Activating API token...");
  const activationResponse = await axios.post(
    `${apiBaseUrl}/token/activate`,
    {
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    },
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  const apiToken = activationResponse.data.token || activationResponse.data;
  console.log("API token activated successfully.");

  // 4. Persist to .env
  appendToEnv({
    TXLINE_JWT: jwt,
    TXLINE_API_TOKEN:
      typeof apiToken === "string" ? apiToken : JSON.stringify(apiToken),
    TXLINE_NETWORK: NETWORK,
  });

  console.log("\nDone. TxLINE setup complete for Teblos.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});