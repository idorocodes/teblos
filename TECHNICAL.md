# Teblos — Technical Specification

Engineering spec for building the hackathon submission. This is the build reference, not the submission doc.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (Node.js) |
| Runtime | Node 20+ |
| Web framework | Express (fastest to stand up an API in 13 days) |
| Blockchain SDK | `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token` |
| Data source | TxLINE (TxODDS), Service Level 1 (World Cup, 60s delay, devnet) |
| Payment rail | Solana devnet |
| Storage | SQLite (single-file, zero-ops, fine for hackathon scale) |
| Process model | Single long-running Node process: ingestion loop + API server in one deployable |

No need for Redis, queues, or a real database at this scale — SQLite plus in-memory state covers a 13-day build cleanly.

## 2. High-Level Flow

```
1. Ingestion loop polls/streams TxLINE odds + scores every N seconds per active fixture
2. Each new data point is compared against recent history (in-memory + SQLite)
3. Detectors run against that comparison → emit a Signal if a threshold is crossed
4. Signal is stored (unpaid) with a unique signal_id
5. Caller hits POST /signals/latest?match_id=X with proof of payment
6. Server verifies payment on-chain → returns the signal(s) generated since the caller's last call
7. Background job periodically checks past signals against actual match outcomes → updates accuracy log
```

## 3. One-Time Setup (per project, not per call)

Following the TxLINE quickstart:

1. Create/load a devnet Solana wallet keypair.
2. Call `program.methods.subscribe(1, 4)` — service level 1, 4-week duration. One on-chain transaction.
3. `POST {apiOrigin}/auth/guest/start` → get guest JWT.
4. Sign `${txSig}::${jwt}` with wallet, `POST {apiBaseUrl}/token/activate` → get `apiToken`.
5. Store `apiToken` in `.env`. Reused for all subsequent TxLINE data calls.

This setup lives in a single script (`scripts/setup-txline.ts`), run once, output saved to `.env`.

## 4. Data Model (SQLite)

**fixtures**
| column | type |
|---|---|
| fixture_id | TEXT PK |
| home_team | TEXT |
| away_team | TEXT |
| start_time | TEXT |
| status | TEXT |

**odds_history**
| column | type |
|---|---|
| id | INTEGER PK |
| fixture_id | TEXT |
| outcome | TEXT (home/draw/away) |
| price | REAL |
| recorded_at | TEXT |

**score_events**
| column | type |
|---|---|
| id | INTEGER PK |
| fixture_id | TEXT |
| event_type | TEXT (goal/card/sub/etc) |
| minute | INTEGER |
| detail | TEXT |
| recorded_at | TEXT |

**signals**
| column | type |
|---|---|
| signal_id | TEXT PK |
| fixture_id | TEXT |
| signal_type | TEXT |
| direction | TEXT |
| confidence | REAL |
| explanation | TEXT |
| created_at | TEXT |
| outcome_checked | BOOLEAN |
| outcome_correct | BOOLEAN NULLABLE |

**accuracy_log** (derived/aggregated view, or computed on read from `signals`)
| signal_type | total | correct | accuracy_pct |

## 5. Detectors (v1 — deterministic rules)

**Odds Swing**
```
if abs(current_price - price_N_seconds_ago) / price_N_seconds_ago > THRESHOLD_SWING:
    emit signal("odds_swing", direction, confidence=magnitude_normalized)
```
Suggested: THRESHOLD_SWING = 0.08 (8%), window = 120s. Tune after seeing real data.

**Momentum Shift**
```
on score_event (card, sub, injury-linked stoppage):
    watch odds for WINDOW_AFTER_EVENT seconds
    if odds move beyond THRESHOLD_MOMENTUM in that window:
        emit signal("momentum_shift", direction, confidence, tied_to=event)
```

**Goal Probability Jump**
```
if implied goal-probability metric (derived from over/under or 1x2 pricing) 
   changes beyond THRESHOLD_GOAL_PROB within a short window:
    emit signal("goal_probability_jump", direction, confidence)
```

All thresholds live in one config file (`config/thresholds.ts`) so they're tunable without touching detector logic.

## 6. Explanation Generation

Template-based, not LLM-based (keep it deterministic and fast for a hackathon demo):

```
"{team} {outcome_direction}-odds shifted {pct}% at minute {minute}"
  + (if tied to event) " following {event_type} ({detail})"
```

Example: `"Argentina win-odds shifted 12% at minute 34 following a substitution (Messi off)"`

## 7. API Endpoints (what you're building)

### `GET /health`
Basic liveness check. No payment required.

### `GET /fixtures/active`
Returns currently live/upcoming fixtures Teblos is tracking. No payment required (discovery only).

**Response:**
```json
{
  "fixtures": [
    { "fixture_id": "string", "home_team": "string", "away_team": "string", "status": "live|upcoming|finished" }
  ]
}
```

### `POST /signals/latest`
The core paid endpoint. Returns new signals for a given fixture since the caller's last call.

**Request:**
```json
{
  "fixture_id": "string",
  "payment_tx": "string"  // Solana tx signature proving payment
}
```

**Server-side flow:**
1. Verify `payment_tx` on-chain: correct amount, correct recipient, not already redeemed.
2. Mark `payment_tx` as consumed (prevent replay).
3. Return unclaimed signals for that fixture.

**Response:**
```json
{
  "fixture_id": "string",
  "signals": [
    {
      "signal_id": "string",
      "signal_type": "odds_swing | momentum_shift | goal_probability_jump",
      "direction": "string",
      "confidence": 0.0,
      "explanation": "string",
      "timestamp": "ISO8601"
    }
  ]
}
```

### `GET /accuracy`
Public, no payment — this is your credibility/production-readiness proof surface.

**Response:**
```json
{
  "by_signal_type": [
    { "signal_type": "odds_swing", "total": 42, "correct": 31, "accuracy_pct": 73.8 }
  ]
}
```

## 8. Payment Verification Logic

```
1. Fetch transaction by signature via Solana RPC (devnet)
2. Confirm: recipient == Teblos treasury address
3. Confirm: amount >= expected per-call price
4. Confirm: tx_signature not present in `redeemed_payments` table
5. If all pass → insert into `redeemed_payments`, proceed
6. Else → reject with 402-style error
```

Keep this dead simple for the hackathon: no need for a full x402 implementation, just direct signature verification against a fixed price and treasury address.

## 9. Self-Grading Logic (background job)

Runs every few minutes:
```
for each unchecked signal older than GRADING_DELAY:
    look up what actually happened (score change, odds settling direction)
    mark outcome_correct = true/false
    mark outcome_checked = true
```

Grading rule per signal type needs a clear, written-down definition of "correct" — e.g., for `odds_swing`, correct = the side that gained odds strength ended up scoring/winning within the following N minutes. Define this precisely before building it; it's the part judges will scrutinize hardest under "mathematically or strategically defensible."

## 10. Build Order (matches the 13-day plan, now concrete)

1. One-time TxLINE setup script + `.env` token
2. Ingestion loop → write raw odds/score data into SQLite, no detection yet
3. Detectors against stored data (test against replayed/historical fixtures first)
4. Explanation templates
5. `/signals/latest` + payment verification
6. `/accuracy` + background grading job
7. `/fixtures/active`, `/health`
8. Demo script/frontend + recording

## 11. Open Decisions (resolve before coding starts)

- Exact per-call price in USDC/SOL
- Treasury wallet address (new keypair, dedicated to this project)
- Grading window length (how long after a signal to wait before checking outcome)
- Whether real-time polling interval is 30s, 60s, or event-driven (depends on TxLINE's actual delivery mechanism — check once you've made real calls)
