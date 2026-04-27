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

// ─── Notification Routes ─────────────────────────────────────────────

// POST /api/notifications/send — fire SMS + email for confirmation/reminder
app.post('/api/notifications/send', async (req, res) => {
  const { kind, appointment, smsBody, emailHtml } = req.body;
  if (!appointment || !kind) {
    return res.status(400).json({ error: 'Required: kind, appointment', code: 'MISSING_PARAMS' });
  }

  const results = [];

  // SMS via Twilio
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  if (twilioSid && twilioToken && twilioFrom && appointment.phone) {
    try {
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: appointment.phone,
            From: twilioFrom,
            Body: smsBody,
          }),
        }
      );
      const twilioData = await twilioRes.json();
      results.push({ channel: 'sms', ok: twilioRes.ok, sid: twilioData.sid });
    } catch (err) {
      results.push({ channel: 'sms', ok: false, error: err.message });
    }
  } else {
    results.push({ channel: 'sms', ok: true, mock: true });
    console.log(`[notif] SMS (no Twilio creds): ${kind} to ${appointment.phone || 'no phone'}`);
  }

  // Email via SendGrid
  const sgKey = process.env.SENDGRID_API_KEY;
  const sgFrom = process.env.SENDGRID_FROM_EMAIL || 'scheduling@venturehome.com';
  if (sgKey && appointment.email) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: appointment.email }] }],
          from: { email: sgFrom, name: 'Venture Home Solar' },
          subject: kind === 'confirmation'
            ? 'Your Solar Consultation is Confirmed'
            : 'Reminder: Solar Consultation Coming Up',
          content: [{ type: 'text/html', value: emailHtml }],
        }),
      });
      results.push({ channel: 'email', ok: sgRes.ok, status: sgRes.status });
    } catch (err) {
      results.push({ channel: 'email', ok: false, error: err.message });
    }
  } else {
    results.push({ channel: 'email', ok: true, mock: true });
    console.log(`[notif] Email (no SendGrid creds): ${kind} to ${appointment.email || 'no email'}`);
  }

  res.json({ ok: true, results });
});

// POST /api/notifications/schedule — queue reminders (stores in memory for now)
const _reminderQueue = [];
app.post('/api/notifications/schedule', (req, res) => {
  const { appointment, windows } = req.body;
  if (!appointment || !windows) {
    return res.status(400).json({ error: 'Required: appointment, windows', code: 'MISSING_PARAMS' });
  }
  const entries = windows.map(hoursOut => ({
    appointmentId: appointment.id,
    hoursOut,
    fireAt: new Date(
      new Date(appointment.date + 'T12:00:00').getTime() - hoursOut * 3600 * 1000
    ).toISOString(),
    status: 'queued',
  }));
  _reminderQueue.push(...entries);
  console.log(`[notif] queued ${entries.length} reminders for apt ${appointment.id}`);
  res.json({ ok: true, queued: entries.length });
});

// GET /api/notifications/queue — inspect queued reminders (debug)
app.get('/api/notifications/queue', (req, res) => {
  res.json({ queue: _reminderQueue, count: _reminderQueue.length });
});

// ─── Property Data Lookup ────────────────────────────────────────────

// POST /api/property/lookup — look up property owner by address
app.post('/api/property/lookup', async (req, res) => {
  const { address, zipCode, provider } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Required: address', code: 'MISSING_PARAMS' });
  }

  // ATTOM Data Solutions
  if (provider === 'attom') {
    const attomKey = process.env.ATTOM_API_KEY;
    if (!attomKey) {
      return res.status(500).json({ error: 'ATTOM_API_KEY not configured', code: 'MISSING_CONFIG' });
    }
    try {
      const encoded = encodeURIComponent(`${address}, ${zipCode}`);
      const attomRes = await fetch(
        `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address=${encoded}`,
        { headers: { 'apikey': attomKey, 'Accept': 'application/json' } }
      );
      const data = await attomRes.json();
      const prop = data?.property?.[0];
      if (!prop) return res.json({ ownerName: null, source: 'attom', error: 'No property found' });
      res.json({
        ownerName: [prop.assessment?.owner?.owner1?.fullName, prop.assessment?.owner?.owner2?.fullName].filter(Boolean).join(' & '),
        ownerSince: prop.sale?.saleTransDate ? new Date(prop.sale.saleTransDate).getFullYear() : null,
        propertyType: prop.summary?.propertyType || 'Unknown',
        assessedValue: prop.assessment?.assessed?.assdTotalValue || null,
        lotSqFt: prop.lot?.lotSize2 || null,
        yearBuilt: prop.summary?.yearBuilt || null,
        source: 'attom',
      });
    } catch (err) {
      res.status(500).json({ ownerName: null, source: 'error', error: err.message });
    }
    return;
  }

  // CoreLogic (placeholder structure — adjust once you have real API docs)
  if (provider === 'corelogic') {
    const clKey = process.env.CORELOGIC_API_KEY;
    if (!clKey) {
      return res.status(500).json({ error: 'CORELOGIC_API_KEY not configured', code: 'MISSING_CONFIG' });
    }
    // TODO: Implement CoreLogic API call
    return res.status(501).json({ error: 'CoreLogic integration not yet implemented' });
  }

  res.status(400).json({ error: `Unknown provider: ${provider}` });
});

// ─── Salesforce Auth Routes ──────────────────────────────────────────

app.get('/auth/salesforce', (req, res) => {
  const clientId = process.env.SF_CLIENT_ID;
  const redirectUri = process.env.SF_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/salesforce/callback`;
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId) {
    return res.status(500).json({ error: 'SF_CLIENT_ID not configured', code: 'MISSING_CONFIG' });
  }

  const authUrl = `${loginUrl}/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=api%20refresh_token`;
  res.redirect(authUrl);
});

app.get('/auth/salesforce/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No authorization code received', code: 'NO_CODE' });
  }

  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const redirectUri = process.env.SF_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/salesforce/callback`;
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Salesforce credentials not configured', code: 'MISSING_CONFIG' });
  }

  try {
    const tokenRes = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('SFDC token error:', tokens);
      return res.status(400).json({ error: tokens.error_description || tokens.error });
    }

    // TODO: Store tokens securely (database / encrypted session)
    console.log('SFDC auth success. Instance:', tokens.instance_url);
    // Store in memory for now (dev only)
    app.locals.sfdc = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      instanceUrl: tokens.instance_url,
    };

    res.redirect('/?sfdc_auth=success');
  } catch (err) {
    console.error('SFDC OAuth error:', err);
    res.status(500).json({ error: 'Failed to exchange code', code: 'EXCHANGE_FAILED' });
  }
});

// GET /api/sfdc/rep-stats — pull real close rates from SFDC
app.get('/api/sfdc/rep-stats', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    // SOQL: aggregate close rates per rep from Opportunity history
    const soql = encodeURIComponent(
      `SELECT OwnerId, Owner.Name, COUNT(Id) total, ` +
      `SUM(CASE WHEN StageName = 'Closed Won' THEN 1 ELSE 0 END) won ` +
      `FROM Opportunity WHERE CreatedDate = LAST_N_MONTHS:6 ` +
      `GROUP BY OwnerId, Owner.Name`
    );
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${soql}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/opportunity/:id — get opp details for scheduling
app.get('/api/sfdc/opportunity/:id', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    const fields = 'Id,Name,Account.Name,LeadSource,Install_Address__c,Install_Zip__c,Aurora_Avg_TSRF__c,Aurora_Project_Id__c,StageName';
    const queryRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/sobjects/Opportunity/${req.params.id}?fields=${fields}`,
      { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
    );
    const data = await queryRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
