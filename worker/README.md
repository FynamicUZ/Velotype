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
