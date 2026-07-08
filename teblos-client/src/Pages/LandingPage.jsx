 import {
  Zap,
  Activity,
  Target,
  Wallet,
  ShieldCheck,
 
  BookOpen,
} from "lucide-react";

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
import { AppKitButton } from '@reown/appkit/react'
import { useAppKitAccount } from '@reown/appkit/react'




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

    @keyframes teblos-ticker-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }

    @keyframes teblos-pulse {
      0% { transform: scale(0.9); opacity: 0.9; }
      70% { transform: scale(1.9); opacity: 0; }
      100% { transform: scale(1.9); opacity: 0; }
    }

    @keyframes teblos-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .teblos-ticker-track {
      animation: teblos-ticker-scroll 35s linear infinite;
    }

    .teblos-blip::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 9999px;
      background: currentColor;
      animation: teblos-pulse 2.6s ease-out infinite;
    }

    .teblos-fade-up {
      animation: teblos-fade-up 0.8s ease-out both;
    }

    @media (prefers-reduced-motion: reduce) {
      .teblos-ticker-track,
      .teblos-blip::before,
      .teblos-fade-up {
        animation: none !important;
      }
    }
  `}</style>
);

/* Navbar */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b" style={{ borderColor: theme.line, background: theme.bgDeep }}>
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          
          <span className="font-display text-2xl font-bold tracking-tighter">TEBLOS</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: theme.ash }}>
          <a href="#signals" className="hover:text-white transition-colors">Signals</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
        
          <a> < AppKitButton/> </a>
        </div>
      </nav>
    </header>
  );
}

/* Hero Section */
function Hero() {

   const { isConnected } = useAppKitAccount()
 
  return (
    <section className="max-w-6xl mx-auto px-6 pt-26 pb-20 flex flex-col items-center text-center" data-aos="fade-up">
 
      <div className="teblos-fade-up" >
    
 
        <h1 className="font-display text-4xl lg:text-7xl md:text-7xl font-extrabold leading-[1.05] mb-8 max-w-4xl">
          Every match moment{" "}
          <span style={{ color: theme.gold }}>worth acting on</span>, delivered instantly.
        </h1>

        <p className="text-1xl lg:text-2xl max-w-2xl mx-auto mb-10" style={{ color: theme.ash }}>
          Teblos watches live football matches in real time, detects meaningful shifts in odds and momentum, 
          and delivers clear signals on demand — paid per call in stablecoin on Solana.
        </p>

       
            <div
          href="#"
          className="inline-flex items-center gap-3 text-lg font-semibold px-10 py-5 rounded-2xl transition-all hover:scale-105"
          style={{ background: theme.gold, color: theme.bgDeep }}
        >
          {isConnected ? <p>Navigating </p>:<p onClick={<AppKitButton/>} className="flex gap-6 hover:cursor-pointer"> <Wallet/> Connect Wallet to Continue</p>}
        </div>
           
          

        <p className="font-mono text-sm mt-10" style={{ color: theme.ash }}>
          No subscription • No dashboard • Pay only when it matters
        </p>
      </div>
    </section>
  );
}

/* Live Signal Ticker */
function SignalTicker() {
  const items = [
    "⚡ ARG win-odds +12% • 34' • substitution",
    "🔴 Red card • FRA vs MAR • momentum shift at 51'",
    "🥅 Goal prob jump • BRA vs ENG • corner sequence 67'",
    "📉 Odds swing • NGA vs POR • -8.4% at 40'",
    "⚡ Injury impact • JPN vs KOR • big move at 22'",
  ];
  const track = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-y py-4" style={{ borderColor: theme.line, background: theme.bgPanel }}>
      <div className="teblos-ticker-track flex items-center gap-12 whitespace-nowrap text-sm font-mono" style={{ color: theme.ash }}>
        {track.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}

/* How It Works */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Ingest Live Data",
      body: "Continuous stream from TxLINE (TxODDS) covering scores, odds, cards, and substitutions across all matches.",
      icon: Activity,
    },
    {
      n: "02",
      title: "Detect Signals",
      body: "Rules-based engine identifies meaningful events — odds swings, momentum shifts, and goal probability changes.",
      icon: Target,
    },
    {
      n: "03",
      title: "Pay & Receive",
      body: "Call the endpoint, pay micro-fee in USDC on Solana, and receive a clear, actionable explanation instantly.",
      icon: Wallet,
    },
  ];

  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-24 teblos-fade-up"  >  
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl font-bold mb-3">How Teblos Works</h2>
        <p className="text-lg" style={{ color: theme.ash }}>Three simple steps. No infrastructure required.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div
            key={step.n}
            className="rounded-3xl p-8 border h-full flex flex-col"
            style={{ background: theme.bgCard, borderColor: theme.line }}
          >
            <div className="flex justify-between items-start mb-8">
              <span className="font-mono text-2xl font-bold" style={{ color: theme.goldDim }}>{step.n}</span>
              <step.icon size={28} color={theme.lime} />
            </div>
            <h3 className="font-display text-2xl font-bold mb-4">{step.title}</h3>
            <p style={{ color: theme.ash }}>{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Signal Types */
function SignalTypes() {
  const signals = [
    {
      icon: Zap,
      title: "Odds Swing",
      desc: "Significant movement in win/draw probabilities within a short time window.",
      example: "Argentina win-odds jumped 12% after a key substitution at 34'.",
    },
    {
      icon: Activity,
      title: "Momentum Shift",
      desc: "Change in market sentiment following cards, injuries, or tactical events.",
      example: "Momentum shifted after red card at 51' vs Morocco.",
    },
    {
      icon: Target,
      title: "Goal Probability Jump",
      desc: "Sudden increase or decrease in implied scoring likelihood.",
      example: "Goal probability rose sharply after corner sequence at 67'.",
    },
  ];

  return (
    <section id="signals" className="max-w-6xl mx-auto px-6 py-24 ">
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl font-bold mb-3">Signals You Pay For</h2>
        <p className="text-lg max-w-md mx-auto" style={{ color: theme.ash }}>
          Clear, contextual alerts — not raw data dumps.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {signals.map((s) => (
          <div
            key={s.title}
            className="rounded-3xl p-8 border flex flex-col"
            style={{ background: theme.bgPanel, borderColor: theme.line }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ background: theme.bgCard }}>
              <s.icon size={32} color={theme.gold} />
            </div>
            <h3 className="font-display text-2xl font-bold mb-3">{s.title}</h3>
            <p className="mb-8 flex-1" style={{ color: theme.ash }}>{s.desc}</p>
            <div className="font-mono text-sm p-4 rounded-2xl" style={{ background: theme.bgCard, color: theme.lime }}>
              “{s.example}”
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Accuracy Proof */
function AccuracyStrip() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div
        className="rounded-3xl p-10 md:p-16 border flex flex-col md:flex-row items-center justify-between gap-10"
        style={{ background: theme.bgCard, borderColor: theme.line }}
      >
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ background: theme.bgPanel }}>
            <ShieldCheck size={36} color={theme.lime} />
          </div>
          <div>
            <h3 className="font-display text-3xl font-bold mb-3">Signals that grade themselves</h3>
            <p className="text-lg leading-relaxed max-w-md" style={{ color: theme.ash }}>
              Every delivered signal is automatically validated against the actual match outcome. Transparency by design.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="font-display text-7xl font-bold mb-1" style={{ color: theme.gold }}>73.8%</div>
          <div className="uppercase tracking-widest text-sm" style={{ color: theme.ash }}>Live odds-swing accuracy</div>
        </div>
      </div>
    </section>
  );
}

/* Pricing */
function PricingCallout() {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 teblos-flip-up">
      <div
        className="rounded-3xl p-16 text-center border max-w-3xl mx-auto"
        style={{
          background: `linear-gradient(160deg, ${theme.bgPanel}, ${theme.bgDeep})`,
          borderColor: theme.line,
        }}
      >
        <h2 className="font-display text-5xl font-bold mb-6">One simple price</h2>
        <div className="text-8xl font-display font-bold mb-4" style={{ color: theme.gold }}>$0.10</div>
        <p className="text-2xl mb-10" style={{ color: theme.ash }}>per signal</p>

        <p className="max-w-md mx-auto mb-12 text-lg" style={{ color: theme.ash }}>
          Pay only when you need a fresh, high-value insight. Settled instantly on Solana. No subscriptions. No waste.
        </p>

        <a
          href="#"
          className="inline-flex items-center gap-3 text-lg font-semibold px-10 py-5 rounded-2xl transition-all hover:scale-105"
          style={{ background: theme.gold, color: theme.bgDeep }}
        >
          <Wallet size={24} />
          Connect Wallet to Start
        </a>
      </div>
    </section>
  );
}

/* Footer */
function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: theme.line }}>
      <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          
          <span className="font-display text-xl font-bold">TEBLOS</span>
        </div>

         

        <p className="font-mono text-sm text-center md:text-right" style={{ color: theme.ash }}>
          Built for real-time football intelligence
        </p>
      </div>
    </footer>
  );
}

export default function TeblosLanding() {
  return (
    <div className="teblos-root">
      <GlobalStyle />
      <Navbar />
      <Hero />
      <SignalTicker />
      <HowItWorks />
      <SignalTypes />
      <AccuracyStrip />
      <PricingCallout />
      <Footer />
    </div>
  );
}