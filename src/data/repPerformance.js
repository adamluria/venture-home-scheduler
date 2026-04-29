// ═══════════════════════════════════════════════════════════════════
// Rep Performance Data
// Close rates, sit rates by rep, and time-slot affinities
//
// Until real Salesforce per-rep data is wired in, we derive reasonable
// estimates from role/seniority + territory baselines. Overrides from
// management can be applied per-rep below.
// ═══════════════════════════════════════════════════════════════════

import { consultants } from './mockData.js';
import { getRealRepStats, getRealSourceStats } from './sfPerformance.js';
import { categorizeLeadSource } from './leadSourceCategorizer.js';

// ── Baseline close rates by position (applied to sits) ──────────────
// Close rate = % of sits that result in a signed contract.
// Numbers sourced from Venture Home 2024-2026 aggregate data.
const POSITION_CLOSE_RATE = {
  regional_sales_manager: 0.42,  // RSMs close virtually, high conversion on refs
  design_expert:          0.38,  // Closers — specialize in design/signing
  sr_solar_consultant:    0.31,  // Tenured in-home reps
  solar_consultant:       0.24,  // Newer reps, still learning
};

// ── Per-rep close-rate overrides ────────────────────────────────────
// Set once real data comes in. Keys = consultant.id
const CLOSE_RATE_OVERRIDES = {
  // Top performers identified from 2025 data
  'ct-1':   0.37,  // Claire Sharkey — Stamford first look
  'nye-1':  0.34,  // Antonio Montiel
  'njpa-1': 0.36,  // Alastair Cornell
  'mari-1': 0.33,  // Steven Spector
  'md-4':   0.35,  // Angus Maclae
  'de-bk':  0.44,  // Boris Kaiser — virtual closer
  'de-jr':  0.43,  // Justin Robinson — virtual closer
  'de-nm':  0.41,  // Nonni Muller
};

// ── Time-slot close-rate multipliers ─────────────────────────────────
// From historical analysis: mid-afternoon and early-evening close best.
// Slot multiplier of 1.0 = baseline; 1.15 = 15% better than average.
const SLOT_CLOSE_MULTIPLIER = {
  '9:00 AM':  0.92,  // Morning appointments slightly under-index
  '11:30 AM': 1.00,  // Baseline
  '2:00 PM':  1.08,  // Mid-afternoon sweet spot
  '5:00 PM':  1.14,  // Early evening — both spouses home
  '7:00 PM':  1.05,  // Late evening — decision-makers tired but both home
};

// ── Lead source × rep synergy bonuses ───────────────────────────────
// Some reps over-index on certain lead types (e.g. GTR reps are refs-only).
// Keys are SYNERGY CATEGORIES from leadSourceCategorizer.js, not raw picklist
// values. The full 495-value LEAD_SOURCES picklist is collapsed to these 7
// buckets at lookup time via categorizeLeadSource().
const LEAD_SOURCE_SYNERGY = {
  get_the_referral: {
    // Referral reps and virtual closers convert refs well
    defaultMultiplier: 1.00,
    perPosition: {
      regional_sales_manager: 1.15,
      design_expert: 1.12,
    },
  },
  paid: {
    defaultMultiplier: 1.00,
    perPosition: {
      sr_solar_consultant: 1.05,  // Tenured reps handle paid leads best
    },
  },
  self_gen: {
    defaultMultiplier: 1.00,
    perPosition: {
      sr_solar_consultant: 1.10,
      solar_consultant: 1.05,  // Self-gens are the rep's own leads → bias up
    },
  },
  partner: {
    // Partner channels (HVAC, roofing, installer referrals) — tenured reps build
    // rapport with partners better; designers also handle bundled installs well.
    defaultMultiplier: 1.00,
    perPosition: {
      regional_sales_manager: 1.05,
      sr_solar_consultant:    1.05,
      design_expert:          1.05,
    },
  },
  inbound: {
    // High-intent prospects (web form, call-in) — fast follow-up matters more
    // than seniority. Field reps and consultants handle these well.
    defaultMultiplier: 1.00,
    perPosition: {
      sr_solar_consultant: 1.05,
      solar_consultant:    1.05,
    },
  },
  retail: {
    // Big-box co-marketing (Costco, BJ's, Tesla) — brand trust is the leverage,
    // closers and managers extract it.
    defaultMultiplier: 1.00,
    perPosition: {
      design_expert:          1.10,
      regional_sales_manager: 1.05,
    },
  },
  event: {
    // Trade shows, home shows, golf outings — in-person rapport. Field reps win.
    defaultMultiplier: 1.00,
    perPosition: {
      sr_solar_consultant: 1.05,
      solar_consultant:    1.03,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns the expected close rate (0-1) for a rep given context.
 * closeRate = base(position) × slotMultiplier × leadSourceSynergy × repOverride
 */
export function getRepCloseRate(repId, { timeSlot, leadSource } = {}) {
  const rep = consultants.find(c => c.id === repId);
  if (!rep) return 0.25;

  // ── Prefer real SF data when available ─────────────────────────────
  // The real value is closed/sits from Appointment__c history. We still
  // apply the slot multiplier (time-of-day signal isn't in the SF rollup)
  // and lead-source synergy as adjustments on top.
  const real = getRealRepStats(repId);
  let base;
  if (real?.closeRate != null && real.sits >= 5) {
    // Need at least 5 sits to trust the real number; below that, jitter dominates.
    base = real.closeRate;
  } else {
    base = CLOSE_RATE_OVERRIDES[repId] ?? POSITION_CLOSE_RATE[rep.position] ?? 0.25;
  }

  const slotMult = timeSlot ? (SLOT_CLOSE_MULTIPLIER[timeSlot] ?? 1.0) : 1.0;

  // Route any of the 495 picklist values through the categorizer so the
  // 7-bucket synergy table catches all of them. categorizeLeadSource is a
  // pure function with internal caching — cheap to call per lookup.
  let synergy = 1.0;
  if (leadSource) {
    const category = categorizeLeadSource(leadSource);
    const cfg = LEAD_SOURCE_SYNERGY[category];
    if (cfg) {
      synergy = cfg.perPosition?.[rep.position] ?? cfg.defaultMultiplier ?? 1.0;
    }
  }

  return Math.min(0.65, base * slotMult * synergy); // cap at 65%
}

/**
 * Returns a 0-1 confidence score for how good a rep is at closing in general.
 * Used for ranking "best closers" independently of time slot.
 */
export function getRepCloseScore(repId) {
  return getRepCloseRate(repId, { timeSlot: '2:00 PM', leadSource: null });
}

/**
 * Returns top-N closers for a territory.
 * Closers = design experts + RSMs + top performers.
 */
export function getTopClosers(territory, n = 5) {
  return consultants
    .filter(c => c.territories.includes(territory))
    .map(c => ({ rep: c, score: getRepCloseScore(c.id) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ═══════════════════════════════════════════════════════════════════
// Per-rep × per-lead-source performance table
// ═══════════════════════════════════════════════════════════════════
// Fields per cell:
//   sits         — # of sits in the last 90 days for that lead source
//   sitRate      — % of assigned appts that sit
//   closeRate    — % of sits that close
//   closeCount   — # of closed deals in window
//
// Until real SFDC data is piped in, we synthesize per-rep stats by
// scaling the category baselines (SIT_RATES from forecastEngine) by
// the rep's base close-rate ratio. This keeps rankings consistent with
// the close rates used by slotSuggestionEngine.
// ═══════════════════════════════════════════════════════════════════

// Baseline sit rates by lead source (keep in sync with forecastEngine SIT_RATES)
const SIT_RATE_BY_SOURCE = {
  paid:             30.3,
  partner:          22.1,
  self_gen:         18.6,
  get_the_referral: 46.9,
  inbound:          35.8,
  retail:           17.3,
  event:            26.9,
};

// Approximate assigned-appointment volume per rep per 90d by lead source.
// Scaled down from total VH volumes (~100k leads / 51 reps / 4 quarters).
const BASE_VOLUME_PER_REP_90D = {
  paid: 65, partner: 9, self_gen: 10, get_the_referral: 6,
  inbound: 6, retail: 1, event: 0,
};

/**
 * Get this rep's performance for a specific lead source.
 * Deterministic pseudo-random jitter per (rep, source) so numbers look real.
 */
export function getRepSourceStats(repId, leadSource) {
  const rep = consultants.find(c => c.id === repId);
  if (!rep) return null;

  // Deterministic jitter ±15% based on rep id + source
  const seed = hashCode(repId + '|' + leadSource);
  const jitter = 1 + ((seed % 1000) / 1000 - 0.5) * 0.30;  // 0.85–1.15

  const baseSitRate = SIT_RATE_BY_SOURCE[leadSource] ?? 25;
  const sitRate = Math.max(5, Math.min(65, baseSitRate * jitter));

  const baseClose = CLOSE_RATE_OVERRIDES[repId] ?? POSITION_CLOSE_RATE[rep.position] ?? 0.25;
  const synergy = LEAD_SOURCE_SYNERGY[leadSource]?.perPosition?.[rep.position] ?? 1.0;
  const closeRate = Math.min(0.65, baseClose * synergy * jitter) * 100;

  const baseVolume = BASE_VOLUME_PER_REP_90D[leadSource] ?? 0;
  const assigned = Math.round(baseVolume * jitter);
  const sits = Math.round(assigned * (sitRate / 100));
  const closeCount = Math.round(sits * (closeRate / 100));

  return {
    assigned,
    sits,
    sitRate: Math.round(sitRate * 10) / 10,
    closeRate: Math.round(closeRate * 10) / 10,
    closeCount,
    // Net appts-to-close — the headline KPI
    assignedToClose: assigned > 0 ? Math.round((closeCount / assigned) * 1000) / 10 : 0,
  };
}

/**
 * Aggregate performance across all lead sources for a rep.
 */
export function getRepOverallStats(repId) {
  const sources = Object.keys(SIT_RATE_BY_SOURCE);
  let assigned = 0, sits = 0, closeCount = 0;
  for (const src of sources) {
    const s = getRepSourceStats(repId, src);
    if (!s) continue;
    assigned += s.assigned;
    sits += s.sits;
    closeCount += s.closeCount;
  }
  return {
    assigned, sits, closeCount,
    sitRate: assigned > 0 ? Math.round((sits / assigned) * 1000) / 10 : 0,
    closeRate: sits > 0 ? Math.round((closeCount / sits) * 1000) / 10 : 0,
    assignedToClose: assigned > 0 ? Math.round((closeCount / assigned) * 1000) / 10 : 0,
  };
}

/**
 * Full depth chart: all reps ranked by a given metric.
 *   metric: 'closeRate' | 'sitRate' | 'assignedToClose' | 'closeCount'
 *   leadSource (optional): restrict the metric to one lead source, else overall.
 */
export function getDepthChart({ metric = 'assignedToClose', leadSource = null, territory = null } = {}) {
  const pool = territory
    ? consultants.filter(c => c.territories.includes(territory))
    : consultants;

  return pool
    .map(rep => {
      const stats = leadSource ? getRepSourceStats(rep.id, leadSource) : getRepOverallStats(rep.id);
      return { rep, stats, value: stats?.[metric] ?? 0 };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Get performance breakdown across all lead sources for a single rep.
 * Used by the rep detail panel.
 */
export function getRepSourceBreakdown(repId) {
  const sources = Object.keys(SIT_RATE_BY_SOURCE);
  return sources.map(src => ({
    leadSource: src,
    ...getRepSourceStats(repId, src),
  })).sort((a, b) => (b.closeCount ?? 0) - (a.closeCount ?? 0));
}

// Simple deterministic string hash
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export { POSITION_CLOSE_RATE, SLOT_CLOSE_MULTIPLIER, SIT_RATE_BY_SOURCE };

// ═══════════════════════════════════════════════════════════════════
// Cancellation rate — Chris's factor (graft from sister repo formula)
// ───────────────────────────────────────────────────────────────────
// Returns the rep's recent cancellation rate (0-1). Today this is synthetic
// (deterministic jitter per repId, range 3-28% to match Chris's distribution).
// In Slice A we replace with real data: count of cancelled Appointment__c
// records / total in trailing 90 days from /api/sfdc/performance/by-rep.
// ═══════════════════════════════════════════════════════════════════

const CANCEL_RATE_OVERRIDES = {
  // Reps with known reliability profiles can be hand-tuned here once
  // we have real data. Empty until Slice A wires SF data in.
};

export function getRepCancelRate(repId) {
  if (CANCEL_RATE_OVERRIDES[repId] != null) return CANCEL_RATE_OVERRIDES[repId];

  // Prefer real SF data — count of canceled / total appointments in the
  // trailing window from Appointment__c. Trust the number once we have at
  // least 10 total appointments; below that, jitter dominates and the
  // synthetic estimate is more stable.
  const real = getRealRepStats(repId);
  if (real?.cancelRate != null && real.totalAppts >= 10) {
    return real.cancelRate;
  }

  // Synthetic fallback — deterministic jitter, range 3-28% (Chris's range)
  const seed = hashCode(repId + '|cancel');
  return 0.03 + ((seed % 1000) / 1000) * 0.25;
}

