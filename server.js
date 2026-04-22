import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env.local in development; production uses Cloud Run env vars
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// CORS: permissive in prod since frontend is same-origin; restricted in dev
app.use(cors({
  origin: isProd
    ? true  // same-origin in production
    : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Google Calendar Auth Routes ─────────────────────────────────────
// Step 1: Redirect user to Google OAuth consent screen
app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.freebusy');

  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CALENDAR_CLIENT_ID not configured', code: 'MISSING_CONFIG' });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback — exchange code for tokens
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No authorization code received', code: 'NO_CODE' });
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Google Calendar credentials not configured', code: 'MISSING_CONFIG' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return res.status(400).json({ error: tokens.error_description || tokens.error, code: 'TOKEN_ERROR' });
    }

    // TODO: Store tokens securely (database, encrypted session, etc.)
    // For now, log success and redirect back to the app
    console.log('Google Calendar tokens received. Access token expires in', tokens.expires_in, 'seconds.');

    res.redirect('/?google_auth=success');
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).json({ error: 'Failed to exchange authorization code', code: 'EXCHANGE_FAILED' });
  }
});

// ─── Google Calendar API Routes ──────────────────────────────────────

// GET /api/calendar/freebusy — check availability for consultants
app.get('/api/calendar/freebusy', async (req, res) => {
  const { calendarIds, dateMin, dateMax } = req.query;

  if (!calendarIds || !dateMin || !dateMax) {
    return res.status(400).json({
      error: 'Required: calendarIds (comma-separated), dateMin, dateMax',
      code: 'MISSING_PARAMS',
    });
  }

  const useMock = process.env.USE_MOCK !== 'false';

  if (useMock) {
    // Return mock free/busy data
    const { getMockFreeBusy } = await import('./src/data/mockGoogleCalendar.js');
    const result = getMockFreeBusy(calendarIds.split(','), dateMin, dateMax);
    return res.json(result);
  }

  // TODO: Real Google Calendar API call with stored tokens
  res.status(501).json({ error: 'Live Google Calendar not yet connected', code: 'NOT_IMPLEMENTED' });
});

// GET /api/calendar/events — list events for a consultant's calendar
app.get('/api/calendar/events', async (req, res) => {
  const { calendarId, dateMin, dateMax } = req.query;

  if (!calendarId) {
    return res.status(400).json({ error: 'Required: calendarId', code: 'MISSING_PARAMS' });
  }

  const useMock = process.env.USE_MOCK !== 'false';

  if (useMock) {
    const { getMockEvents } = await import('./src/data/mockGoogleCalendar.js');
    const result = getMockEvents(calendarId, dateMin, dateMax);
    return res.json(result);
  }

  res.status(501).json({ error: 'Live Google Calendar not yet connected', code: 'NOT_IMPLEMENTED' });
});

// POST /api/calendar/events — create an event (push appointment to Google Calendar)
app.post('/api/calendar/events', async (req, res) => {
  const { calendarId, event } = req.body;

  if (!calendarId || !event) {
    return res.status(400).json({ error: 'Required: calendarId, event', code: 'MISSING_PARAMS' });
  }

  const useMock = process.env.USE_MOCK !== 'false';

  if (useMock) {
    const { createMockEvent } = await import('./src/data/mockGoogleCalendar.js');
    const result = createMockEvent(calendarId, event);
    return res.json(result);
  }

  res.status(501).json({ error: 'Live Google Calendar not yet connected', code: 'NOT_IMPLEMENTED' });
});

// PATCH /api/calendar/events/:eventId — update an existing event
app.patch('/api/calendar/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { calendarId, updates } = req.body;

  if (!calendarId || !updates) {
    return res.status(400).json({ error: 'Required: calendarId, updates', code: 'MISSING_PARAMS' });
  }

  const useMock = process.env.USE_MOCK !== 'false';

  if (useMock) {
    const { updateMockEvent } = await import('./src/data/mockGoogleCalendar.js');
    const result = updateMockEvent(calendarId, eventId, updates);
    return res.json(result);
  }

  res.status(501).json({ error: 'Live Google Calendar not yet connected', code: 'NOT_IMPLEMENTED' });
});

// ─── Salesforce Auth Routes (placeholder) ────────────────────────────
app.get('/auth/salesforce', (req, res) => {
  res.status(501).json({ error: 'Salesforce OAuth not yet implemented', code: 'NOT_IMPLEMENTED' });
});

app.get('/auth/salesforce/callback', (req, res) => {
  res.status(501).json({ error: 'Salesforce OAuth not yet implemented', code: 'NOT_IMPLEMENTED' });
});

// ─── Serve built frontend (production only) ──────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  // SPA fallback — serve index.html for any non-API route
  app.get(/^(?!\/api\/|\/auth\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mock mode: ${process.env.USE_MOCK !== 'false' ? 'ON' : 'OFF'}`);
  console.log(`Google Calendar: ${process.env.GOOGLE_CALENDAR_CLIENT_ID ? 'configured' : 'not configured'}`);
});
