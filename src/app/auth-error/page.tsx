"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const HINTS: Record<string, string> = {
  OAuthSignin: "Could not start the sign-in request. Check GOOGLE_CLIENT_ID/SECRET.",
  OAuthCallback: "Google did not send the authorization code back. Check the redirect URI.",
  OAuthCreateAccount: "Google tried to create a new account for this email.",
  OAuthAccountNotLinked: "This email is linked to a different provider.",
  EmailSignin: "The email sign-in link was invalid or expired.",
  Callback: "The OAuth callback failed. Check the redirect URI matches exactly.",
  OAuthAccountNotVerified: "The Google account is not verified.",
  AccessDenied: "Permission denied. Add your account under OAuth consent screen > Test users.",
  Configuration: "The server is misconfigured. Check the env variables.",
  Verification: "Google verification problem. The OAuth consent screen may be incomplete.",
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Unknown";
  const hint = HINTS[error] ?? "";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Sign-in failed</h1>
      <p className="text-sm text-gray-500">Error code</p>
      <code className="px-4 py-2 bg-gray-100 rounded font-mono text-lg">
        {error}
      </code>
      {hint && <p className="max-w-md text-center text-gray-700">{hint}</p>}
      <a
        href="/"
        className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Back to app
      </a>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <ErrorContent />
    </Suspense>
  );
}
