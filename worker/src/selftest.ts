// A no-tools connectivity check, served from the Worker itself.
//
// Browsers report a failed WebSocket upgrade as a bare "connection failed" with
// no reason, and pasting a probe into the console is blocked by Chrome's
// self-XSS guard. This page runs the same probe from a URL the player can just
// open, and prints what actually happened.
export const SELFTEST_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Velotype connectivity check</title>
<style>
  :root { color-scheme: dark; --bg:#12101c; --fg:#e8e4f5; --muted:#a79fc4; --ok:#57d9a3; --bad:#ff6b81; --card:#1c1830; }
  body { margin:0; padding:24px 16px; background:var(--bg); color:var(--fg);
         font:16px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  main { max-width: 640px; margin: 0 auto; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { color:var(--muted); margin:0 0 20px; font-size:14px; }
  .row { background:var(--card); border-radius:10px; padding:14px 16px; margin-bottom:10px; }
  .label { color:var(--muted); font-size:13px; }
  .val { font-size:17px; margin-top:4px; word-break:break-word; }
  .ok { color:var(--ok); } .bad { color:var(--bad); }
  .verdict { margin-top:18px; padding:14px 16px; border-radius:10px; background:var(--card); }
</style>
</head>
<body>
<main>
  <h1>Velotype connectivity check</h1>
  <p class="sub">Tests whether this browser can reach the signaling server.</p>

  <div class="row">
    <div class="label">1 — Ordinary HTTPS request (fetch /healthz)</div>
    <div class="val" id="http">testing…</div>
  </div>

  <div class="row">
    <div class="label">2 — WebSocket upgrade (what the game uses)</div>
    <div class="val" id="ws">testing…</div>
  </div>

  <div class="row">
    <div class="label">3 — WebRTC / UDP (how matches actually run)</div>
    <div class="val" id="rtc">testing…</div>
  </div>

  <div class="verdict" id="verdict">Running…</div>
</main>
<script>
  const httpEl = document.getElementById('http');
  const wsEl = document.getElementById('ws');
  const rtcEl = document.getElementById('rtc');
  const verdictEl = document.getElementById('verdict');
  let httpOk = null, wsOk = null, rtcOk = null;

  function finish() {
    if (httpOk === null || wsOk === null || rtcOk === null) return;
    if (httpOk && wsOk) {
      verdictEl.innerHTML = '<span class="ok">Both work.</span> This browser can reach the signaling server, ' +
        'so a failure in the game is not network related.' +
        (rtcOk ? '' : '<br><br><span class="bad">But WebRTC/UDP is blocked</span>, so matches themselves would still fail.');
    } else if (httpOk && !wsOk) {
      verdictEl.innerHTML = '<span class="bad">HTTPS works, WebSockets are blocked.</span> ' +
        'Something between this browser and the server is killing WebSocket connections — ' +
        'typically a browser extension, antivirus HTTPS/web scanning, or a proxy on the network. ' +
        'The server itself is fine.' +
        (rtcOk
          ? '<br><br>WebRTC/UDP <span class="ok">does</span> work here, so signaling over plain HTTP would make the game playable.'
          : '<br><br>WebRTC/UDP is <span class="bad">also</span> blocked, so the same thing is likely blocking both.');
    } else {
      verdictEl.innerHTML = '<span class="bad">This browser cannot reach the server at all.</span> ' +
        'The whole domain looks blocked from this network.';
    }
  }

  fetch('/healthz')
    .then((r) => { httpOk = r.ok; httpEl.innerHTML = r.ok
      ? '<span class="ok">OK — ' + r.status + '</span>'
      : '<span class="bad">HTTP ' + r.status + '</span>'; finish(); })
    .catch((e) => { httpOk = false; httpEl.innerHTML = '<span class="bad">FAILED — ' + e.message + '</span>'; finish(); });

  // Does UDP get out at all? Gather ICE candidates against a public STUN
  // server: a server-reflexive (srflx) candidate means UDP works, which is what
  // the peer-to-peer match connection needs.
  try {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    let sawSrflx = false;
    pc.onicecandidate = (e) => {
      if (e.candidate && e.candidate.candidate.includes('srflx')) sawSrflx = true;
      if (!e.candidate) {
        rtcOk = sawSrflx;
        rtcEl.innerHTML = sawSrflx
          ? '<span class="ok">OK — UDP works, peer connections can be made</span>'
          : '<span class="bad">BLOCKED — no UDP path out (matches would need TURN over TCP)</span>';
        finish();
        pc.close();
      }
    };
    pc.createDataChannel('probe');
    pc.createOffer().then((o) => pc.setLocalDescription(o));
    setTimeout(() => {
      if (rtcOk === null) {
        rtcOk = sawSrflx;
        rtcEl.innerHTML = sawSrflx
          ? '<span class="ok">OK — UDP works, peer connections can be made</span>'
          : '<span class="bad">BLOCKED — no UDP path out (matches would need TURN over TCP)</span>';
        finish();
        pc.close();
      }
    }, 10000);
  } catch (e) {
    rtcOk = false; rtcEl.innerHTML = '<span class="bad">FAILED — ' + e.message + '</span>'; finish();
  }

  try {
    const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/');
    const timer = setTimeout(() => {
      if (wsOk === null) { wsOk = false; wsEl.innerHTML = '<span class="bad">FAILED — timed out after 15s</span>'; finish(); ws.close(); }
    }, 15000);
    ws.onopen = () => { clearTimeout(timer); wsOk = true;
      wsEl.innerHTML = '<span class="ok">OPEN — WebSockets work</span>'; finish(); ws.close(); };
    ws.onerror = () => { clearTimeout(timer); if (wsOk === null) { wsOk = false;
      wsEl.innerHTML = '<span class="bad">FAILED — connection refused or blocked</span>'; finish(); } };
  } catch (e) {
    wsOk = false; wsEl.innerHTML = '<span class="bad">FAILED — ' + e.message + '</span>'; finish();
  }
</script>
</body>
</html>`;
