# Teblos

**Real-time signal detection for live football data, delivered pay-per-call.**

Built for the TxODDS World Cup Hackathon — Trading Tools and Agents track.

---

## What is Teblos?

Teblos watches live World Cup matches through TxLINE's data feed and automatically detects moments that matter — a sharp odds swing, a momentum shift after a card or substitution, a goal-probability jump — and turns them into a structured, explained signal.

Instead of continuously polling a match yourself, you ask Teblos: *"tell me if anything important just happened,"* pay a small amount per call, and get back a signal with a plain-language explanation of what happened and why it's significant.

No subscriptions. No dashboards to babysit. One call, one signal, paid for automatically on Solana.

## The Problem

Anyone trying to react to live match events in real time — a small trading desk, an automated agent, an individual running a strategy — faces the same bottleneck: watching a full match isn't practical, and raw odds/score feeds are noisy. The signal (a real shift worth acting on) is buried in a stream of routine updates.

Building your own ingestion + detection pipeline for this is real infrastructure work most teams don't want to own for a single tournament.

## The Solution

Teblos is that pipeline, exposed as a paid API:

1. **Ingest** — continuously consume TxLINE's live odds and score feed for all 104 World Cup matches.
2. **Detect** — apply rule-based detectors for defined signal types (odds swing, momentum shift, goal-probability change).
3. **Explain** — attach a short, plain-language explanation to each signal, not just raw numbers.
4. **Serve** — gate access behind a per-call Solana payment. Pay, get a signal, done.
5. **Grade itself** — track whether each signal's implied prediction actually held up, and expose a running accuracy record per signal type.

## Architecture

```
TxLINE Feed (Odds + Scores)
        │
        ▼
  Ingestion Service (TypeScript)
        │
        ▼
  Signal Detection Engine
        │
        ▼
  Explanation Layer
        │
        ▼
  Payment-Gated API ── on-chain payment (Solana) ──> Caller
        │
        ▼
  Self-Grading Tracker (accuracy log per signal type)
```

## Signal Types (v1)

| Signal | Trigger | Example Output |
|---|---|---|
| **Odds Swing** | Win probability moves beyond a defined threshold within a short window | "Argentina win-odds shifted 12% at minute 34" |
| **Momentum Shift** | Odds movement immediately following a card, substitution, or injury | "Odds moved following a red card at minute 51" |
| **Goal Probability Jump** | Sudden change in implied goal-scoring likelihood | "Goal probability rose sharply after a corner sequence at minute 67" |

Each signal returns:

```json
{
  "match_id": "string",
  "signal_type": "odds_swing | momentum_shift | goal_probability_jump",
  "direction": "string",
  "confidence": "float",
  "explanation": "string",
  "timestamp": "ISO8601"
}
```

## Payment Model

Each signal call is gated behind a small Solana payment (stablecoin, e.g. ~$0.10 per call). No subscription required — pay only for the signals you actually pull.

## Self-Grading

Teblos doesn't just emit signals — it tracks its own track record. Every signal's implied prediction is checked against what actually happened in the match, and an accuracy score is maintained per signal type. This is exposed alongside the API so callers can see how reliable each signal category has been across the tournament, not just trust it blindly.

## Tech Stack

- **Backend**: TypeScript / Node.js
- **Blockchain SDK**: `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`
- **Data Source**: TxLINE (TxODDS) — live odds, scores, World Cup free tier
- **Payments**: Solana (devnet for hackathon submission)
- **API**: REST, token-gated per call

## TxLINE Endpoints Used

- Fixtures — match metadata
- Odds — live and historical odds snapshots/streams
- Scores — live score events
- Validation Proofs — on-chain verification of underlying data

## Status

Built for the TxODDS World Cup Hackathon (submissions close July 19, 2026). This is a hackathon-stage build: functional core pipeline, not a production deployment.

## Feedback on TxLINE

_(To be completed after building against the live API — friction points and what worked well.)_

## Repo & Demo

- Public repo: _link here_
- Demo video: _link here_
- Live/devnet endpoint: _link here_

---

Built by [idorocodes](https://github.com/idorocodes)
