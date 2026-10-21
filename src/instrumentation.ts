/**
 * Startup self-check.
 *
 * Redirect-URI mismatches are the #1 cause of "Access blocked / invalid
 * request" during Google sign-in, and the error Google shows does not make
 * the cause obvious. This runs once when the server boots and tells you
 * exactly what to paste into the Google Cloud Console -- or tells you it's
 * already correct.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_OAUTH_CHECK === "1") return;

  const { checkOAuthConfig } = await import("./lib/oauth-check");
  await checkOAuthConfig();
}
