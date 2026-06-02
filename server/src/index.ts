import { createSignalingServer } from './signalingServer.js';

const PORT = Number(process.env.PORT) || 3001;
const server = createSignalingServer(PORT);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[velotype] received ${signal}, shutting down…`);
  try {
    await server.close();
  } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
