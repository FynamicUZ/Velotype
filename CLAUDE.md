# Velotype — Claude Context

## Project
Velotype is a web-based multiplayer typing battle game. Players type words to cast spells and deal damage to opponents in real-time. Supports solo practice, a singleplayer campaign (4 worlds), survival, tournament, and real-time PvP via WebRTC. Built with React + TypeScript on the frontend and a Node.js WebSocket signaling server on the backend.

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 3 |
| State | Zustand 5 (three stores) |
| Routing | React Router 7 |
| Backend | Node.js, ws 8 (WebSockets), TypeScript 5.5, esbuild |
| Realtime | WebRTC Data Channels (P2P game sync), WebSocket (signaling only) |

## Dev Commands
```bash
# Client — http://localhost:5173
cd client && npm install && npm run dev

# Server — ws://localhost:3001
cd server && npm install && npm run dev

# Production builds
cd client && npm run build
cd server && npm run build
```

The Vite dev server proxies `/ws` → `ws://localhost:3001` (see `client/vite.config.ts`).

## Environment Variables
**Client** (build-time, prefix `VITE_`):
- `VITE_SIGNAL_URL` — signaling server URL (`wss://…` in prod). Defaults to `ws://localhost:3001`.
- `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` — TURN server for WebRTC NAT traversal. All three required.

**Server** (runtime):
- `PORT` — defaults to 3001
- `ALLOWED_ORIGINS` — comma-separated origin allowlist. Empty = allow all (dev only).

See `client/.env.example` and `server/.env.example`.

## Route Map (`client/src/App.tsx`)
| Path | Page |
|---|---|
| `/` | HomePage |
| `/play` | MultiplayerLobby |
| `/battle` | BattlePage |
| `/results` | ResultsPage |
| `/shop` | ShopPage |
| `/profile` | ProfilePage |
| `/sp` | WorldMapPage |
| `/sp/world/:worldId` | FightSelectPage |
| `/sp/survival` | SurvivalPage |
| `/sp/tournament/:worldId` | TournamentPage |

## State Management (Zustand)
| Store | File | Owns |
|---|---|---|
| `useGameStore` | `client/src/store/useGameStore.ts` | Battle phases (IDLE→COUNTDOWN→BATTLE→RESULTS), HP, damage numbers, weapon cooldowns, opponent effects (glitch/letterDrop/slow/shield) |
| `usePlayerStore` | `client/src/store/usePlayerStore.ts` | Persistent profile (localStorage): level, XP, ELO, coins, inventory, cosmetics, singleplayer progress |
| `useMpStore` | `client/src/store/useMpStore.ts` | WebRTC signaling state, peer connection, data channel |

## Core Game Logic
All in `client/src/lib/game/` and `client/src/hooks/`.

**Damage formula** (`damageCalculator.ts`):
```
damage = 10 × complexityMult × speedMult × accuracyMult × streakMult × levelMult

complexityMult = 1 + (tier - 1) × 0.3          // tier 1–5
speedMult      = clamp(optimalMs / actualMs, 0.5, 2.0)
accuracyMult   = correctChars / totalKeystrokes
streakMult     = 1 + streak × 0.1              // streak capped at 10
levelMult      = 1 + level × 0.05
```

**Word difficulty** (`wordPool.ts`):
- 5 tiers ramped by battle progress: 0–20% → T1, 20–50% → T2, 50–80% → T3, 80–95% → T4, 95–100% → T5
- Player level shifts tier by up to +2 (every 5 levels)
- Optimal word time: `1500 + 300 × charCount` ms
- Seeded RNG (`utils/seededRandom.ts`) ensures both P2P players see identical word sequences

**Typing engine** (`hooks/useTypingEngine.ts`):
- First wrong character ends the word immediately (no mid-word correction)
- Space or Enter submits a correctly typed word
- Timeout = 2× optimal time × `timeoutMultiplier`
- Streak resets on timeout or wrong word; increments on correct word

**Bot AI** (`lib/game/botAI.ts`): configurable typing speed, accuracy, and ability usage for each enemy

## Secondary Weapons (`lib/game/secondaryWeapons.ts`)
| Weapon | Effect | Duration | Cooldown | Cost (3-pack / 10-pack) |
|---|---|---|---|---|
| Glitch ⚡ | Scrambles opponent letters | 4 s | 30 s | 60 / 180 coins |
| Letter Drop 👁 | Hides letters from opponent | 6 s | 35 s | 75 / 220 coins |
| Slow Curse 🕸 | Reduces opponent timeout by 30% | 8 s | 40 s | 90 / 250 coins |
| Shield 🛡 | Absorbs 50% of next damage hit | — | 25 s | 50 / 150 coins |

Activated by pressing **Tab** during battle. Inventory is consumed on use.

## Multiplayer Architecture
```
Client A                   Server (port 3001)             Client B
   |-- WS connect -------->|                              |
   |                       |<------- WS connect ----------|
   |-- join/create room -->|-- notify opponent ----------->|
   |<-- SDP offer ---------|<------ SDP answer ------------|
   |-- ICE candidates ---->|-- relay ---------------------->|
   |<====================== WebRTC DataChannel ============>|
            (damage, weapon effects, game-finished messages)
```

Server files: `server/src/signalingServer.ts`, `roomManager.ts`, `matchmaker.ts`
WebRTC client files: `client/src/lib/webrtc/` (SignalingClient, PeerConnection, GameChannel)

## Player Progression
| Level | XP required |
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

- ELO starts at 1000; ranked matchmaking pairs by closest ELO (FIFO queue, `server/src/matchmaker.ts`)
- Default inventory: 20× each weapon, 10,000 coins
- Cosmetics: wands, hats, particle effects — purchased in ShopPage

## Path Alias
`@` resolves to `client/src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Style Conventions
- Dark arcane theme: purple, cyan, lime, orange, rose, gold on dark backgrounds
- Fonts: Press Start 2P (headings), Inter (body), JetBrains Mono (typing input)
- Custom Tailwind animations: `pulse-glow`, `float-up`, `shake`, `cast` (see `tailwind.config.ts`)
- No CSS modules — all styling via Tailwind utility classes
