/**
 * Shared OAuth redirect-URI diagnostics.
 *
 * Google validates the `redirect_uri` BEFORE the user logs in, so we can
 * probe the authorize endpoint to learn exactly which URIs are registered
 * for an OAuth client -- no browser login required.
 *
 * Used by:
 *   - scripts/check-oauth.mjs  (pnpm check:oauth)
 *   - src/instrumentation.ts  (startup self-check)
 */

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";

export const CALLBACK_PATH = "/api/auth/callback/google";

/**
 * Google redirects the browser to /signin/oauth/error?authError=... when the
 * redirect_uri is not registered, and continues to the sign-in page when it
 * is. That difference is what we key off.
 */
export async function isRedirectUriRegistered(
  clientId: string,
  redirectUri: string
): Promise<boolean> {
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

/** The redirect URI this app will actually send to Google. */
export function appRedirectUri(baseUrl: string): string {
  const url = new URL(baseUrl);
  return `${url.origin}${CALLBACK_PATH}`;
}

/** Candidate URIs worth probing, in order of usefulness. */
export function candidateUris(baseUrl: string): string[] {
  const url = new URL(baseUrl);
  const port = url.port || "3000";
  const path = CALLBACK_PATH;
  return [
    `${url.protocol}//${url.host}${path}`,
    `http://localhost:${port}${path}`,
    `https://localhost:${port}${path}`,
    `http://127.0.0.1:${port}${path}`,
    `https://127.0.0.1:${port}${path}`,
  ];
}

/** A URI that is guaranteed not to be registered -- used to validate the probe. */
export const CONTROL_URI =
  "https://example.invalid/definitely-not-registered-callback";

/**
 * Verify the OAuth redirect URI is registered and print a clear report.
 * Never throws -- a failed check must not stop the app from booting.
 */
export async function checkOAuthConfig(): Promise<{
  ok: boolean;
  appUri: string;
  registered: string[];
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  const appUri = appRedirectUri(baseUrl);
  const empty = { ok: false, appUri, registered: [] as string[] };

  if (!clientId || clientId.includes("your-google-client-id")) {
    console.warn(
      "[oauth] GOOGLE_CLIENT_ID is not set -- skipping redirect URI check."
    );
    return empty;
  }

  try {
    const controlOk = await isRedirectUriRegistered(clientId, CONTROL_URI);
    if (controlOk) {
      console.warn(
        "[oauth] Could not verify redirect URI (probe behaviour changed)."
      );
      return empty;
    }

    const results = await Promise.all(
      candidateUris(baseUrl).map(async (uri) => ({
        uri,
        ok: await isRedirectUriRegistered(clientId, uri),
      }))
    );
    const registered = results.filter((r) => r.ok).map((r) => r.uri);
    const ok = results[0].ok;

    if (ok) {
      console.log(`[oauth] redirect URI registered: ${results[0].uri}`);
    } else {
      console.warn("");
      console.warn("  ┌───────────────────────────────────────────────┐");
      console.warn("  │  Google sign-in will FAIL until you fix this  │");
      console.warn("  └───────────────────────────────────────────────┘");
      console.warn(
        `[oauth] this app sends:  ${results[0].uri}\n` +
          `[oauth] NOT registered in Google Cloud Console.`
      );
      console.warn("");
      console.warn("  Google Cloud Console > Credentials > your OAuth client");
      console.warn("  > Authorized redirect URIs > ADD URI:");
      console.warn("");
      console.warn(`    ${results[0].uri}`);
      for (const uri of registered) console.warn(`    ${uri}`);
      console.warn("");
      console.warn("  (Keep the existing https:// entry too -- Google allows several.)");
      console.warn("");
      console.warn("  Then run: pnpm check:oauth   (to verify)");
      console.warn("");
    }

    return { ok, appUri, registered };
  } catch (e) {
    console.warn("[oauth] redirect URI check failed:", (e as Error).message);
    return empty;
  }
}
