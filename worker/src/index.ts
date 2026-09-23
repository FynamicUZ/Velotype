import { Lobby } from './lobby.js';
import { SELFTEST_HTML } from './selftest.js';

export { Lobby };

export interface Env {
  LOBBY: DurableObjectNamespace;
  ALLOWED_ORIGINS?: string;
}

function originAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.some((entry) => {
    if (entry === '*') return true;
    if (entry.startsWith('*')) return origin.endsWith(entry.slice(1));
    if (entry.endsWith('*')) return origin.startsWith(entry.slice(0, -1));
    return origin === entry;
  });
}

/** The polling transport is cross-origin, so it needs CORS on every response. */
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Same origin lockdown as the Node server's verifyClient, except entries
    // may carry a single leading or trailing `*`. Netlify serves this site from
    // several hostnames — the canonical one, plus `<branch>--velotype.netlify.app`
    // for branch and preview deploys — and a rejected origin looks to the player
    // like a plain "Disconnected from signaling server", so the list has to
    // cover them all.
    const allowed = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // The /selftest page lives on this same origin, so it has to be allowed to
    // talk to us.
    const permitted = allowed.length === 0 || origin === url.origin || originAllowed(origin, allowed);

    const lobby = () => env.LOBBY.get(env.LOBBY.idFromName('global'));

    // ── HTTP polling transport ───────────────────────────────────────────────
    // For players whose network drops WebSocket upgrades but passes ordinary
    // HTTPS. Same lobby behind it, carried over plain requests.
    if (url.pathname.startsWith('/poll/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (!permitted) {
        console.warn(`[velotype] refused poll from origin: ${origin ?? '(none)'}`);
        return new Response(`Origin not allowed: ${origin ?? '(none)'}`, {
          status: 403,
          headers: corsHeaders(origin),
        });
      }
      return lobby()
        .fetch(request)
        .then((res) => {
          const headers = new Headers(res.headers);
          for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
          return new Response(res.body, { status: res.status, headers });
        });
    }

    // ── plain HTTP ───────────────────────────────────────────────────────────
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      if (url.pathname === '/selftest') {
        return new Response(SELFTEST_HTML, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
      if (url.pathname === '/healthz' || url.pathname === '/') {
        return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      return new Response(null, { status: 404 });
    }

    // ── websocket ────────────────────────────────────────────────────────────
    if (!permitted) {
      // Name the rejected origin: the browser only surfaces "failed", which
      // makes a mismatch here very expensive to diagnose from the client side.
      console.warn(`[velotype] refused websocket from origin: ${origin ?? '(none)'}`);
      return new Response(`Origin not allowed: ${origin ?? '(none)'}`, { status: 403 });
    }

    console.log(`[velotype] accepted websocket from origin: ${origin ?? '(none)'}`);
    // Every player shares one lobby, so all rooms and the matchmaking queue
    // live in a single Durable Object instance.
    return lobby().fetch(request);
  },
};
