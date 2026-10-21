/**
 * Diagnose Google OAuth redirect URI registration.
 *
 * Google validates the `redirect_uri` BEFORE the user logs in, so we can
 * probe the authorize endpoint to learn exactly which URIs are actually
 * registered for your OAuth client -- no browser login required.
 *
 * Usage:
 *   pnpm check:oauth
 *
 * Env (from .env.local):
 *   GOOGLE_CLIENT_ID     (required)
 *   NEXTAUTH_URL         (the URL this app is served from)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const clientId = process.env.GOOGLE_CLIENT_ID;
const authUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

if (!clientId || clientId.includes("your-google-client-id")) {
  console.error(
    "ERROR: GOOGLE_CLIENT_ID is not set in .env.local. Add it and re-run."
  );
  process.exit(1);
}

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const CALLBACK_PATH = "/api/auth/callback/google";
const CONTROL_URI = "https://example.invalid/definitely-not-registered-callback";

async function isRegistered(redirectUri) {
  const url =
    `${AUTHORIZE}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=diagnostic`;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (res.status !== 302) return false;
  const location = res.headers.get("location") || "";
  return !location.includes("/signin/oauth/error");
}

const origin = new URL(authUrl);
const port = origin.port || "3000";

const candidates = [
  `${origin.protocol}//${origin.host}${CALLBACK_PATH}`,
  `http://localhost:${port}${CALLBACK_PATH}`,
  `https://localhost:${port}${CALLBACK_PATH}`,
  `http://127.0.0.1:${port}${CALLBACK_PATH}`,
  `https://127.0.0.1:${port}${CALLBACK_PATH}`,
  CONTROL_URI,
];

console.log(`OAuth client : ${clientId}`);
console.log(`App served at : ${authUrl}`);
console.log("");

const results = [];
for (const uri of candidates) {
  let ok = false;
  try {
    ok = await isRegistered(uri);
  } catch (e) {
    console.error(`  network error for ${uri}: ${e.message}`);
  }
  results.push({ uri, ok });
  const isControl = uri === CONTROL_URI;
  const label = isControl ? "(control - must be REJECTED)" : "";
  console.log(`  ${ok ? "REGISTERED" : "not registered"}  ${uri} ${label}`);
}

const appUri = candidates[0];
const appOk = results[0].ok;
const control = results[results.length - 1];

console.log("");

if (control.ok) {
  console.error(
    "The control URI was accepted, so this probe is unreliable -- " +
      "Google may have changed its validation behaviour."
  );
  process.exit(2);
}

if (appOk) {
  console.log("PASS: the redirect URI this app uses IS registered.");
  console.log(`      ${appUri}`);
  process.exit(0);
}

console.error("FAIL: the redirect URI this app uses is NOT registered.");
console.error(`      app sends:   ${appUri}`);
const registered = results.filter((r) => r.ok).map((r) => r.uri);
if (registered.length) {
  console.error("      registered:  " + registered.join(", "));
  console.error("");
  console.error("FIX -- add BOTH of these to Google Cloud Console:");
  console.error("  Credentials > your OAuth client > Authorized redirect URIs");
  console.error("");
  console.error("    " + appUri);
  for (const r of registered) console.error("    " + r);
  console.error("");
  console.error(
    "  (You can keep the existing https:// entry -- Google allows several.)"
  );
} else {
  console.error("      Nothing is registered yet for this client.");
  console.error("");
  console.error("FIX -- add this to Google Cloud Console:");
  console.error("  Credentials > your OAuth client > Authorized redirect URIs");
  console.error("");
  console.error("    " + appUri);
}
process.exit(1);
