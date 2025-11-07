import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const {
  PORT = 4000,
  CLIENT_URL = 'http://localhost:5173',
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SESSION_SECRET,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !SESSION_SECRET) {
  console.warn(
    '⚠️  Missing required env vars. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, SESSION_SECRET.'
  );
}

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
  })
);

const TEMPLATES = [
  {
    id: 'friendly-check-in',
    name: 'Friendly Check-In',
    subject: 'Just checking in 😊',
    body: `Hi {{name}},\n\nI hope you are doing well! Just wanted to check in and see how everything is going.\n\nBest,\n{{sender}}`,
  },
  {
    id: 'event-invite',
    name: 'Event Invite',
    subject: "You're invited!",
    body: `Hello {{name}},\n\nI'm hosting a small get-together this weekend and would love for you to join! Let me know if you can make it.\n\nCheers,\n{{sender}}`,
  },
  {
    id: 'thank-you',
    name: 'Thank You Note',
    subject: 'Thank you so much',
    body: `Dear {{name}},\n\nThank you for your help recently. It meant a lot to me and I appreciate your support.\n\nWarm regards,\n{{sender}}`,
  },
];

const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'openid', 'email', 'profile'];

function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function getSessionTokens(req) {
  return req.session?.tokens;
}

function ensureAuthenticated(req, res, next) {
  if (!getSessionTokens(req)) {
    return res.status(401).json({ message: 'Not authenticated with Google' });
  }
  next();
}

app.get('/api/auth/url', (req, res) => {
  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url: authUrl });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const oauth2Client = createOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    res.redirect(`${CLIENT_URL}/dashboard?authenticated=true`);
  } catch (error) {
    console.error('OAuth callback error', error);
    res.status(500).send('Failed to authenticate with Google');
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = getSessionTokens(req);
  res.json({ authenticated: Boolean(tokens), profile: tokens?.id_token ? decodeIdToken(tokens.id_token) : null });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/templates', ensureAuthenticated, (req, res) => {
  res.json(TEMPLATES);
});

app.post('/api/email/send', ensureAuthenticated, async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ message: 'to, subject, and body are required' });
  }

  const oauth2Client = createOAuthClient();
  const tokens = getSessionTokens(req);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = tokens?.id_token ? decodeIdToken(tokens.id_token) : null;

  try {
    const rawMessage = createRawMessage({
      from: profile?.email ?? 'me',
      to,
      subject,
      body,
    });
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to send email', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function createRawMessage({ from, to, subject, body }) {
  const messageLines = [
    `From: ${from}`,
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ];
  const message = messageLines.join('\r\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeIdToken(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Failed to decode id token', error);
    return null;
  }
}


