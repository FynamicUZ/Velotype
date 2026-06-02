# Velotype

A web-based multiplayer typing battle game. Type words to cast spells, deal damage, and defeat your opponents in real-time duels.

---

## Overview

Velotype combines fast-paced typing mechanics with RPG-style progression. Each battle presents a queue of words — type them correctly and quickly to deal damage. Combo streaks, secondary weapons, and player level all influence how hard you hit. First player to reduce the opponent's HP to zero wins.

**Core loop:**
1. Battle starts with a countdown
2. Words appear with a time limit — type them to attack
3. Use secondary weapons (Tab) to disrupt your opponent
4. Win → earn XP and coins → level up, buy items, unlock worlds

---

## Game Modes

| Mode | Description |
|---|---|
| **Solo Practice** | Fight a Training Dummy with infinite HP — no pressure, just reps |
| **Campaign** | 4 worlds with 30+ unique enemies; worlds unlock as you progress |
| **Survival** | Endless waves of escalating difficulty |
| **Tournament** | Bracket-style competition within a world |
| **Ranked Multiplayer** | Real-time PvP with ELO-based matchmaking |
| **Friend Duel** | Private room via a shareable code |

---

## Gameplay Mechanics

### Typing System
- A queue of words is shown on screen; you type the current word
- **First wrong character immediately ends the word** — no mid-word correction
- Press **Space** or **Enter** to submit a correctly typed word
- Each word has a time limit of `2× optimal time` — miss it and the word is failed
- Failed words deal no damage and reset your streak

### Damage Formula
Every correctly typed word deals damage calculated as:

```
damage = 10 × complexityMult × speedMult × accuracyMult × streakMult × levelMult
```

| Multiplier | Formula | Notes |
|---|---|---|
| Complexity | `1 + (tier − 1) × 0.3` | Tier 1–5 based on word difficulty |
| Speed | `optimalMs / actualMs` | Clamped to 0.5–2.0 |
| Accuracy | `correctChars / totalKeystrokes` | Penalises false starts |
| Streak | `1 + streak × 0.1` | Streak capped at 10 (+100% max bonus) |
| Level | `1 + level × 0.05` | +5% damage per level |

Optimal word time is `1500 + 300 × characterCount` milliseconds.

### Word Difficulty
Words are drawn from a 5-tier list and ramped over the course of a battle:

| Battle Progress | Tier |
|---|---|
| 0 – 20% | 1 (easiest) |
| 20 – 50% | 2 |
| 50 – 80% | 3 |
| 80 – 95% | 4 |
| 95 – 100% | 5 (hardest) |

Higher player levels shift the starting tier up by up to +2 (every 5 levels), keeping matches challenging as you improve.

### Streak Combo
Consecutive correct words build a streak. The streak multiplier adds +10% damage per step and is capped at 10 (giving a 2× damage ceiling). Any failed or timed-out word resets the streak to zero.

### Secondary Weapons
Press **Tab** during a battle to activate your equipped weapon. Each use consumes one from inventory.

| Weapon | Effect on Opponent | Duration | Cooldown |
|---|---|---|---|
| Glitch ⚡ | Scrambles the letters of their current word | 4 s | 30 s |
| Letter Drop 👁 | Hides letters so they can't see the word | 6 s | 35 s |
| Slow Curse 🕸 | Reduces their word timeout by 30% | 8 s | 40 s |
| Shield 🛡 | Next damage hit you receive is reduced 50% | — | 25 s |

---

## Progression System

### Player Levels
| Level | XP Required |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 450 |
| 5 | 700 |
| 6 | 1000 |
| 7 | 1400 |
| 8 | 1900 |
| 9 | 2500 |
| 10 | 3200 |
| 11 | 4000 |

Higher levels increase damage output (+5% per level) and shift word difficulty tiers.

### ELO Ranking
- Every new player starts at **1000 ELO**
- Ranked matchmaking pairs the two closest-ELO players in the queue
- Wins increase ELO; losses decrease it

### Coins & Shop
- Coins are earned from battles
- Spent in the Shop on weapon packs and cosmetics

| Item | 3-pack | 10-pack |
|---|---|---|
| Glitch ⚡ | 60 coins | 180 coins |
| Letter Drop 👁 | 75 coins | 220 coins |
| Slow Curse 🕸 | 90 coins | 250 coins |
| Shield 🛡 | 50 coins | 150 coins |

**Cosmetics:** wands, hats, and particle effects — purely visual, no gameplay effect.

---

## Tech Stack

### Client
| Package | Version | Role |
|---|---|---|
| React | 19.2 | UI framework |
| TypeScript | ~6.0 | Type safety |
| Vite | 8.0 | Dev server & bundler |
| React Router | 7.15 | SPA routing |
| Zustand | 5.0 | State management |
| Tailwind CSS | 3.4 | Utility-first styling |

### Server
| Package | Version | Role |
|---|---|---|
| ws | 8.18 | WebSocket server |
| TypeScript | 5.5 | Type safety |
| esbuild | — | Production bundler |
| tsx | — | Dev-mode TS runner |
| nanoid | 3.3 | Room/player ID generation |

---

## Architecture

### Directory Structure
```
velotype/
├── client/
│   └── src/
│       ├── components/         # Reusable UI components
│       │   └── ui/             # Base primitives (Button, Card, Badge, HPBar…)
│       ├── pages/              # Route-level page components
│       │   └── singleplayer/   # Campaign sub-pages
│       ├── store/              # Zustand state stores
│       ├── hooks/              # Custom React hooks (typing engine, bot, countdown)
│       ├── lib/
│       │   ├── game/           # Core game logic (damage, words, weapons, AI, enemies)
│       │   └── webrtc/         # WebRTC client (signaling, peer connection, data channel)
│       ├── utils/              # Shared utilities (seeded RNG)
│       └── assets/words/       # 5-tier word list
└── server/
    └── src/
        ├── index.ts            # Entry point (port 3001)
        ├── signalingServer.ts  # WebSocket connection handling
        ├── roomManager.ts      # Friend room state
        └── matchmaker.ts       # ELO-based ranked queue
```

### State Management
Three Zustand stores handle all runtime state:

| Store | Scope | Persisted |
|---|---|---|
| `useGameStore` | Active battle — HP, phases, damage numbers, weapon cooldowns, opponent effects | No |
| `usePlayerStore` | Player profile — level, XP, ELO, coins, inventory, cosmetics, campaign progress | Yes (localStorage) |
| `useMpStore` | Multiplayer — signaling socket, WebRTC peer connection, data channel | No |

### Multiplayer Flow
Velotype uses a **WebSocket signaling server** to negotiate a **WebRTC peer-to-peer connection** between players. Once connected, all game events (damage, weapon activations, match end) are sent directly between clients — the server is no longer involved.

```
Player A                  Signaling Server (WS)            Player B
   |--- connect --------->|                                |
   |                      |<---------- connect ------------|
   |--- join/create room->|------- notify opponent ------->|
   |<-- SDP offer --------|<-------- SDP answer -----------|
   |--- ICE candidates -->|-------- relay ---------------->|
   |<==================== WebRTC DataChannel ==============>|
         damage dealt · weapon fired · game finished
```

**Seeded RNG:** Both players generate the same word sequence using a shared seed, ensuring they always see identical words without any server coordination after the match starts.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Run locally
```bash
# 1. Clone the repo
git clone <repo-url>
cd velotype

# 2. Start the signaling server
cd server
npm install
npm run dev        # Starts on ws://localhost:3001

# 3. Start the client (new terminal)
cd ../client
npm install
npm run dev        # Opens http://localhost:5173
```

The client connects directly to `ws://localhost:3001` in dev (no CORS setup needed).

### Environment Variables
Copy the templates and fill them in:
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

**Client (`client/.env`)** — build-time, must start with `VITE_`:
| Variable | Required | Purpose |
|---|---|---|
| `VITE_SIGNAL_URL` | Prod | Signaling server URL (`wss://…`). Defaults to `ws://localhost:3001` if unset. |
| `VITE_TURN_URL` | Recommended | TURN server URL (e.g. `turn:openrelay.metered.ca:80`) |
| `VITE_TURN_USERNAME` | With TURN | TURN username |
| `VITE_TURN_CREDENTIAL` | With TURN | TURN password |

**Server (`server/.env`)** — runtime:
| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | Port to listen on (default `3001`) |
| `ALLOWED_ORIGINS` | Prod | Comma-separated origin allowlist. Empty allows all (dev only). |

---

## Building for Production

```bash
# Build client (outputs to client/dist/)
cd client && npm run build

# Build server (outputs to server/dist/)
cd server && npm run build
```

Deploy `client/dist/` to any static host (Vercel, Netlify, Cloudflare Pages) and run the server with `node server/dist/index.js`.

The server exposes `GET /healthz` for platform health checks and handles `SIGTERM`/`SIGINT` for graceful shutdown.

---

## Deployment Guide

### 1. Sign up for a free TURN service
STUN alone fails for ~15–20% of users (mobile carriers, corporate NAT). Get free TURN credentials from one of:
- [Metered.ca](https://www.metered.ca/) — 50 GB/mo free
- [Cloudflare Calls](https://developers.cloudflare.com/calls/) — generous free tier
- [Open Relay Project](https://www.metered.ca/tools/openrelay/) — fully free, public

### 2. Deploy the signaling server
Push to any Node host that supports long-lived WebSockets (Render, Railway, Fly.io, a VPS). On Render:
- New → Web Service → connect repo, set root to `server/`
- Build: `npm install && npm run build`
- Start: `npm start`
- Env vars: `ALLOWED_ORIGINS=https://your-client.vercel.app`
- Health check path: `/healthz`

Render will give you a URL like `https://velotype-server.onrender.com`. The WS URL is the same host with `wss://` scheme.

### 3. Deploy the client
On Vercel / Netlify / Cloudflare Pages:
- Root directory: `client/`
- Build command: `npm run build`
- Output directory: `dist`
- Env vars:
  - `VITE_SIGNAL_URL=wss://velotype-server.onrender.com`
  - `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` from step 1

### 4. Share the link and play
Open `/play` → "Create friend room" → send the 6-character code to your friend → they join via "Join with code".

---

## Known Limitations
- Player profile lives in `localStorage` only — clearing browser data wipes level/ELO/coins
- No reconnect into an in-progress match — a network drop ends the duel
- Matchmaker queue is open (no auth) — fine for friend rooms, soft-risky for a public deployment

---

## Key Files Reference

| File | Purpose |
|---|---|
| `client/src/App.tsx` | Route definitions |
| `client/src/pages/BattlePage.tsx` | Main battle screen — orchestrates all hooks |
| `client/src/hooks/useTypingEngine.ts` | Core typing loop (input, validation, timing) |
| `client/src/hooks/useBotFight.ts` | AI opponent simulation |
| `client/src/lib/game/damageCalculator.ts` | Damage formula |
| `client/src/lib/game/wordPool.ts` | Word generation and difficulty ramping |
| `client/src/lib/game/botAI.ts` | Enemy definitions and AI behavior |
| `client/src/lib/game/enemies.ts` | 4 campaign worlds and their enemies |
| `client/src/lib/game/secondaryWeapons.ts` | Weapon definitions and stats |
| `client/src/lib/webrtc/SignalingClient.ts` | WebSocket connection to server |
| `client/src/lib/webrtc/PeerConnection.ts` | WebRTC peer setup (SDP/ICE) |
| `client/src/lib/webrtc/GameChannel.ts` | Data channel message handling |
| `server/src/signalingServer.ts` | WebSocket server — routes all signaling messages |
| `server/src/matchmaker.ts` | ELO-based ranked matchmaking queue |
