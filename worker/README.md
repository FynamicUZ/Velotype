# Velotype signaling — Cloudflare Worker

The signaling server that used to run as a Node process on Railway, ported to a
Cloudflare Worker backed by one Durable Object. It exists because the Railway
service was lost when its free credit ran out; the Workers free plan hosts this
with no card and no idle sleep.

## How it fits together

- `src/index.ts` — the Worker. Answers `/healthz`, enforces `ALLOWED_ORIGINS`,
  and forwards WebSocket upgrades to the Durable Object.
- `src/lobby.ts` — the `Lobby` Durable Object. One global instance holds every
  room, the matchmaking queue and all battle royale state, exactly as the single
  Node process did.
- The game logic itself is **not** duplicated: `RoomManager`, `Matchmaker` and
  `BRRoomManager` are imported straight from `../server/src`. Those files import
  `WebSocket` from `ws` as a *type only*, so the import disappears at build time
  and `src/ws-shim.d.ts` re-points that type at the Workers runtime WebSocket.
  **Do not delete `../server/src` while this Worker is deployed.**

Sockets are accepted with `accept()` rather than the WebSocket Hibernation API,
because the managers hold their state in memory — the object must stay resident
while players are connected.

## Two ways in

Players connect over a WebSocket when their network allows it. Some networks
pass ordinary HTTPS but silently drop the upgrade — ad blockers, security
suites, and filtering of `workers.dev`, which is widely blocklisted because it
is abused for phishing. Those players fall back to HTTP polling:

| route | purpose |
|---|---|
| `POST /poll/connect` | opens a session, returns its id |
| `POST /poll/send?s=<id>` | one client→server message, body is the JSON |
| `GET /poll/recv?s=<id>` | long poll, held up to 20s, returns queued messages |
| `POST /poll/close?s=<id>` | ends the session |

`PollingSocket` (`src/polling.ts`) presents the same `send`/`readyState` surface
as a WebSocket, so the room, matchmaking and battle royale code is identical for
both carriers — a polling player and a WebSocket player land in the same lobby
and can play each other. A session that stops polling for 45s is treated as a
disconnect. The client picks the carrier itself in
`client/src/lib/net/signalTransport.ts`, trying the WebSocket first with a 5s
timeout.

`/selftest` reports which layers work from a given browser, which is the fastest
way to tell a blocked network apart from a real bug.

## Deploy

```bash
npm install
npx wrangler login     # opens a browser, one time
npm run deploy
```

The deploy prints the public URL, e.g. `https://velotype-signal.<you>.workers.dev`.
The client then needs `VITE_SIGNAL_URL=wss://velotype-signal.<you>.workers.dev`
set in Netlify, and `ALLOWED_ORIGINS` in `wrangler.toml` must list the site's
origin.

## Local development

```bash
npm run dev
```

On Windows, run this from a **short directory path**. Deep paths overflow the
Windows path limit when workerd creates its local SQLite state for the Durable
Object, and every request then fails with an opaque `internal error`. Passing
`--persist-to C:/some/short/dir` works around it.

## Testing against it

Point any WebSocket client at the dev server with an allowed `Origin` header and
speak the protocol in `../server/src/types.ts`; `find-match` from two clients
should return a shared `match-found` room code.
