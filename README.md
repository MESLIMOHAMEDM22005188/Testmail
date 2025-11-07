# Testmail

Simple demo app that lets a user sign in with Google and send Gmail messages using predefined templates.

## Prerequisites

- Node.js 18+
- Google Cloud project with Gmail API enabled
- OAuth 2.0 client ID (Web application)

## Getting Started

```bash
npm install
cd server
npm install
cd ..

# start backend
cd server
npm run dev

# in another terminal start frontend
cd ..
npm run dev
```

## Environment Variables

Create `server/.env`:

```
PORT=4000
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=...
```

Update `CLIENT_URL` if Vite selects a different port.

## OAuth Setup

1. Add the redirect URI in Google Cloud Console: `http://localhost:4000/api/auth/google/callback`.
2. On the consent screen, add `gmail.send`, `openid`, `email`, `profile` scopes.
3. While in testing mode, add your Gmail address under Test users.

## Sending Email

After logging in, choose a template, fill in recipient email/name, and click **Send email**. Messages are sent from the signed-in Gmail account.
