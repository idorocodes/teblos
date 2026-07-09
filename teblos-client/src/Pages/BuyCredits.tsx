import { useState } from "react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { AppKitButton } from "@reown/appkit/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { Wallet, Zap, ShieldCheck, Loader2 } from "lucide-react";

const theme = {
  bgDeep: "#071410",
  bgPanel: "#0E2620",
  bgCard: "#0C2019",
  gold: "#F4B942",
  goldDim: "#B98F35",
  lime: "#B6FF3C",
  chalk: "#F5F2E8",
  ash: "#8FA79C",
  line: "rgba(245,242,232,0.08)",
};

// Must match payment/verify.ts CREDIT_PRICE_LAMPORTS on the backend.
const CREDIT_PRICE_LAMPORTS = 1_000_000; // 0.001 SOL per credit
const LAMPORTS_PER_SOL = 1_000_000_000;

const TREASURY_WALLET = "3aqHiBkVSGtyK4NEPmkbENo1NY4H8TgCNHnuzgTKdxfH";

// Point this at wherever your Express server actually runs.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const CREDIT_OPTIONS = [1,3, 5,7, 10,15, 17,19,21,25];

type PayState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "verifying" }
  | { status: "success"; newBalance: number; creditsGranted: number }
  | { status: "error"; message: string };

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .teblos-root {
      background: ${theme.bgDeep};
      color: ${theme.chalk};
      font-family: 'IBM Plex Sans', sans-serif;
      min-height: 100vh;
    }
    .font-display {
      font-family: 'Big Shoulders Display', sans-serif;
      letter-spacing: 0.01em;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    @keyframes teblos-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .teblos-spin {
      animation: teblos-spin 1s linear infinite;
    }
  `}</style>
);

function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ borderColor: theme.line, background: theme.bgDeep }}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tighter">
            TEBLOS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AppKitButton />
        </div>
      </nav>
    </header>
  );
}

export default function BuyCredits() {
  const { isConnected, address } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  const [selectedCredits, setSelectedCredits] = useState(5);
  const [payState, setPayState] = useState<PayState>({ status: "idle" });

  const totalLamports = selectedCredits * CREDIT_PRICE_LAMPORTS;
  const totalSol = totalLamports / LAMPORTS_PER_SOL;

  async function handleBuyCredits() {
    if (!isConnected || !address || !connection) {
      setPayState({ status: "error", message: "Connect your wallet first." });
      return;
    }

    try {
      setPayState({ status: "sending" });

      const senderPubkey = new PublicKey(address);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const latestBlockhash = await connection.getLatestBlockhash();

      const transaction = new Transaction({
        feePayer: senderPubkey,
        recentBlockhash: latestBlockhash.blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: treasuryPubkey,
          lamports: totalLamports,
        })
      );

      // This raises the wallet's signing modal (Phantom, etc).
      const txSignature = await walletProvider.sendTransaction(
        transaction,
        connection
      );

      setPayState({ status: "verifying" });

      const response = await fetch(`${API_BASE_URL}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature, walletAddress: address }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPayState({
          status: "error",
          message: data.message || "Payment could not be verified.",
        });
        return;
      }

      setPayState({
        status: "success",
        newBalance: data.newBalance,
        creditsGranted: data.creditsGranted,
      });
    } catch (err: any) {
      setPayState({
        status: "error",
        message: err?.message || "Something went wrong sending the payment.",
      });
    }
  }

  const isBusy = payState.status === "sending" || payState.status === "verifying";

  return (
    <div className="teblos-root">
      <GlobalStyle />
      <Navbar />

      <section className="max-w-2xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h1 className="font-display text-5xl font-bold mb-4">
            Buy Signal Credits
          </h1>
          <p className="text-lg" style={{ color: theme.ash }}>
            Pay once, use credits whenever a signal call matters.
          </p>
        </div>

        <div
          className="rounded-3xl p-10 border"
          style={{ background: theme.bgCard, borderColor: theme.line }}
        >
          <div className="mb-8">
            <label
              className="font-mono text-sm uppercase tracking-widest mb-4 block"
              style={{ color: theme.ash }}
            >
              Select credits
            </label>
            <div className="grid grid-cols-4 gap-3">
              {CREDIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedCredits(n)}
                  disabled={isBusy}
                  className="rounded-2xl py-4 font-display text-2xl font-bold border transition-all"
                  style={{
                    background:
                      selectedCredits === n ? theme.gold : theme.bgPanel,
                    color: selectedCredits === n ? theme.bgDeep : theme.chalk,
                    borderColor:
                      selectedCredits === n ? theme.gold : theme.line,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-6 mb-8 flex items-center justify-between"
            style={{ background: theme.bgPanel }}
          >
            <div className="flex items-center gap-3">
              <Zap size={22} color={theme.lime} />
              <span style={{ color: theme.ash }}>Total</span>
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: theme.gold }}>
              {totalSol} SOL
            </div>
          </div>

          {!isConnected ? (
            <div
              className="flex items-center justify-center gap-3 py-5 rounded-2xl font-semibold"
              style={{ background: theme.bgPanel, color: theme.ash }}
            >
              <Wallet size={20} />
              Connect your wallet to continue
            </div>
          ) : (
            <button
              onClick={handleBuyCredits}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-3 text-lg font-semibold px-10 py-5 rounded-2xl transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: theme.gold, color: theme.bgDeep }}
            >
              {isBusy && <Loader2 className="teblos-spin" size={22} />}
              {payState.status === "sending" && "Confirm in wallet..."}
              {payState.status === "verifying" && "Verifying payment..."}
              {(payState.status === "idle" ||
                payState.status === "success" ||
                payState.status === "error") &&
                `Pay ${totalSol} SOL for ${selectedCredits} credit${selectedCredits > 1 ? "s" : ""}`}
            </button>
          )}

          {payState.status === "success" && (
            <div
              className="mt-6 rounded-2xl p-6 flex items-start gap-3"
              style={{ background: theme.bgPanel }}
            >
              <ShieldCheck size={24} color={theme.lime} />
              <div>
                <p className="font-semibold mb-1">Payment verified!</p>
                <p style={{ color: theme.ash }}>
                  {payState.creditsGranted} credit(s) added. Your balance is
                  now{" "}
                  <span className="font-mono" style={{ color: theme.gold }}>
                    {payState.newBalance}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {payState.status === "error" && (
            <div
              className="mt-6 rounded-2xl p-6"
              style={{ background: theme.bgPanel, color: theme.ash }}
            >
              <p className="font-semibold mb-1" style={{ color: theme.chalk }}>
                Payment failed
              </p>
              <p>{payState.message}</p>
            </div>
          )}
        </div>

        <p className="font-mono text-xs text-center mt-8" style={{ color: theme.ash }}>
          Payments are verified on-chain against devnet. No refunds on
          unconfirmed transactions.
        </p>
      </section>
    </div>
  );
}