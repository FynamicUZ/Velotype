import { Lobby } from './lobby.js';

export { Lobby };

export interface Env {
  LOBBY: DurableObjectNamespace;
  ALLOWED_ORIGINS?: string;
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);

    // Plain HTTP: health check, same paths the Node server answered.
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      if (url.pathname === '/healthz' || url.pathname === '/') {
        return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      return new Response(null, { status: 404 });
    }

    // Same origin lockdown as the Node server's verifyClient.
    const allowed = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    if (allowed.length > 0 && (!origin || !allowed.includes(origin))) {
      return new Response('Origin not allowed', { status: 403 });
    }

    // Every player shares one lobby, so all rooms and the matchmaking queue
    // live in a single Durable Object instance.
    const id = env.LOBBY.idFromName('global');
    return env.LOBBY.get(id).fetch(request);
  },
};
