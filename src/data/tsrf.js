// ═══════════════════════════════════════════════════════════════════
// TSRF (Total Solar Resource Fraction) — lead-quality signal
//
// TSRF is Aurora Solar's measure of how much of the theoretical max
// solar radiation a roof actually captures (0-100%). Higher TSRF =
// sunnier/less-shaded roof = better candidate for solar = higher close
// probability.
//
// ─── Source of truth ────────────────────────────────────────────────
//   Salesforce Opportunity → Aurora project integration
//     - `Opportunity.Aurora_Avg_TSRF__c` (Number, 0-100)   ← primary
//     - `Opportunity.Aurora_Project_Id__c`                  (for deep-links)
//   Until the SFDC pipe is wired, mock values are seeded on each
//   appointment (`apt.tsrf`) via `seedMockTsrf` (see mockData.js).
//
// ─── Tier thresholds ────────────────────────────────────────────────
//   >= 85  Premium   (green)   ▸ prioritize — top closer, best slot
//   75-84  Strong    (lime)    ▸ standard assignment
//   65-74  Fair      (amber)   ▸ viable but expect pushback on savings
//   <  65  Weak      (red)     ▸ shade/pitch problem — consider ground mount or pass
//   null   Unknown   (dim)     ▸ Aurora project not yet run
//
// Industry rule of thumb: anything < 70 is a yellow flag; < 60 is a
// design challenge. VH Solar historically closes ~1.4× better on
// TSRF >= 85 than on TSRF 65-74.
// ═══════════════════════════════════════════════════════════════════

import { T } from './theme.js';

export const TSRF_TIERS = [
  { key: 'premium', min: 85, label: 'Premium roof',  short: 'Premium', color: T.green,  bg: T.greenDim,  weight: 1.10 },
  { key: 'strong',  min: 75, label: 'Strong roof',   short: 'Strong',  color: '#A3E635', bg: 'rgba(163, 230, 53, 0.15)', weight: 1.03 },
  { key: 'fair',    min: 65, label: 'Fair roof',     short: 'Fair',    color: T.accent, bg: T.accentDim, weight: 0.95 },
  { key: 'weak',    min: 0,  label: 'Weak roof',     short: 'Weak',    color: T.red,    bg: T.redDim,    weight: 0.85 },
];

export const TSRF_UNKNOWN_TIER = {
  key: 'unknown', min: null, label: 'TSRF not run', short: 'Unknown',
  color: T.dim, bg: 'transparent', weight: 1.0,
};

/**
 * Map a TSRF number (0-100) to its tier.
 * Returns `TSRF_UNKNOWN_TIER` for null / undefined / non-numeric input.
 */
export function getTsrfTier(tsrf) {
  if (tsrf === null || tsrf === undefined || Number.isNaN(Number(tsrf))) {
    return TSRF_UNKNOWN_TIER;
  }
  const n = Number(tsrf);
  for (const tier of TSRF_TIERS) {
    if (n >= tier.min) return tier;
  }
  return TSRF_TIERS[TSRF_TIERS.length - 1];
}

/**
 * Multiplier applied to P(close) in the scoring engine. Keeps the
 * effect modest so TSRF is a tiebreaker rather than a dominant factor.
 */
export function tsrfCloseMultiplier(tsrf) {
  return getTsrfTier(tsrf).weight;
}

/**
 * Deterministic mock TSRF from an appointment id — stable across
 * reloads so colours don't flicker during demo. Replace with real
 * `apt.tsrf` once the Aurora/SFDC sync lands.
 *
 * Distribution roughly: 30% premium, 35% strong, 25% fair, 8% weak,
 * 2% unknown. Tunable via the `pctUnknown` arg for testing empty states.
 */
export function seedMockTsrf(appointmentId, { pctUnknown = 0.02 } = {}) {
  if (!appointmentId) return null;
  // djb2-ish — same family as notification service
  let h = 5381;
  for (let i = 0; i < appointmentId.length; i++) {
    h = ((h << 5) + h) + appointmentId.charCodeAt(i);
  }
  const r = (Math.abs(h) % 10000) / 10000; // 0..1 deterministic
  if (r < pctUnknown) return null;
  // Map r into a gentle bell centered around 78 with tails into both extremes.
  // Use inverse-CDF of a triangular-ish distribution: sqrt gives a left-heavy
  // then mirror so higher end is slightly favoured (we want most roofs ok).
  const shaped = 1 - Math.pow(1 - r, 1.6); // skew toward higher values
  const tsrf = 55 + shaped * 42;           // range ~55..97
  return Math.round(tsrf * 10) / 10;       // 1 decimal
}
