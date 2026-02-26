import app from "./app";
import { serveStatic } from "hono/bun";

const isProd = process.env.NODE_ENV === "production";

// ─── 本番: 静的ファイル配信 ───────────────────────────────────────
if (isProd) {
  app.use("*", serveStatic({ root: "./dist/static" }));
  app.get("*", serveStatic({ path: "./dist/static/index.html" }));
}

// ─── Health check ───────────────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

const port = Number(process.env.PORT ?? 3000);
console.log(`🚃 乗換案内 server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
