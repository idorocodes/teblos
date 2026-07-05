import {  Home, Radio } from "lucide-react";

const theme = {
  bgDeep: "#071410",
  bgPanel: "#0E2620",
  bgCard: "#0C2019",
  gold: "#F4B942",
  lime: "#B6FF3C",
  chalk: "#F5F2E8",
  ash: "#8FA79C",
  line: "rgba(245,242,232,0.08)",
};

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
  `}</style>
);

export default function Error404() {
  return (
    <div className="teblos-root flex items-center justify-center px-6 py-20">
      <GlobalStyle />

      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            
            <span className="font-display text-4xl font-bold tracking-tighter">TEBLOS</span>
          </div>
        </div>

        {/* 404 Number */}
        <div className="font-display text-[180px] md:text-[220px] font-black leading-none mb-6 tracking-tighter opacity-90"
             style={{ color: theme.gold }}>
          404
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">
          Signal Lost
        </h1>

        <p className="text-xl md:text-2xl mb-10 max-w-md mx-auto" style={{ color: theme.ash }}>
          The match moment you're looking for doesn't exist or has moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 active:scale-95"
            style={{ background: theme.gold, color: theme.bgDeep }}
          >
            <Home size={22} />
            Return to Home
          </a>

          <a
            href="/signals"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-medium text-lg border transition-all hover:bg-white/5"
            style={{ borderColor: theme.line, color: theme.chalk }}
          >
            <Radio size={22} />
            Browse Live Signals
          </a>
        </div>

        <div className="mt-16 text-sm font-mono flex items-center justify-center gap-2" style={{ color: theme.ash }}>
          <span>Still lost?</span>
          <a href="/docs" className="hover:text-white underline">Check the Docs</a>
          <span>or</span>
          <a href="#" className="hover:text-white underline">Contact Support</a>
        </div>

        {/* Decorative Element */}
        <div className="mt-20 opacity-30">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest" style={{ color: theme.ash }}>
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            TXLINE LIVE FEED • SOLANA SETTLED
          </div>
        </div>
      </div>
    </div>
  );
}