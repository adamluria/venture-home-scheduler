import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createSession, getSession, deleteSession,
  setSessionCookie, clearSessionCookie,
  loadSfdcSession, requireSfdcAuth, sfdcFetch,
  generatePkce, setPkceCookie, readPkceCookie, clearPkceCookie,
} from './sfdcAuth.js';

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
// Load SF session from cookie on every request — sets req.sfdc + req.sessionId
// when a valid session exists; leaves them undefined otherwise. Routes that
// need auth either use the requireSfdcAuth middleware or check req.sfdc themselves.
app.use(loadSfdcSession);

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
          from: { email: sgFrom, name: 'Venture Home' },
          subject: kind === 'confirmation'
            ? 'Your Venture Home Consultation is Confirmed'
            : 'Reminder: Your Consultation is Coming Up',
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

  // PKCE: generate verifier, stash in HTTP-only cookie, send challenge to SF.
  // The verifier round-trips back to /callback via cookie; SF gets only the
  // challenge in the auth URL.
  const { verifier, challenge } = generatePkce();
  setPkceCookie(res, verifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             clientId,
    redirect_uri:          redirectUri,
    // 'id' scope dropped — some ECA configurations reject it. Auth + API +
    // refresh-token still work without it; we just lose the auto-populated
    // email in the banner. We can add it back once we know which scope
    // identifier (id vs openid) the org accepts.
    scope:                 'api refresh_token',
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });
  res.redirect(`${loginUrl}/services/oauth2/authorize?${params.toString()}`);
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
    // PKCE: pull the verifier we stashed in the cookie before SF redirected
    const codeVerifier = readPkceCookie(req);
    if (!codeVerifier) {
      return res.status(400).json({
        error: 'Missing PKCE verifier cookie. The auth flow expired or the cookie was blocked. Try again.',
        code: 'NO_PKCE',
      });
    }
    clearPkceCookie(res); // one-time use

    const tokenRes = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('SFDC token error:', tokens);
      return res.status(400).json({ error: tokens.error_description || tokens.error });
    }

    // Capture identity claims so /api/sfdc/whoami can show who the rep is.
    // Best-effort — failure here doesn't block auth.
    let identity = {};
    try {
      if (tokens.id) {
        const idRes = await fetch(tokens.id, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        if (idRes.ok) {
          const claims = await idRes.json();
          identity = {
            sfUserId:      claims.user_id,
            sfEmail:       claims.email,
            sfDisplayName: claims.display_name || claims.username,
          };
        }
      }
    } catch (e) {
      console.warn('SFDC identity claim fetch failed (non-blocking):', e.message);
    }

    // Create per-rep session, set HTTP-only cookie. Each rep gets their own
    // tokens; multiple reps can use the app concurrently without conflicting.
    const sessionId = createSession({ ...tokens, ...identity });
    setSessionCookie(res, sessionId);
    console.log(`SFDC auth success: ${identity.sfEmail || 'unknown'} → instance ${tokens.instance_url}`);

    // Backward-compat: also seed app.locals.sfdc so any not-yet-refactored
    // code path doesn't break during the rollout. Safe to remove once the
    // refactor is fully verified in production.
    app.locals.sfdc = {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      instanceUrl:  tokens.instance_url,
    };

    // Honor a return URL if the auth flow was triggered from a deep link
    const returnTo = (req.query.return && /^\/[^/].*/.test(req.query.return)) ? req.query.return : '/?sfdc_auth=success';
    res.redirect(returnTo);
  } catch (err) {
    console.error('SFDC OAuth error:', err);
    res.status(500).json({ error: 'Failed to exchange code', code: 'EXCHANGE_FAILED' });
  }
});

// GET /api/sfdc/whoami — frontend uses this to render the auth state in the UI.
// Returns 200 with identity if authenticated, 200 with { authenticated: false }
// if not (so the frontend doesn't have to special-case 401 for an explicit check).
app.get('/api/sfdc/whoami', (req, res) => {
  if (!req.sfdc) return res.json({ authenticated: false });
  res.json({
    authenticated: true,
    email:       req.sfdc.sfEmail,
    displayName: req.sfdc.sfDisplayName,
    userId:      req.sfdc.sfUserId,
    instanceUrl: req.sfdc.instanceUrl,
  });
});

// POST /api/sfdc/logout — clear session + cookie. Doesn't revoke the SF
// refresh_token; if you want hard revocation, hit
// {loginUrl}/services/oauth2/revoke from the client side too.
app.post('/api/sfdc/logout', (req, res) => {
  if (req.sessionId) deleteSession(req.sessionId);
  clearSessionCookie(res);
  res.json({ success: true });
});

// GET /api/sfdc/rep-stats — pull real close rates from SFDC
app.get('/api/sfdc/rep-stats', async (req, res) => {
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

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
  if (!req.sfdc) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  const sfdc = req.sfdc;

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
  if (!req.sfdc) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  const sfdc = req.sfdc;

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
  if (!req.sfdc) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  const sfdc = req.sfdc;

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
  if (!req.sfdc) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  const sfdc = req.sfdc;

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
  if (!req.sfdc) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  const sfdc = req.sfdc;

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
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

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
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

  try {
    const fields = 'Id,Name,FirstName,LastName,Phone,MobilePhone,Email,Street,PostalCode,City,State,LeadSource,Company,Status';
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
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

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

// Maps the frontend's lowercase, kebab-case status values to the Title Case
// values stored in the Appointment__c.Status__c picklist. The picklist set
// is defined in docs/salesforce-sandbox-setup.md §1.3 and matches the SOQL
// reads in this file (e.g. 'Closed Won', 'No Show' — note the space).
const STATUS_FE_TO_SF = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  'closed-won': 'Closed Won',
  canceled: 'Canceled',
  'no-show': 'No Show',
};
const toSfStatus = (s) => STATUS_FE_TO_SF[s] || s;

// POST /api/sfdc/appointment — create Appointment__c record in Salesforce
app.post('/api/sfdc/appointment', async (req, res) => {
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

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
      Status__c: toSfStatus(apt.status) || 'Scheduled',
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
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

  try {
    const updates = { ...req.body }; // field-value pairs to update
    if (updates.Status__c) updates.Status__c = toSfStatus(updates.Status__c);
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
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

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

// GET /api/sfdc/search?phone=...&email=...&name=... — lookup Lead or Contact
//   - phone/email: exact-match SOQL (existing behavior)
//   - name: fuzzy SOSL across Name fields (used by the in-app Lead picker)
app.get('/api/sfdc/search', async (req, res) => {
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

  try {
    const { phone, email, name } = req.query;
    const results = { leads: [], contacts: [] };

    // ── Phone/Email — exact-match SOQL (existing behavior) ────────────
    if (phone || email) {
      const conditions = [];
      if (phone) conditions.push(`Phone = '${phone.replace(/'/g, "\\'")}'`);
      if (phone) conditions.push(`MobilePhone = '${phone.replace(/'/g, "\\'")}'`);
      if (email) conditions.push(`Email = '${email.replace(/'/g, "\\'")}'`);
      const where = conditions.join(' OR ');

      const leadQuery = `SELECT Id, Name, FirstName, LastName, Phone, MobilePhone, Email, Street, PostalCode, City, State, LeadSource, Status FROM Lead WHERE (${where}) AND IsConverted = false ORDER BY CreatedDate DESC LIMIT 5`;
      const leadRes = await fetch(
        `${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(leadQuery)}`,
        { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
      );
      if (leadRes.ok) {
        const data = await leadRes.json();
        results.leads = (data.records || []).map(r => ({
          id: r.Id, name: r.Name, firstName: r.FirstName, lastName: r.LastName,
          phone: r.Phone, mobilePhone: r.MobilePhone, email: r.Email,
          address: r.Street, zip: r.PostalCode, city: r.City, state: r.State,
          source: r.LeadSource, status: r.Status, type: 'lead',
        }));
      }

      // Also search Contacts (which have associated Opportunities)
      const contactQuery = `SELECT Id, Name, FirstName, LastName, Phone, MobilePhone, Email, MailingStreet, MailingPostalCode, MailingCity, MailingState, AccountId FROM Contact WHERE (${where}) ORDER BY CreatedDate DESC LIMIT 5`;
      const contactRes = await fetch(
        `${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(contactQuery)}`,
        { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
      );
      if (contactRes.ok) {
        const data = await contactRes.json();
        results.contacts = (data.records || []).map(r => ({
          id: r.Id, name: r.Name, firstName: r.FirstName, lastName: r.LastName,
          phone: r.Phone, mobilePhone: r.MobilePhone, email: r.Email,
          address: r.MailingStreet, zip: r.MailingPostalCode,
          city: r.MailingCity, state: r.MailingState,
          accountId: r.AccountId, type: 'contact',
        }));
      }
    }

    // ── Name — fuzzy SOSL across Name fields ──────────────────────────
    // Used by the in-app Lead picker. SOSL handles tokens better than LIKE
    // and searches the indexed Name field across both Lead and Contact in one call.
    if (name && name.trim().length >= 2) {
      // Strip SOSL reserved chars; trailing '*' enables prefix match per token.
      const term = name.replace(/[?&|!{}\[\]()^~*:\\"'\-+]/g, ' ').trim();
      const tokens = term.split(/\s+/).filter(Boolean).map(t => `${t}*`).join(' ');
      const sosl =
        `FIND {${tokens}} IN NAME FIELDS RETURNING ` +
        `Lead(Id, Name, FirstName, LastName, Phone, MobilePhone, Email, ` +
          `Street, PostalCode, City, State, LeadSource, Status ` +
          `WHERE IsConverted = false ORDER BY CreatedDate DESC LIMIT 8), ` +
        `Contact(Id, Name, FirstName, LastName, Phone, MobilePhone, Email, ` +
          `MailingStreet, MailingPostalCode, MailingCity, MailingState, AccountId LIMIT 8)`;

      const sr = await fetch(
        `${sfdc.instanceUrl}/services/data/v59.0/search?q=${encodeURIComponent(sosl)}`,
        { headers: { 'Authorization': `Bearer ${sfdc.accessToken}` } }
      );
      if (sr.ok) {
        const data = await sr.json();
        for (const rec of (data.searchRecords || [])) {
          if (rec.attributes?.type === 'Lead') {
            results.leads.push({
              id: rec.Id, name: rec.Name,
              firstName: rec.FirstName, lastName: rec.LastName,
              phone: rec.Phone, mobilePhone: rec.MobilePhone, email: rec.Email,
              address: rec.Street, zip: rec.PostalCode, city: rec.City, state: rec.State,
              source: rec.LeadSource, status: rec.Status, type: 'lead',
            });
          } else if (rec.attributes?.type === 'Contact') {
            results.contacts.push({
              id: rec.Id, name: rec.Name,
              firstName: rec.FirstName, lastName: rec.LastName,
              phone: rec.Phone, mobilePhone: rec.MobilePhone, email: rec.Email,
              address: rec.MailingStreet, zip: rec.MailingPostalCode,
              city: rec.MailingCity, state: rec.MailingState,
              accountId: rec.AccountId, type: 'contact',
            });
          }
        }
      } else {
        const errText = await sr.text().catch(() => '');
        console.warn('SFDC name search SOSL non-OK:', sr.status, errText.slice(0, 200));
      }
    }

    res.json(results);
  } catch (err) {
    console.error('SFDC search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sfdc/customer-history?phone=XXX
//   Aggregates everything we know about a person across SF: prior Leads,
//   Contacts, Opportunities, Tasks (call logs), Events (meetings), and Notes.
//   Match key is phone number (last 10 digits); SOSL handles the formatting
//   variants (parens, dashes, +1 prefix, etc).
//
//   Response shape:
//     { summary: {...counts + dates}, leads, contacts, opportunities,
//       tasks, events, notes, errors? }
//
//   Designed to never hard-fail: each sub-query is wrapped in try/catch and
//   silently returns [] on permission errors, so a missing ContentNote or
//   Note read permission doesn't kill the whole endpoint.
app.get('/api/sfdc/customer-history', async (req, res) => {
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  const sfdc = req.sfdc;

  const rawPhone = (req.query.phone || '').toString();
  const digits = rawPhone.replace(/\D/g, '').slice(-10); // last 10 digits
  if (digits.length < 7) {
    return res.status(400).json({ error: 'phone parameter required (>=7 digits)' });
  }

  const errors = [];

  // Helper: SOQL query with a per-call try/catch. Returns records[] or [].
  // Uses sfdcFetch so a 401 mid-history triggers refresh + retry once.
  const soql = async (q, label) => {
    try {
      const r = await sfdcFetch(
        req,
        `${sfdc.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(q)}`
      );
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        errors.push({ label, status: r.status, snippet: t.slice(0, 200) });
        return [];
      }
      const data = await r.json();
      return data.records || [];
    } catch (e) {
      errors.push({ label, error: e.message });
      return [];
    }
  };

  try {
    // ── Step 1: SOSL phone lookup → find all matching Leads + Contacts ──
    const sosl =
      `FIND {${digits}} IN PHONE FIELDS RETURNING ` +
      `Lead(Id, Name, FirstName, LastName, Phone, MobilePhone, Email, ` +
        `Status, LeadSource, CreatedDate, ConvertedDate, IsConverted, ` +
        `Description, Company, Street, City, State, PostalCode, ` +
        `Owner.Name LIMIT 25), ` +
      `Contact(Id, Name, FirstName, LastName, Phone, MobilePhone, Email, ` +
        `AccountId, Account.Name, CreatedDate, Description, ` +
        `Owner.Name LIMIT 25)`;

    const sr = await sfdcFetch(
      req,
      `${sfdc.instanceUrl}/services/data/v59.0/search?q=${encodeURIComponent(sosl)}`
    );
    if (!sr.ok) {
      const t = await sr.text().catch(() => '');
      return res.status(502).json({
        error: 'Salesforce SOSL phone search failed',
        status: sr.status,
        snippet: t.slice(0, 300),
      });
    }
    const sosResults = (await sr.json()).searchRecords || [];

    const leads = [];
    const contacts = [];
    for (const rec of sosResults) {
      if (rec.attributes?.type === 'Lead') {
        leads.push({
          id: rec.Id, name: rec.Name,
          firstName: rec.FirstName, lastName: rec.LastName,
          phone: rec.Phone, mobilePhone: rec.MobilePhone, email: rec.Email,
          status: rec.Status, source: rec.LeadSource,
          createdDate: rec.CreatedDate, convertedDate: rec.ConvertedDate,
          isConverted: rec.IsConverted,
          description: rec.Description, company: rec.Company,
          street: rec.Street, city: rec.City, state: rec.State, zip: rec.PostalCode,
          ownerName: rec.Owner?.Name || null,
        });
      } else if (rec.attributes?.type === 'Contact') {
        contacts.push({
          id: rec.Id, name: rec.Name,
          firstName: rec.FirstName, lastName: rec.LastName,
          phone: rec.Phone, mobilePhone: rec.MobilePhone, email: rec.Email,
          accountId: rec.AccountId, accountName: rec.Account?.Name || null,
          createdDate: rec.CreatedDate, description: rec.Description,
          ownerName: rec.Owner?.Name || null,
        });
      }
    }

    // Collect IDs we'll need for downstream queries.
    const leadIds   = leads.map(l => `'${l.id}'`);
    const contactIds = contacts.map(c => `'${c.id}'`);
    const accountIds = [...new Set(contacts.map(c => c.accountId).filter(Boolean))]
                        .map(id => `'${id}'`);
    const personIds = [...leadIds, ...contactIds];           // Tasks/Events.WhoId
    const recordIds = [...personIds, ...accountIds];          // Tasks/Events.WhatId, Notes.LinkedEntityId

    // No matches → return empty shape early, don't burn extra queries.
    if (recordIds.length === 0) {
      return res.json({
        summary: { leadCount: 0, contactCount: 0, oppCount: 0, callCount: 0, taskCount: 0, eventCount: 0, noteCount: 0, firstContact: null, lastContact: null },
        leads: [], contacts: [], opportunities: [], tasks: [], events: [], notes: [],
        errors: errors.length ? errors : undefined,
      });
    }

    // ── Steps 2-6: fetch related records in parallel ────────────────────
    const inList = (arr) => arr.length ? arr.join(',') : "''"; // empty-list-safe

    const [oppRecs, taskRecs, eventRecs, cdLinkRecs] = await Promise.all([
      // Opportunities — match by AccountId (most reliable) and recent first
      accountIds.length
        ? soql(
            `SELECT Id, Name, StageName, CreatedDate, CloseDate, Amount, ` +
            `Description, IsClosed, IsWon, AccountId, Account.Name, ` +
            `LeadSource, Owner.Name ` +
            `FROM Opportunity ` +
            `WHERE AccountId IN (${inList(accountIds)}) ` +
            `ORDER BY CreatedDate DESC LIMIT 25`,
            'opps'
          )
        : Promise.resolve([]),

      // Tasks — both WhoId (Lead/Contact) and WhatId (Opp/Account)
      soql(
        `SELECT Id, Subject, Type, ActivityDate, Description, ` +
        `CallType, CallDurationInSeconds, CallDisposition, ` +
        `Status, WhoId, WhatId, Owner.Name, CreatedDate ` +
        `FROM Task ` +
        `WHERE WhoId IN (${inList(personIds)}) ` +
        (recordIds.length ? `OR WhatId IN (${inList(recordIds)})` : '') +
        ` ORDER BY ActivityDate DESC NULLS LAST, CreatedDate DESC LIMIT 50`,
        'tasks'
      ),

      // Events — meetings/calendar
      soql(
        `SELECT Id, Subject, ActivityDateTime, ActivityDate, Description, ` +
        `Location, WhoId, WhatId, Owner.Name ` +
        `FROM Event ` +
        `WHERE WhoId IN (${inList(personIds)}) ` +
        (recordIds.length ? `OR WhatId IN (${inList(recordIds)})` : '') +
        ` ORDER BY ActivityDateTime DESC NULLS LAST LIMIT 25`,
        'events'
      ),

      // ContentDocumentLinks — to find ContentNotes attached to any of these records
      soql(
        `SELECT ContentDocumentId, LinkedEntityId ` +
        `FROM ContentDocumentLink ` +
        `WHERE LinkedEntityId IN (${inList(recordIds)}) LIMIT 100`,
        'contentLinks'
      ),
    ]);

    // ── Step 7: fetch ContentNote details for any linked docs ──────────
    let notes = [];
    const contentDocIds = [...new Set(cdLinkRecs.map(l => l.ContentDocumentId).filter(Boolean))];
    if (contentDocIds.length) {
      const noteRecs = await soql(
        `SELECT Id, Title, TextPreview, CreatedDate, OwnerId, Owner.Name ` +
        `FROM ContentNote ` +
        `WHERE Id IN (${contentDocIds.map(i => `'${i}'`).join(',')}) ` +
        `ORDER BY CreatedDate DESC LIMIT 30`,
        'contentNotes'
      );
      notes = noteRecs.map(n => ({
        id: n.Id, title: n.Title, preview: n.TextPreview,
        createdDate: n.CreatedDate, ownerName: n.Owner?.Name || null,
        kind: 'content_note',
      }));
    }

    // Also pull legacy Note (rare in modern orgs but cheap to check)
    const legacyNotes = await soql(
      `SELECT Id, Title, Body, CreatedDate, ParentId, Owner.Name ` +
      `FROM Note WHERE ParentId IN (${inList(recordIds)}) ` +
      `ORDER BY CreatedDate DESC LIMIT 20`,
      'legacyNotes'
    );
    for (const n of legacyNotes) {
      notes.push({
        id: n.Id, title: n.Title,
        preview: (n.Body || '').slice(0, 255),
        createdDate: n.CreatedDate, ownerName: n.Owner?.Name || null,
        kind: 'legacy_note',
      });
    }

    // ── Normalize records for the frontend ──────────────────────────────
    const opportunities = oppRecs.map(o => ({
      id: o.Id, name: o.Name, stage: o.StageName,
      createdDate: o.CreatedDate, closeDate: o.CloseDate,
      amount: o.Amount, description: o.Description,
      isClosed: o.IsClosed, isWon: o.IsWon,
      accountId: o.AccountId, accountName: o.Account?.Name || null,
      source: o.LeadSource, ownerName: o.Owner?.Name || null,
    }));

    const tasks = taskRecs.map(t => ({
      id: t.Id, subject: t.Subject, type: t.Type,
      activityDate: t.ActivityDate, createdDate: t.CreatedDate,
      description: t.Description, status: t.Status,
      callType: t.CallType, callDurationSeconds: t.CallDurationInSeconds,
      callDisposition: t.CallDisposition,
      whoId: t.WhoId, whatId: t.WhatId,
      ownerName: t.Owner?.Name || null,
      isCall: t.Type === 'Call' || !!t.CallDurationInSeconds || !!t.CallType,
    }));

    const events = eventRecs.map(e => ({
      id: e.Id, subject: e.Subject,
      activityDateTime: e.ActivityDateTime, activityDate: e.ActivityDate,
      description: e.Description, location: e.Location,
      whoId: e.WhoId, whatId: e.WhatId,
      ownerName: e.Owner?.Name || null,
    }));

    // ── Summary stats ──────────────────────────────────────────────────
    const allDates = [
      ...leads.map(l => l.createdDate),
      ...contacts.map(c => c.createdDate),
      ...opportunities.map(o => o.createdDate),
      ...tasks.map(t => t.activityDate || t.createdDate),
      ...events.map(e => e.activityDateTime || e.activityDate),
    ].filter(Boolean).sort();

    const summary = {
      leadCount: leads.length,
      contactCount: contacts.length,
      oppCount: opportunities.length,
      callCount: tasks.filter(t => t.isCall).length,
      taskCount: tasks.length,
      eventCount: events.length,
      noteCount: notes.length,
      firstContact: allDates[0] || null,
      lastContact: allDates[allDates.length - 1] || null,
    };

    res.json({
      matchedDigits: digits,
      summary,
      leads, contacts, opportunities, tasks, events, notes,
      ...(errors.length ? { errors } : {}),
    });
  } catch (err) {
    console.error('SFDC customer-history error:', err);
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
