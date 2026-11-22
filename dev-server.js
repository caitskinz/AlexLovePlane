// Local test server for "What's overhead".
// Serves this folder and forwards /api/... requests to the flight data APIs,
// exactly like the _redirects file does on Netlify.
// Needs Node 18 or newer. Run:  node dev-server.js   then open http://localhost:3000

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;
const PROXIES = {
  "/api/adsblol/":       "https://api.adsb.lol/v2/",
  "/api/adsbfi/":        "https://opendata.adsb.fi/api/v2/",
  "/api/airplaneslive/": "https://api.airplanes.live/v2/",
  "/api/adsbdb/":        "https://api.adsbdb.com/v0/",
};
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".json": "application/json",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  for (const [prefix, target] of Object.entries(PROXIES)) {
    if (url.pathname.startsWith(prefix)) {
      const upstream = target + url.pathname.slice(prefix.length) + url.search;
      try {
        const r = await fetch(upstream, { headers: { "User-Agent": "whats-overhead (personal project)" } });
        res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json" });
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        console.error("Proxy failed:", upstream, e.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Upstream request failed" }));
      }
      return;
    }
  }

  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`What's overhead is running at http://localhost:${PORT}`));
