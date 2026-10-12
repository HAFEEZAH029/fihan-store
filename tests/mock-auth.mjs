import { createServer } from "node:http";

// Loopback-only test fixture. The real app has no authentication bypass.
const id = "11111111-1111-4111-8111-111111111111";
createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ready"); return; }
  if (req.url.startsWith("/auth/v1/authorize")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Google OAuth test destination</h1>");
    return;
  }
  let payload;
  try { payload = JSON.parse(Buffer.from((req.headers.authorization || "").split(".")[1], "base64url").toString()); } catch {}
  res.setHeader("Content-Type", "application/json");
  if (req.url.startsWith("/auth/v1/user") && payload?.sub === id) {
    res.writeHead(200);
    res.end(JSON.stringify({ id, aud: "authenticated", role: "authenticated", email: "shopper@example.com", app_metadata: { provider: "google", providers: ["google"] }, user_metadata: { full_name: "Test Shopper" }, created_at: new Date().toISOString() }));
  } else {
    res.writeHead(401);
    res.end(JSON.stringify({ message: "Not signed in", error_code: "bad_jwt" }));
  }
}).listen(54329, "127.0.0.1");
