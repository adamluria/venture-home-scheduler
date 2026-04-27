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

// ─── SFDC Performance Dashboard Endpoints ──────────────────────────

// GET /api/sfdc/performance/by-rep — close rate, sit rate, revenue by assigned consultant
app.get('/api/sfdc/performance/by-rep', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });

  try {
    const months = parseInt(req.query.months) || 6;
    const soql = `SELECT Assigned_Consultant__c rep,
      COUNT(Id) total_appts,
      SUM(CASE WHEN Status__c = 'Completed' THEN 1 ELSE 0 END) sits,
      SUM(CASE WHEN Status__c = 'Closed Won' THEN 1 ELSE 0 END) closed,
      SUM(CASE WHEN Status__c = 'Canceled' THEN 1 ELSE 0 END) canceled,
      SUM(CASE WHEN Status__c = 'No Show' THEN 1 ELSE 0 END) no_shows
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}
      AND Assigned_Consultant__c != null
      GROUP BY Assigned_Consultant__c
      ORDER BY Assigned_Consultant__c`;
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();

    // Also pull revenue from Opportunity linked to appointments
    const revSoql = `SELECT Opportunity__r.OwnerId rep,
      SUM(Opportunity__r.Amount) revenue,
      COUNT(Id) deals
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}
      AND Opportunity__r.StageName = 'Closed Won'
      AND Opportunity__r.Amount != null
      GROUP BY Opportunity__r.OwnerId`;
    const revRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(revSoql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const revData = await revRes.json();

    res.json({ appointments: data.records || [], revenue: revData.records || [] });
  } catch (err) {
    console.error('SFDC performance/by-rep error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/performance/by-source — metrics broken down by lead source
app.get('/api/sfdc/performance/by-source', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });

  try {
    const months = parseInt(req.query.months) || 6;
    const soql = `SELECT Lead_Source__c source,
      COUNT(Id) total_appts,
      SUM(CASE WHEN Status__c = 'Completed' THEN 1 ELSE 0 END) sits,
      SUM(CASE WHEN Status__c = 'Closed Won' THEN 1 ELSE 0 END) closed,
      SUM(CASE WHEN Status__c = 'Canceled' THEN 1 ELSE 0 END) canceled,
      SUM(CASE WHEN Status__c = 'No Show' THEN 1 ELSE 0 END) no_shows
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}
      AND Lead_Source__c != null
      GROUP BY Lead_Source__c
      ORDER BY Lead_Source__c`;
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();
    res.json({ records: data.records || [] });
  } catch (err) {
    console.error('SFDC performance/by-source error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/performance/by-setter — metrics by who set/created the appointment
app.get('/api/sfdc/performance/by-setter', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });

  try {
    const months = parseInt(req.query.months) || 6;
    const soql = `SELECT CreatedById setter, CreatedBy.Name setter_name,
      COUNT(Id) total_appts,
      SUM(CASE WHEN Status__c = 'Completed' THEN 1 ELSE 0 END) sits,
      SUM(CASE WHEN Status__c = 'Closed Won' THEN 1 ELSE 0 END) closed,
      SUM(CASE WHEN Status__c = 'Canceled' THEN 1 ELSE 0 END) canceled,
      SUM(CASE WHEN Status__c = 'No Show' THEN 1 ELSE 0 END) no_shows
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}
      GROUP BY CreatedById, CreatedBy.Name
      ORDER BY CreatedBy.Name`;
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();
    res.json({ records: data.records || [] });
  } catch (err) {
    console.error('SFDC performance/by-setter error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/performance/by-territory — metrics by territory
app.get('/api/sfdc/performance/by-territory', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });

  try {
    const months = parseInt(req.query.months) || 6;
    const soql = `SELECT Territory__c territory,
      COUNT(Id) total_appts,
      SUM(CASE WHEN Status__c = 'Completed' THEN 1 ELSE 0 END) sits,
      SUM(CASE WHEN Status__c = 'Closed Won' THEN 1 ELSE 0 END) closed,
      SUM(CASE WHEN Status__c = 'Canceled' THEN 1 ELSE 0 END) canceled,
      SUM(CASE WHEN Status__c = 'No Show' THEN 1 ELSE 0 END) no_shows
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}
      AND Territory__c != null
      GROUP BY Territory__c
      ORDER BY Territory__c`;
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();
    res.json({ records: data.records || [] });
  } catch (err) {
    console.error('SFDC performance/by-territory error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/performance/summary — top-level KPIs
app.get('/api/sfdc/performance/summary', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });

  try {
    const months = parseInt(req.query.months) || 6;
    const soql = `SELECT
      COUNT(Id) total_appts,
      SUM(CASE WHEN Status__c = 'Completed' THEN 1 ELSE 0 END) sits,
      SUM(CASE WHEN Status__c = 'Closed Won' THEN 1 ELSE 0 END) closed,
      SUM(CASE WHEN Status__c = 'Canceled' THEN 1 ELSE 0 END) canceled,
      SUM(CASE WHEN Status__c = 'No Show' THEN 1 ELSE 0 END) no_shows
      FROM Appointment__c
      WHERE CreatedDate = LAST_N_MONTHS:${months}`;
    const queryRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const data = await queryRes.json();

    // Revenue
    const revSoql = `SELECT SUM(Amount) revenue, COUNT(Id) deals
      FROM Opportunity WHERE StageName = 'Closed Won'
      AND CreatedDate = LAST_N_MONTHS:${months}`;
    const revRes = await fetch(`${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(revSoql)}`, {
      headers: { 'Authorization': `Bearer ${sfdc.accessToken}` },
    });
    const revData = await revRes.json();

    res.json({
      appointments: data.records?.[0] || {},
      revenue: revData.records?.[0] || {},
    });
  } catch (err) {
    console.error('SFDC performance/summary error:', err);
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

// ─── Salesforce Lead Endpoints ──────────────────────────────────────

// GET /api/sfdc/lead/:id — get Lead details for scheduling
app.get('/api/sfdc/lead/:id', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    const fields = 'Id,Name,FirstName,LastName,Phone,Email,Street,PostalCode,City,State,LeadSource,Company,Status';
    const queryRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/sobjects/Lead/${req.params.id}?fields=${fields}`,
      { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
    );
    const data = await queryRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sfdc/lead/:id/convert — convert Lead to Account + Contact + Opportunity
app.post('/api/sfdc/lead/:id/convert', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    // Use Salesforce REST API composite to convert lead
    // The convertedStatus should be the org's default converted status
    const convertedStatus = req.body.convertedStatus || 'Qualified';
    const payload = {
      allOrNone: true,
      compositeRequest: [
        {
          method: 'PATCH',
          url: `/services/data/v59.0/sobjects/Lead/${req.params.id}`,
          referenceId: 'updateLead',
          body: { Status: convertedStatus },
        },
      ],
    };

    // Salesforce Lead conversion via Apex REST endpoint
    // Orgs typically expose /services/apexrest/leadconvert or use the SOAP API
    // We use the standard REST approach with the LeadConvert action
    const convertRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/actions/standard/convertLead`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sfdc.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [{
            leadId: req.params.id,
            convertedStatus,
            createOpportunity: true,
          }],
        }),
      }
    );
    const data = await convertRes.json();

    if (!convertRes.ok) {
      console.error('Lead convert error:', data);
      return res.status(convertRes.status).json({ error: 'Lead conversion failed', details: data });
    }

    // Return the new Opportunity ID and Account ID
    const result = Array.isArray(data) ? data[0] : data;
    res.json({
      success: true,
      leadId: req.params.id,
      opportunityId: result.outputValues?.opportunityId || result.opportunityId,
      accountId: result.outputValues?.accountId || result.accountId,
      contactId: result.outputValues?.contactId || result.contactId,
    });
  } catch (err) {
    console.error('Lead convert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Salesforce Appointment__c CRUD ─────────────────────────────────

// POST /api/sfdc/appointment — create Appointment__c record in Salesforce
app.post('/api/sfdc/appointment', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    const apt = req.body;
    const sObject = {
      Opportunity__c: apt.sfdcOppId || null,
      Lead__c: apt.sfdcLeadId || null,
      Customer_Name__c: apt.customer,
      Customer_Address__c: apt.address,
      Customer_Zip__c: apt.zipCode,
      Customer_Phone__c: apt.phone || null,
      Customer_Email__c: apt.email || null,
      Scheduled_Date__c: apt.date,
      Scheduled_Time__c: apt.time,
      Status__c: apt.status || 'Scheduled',
      Type__c: apt.type || 'Appointment',
      Assigned_Consultant__c: apt.consultant || null,
      Assigned_Design_Expert__c: apt.designExpert || null,
      Is_Virtual__c: apt.isVirtual || false,
      Lead_Source__c: apt.leadSource || null,
      Territory__c: apt.territory || null,
      TSRF__c: apt.tsrf || null,
      External_Id__c: apt.id, // our internal appointment ID for dedup
    };

    const createRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/sobjects/Appointment__c`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sfdc.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sObject),
      }
    );
    const data = await createRes.json();

    if (!createRes.ok) {
      console.error('SFDC Appointment create error:', data);
      return res.status(createRes.status).json({ error: 'Failed to create Appointment__c', details: data });
    }

    res.json({ success: true, sfdcAppointmentId: data.id });
  } catch (err) {
    console.error('SFDC Appointment create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sfdc/appointment/:id — update Appointment__c record
app.patch('/api/sfdc/appointment/:id', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    const updates = req.body; // field-value pairs to update
    const updateRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/sobjects/Appointment__c/${req.params.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sfdc.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (updateRes.status === 204) {
      return res.json({ success: true });
    }

    const data = await updateRes.json();
    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: 'Failed to update Appointment__c', details: data });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sfdc/appointment/:id — cancel/delete Appointment__c record
app.delete('/api/sfdc/appointment/:id', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    // Soft-delete: update status to Canceled rather than hard delete
    const updateRes = await fetch(
      `${sfdc.instanceUrl}/services/data/v59.0/sobjects/Appointment__c/${req.params.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sfdc.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Status__c: 'Canceled' }),
      }
    );

    if (updateRes.status === 204) {
      return res.json({ success: true });
    }

    const data = await updateRes.json();
    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: 'Failed to cancel Appointment__c', details: data });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Two-Way SMS (Twilio Inbound Webhook) ──────────────────────────

// POST /api/sms/inbound — Twilio webhook for incoming customer SMS
app.post('/api/sms/inbound', async (req, res) => {
  const { From, Body, To } = req.body;

  if (!From || !Body) {
    return res.status(400).send('<Response><Message>Invalid request</Message></Response>');
  }

  console.log(`[SMS Inbound] From: ${From}, Body: "${Body}"`);

  // Normalize phone number (remove +1 prefix)
  const phone = From.replace(/^\+1/, '').replace(/\D/g, '');

  // Look up appointment by customer phone number
  // In production, query Appointment__c from Salesforce
  // For now, search in-memory appointments
  let matchedApt = null;
  try {
    // Try to find from mock data or recent appointments
    // This would be a DB/SFDC query in production
    matchedApt = { id: 'unknown', customer: phone, date: 'upcoming', time: 'TBD' };
  } catch (err) {
    console.warn('SMS appointment lookup failed:', err);
  }

  // Parse intent from message
  const intents = {
    confirm: ['confirm', 'yes', 'yep', 'yeah', 'ok', 'sure', 'coming', 'on my way'],
    cancel: ['cancel', "can't make it", 'not coming', 'have to cancel'],
    reschedule: ['reschedule', 'move', 'change time', 'different time'],
    late: ['running late', 'gonna be late', 'be there soon', 'stuck in traffic'],
  };

  const bodyLower = Body.toLowerCase().trim();
  let action = 'unknown';
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(kw => bodyLower.includes(kw))) {
      action = intent;
      break;
    }
  }

  // Generate reply
  let reply;
  switch (action) {
    case 'confirm':
      reply = "Great, you're confirmed! Your consultant looks forward to meeting you. Reply CANCEL if plans change.";
      break;
    case 'cancel':
      reply = "We've noted your cancellation. Would you like to reschedule? Reply RESCHEDULE or call us.";
      break;
    case 'reschedule':
      reply = "No problem! We'll have someone reach out to find a new time that works. You can also visit our booking page to reschedule.";
      break;
    case 'late':
      reply = "Thanks for the heads up! Your consultant will wait for you. See you soon!";
      break;
    default:
      reply = "Thanks for your message! Reply CONFIRM, CANCEL, or RESCHEDULE. For anything else, we'll have someone reach out shortly.";
  }

  // Log the conversation
  console.log(`[SMS] Action: ${action}, Reply: "${reply}"`);

  // Send Slack alert for cancel/no-show intents
  if (action === 'cancel') {
    const slackWebhook = process.env.SLACK_WEBHOOK_OPS;
    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📱 Customer SMS cancellation from ${From}: "${Body}"`,
        }),
      }).catch(() => {});
    }
  }

  // Respond with TwiML
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Message>
</Response>`);
});

// GET /api/sms/conversations/:phone — get conversation log for a phone number
app.get('/api/sms/conversations/:phone', (req, res) => {
  // In production, query from database
  res.json({ messages: [], phone: req.params.phone });
});

// ─── Slack / Teams Alert Webhooks ───────────────────────────────────

// POST /api/slack/alert — send alert to Slack or Teams channel
app.post('/api/slack/alert', async (req, res) => {
  const { type, channel, payload } = req.body;

  // Channel → webhook URL mapping
  const webhooks = {
    general: process.env.SLACK_WEBHOOK_GENERAL,
    sales: process.env.SLACK_WEBHOOK_SALES,
    ops: process.env.SLACK_WEBHOOK_OPS,
  };

  const webhookUrl = webhooks[channel] || webhooks.general;
  const teamsUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl && !teamsUrl) {
    return res.json({ sent: false, reason: 'No webhook configured' });
  }

  const results = [];

  // Send to Slack
  if (webhookUrl) {
    try {
      const slackRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      results.push({ platform: 'slack', ok: slackRes.ok, status: slackRes.status });
    } catch (err) {
      results.push({ platform: 'slack', ok: false, error: err.message });
    }
  }

  // Send to Teams
  if (teamsUrl) {
    try {
      // Convert to Teams Adaptive Card format
      const teamsPayload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: 'F0A830',
        summary: payload.text || type,
        sections: [{
          activityTitle: payload.text || type,
          markdown: true,
          text: payload.blocks?.map(b =>
            b.text?.text || b.fields?.map(f => f.text).join(' | ') || ''
          ).join('\n') || '',
        }],
      };
      const teamsRes = await fetch(teamsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamsPayload),
      });
      results.push({ platform: 'teams', ok: teamsRes.ok, status: teamsRes.status });
    } catch (err) {
      results.push({ platform: 'teams', ok: false, error: err.message });
    }
  }

  res.json({ sent: true, results });
});

// GET /api/slack/test — test webhook configuration
app.get('/api/slack/test', async (req, res) => {
  const configured = {
    general: !!process.env.SLACK_WEBHOOK_GENERAL,
    sales: !!process.env.SLACK_WEBHOOK_SALES,
    ops: !!process.env.SLACK_WEBHOOK_OPS,
    teams: !!process.env.TEAMS_WEBHOOK_URL,
  };
  res.json({ configured });
});

// GET /api/sfdc/search?phone=...&email=... — lookup Lead or Contact by phone/email
app.get('/api/sfdc/search', async (req, res) => {
  const sfdc = app.locals.sfdc;
  if (!sfdc?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }

  try {
    const { phone, email } = req.query;
    const results = { leads: [], contacts: [] };

    // Search Leads
    if (phone || email) {
      const conditions = [];
      if (phone) conditions.push(`Phone = '${phone.replace(/'/g, "\\'")}'`);
      if (email) conditions.push(`Email = '${email.replace(/'/g, "\\'")}'`);
      const where = conditions.join(' OR ');

      const leadQuery = `SELECT Id, Name, Phone, Email, Street, PostalCode, City, State, LeadSource, Status FROM Lead WHERE (${where}) AND IsConverted = false ORDER BY CreatedDate DESC LIMIT 5`;
      const leadRes = await fetch(
        `${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(leadQuery)}`,
        { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
      );
      if (leadRes.ok) {
        const data = await leadRes.json();
        results.leads = (data.records || []).map(r => ({
          id: r.Id, name: r.Name, phone: r.Phone, email: r.Email,
          address: r.Street, zip: r.PostalCode, city: r.City, state: r.State,
          source: r.LeadSource, status: r.Status, type: 'lead',
        }));
      }

      // Also search Contacts (which have associated Opportunities)
      const contactQuery = `SELECT Id, Name, Phone, Email, MailingStreet, MailingPostalCode, MailingCity, MailingState, AccountId FROM Contact WHERE (${where}) ORDER BY CreatedDate DESC LIMIT 5`;
      const contactRes = await fetch(
        `${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(contactQuery)}`,
        { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
      );
      if (contactRes.ok) {
        const data = await contactRes.json();
        results.contacts = (data.records || []).map(r => ({
          id: r.Id, name: r.Name, phone: r.Phone, email: r.Email,
          address: r.MailingStreet, zip: r.MailingPostalCode,
          city: r.MailingCity, state: r.MailingState,
          accountId: r.AccountId, type: 'contact',
        }));
      }
    }

    res.json(results);
  } catch (err) {
    console.error('SFDC search error:', err);
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
