# Testmail

Testmail is a lightweight email-composition app that lets users authenticate with Google, choose a reusable message template, customize the content, and send the email through their own Gmail account.

The project uses a React + Vite frontend and an Express API backed by the Google OAuth 2.0 and Gmail APIs.

## Features

- Google sign-in using OAuth 2.0.
- Gmail message delivery with the `gmail.send` scope.
- Reusable email templates with recipient and sender placeholders.
- Editable recipient, subject, and message body.
- Session-based authentication with an HTTP-only cookie.
- Server-side validation for email fields and message content.
- Responsive interface for desktop and mobile screens.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| HTTP client | Axios |
| Backend | Node.js, Express 5 |
| Authentication | Google OAuth 2.0 |
| Email delivery | Gmail API |
| Sessions | express-session |

## Project structure

```text
Testmail/
├── src/
│   ├── context/          # React authentication context
│   ├── hooks/            # Authentication state and actions
│   ├── pages/            # Login and dashboard screens
│   └── services/         # API client
├── server/
│   ├── index.js          # Express API and Gmail integration
│   └── .env.example      # Backend configuration template
├── .env.example          # Frontend configuration template
└── package.json
```

## Requirements

- Node.js 20 or later.
- npm.
- A Google Cloud project.
- Gmail API enabled in the Google Cloud project.
- An OAuth 2.0 Client ID configured as a **Web application**.

## Google Cloud configuration

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project and enable the **Gmail API**.
3. Configure the OAuth consent screen. While the app is in testing mode, add the Gmail account you will use under **Test users**.
4. Create an OAuth 2.0 client ID with the **Web application** type.
5. Add this authorized redirect URI:

   ```text
   http://localhost:4000/api/auth/google/callback
   ```

6. The application requests these scopes:

   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.send`

The Gmail scope is limited to sending messages. The app does not request permission to read or manage the mailbox.

## Installation

Clone your fork and install the dependencies:

```bash
git clone https://github.com/MESLIMOHAMEDM22005188/Testmail.git
cd Testmail
npm install
cd server
npm install
cd ..
```

## Environment configuration

Create `server/.env` from the example.

macOS/Linux:
```bash
cp server/.env.example server/.env
```

Windows PowerShell:
```powershell
Copy-Item server/.env.example server/.env
```

Set the Google OAuth credentials and a long, random session secret in `server/.env`. Generate a suitable secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Create the frontend environment file only when you need to override the defaults:

```bash
cp .env.example .env
```

By default, Vite proxies `/api` requests to `http://localhost:4000`. Set `VITE_PROXY_TARGET` if your backend uses another local address. For a separately hosted API, set `VITE_API_URL` to its public API base URL, including `/api`.

Never commit real `.env` files or expose the Google client secret in frontend variables.

## Run locally

Start the backend in the first terminal:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal from the project root:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually [http://localhost:5173](http://localhost:5173).

To create a production frontend build:

```bash
npm run lint
npm run build
```

Start the API in production with:

```bash
cd server
npm start
```

For production deployment, configure HTTPS, set `NODE_ENV=production`, use a persistent session store (rather than Express MemoryStore), and configure `CLIENT_URL`, `GOOGLE_REDIRECT_URI`, and the OAuth redirect URI to match the deployed domains.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Basic API health check |
| GET | `/api/auth/url` | Generate a Google OAuth URL |
| GET | `/api/auth/google/callback` | Handle the OAuth callback |
| GET | `/api/auth/status` | Return the current session status |
| POST | `/api/auth/logout` | Destroy the current session |
| GET | `/api/templates` | Retrieve message templates (authenticated) |
| POST | `/api/email/send` | Send a Gmail message (authenticated) |

Example send request:

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Hi there,\\n\\nThis message was sent with Testmail."
}
```

## Improvements in this fork

This fork includes a focused maintenance and reliability pass over the original implementation.

### Backend and security

- **OAuth state validation:** Adds a random, short-lived state value to the authorization flow and validates it on callback to mitigate login CSRF.
- **Session hardening:** Removes the fallback development secret, requires a strong session secret, regenerates the session after successful sign-in, and configures HTTP-only, SameSite cookies with production-aware Secure behavior.
- **Safer API defaults:** Disables the Express-powered-by header and applies a JSON request-size limit.
- **Input validation:** Validates recipient addresses and enforces sensible subject/body size limits before calling Gmail.
- **Header-injection protection:** Rejects newline characters in subjects and encodes non-ASCII subject text using MIME encoded words.
- **Correct MIME body encoding:** Encodes the message body as UTF-8 base64 before constructing the Gmail raw message, preserving Unicode and multiline content reliably.
- **Clearer Gmail errors:** Handles expired/invalid credentials separately and returns actionable API messages without exposing provider internals.
- **Session cleanup:** Destroys the server-side session and clears the matching cookie during logout.

### Frontend and developer experience

- **Configurable API URL:** Removes the hard-coded localhost API URL and uses environment configuration with a Vite development proxy.
- **More reliable template loading:** Avoids refetching templates whenever the selected template changes and prevents state updates after unmount.
- **Better form behavior:** Uses a real form submit handler, browser validation, input limits, and accessible feedback/status messages.
- **Authentication UX:** Adds loading and error states and refreshes the session after the OAuth redirect.
- **Responsive UI:** Improves the layout, spacing, focus visibility, and small-screen behavior.
- **Project cleanup:** Replaces starter branding, adds environment examples, and provides reproducible setup instructions.

## Security and deployment notes

- OAuth credentials and session secrets belong only in the backend environment.
- Use HTTPS in production. Secure cookies are enabled when `NODE_ENV=production`.
- The default Express MemoryStore is intended for local development only. Use a supported persistent session store in production.
- The OAuth state store in this implementation is in-memory. For a multi-instance deployment, use a shared store for OAuth state and sessions.
- This is a practical starter application, not a complete production email platform. Add monitoring, rate limiting, automated tests, and a deployment-specific session store before exposing it to public traffic.

## Acknowledgements

Testmail is based on an existing open-source project and this repository is a maintenance-focused fork. Please review the original project's license and preserve its attribution requirements when redistributing.
