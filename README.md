# Testmail

**A lightweight Gmail email composer built with React, Vite, Node.js, and the Gmail API.**

Testmail lets you sign in with your Google account, start from a reusable email template, personalize the message, and send it directly through Gmail. This fork also includes improvements to authentication handling, input validation, email encoding, frontend usability, and project documentation.

> Testmail is a learning and starter project. It is not intended to be an enterprise email marketing platform.

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Google Cloud setup](#google-cloud-setup)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Run the application](#run-the-application)
- [API reference](#api-reference)
- [Improvements in this fork](#improvements-in-this-fork)
- [Security and production considerations](#security-and-production-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

Testmail provides a simple workflow for composing and sending emails:

1. Sign in with Google.
2. Choose one of the available message templates.
3. Enter the recipient's email address and, optionally, their name.
4. Edit the subject and message body.
5. Send the message through the authenticated Gmail account.

The application uses Google's OAuth 2.0 flow for authentication and the Gmail API for message delivery. Google credentials remain on the backend; the frontend communicates with the API using a session cookie.

## Features

- **Google authentication** — sign in with an OAuth 2.0 Google account.
- **Gmail integration** — send messages using the Gmail API.
- **Reusable templates** — start with a check-in, invitation, or thank-you message.
- **Personalized content** — templates support recipient and sender placeholders.
- **Editable messages** — customize the recipient, subject, and body before sending.
- **Session-based access** — protect email and template endpoints behind authentication.
- **Input validation** — validate addresses and enforce message length limits on the server.
- **Responsive interface** — use the composer on desktop and mobile screens.

## How it works

```text
┌────────────────────┐
│   React frontend   │
│  Login / Composer  │
└─────────┬──────────┘
          │ HTTP + session cookie
          ▼
┌────────────────────┐
│    Express API     │
│ Auth / Validation  │
└─────────┬──────────┘
          │ OAuth 2.0 access token
          ▼
┌────────────────────┐
│     Google APIs    │
│  OAuth 2.0 / Gmail │
└────────────────────┘
```

The frontend never receives the Google client secret. The backend manages the OAuth callback, stores the authenticated session, validates outgoing message data, and submits the message to Gmail.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite |
| Routing | React Router |
| HTTP client | Axios |
| Backend | Node.js 20+, Express 5 |
| Authentication | Google OAuth 2.0 |
| Email delivery | Google Gmail API |
| Session management | express-session |
| Development tooling | ESLint, Nodemon |

## Project structure

```text
Testmail/
├── server/
│   ├── index.js              # Express API, OAuth flow and Gmail integration
│   ├── .env.example          # Backend environment template
│   └── package.json
├── src/
│   ├── context/
│   │   └── AuthContext.jsx   # Shared authentication context
│   ├── hooks/
│   │   └── useAuthProvider.js
│   ├── pages/
│   │   ├── Dashboard.jsx     # Email composer and templates
│   │   └── Login.jsx         # Google sign-in screen
│   ├── services/
│   │   └── api.js            # Axios API client
│   ├── App.jsx
│   └── main.jsx
├── .env.example              # Frontend environment template
├── index.html
├── package.json
└── README.md
```

## Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) 20 or later.
- npm (included with Node.js).
- A Google account for testing.
- A Google Cloud project with the Gmail API enabled.

Check your installed versions:

```bash
node --version
npm --version
```

## Google Cloud setup

Testmail requires a Google OAuth 2.0 client and access to the Gmail API.

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select an existing one.
3. Open **APIs & Services → Library** and enable the **Gmail API**.
4. Configure the OAuth consent screen. If the application is in testing mode, add the Google account you will use as a test user.
5. Open **APIs & Services → Credentials**.
6. Create an **OAuth client ID** and choose **Web application**.
7. Add the following authorized redirect URI:

   ```text
   http://localhost:4000/api/auth/google/callback
   ```

8. Copy the OAuth **Client ID** and **Client Secret**. You will add them to the backend environment file in the next section.

### OAuth scopes

The application requests the following scopes:

| Scope | Purpose |
| --- | --- |
| `openid` | Identify the signed-in Google account |
| `email` | Retrieve the account email address |
| `profile` | Retrieve basic profile information |
| `https://www.googleapis.com/auth/gmail.send` | Send email messages |

The Gmail permission is limited to sending messages. Testmail does not request permission to read, delete, or manage mailbox messages.

## Installation

Clone the repository:

```bash
git clone https://github.com/MESLIMOHAMEDM22005188/Testmail.git
cd Testmail
```

Install the frontend dependencies:

```bash
npm ci
```

Install the backend dependencies:

```bash
cd server
npm ci
cd ..
```

If you do not have a lockfile for a package directory, use `npm install` instead of `npm ci`.

## Environment variables

The backend and frontend use separate environment files.

### 1. Backend configuration

Create `server/.env` from the example.

macOS / Linux:

```bash
cp server/.env.example server/.env
```

Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env`:

```dotenv
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

SESSION_SECRET=replace-with-a-long-random-secret
SESSION_COOKIE_NAME=testmail.sid
```

Generate a strong session secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `SESSION_SECRET`. Keep this value private.

### 2. Frontend configuration

For a standard local setup, no frontend environment file is required. Vite proxies requests beginning with `/api` to `http://localhost:4000`.

To customize the proxy target, create a root-level `.env` file:

```dotenv
VITE_PROXY_TARGET=http://localhost:4000
```

If the frontend must call a separately hosted API directly, configure:

```dotenv
VITE_API_URL=https://your-api-domain.example/api
```

Only public configuration belongs in frontend variables. **Never put Google client secrets or session secrets in a `VITE_*` variable.**

## Run the application

You need two terminal windows: one for the backend and one for the frontend.

### Terminal 1 — Start the backend

```bash
cd server
npm run dev
```

The API runs on:

```text
http://localhost:4000
```

### Terminal 2 — Start the frontend

From the project root:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

[http://localhost:5173](http://localhost:5173)

You can now sign in with the Google account configured in your OAuth consent screen.

### Build the frontend

Run these commands from the project root:

```bash
npm run lint
npm run build
```

To preview the production frontend build locally:

```bash
npm run preview
```

### Start the backend without Nodemon

From the `server/` directory:

```bash
npm start
```

## API reference

All endpoints use the `/api` prefix. Authenticated endpoints require the session cookie created during Google sign-in.

| Method | Endpoint | Authentication | Description |
| --- | --- |---| --- |
| `GET` | `/api/health` | No | API health check |
| `GET` | `/api/auth/url` | No | Create a Google sign-in URL |
| `GET` | `/api/auth/google/callback` | OAuth callback | Complete Google authentication |
| `GET` | `/api/auth/status` | Session | Check the current sign-in status |
| `POST` | `/api/auth/logout` | Session | Destroy the current session |
| `GET` | `/api/templates` | Yes | Retrieve available email templates |
| `POST` | `/api/email/send` | Yes | Send an email through Gmail |

### Send an email

Example request to `POST /api/email/send`:

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Hi there,\n\nThis message was sent with Testmail."
}
```

A successful request returns a response similar to:

```json
{
  "success": true,
  "messageId": "gmail-message-id"
}
```

The message ID is supplied by Gmail. Error responses include a human-readable `message` field.

## Improvements in this fork

This fork focuses on security, reliability, maintainability, and a clearer developer experience.

### Backend and authentication

- **OAuth state protection:** generate a cryptographically random state value, store it in the session, and validate it during the callback.
- **Session fixation mitigation:** regenerate the session after successful Google authentication.
- **Stronger configuration:** require Google OAuth credentials and a session secret of at least 32 characters. The application no longer silently falls back to a hard-coded secret.
- **Safer cookies:** use HTTP-only and SameSite cookies, with the Secure flag enabled in production.
- **Verified profile retrieval:** retrieve basic account information through Google's OAuth user-info endpoint instead of trusting an unverified client-side token payload.
- **Restricted API access:** require an authenticated session before returning templates or sending email.
- **Request limits:** limit JSON request size and enforce maximum lengths for recipient, subject, and message body.
- **Header-injection protection:** reject newline characters in subject headers.
- **Unicode-safe email content:** encode message subjects and UTF-8 message bodies before creating the Gmail API raw message.
- **Token refresh persistence:** save refreshed Google tokens back into the active session.
- **Send throttling:** apply a basic per-session limit to reduce accidental bursts of outgoing messages.
- **Cleaner errors:** return clearer API error messages without exposing provider response details to the frontend.

### Frontend and user experience

- **Configurable API endpoint:** remove the hard-coded API host and support environment-based configuration.
- **Development proxy:** route local `/api` requests through Vite to the backend.
- **Improved authentication flow:** add session loading, sign-in error feedback, and a session refresh after the OAuth redirect.
- **More predictable template loading:** separate template retrieval from template selection and avoid updating component state after unmount.
- **Safer form handling:** use browser validation, required fields, and input length limits.
- **Accessible feedback:** provide status and error messages that can be announced by assistive technologies.
- **Responsive styling:** improve layout behavior on narrow screens, keyboard focus indicators, and visual consistency.
- **Updated application metadata:** replace starter-page branding and add a descriptive page title and metadata.

### Documentation and project setup

- Add separate frontend and backend environment examples.
- Document Google Cloud and OAuth configuration.
- Explain the local development workflow and available API routes.
- Synchronize package metadata and lockfile names.

## Security and production considerations

The current configuration is suitable as a development baseline, but additional work is required before public production deployment.

- **Use HTTPS:** deploy behind HTTPS and set `NODE_ENV=production` so secure cookies are enabled.
- **Use a persistent session store:** Express MemoryStore is not designed for production. Replace it with a maintained store backed by Redis or another persistent database.
- **Use shared state in multi-instance deployments:** the current send-throttle map is process-local. Move rate-limit state to a shared store if the API runs on multiple instances.
- **Protect secrets:** keep OAuth credentials and session secrets in your hosting provider's secret/environment manager.
- **Restrict origins:** set `CLIENT_URL` to the exact frontend origin and configure the matching Google OAuth redirect URI.
- **Review OAuth publishing requirements:** Google may require additional consent-screen verification before the application can be used by a wider audience.
- **Add automated tests and monitoring:** test authentication, validation, message encoding, and failure scenarios before relying on the service.

Do not use the default in-memory session store as a production session backend.

## Troubleshooting

### Google returns a redirect URI error

Make sure the redirect URI in Google Cloud matches `GOOGLE_REDIRECT_URI` exactly:

```text
http://localhost:4000/api/auth/google/callback
```

The protocol, hostname, port, and path must all match.

### The backend refuses to start

Check that:

- `server/.env` exists.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- `SESSION_SECRET` contains at least 32 characters.
- Backend dependencies have been installed with npm.

### The frontend cannot reach the API

Check that the backend is running on port `4000`. If you changed its address, update `VITE_PROXY_TARGET` or `VITE_API_URL` as appropriate, then restart the Vite development server.

### Google sign-in succeeds but the app does not recognize the session

Make sure the frontend and backend origins match the configured `CLIENT_URL`, that requests include credentials, and that the browser accepts the session cookie. For local development, use the same hostname consistently (for example, do not mix `localhost` and `127.0.0.1`).

### Gmail rejects a message

Check that the Gmail API is enabled, the signed-in account has granted the requested send permission, and the OAuth session is still valid. If the session has expired, sign in again.

## Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the frontend lint and build checks.
5. Open a pull request with a clear description of the changes.

Please avoid committing credentials, tokens, real environment files, or personal data.

## License

Check the repository's license file for the applicable terms. If this fork is derived from another open-source project, retain the original copyright notices and comply with its license requirements.
