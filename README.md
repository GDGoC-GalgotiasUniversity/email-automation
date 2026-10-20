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
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Enable the **Gmail API** for your project.
   - (Optional) Add yourself as a test user while the app is in testing mode.

3. Configure environment:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a `NEXTAUTH_SECRET`
   (generate with `openssl rand -base64 32`).

4. Run:

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

## Notes

- Sending uses your Gmail account; daily sending limits apply.
- Tokens are stored in an encrypted JWT session cookie.