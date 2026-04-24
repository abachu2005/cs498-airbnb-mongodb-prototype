// orchestrates a full-data demo capture in a single foreground process.
//
// what it does:
//   1. spawns `node web/server.js` as a child (full data load, no LIMIT_* caps)
//   2. polls /api/health every 5s until ready=true (the load takes ~6.5min)
//   3. calls runCapture({ full: true }) to screenshot every query panel
//   4. cleanly shuts the child server down and exits
//
// run it via: node scripts/capture_full.js
//
// keeping everything inside one parent process avoids the shell-teardown problem
// where backgrounded servers got SIGINT'd when the outer Shell call's
// block_until_ms expired. the parent is alive for the full ~7min, so the child
// stays alive too.

const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const { runCapture } = require("./capture_demo");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const SERVER_TIMEOUT_MS = 20 * 60 * 1000; // 20 min ceiling for the full load
const POLL_EVERY_MS = 5000;

function getHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/api/health", timeout: 5000 },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function waitForReady(port) {
  const startedAt = Date.now();
  let lastUptime = -1;
  while (true) {
    const h = await getHealth(port);
    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(0);
    if (h == null) {
      console.log(`[orchestrator] waiting... (${elapsedSec}s) — no response yet`);
    } else if (h.err) {
      throw new Error(`web server boot failed: ${h.err}`);
    } else if (h.ready) {
      console.log(`[orchestrator] READY after ${elapsedSec}s`);
      console.log(`[orchestrator] counts: ${JSON.stringify(h.counts)}`);
      console.log(`[orchestrator] q1 dates: ${JSON.stringify(h.q1_default_dates)}`);
      console.log(`[orchestrator] q2 month: ${h.q2_default_month}, q3 month: ${h.q3_default_month}`);
      return h;
    } else {
      const u = h.uptime_ms != null ? `uptime=${(h.uptime_ms / 1000).toFixed(0)}s` : "";
      if (h.uptime_ms !== lastUptime) {
        console.log(`[orchestrator] waiting... (${elapsedSec}s) ${u} — boot in progress`);
        lastUptime = h.uptime_ms;
      }
    }
    if (Date.now() - startedAt > SERVER_TIMEOUT_MS) {
      throw new Error("web server failed to become ready within timeout");
    }
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
  }
}

async function shutdown(child) {
  if (!child || child.killed) return;
  console.log("[orchestrator] sending SIGTERM to web server");
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const t = setTimeout(() => {
      console.log("[orchestrator] SIGTERM didn't take, sending SIGKILL");
      try { child.kill("SIGKILL"); } catch (_) {}
      resolve();
    }, 15000);
    child.on("exit", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

(async () => {
  const root = path.join(__dirname, "..");
  console.log(`[orchestrator] spawning  node web/server.js  (PORT=${PORT}, full data)`);

  // detached:false keeps the child in our process group so SIGTERM from us
  // controls its lifecycle. stdio inherited so we see loader logs in real time.
  const child = spawn("node", ["--max-old-space-size=8192", "web/server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });

  child.on("exit", (code, sig) => {
    console.log(`[orchestrator] web server child exited (code=${code}, signal=${sig})`);
  });

  // make sure we always tear down the child even on unexpected exit
  const cleanup = async () => {
    try { await shutdown(child); } catch (_) {}
  };
  process.on("SIGINT", async () => { await cleanup(); process.exit(130); });
  process.on("SIGTERM", async () => { await cleanup(); process.exit(143); });

  try {
    await waitForReady(PORT);
    // small buffer so any post-ready logging settles before we screenshot
    await new Promise((r) => setTimeout(r, 1500));
    await runCapture({ port: PORT, full: true });
    console.log("[orchestrator] capture complete");
  } catch (e) {
    console.error("[orchestrator] failed:", e && e.message ? e.message : e);
    await cleanup();
    process.exit(1);
  }

  await cleanup();
  console.log("[orchestrator] done");
  process.exit(0);
})();
