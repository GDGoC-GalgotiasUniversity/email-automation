# Email Automation

Send personalized emails (with inline embedded images) to a list of recipients from a CSV, using your own Gmail account via Google OAuth.

## Setup

1. Install dependencies (uses pnpm):

   ```bash
   pnpm install
   ```

2. Create Google OAuth credentials:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create an OAuth 2.0 Client ID (Web application).
   - **Authorized redirect URIs** — add both of these (Google allows several):
     ```
     http://localhost:3000/api/auth/callback/google
     https://localhost:3000/api/auth/callback/google
     ```
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://localhost:3000
     ```
   - Enable the **Gmail API** for your project.
   - (Optional) Add yourself as a test user while the app is in testing mode.

   > **The scheme matters.** `http://` and `https://` are *different* redirect
   > URIs to Google. Registering only the `https://` one makes sign-in fail with
   > `redirect_uri_mismatch`. Verify with `pnpm check:oauth` (step 4).

3. Configure environment:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a `NEXTAUTH_SECRET`
   (generate with `openssl rand -base64 32` or
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).

4. Verify the OAuth setup:

   ```bash
   pnpm check:oauth
   ```

   This asks Google which redirect URIs are actually registered for your client
   and prints exactly what to paste into the Google Cloud Console. It needs no
   browser login.

5. Run:

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000 and sign in with Google.

## CSV format

```csv
name,email
Alice,alice@example.com
Bob,bob@example.com
```

Columns are matched case-insensitively by name containing "name"/"email".

## Compose

- Use `{{name}}` and `{{email}}` placeholders for personalization.
- Upload an image, then click "Insert image into body" to embed it inline
  (via CID) instead of as an end attachment.

## Commands

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Start the app (frontend + API) with hot reload |
| `pnpm build`       | Production build (also type-checks)            |
| `pnpm start`       | Run the production build                       |
| `pnpm lint`        | Lint the code                                  |
| `pnpm check:oauth` | Diagnose Google OAuth redirect URI mismatches  |

## Notes

- Sending uses your Gmail account; daily sending limits apply.
- Tokens are stored in an encrypted JWT session cookie.
- If sign-in fails, the app redirects to `/auth-error`, which shows the exact
  error code (e.g. `AccessDenied`, `OAuthCallback`).
