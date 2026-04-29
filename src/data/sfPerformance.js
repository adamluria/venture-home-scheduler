// sfPerformance.js
//
// Caches real Salesforce performance data so repPerformance.js can replace
// its synthetic close/cancel rates with actual numbers from the org.
//
// Data sources:
//   GET /api/sfdc/performance/by-rep    — per Assigned_Consultant__c (our internal repId)
//   GET /api/sfdc/performance/by-source — per Lead_Source__c
//
// Cache strategy: module-scoped, 10-minute TTL, single in-flight fetch.
// The `prefetch()` function is called from SfdcAuthBanner once auth is
// confirmed, so data is warm by the time the user opens Smart Schedule.
//
// Failure modes:
//   - Not authenticated → fetch 401s, cache stays empty, lookups return null,
//     synthetic fallback fires in repPerformance.js. No errors surfaced to
//     the user.
//   - SF endpoint errors → same as above, silently fall back.
//   - Empty results (no Appointment__c history yet in this sandbox) → cache
//     populates with empty maps, lookups return null, synthetic fallback fires.

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const ENDPOINTS = {
  byRep:    '/api/sfdc/performance/by-rep',
  bySource: '/api/sfdc/performance/by-source',
};

// Module state
let cache = {
  byRep:     null,    // { [repId]: { totalAppts, sits, closed, canceled, noShows, closeRate, sitRate, cancelRate } }
  bySource:  null,    // { [source]: { totalAppts, sits, closed, canceled, noShows, closeRate, sitRate, cancelRate } }
  loadedAt:  0,
  realData:  false,   // true once we've successfully populated from SF (vs empty/never-fetched)
};
let inflight = null;
let lastErrorAt = 0;

const isStale = () => Date.now() - cache.loadedAt > TTL_MS;
const recentError = () => Date.now() - lastErrorAt < 30 * 1000; // back off 30s after errors

// ─── Internal: fetch + normalize ────────────────────────────────────

function safeRate(numerator, denominator) {
  if (!denominator || denominator <= 0) return null;
  return numerator / denominator;
}

function normalizeRow(r) {
  // Both endpoints share the same row shape: total_appts, sits, closed, canceled, no_shows
  const total    = Number(r.total_appts ?? 0);
  const sits     = Number(r.sits ?? 0);
  const closed   = Number(r.closed ?? 0);
  const canceled = Number(r.canceled ?? 0);
  const noShows  = Number(r.no_shows ?? 0);
  return {
    totalAppts: total,
    sits,
    closed,
    canceled,
    noShows,
    sitRate:    safeRate(sits, total),
    closeRate:  safeRate(closed, sits),       // close rate given sit
    cancelRate: safeRate(canceled, total),
  };
}

async function doFetch() {
  try {
    const [byRepRes, bySourceRes] = await Promise.all([
      fetch(ENDPOINTS.byRep,    { credentials: 'include' }),
      fetch(ENDPOINTS.bySource, { credentials: 'include' }),
    ]);

    if (!byRepRes.ok || !bySourceRes.ok) {
      // 401 (not authed) is the most common case during dev — silent.
      // Other errors: log once but don't throw.
      if (byRepRes.status !== 401) {
        console.warn('sfPerformance: fetch failed',
                     'byRep:', byRepRes.status,
                     'bySource:', bySourceRes.status);
      }
      lastErrorAt = Date.now();
      return;
    }

    const byRepData    = await byRepRes.json();
    const bySourceData = await bySourceRes.json();

    const byRep = {};
    for (const r of (byRepData.records || [])) {
      if (!r.rep) continue; // SOQL alias from server.js
      byRep[r.rep] = normalizeRow(r);
    }

    const bySource = {};
    for (const r of (bySourceData.records || [])) {
      if (!r.source) continue;
      bySource[r.source] = normalizeRow(r);
    }

    cache = {
      byRep,
      bySource,
      loadedAt: Date.now(),
      realData: Object.keys(byRep).length > 0 || Object.keys(bySource).length > 0,
    };
  } catch (e) {
    console.warn('sfPerformance: fetch error (non-blocking):', e.message);
    lastErrorAt = Date.now();
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Trigger a background load if needed. Returns the in-flight promise
 * so callers can await if they want, but most callers fire-and-forget.
 */
export function prefetch() {
  if (recentError()) return Promise.resolve();
  if (!isStale() && cache.realData) return Promise.resolve();
  if (inflight) return inflight;
  inflight = doFetch().finally(() => { inflight = null; });
  return inflight;
}

/**
 * Real per-rep stats from SF, or null when unavailable.
 * `repId` matches our internal consultant.id (e.g. 'nyw-1').
 */
export function getRealRepStats(repId) {
  if (isStale()) prefetch();              // refresh in background
  return cache.byRep?.[repId] || null;
}

/**
 * Real per-source stats from SF, or null when unavailable.
 * `source` is the Lead_Source__c string from SF (matches our LEAD_SOURCES values).
 */
export function getRealSourceStats(source) {
  if (isStale()) prefetch();
  return cache.bySource?.[source] || null;
}

/**
 * Diagnostic — used by SmartPickPreview to badge "Live data" vs "Synthetic".
 */
export function isRealDataAvailable() {
  return cache.realData;
}

export function _debugCache() {
  return cache;
}
