import crypto from 'node:crypto';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const {
  PORT = 4000,
  NODE_ENV = 'development',
  CLIENT_URL = 'http://localhost:5173',
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/api/auth/google/callback`,
  SESSION_SECRET,
  SESSION_COOKIE_NAME = 'testmail.sid',
} = process.env;

const isProduction = NODE_ENV === 'production';
const missingEnv = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET']
  .filter((key) => !process.env[key]);

if (missingEnv.length) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}
if (SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}

const app = express();
app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: SESSION_COOKIE_NAME,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

const TEMPLATES = [
  {
    id: 'friendly-check-in',
    name: 'Friendly Check-In',
    subject: 'Just checking in',
    body: 'Hi {{name}},\n\nI hope you are doing well! Just wanted to check in and see how everything is going.\n\nBest,\n{{sender}}',
  },
  {
    id: 'event-invite',
    name: 'Event Invite',
    subject: "You're invited!",
    body: "Hello {{name}},\n\nI'm hosting a small get-together this weekend and would love for you to join! Let me know if you can make it.\n\nCheers,\n{{sender}}",
  },
  {
    id: 'thank-you',
    name: 'Thank You Note',
    subject: 'Thank you so much',
    body: 'Dear {{name}},\n\nThank you for your help recently. It meant a lot to me and I appreciate your support.\n\nWarm regards,\n{{sender}}',
  },
];

const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'openid', 'email', 'profile'];

function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function ensureAuthenticated(req, res, next) {
  if (!req.session?.tokens?.access_token) {
    return res.status(401).json({ message: 'Authentication required. Please sign in again.' });
  }
  next();
}

function isValidEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function containsHeaderBreak(value) {
  return typeof value !== 'string' || /[\r\n]/.test(value);
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function createRawMessage({ to, subject, body }) {
  const message = [
    `To: ${to.trim()}`,
    `Subject: ${encodeHeader(subject.trim())}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64'),
  ].join('\r\n');

  return Buffer.from(message, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

app.get('/api/auth/url', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  req.session.oauthStateCreatedAt = Date.now();

  const url = createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
  req.session.save((error) => {
    if (error) return res.status(500).json({ message: 'Could not initialize Google sign-in.' });
    res.json({ url });
  });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${CLIENT_URL}/?auth_error=consent_denied`);

  const stateIsValid = typeof state === 'string'
    && typeof req.session.oauthState === 'string'
    && state === req.session.oauthState
    && Date.now() - req.session.oauthStateCreatedAt <= 10 * 60 * 1000;

  if (typeof code !== 'string' || !stateIsValid) {
    return res.status(400).send('Invalid or expired OAuth state. Please restart sign-in.');
  }

  try {
    const { tokens } = await createOAuthClient().getToken(code);
    if (!tokens.access_token) throw new Error('Google did not return an access token.');

    const oauthClient = createOAuthClient();
    oauthClient.setCredentials(tokens);
    const { data: profile } = await google.oauth2({ version: 'v2', auth: oauthClient }).userinfo.get();

    await new Promise((resolve, reject) => {
      req.session.regenerate((sessionError) => {
        if (sessionError) return reject(sessionError);
        req.session.tokens = tokens;
        req.session.profile = {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        };
        req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
      });
    });

    res.redirect(`${CLIENT_URL}/dashboard?authenticated=true`);
  } catch (callbackError) {
    console.error('OAuth callback failed:', callbackError.message);
    res.redirect(`${CLIENT_URL}/?auth_error=oauth_failed`);
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = req.session?.tokens;
  res.json({
    authenticated: Boolean(tokens?.access_token),
    profile: req.session?.profile ?? null,
  });
});

app.post('/api/auth/logout', (req, res, next) => {
  if (!req.session) return res.json({ success: true });
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
    });
    res.json({ success: true });
  });
});

app.get('/api/templates', ensureAuthenticated, (_req, res) => {
  res.json(TEMPLATES);
});

app.post('/api/email/send', ensureAuthenticated, async (req, res) => {
  const { to, subject, body } = req.body ?? {};

  if (!isValidEmail(to)) {
    return res.status(400).json({ message: 'Please provide a valid recipient email address.' });
  }
  if (typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 998) {
    return res.status(400).json({ message: 'Subject must contain between 1 and 998 characters.' });
  }
  if (containsHeaderBreak(subject)) {
    return res.status(400).json({ message: 'Subject contains invalid line breaks.' });
  }
  if (typeof body !== 'string' || body.trim().length === 0 || body.length > 100000) {
    return res.status(400).json({ message: 'Email body must contain between 1 and 100,000 characters.' });
  }

  const oauthClient = createOAuthClient();
  oauthClient.setCredentials(req.session.tokens);
  oauthClient.on('tokens', (tokens) => {
    req.session.tokens = { ...req.session.tokens, ...tokens };
    req.session.save((error) => {
      if (error) console.error('Could not persist refreshed Google tokens:', error.message);
    });
  });

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauthClient });
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: createRawMessage({ to, subject, body }) },
    });
    res.json({ success: true, messageId: result.data.id ?? null });
  } catch (sendError) {
    const status = sendError.code === 401 || sendError.response?.status === 401 ? 401 : 502;
    console.error('Gmail send failed:', sendError.message);
    res.status(status).json({
      message: status === 401
        ? 'Your Google session has expired. Please sign in again.'
        : 'Gmail could not send this message. Please try again.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error.message);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Testmail API listening on port ${PORT} (${NODE_ENV})`);
});
