// sfdcAuth.js — per-rep Salesforce session management
//
// Replaces the pre-existing `app.locals.sfdc` single-shared-token pattern
// with per-session tokens stored against an HTTP-only cookie. Each rep
// authenticates separately; their tokens stay isolated.
//
// Storage today: in-memory Map. Fine for sandbox testing and single-instance
// Cloud Run. For production multi-instance, swap `sessions` for a Firestore-
// backed Map adapter — every other piece of code stays the same.
//
// Public API:
//   loadSfdcSession    — Express middleware; reads cookie, attaches req.sfdc
//   requireSfdcAuth    — Express middleware; 401s if no session
//   createSession      — call after OAuth callback
//   deleteSession      — call from /logout
//   setSessionCookie   — set the cookie on a response
//   clearSessionCookie — clear it
//   sfdcFetch          — fetch wrapper with refresh-on-401
//   refreshSfdcToken   — explicit refresh
//
// Cookie:
//   Name:   vhs_sfdc_session
//   Flags:  HttpOnly, SameSite=Lax, Secure (in prod), Path=/
//   TTL:    7 days (refresh_token from SF lasts much longer; we cap our cookie shorter)

import crypto from 'crypto';

const SESSION_COOKIE  = 'vhs_sfdc_session';
const SESSION_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory token store. For production: swap with Firestore-backed adapter
// that implements .get(id), .set(id, value), .delete(id).
const sessions = new Map();

function newSessionId() {
  return crypto.randomBytes(32).toString('base64url');
}

// ─── Session lifecycle ──────────────────────────────────────────────

export function createSession(tokens) {
  const id = newSessionId();
  const now = Date.now();
  sessions.set(id, {
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token,
    instanceUrl:  tokens.instance_url,
    // Identity claims from the id_token / userinfo (populated lazily below)
    sfUserId:     tokens.sfUserId    || null,
    sfEmail:      tokens.sfEmail     || null,
    sfDisplayName:tokens.sfDisplayName || null,
    createdAt:    now,
    lastUsedAt:   now,
  });
  return id;
}

export function getSession(id) {
  if (!id) return null;
  const s = sessions.get(id);
  if (!s) return null;
  if (Date.now() - s.lastUsedAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  s.lastUsedAt = Date.now();
  return s;
}

export function deleteSession(id) {
  if (id) sessions.delete(id);
}

// ─── Cookie helpers ─────────────────────────────────────────────────

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = v.join('=');
  }
  return out;
}

export function readSessionCookie(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

export function setSessionCookie(res, sessionId) {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = [
    `${SESSION_COOKIE}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isProd) flags.push('Secure');
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// ─── OAuth refresh ──────────────────────────────────────────────────

export async function refreshSfdcToken(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  if (!s.refreshToken) throw new Error('No refresh token on session');

  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
  const r = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: s.refreshToken,
      client_id:     process.env.SF_CLIENT_ID || '',
      client_secret: process.env.SF_CLIENT_SECRET || '',
    }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    // If SF tells us the refresh token is no good, drop the session entirely
    // so the next call forces a fresh /auth/salesforce flow.
    sessions.delete(sessionId);
    throw new Error(`Token refresh failed (${r.status}): ${text.slice(0, 200)}`);
  }

  const tokens = await r.json();
  s.accessToken = tokens.access_token;
  // SF may rotate the refresh_token; capture if returned
  if (tokens.refresh_token) s.refreshToken = tokens.refresh_token;
  if (tokens.instance_url)  s.instanceUrl  = tokens.instance_url;
  s.lastUsedAt = Date.now();
  return s;
}

// ─── Auth-aware fetch wrapper ───────────────────────────────────────
// Use this instead of raw fetch() for every Salesforce REST call.
// It automatically refreshes the access token on 401 and retries once.
//
// Usage:
//   const r = await sfdcFetch(req, `${req.sfdc.instanceUrl}/services/data/...`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   });

export async function sfdcFetch(req, url, options = {}) {
  if (!req.sfdc) throw new Error('Not authenticated with Salesforce');

  const doFetch = (token) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let r = await doFetch(req.sfdc.accessToken);

  if (r.status === 401 && req.sessionId) {
    try {
      const refreshed = await refreshSfdcToken(req.sessionId);
      req.sfdc = refreshed;
      r = await doFetch(refreshed.accessToken);
    } catch (e) {
      console.warn('SFDC token refresh failed:', e.message);
      // Fall through — the caller gets the 401 and surfaces it to the UI,
      // which redirects to /auth/salesforce.
    }
  }
  return r;
}

// ─── Express middleware ─────────────────────────────────────────────

export function loadSfdcSession(req, res, next) {
  const id = readSessionCookie(req);
  if (!id) return next();
  const session = getSession(id);
  if (!session) return next();
  req.sessionId = id;
  req.sfdc      = session;
  next();
}

export function requireSfdcAuth(req, res, next) {
  if (!req.sfdc) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce', code: 'NO_AUTH' });
  }
  next();
}

// ─── Diagnostics (dev only) ─────────────────────────────────────────

export function _stats() {
  return {
    activeSessions: sessions.size,
    cookieName: SESSION_COOKIE,
    ttlMs: SESSION_TTL_MS,
  };
}
