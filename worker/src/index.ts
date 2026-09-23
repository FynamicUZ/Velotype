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

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);

    // Plain HTTP: health check, same paths the Node server answered.
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
    const origin = request.headers.get('Origin');
    // The /selftest page lives on this same origin, so it has to be allowed to
    // open a socket back to us.
    if (allowed.length > 0 && origin !== url.origin && !originAllowed(origin, allowed)) {
      console.warn(`[velotype] refused websocket from origin: ${origin ?? '(none)'}`);
      // Name the rejected origin: the browser only surfaces "failed", which
      // makes a mismatch here very expensive to diagnose from the client side.
      return new Response(`Origin not allowed: ${origin ?? '(none)'}`, { status: 403 });
    }

    // Every player shares one lobby, so all rooms and the matchmaking queue
    // live in a single Durable Object instance.
    console.log(`[velotype] accepted websocket from origin: ${origin ?? '(none)'}`);
    const id = env.LOBBY.idFromName('global');
    return env.LOBBY.get(id).fetch(request);
  },
};
