// The shared managers in ../server/src import `WebSocket` from 'ws' as a TYPE
// ONLY, so the import is erased at build time and `ws` is never bundled here.
// This shim points that type at the Workers runtime WebSocket so the same files
// typecheck against both the Node server and this Worker.
declare module 'ws' {
  export type WebSocket = globalThis.WebSocket;
}
