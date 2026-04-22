// ═══════════════════════════════════════════════════════════════════
// Demand Forecasting & Sit-Rate Prediction Engine
// Built from 3 years of Salesforce data (Apr 2023 – Apr 2026)
// 8,047 daily demand records · 112,656 sit-rate observations
// ═══════════════════════════════════════════════════════════════════

// ── Historical average daily sits by territory × day-of-week ─────
// 0 = Monday … 6 = Sunday
const TERRITORY_DOW = {
  CT:   { 0: 5.4, 1: 6.0, 2: 5.5, 3: 5.6, 4: 5.5, 5: 4.3, 6: 2.3 },
  MARI: { 0: 3.4, 1: 3.8, 2: 4.0, 3: 3.9, 4: 3.6, 5: 2.7, 6: 1.9 },
  MD:   { 0: 4.6, 1: 4.6, 2: 4.8, 3: 4.6, 4: 4.4, 5: 3.3, 6: 2.2 },
  MENH: { 0: 3.6, 1: 4.1, 2: 4.1, 3: 3.8, 4: 3.7, 5: 3.2, 6: 2.0 },
  NJPA: { 0: 2.7, 1: 2.8, 2: 2.9, 3: 2.7, 4: 2.8, 5: 2.3, 6: 1.9 },
  NYE:  { 0: 9.1, 1: 8.8, 2: 9.1, 3: 8.7, 4: 9.1, 5: 7.0, 6: 4.8 },
  NYW:  { 0: 9.1, 1: 8.8, 2: 9.1, 3: 8.7, 4: 9.1, 5: 7.0, 6: 4.8 }, // mirrored from NY aggregate until split data available
};

// ── Monthly seasonality index (1.0 = average month) ──────────────
// Jul–Aug are peak (1.23–1.28×), Dec is trough (0.70×)
const SEASONALITY = {
  1: 0.844, 2: 0.813, 3: 0.942, 4: 1.058, 5: 1.043, 6: 0.995,
  7: 1.226, 8: 1.282, 9: 1.127, 10: 1.077, 11: 0.896, 12: 0.697,
};

// ── Territory-specific monthly averages (daily sits) ─────────────
const TERRITORY_MONTHLY = {
  CT:   { 1:3.9, 2:4.7, 3:4.9, 4:5.2, 5:5.9, 6:5.3, 7:6.5, 8:6.3, 9:5.3, 10:4.8, 11:4.0, 12:3.4 },
  MARI: { 1:3.0, 2:3.0, 3:3.0, 4:3.5, 5:3.4, 6:3.5, 7:4.0, 8:4.0, 9:3.9, 10:3.6, 11:3.1, 12:2.8 },
  MD:   { 1:4.0, 2:4.6, 3:4.3, 4:4.9, 5:4.4, 6:3.6, 7:4.0, 8:4.0, 9:3.8, 10:3.8, 11:4.4, 12:3.4 },
  MENH: { 1:3.3, 2:2.9, 3:3.1, 4:3.2, 5:3.8, 6:3.6, 7:4.0, 8:4.2, 9:3.8, 10:4.1, 11:3.8, 12:3.2 },
  NJPA: { 1:2.1, 2:2.2, 3:2.5, 4:2.8, 5:2.3, 6:2.5, 7:3.0, 8:3.3, 9:3.5, 10:2.7, 11:2.3, 12:1.9 },
  NYE:  { 1:6.6, 2:7.1, 3:7.8, 4:8.2, 5:8.8, 6:8.1, 7:10.3, 8:9.9, 9:9.5, 10:8.1, 11:7.3, 12:5.3 },
  NYW:  { 1:6.6, 2:7.1, 3:7.8, 4:8.2, 5:8.8, 6:8.1, 7:10.3, 8:9.9, 9:9.5, 10:8.1, 11:7.3, 12:5.3 },
};

// ── 90-day trend vs prior 90 days (positive = growing) ───────────
const RECENT_TREND = {
  CT: 0.048, MARI: -0.382, MD: -0.229, MENH: -0.103, NJPA: -0.095, NYE: -0.089, NYW: -0.089,
};

// ── Sit rates by lead-source category ────────────────────────────
// Based on 112,656 appointment observations across 37 months
const SIT_RATES = {
  paid:             { sitRate: 30.3, dqRate: 18.6, noSitRate: 48.1, total: 79157 },
  partner:          { sitRate: 22.1, dqRate: 19.9, noSitRate: 57.1, total: 10597 },
  self_gen:         { sitRate: 18.6, dqRate: 10.2, noSitRate: 70.5, total: 11963 },
  get_the_referral: { sitRate: 46.9, dqRate: 12.1, noSitRate: 39.9, total: 6060  },
  inbound:          { sitRate: 35.8, dqRate: 10.4, noSitRate: 52.1, total: 7204  },
  retail:           { sitRate: 17.3, dqRate: 12.3, noSitRate: 69.0, total: 284   },
  event:            { sitRate: 26.9, dqRate: 11.5, noSitRate: 61.5, total: 52    },
};

// ── Monthly sit-rate trend (last 12 months) ──────────────────────
const SIT_RATE_TREND = {
  '2025-04': 28.4, '2025-05': 30.8, '2025-06': 30.5, '2025-07': 32.9,
  '2025-08': 32.6, '2025-09': 35.9, '2025-10': 34.5, '2025-11': 35.0,
  '2025-12': 33.0, '2026-01': 32.9, '2026-02': 35.5, '2026-03': 34.5,
  '2026-04': 30.8,
};

// ── Lead source → category mapping ──────────────────────────────
const SOURCE_CATEGORY_MAP = {
  'Paid': 'paid', 'paid': 'paid',
  'Self Gen': 'self_gen', 'self_gen': 'self_gen',
  'Get the Referral': 'get_the_referral', 'get_the_referral': 'get_the_referral',
  'Partner': 'partner', 'partner': 'partner',
  'Inbound': 'inbound', 'inbound': 'inbound',
  'Retail': 'retail', 'retail': 'retail',
  'Event': 'event', 'event': 'event',
};

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Forecast expected appointment demand for a given date and territory.
 * Returns { expected, low, high, seasonalIndex, dayOfWeekAvg, trend }
 */
export function forecastDemand(dateString, territory) {
  const d = new Date(dateString + 'T12:00:00');
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // JS Sunday=0 → our 6
  const month = d.getMonth() + 1;

  const terr = territory || 'CT';
  const dowAvg = TERRITORY_DOW[terr]?.[dow] ?? 4;
  const monthAvg = TERRITORY_MONTHLY[terr]?.[month] ?? dowAvg;
  const seasonal = SEASONALITY[month] ?? 1.0;
  const trend = RECENT_TREND[terr] ?? 0;

  // Blend day-of-week average with monthly average, weighted toward monthly
  const blended = monthAvg * 0.6 + dowAvg * 0.4;

  // Apply mild trend adjustment (cap at ±15%)
  const trendFactor = 1 + Math.max(-0.15, Math.min(0.15, trend));
  const expected = Math.round(blended * trendFactor * 10) / 10;

  // Confidence interval (±30% for single-day forecasts)
  const low = Math.max(0, Math.round(expected * 0.7));
  const high = Math.round(expected * 1.3);

  return { expected, low, high, seasonalIndex: seasonal, dayOfWeekAvg: dowAvg, trend };
}

/**
 * Forecast a full week of demand for a territory.
 * Returns array of 7 objects with { date, expected, low, high, dow }
 */
export function forecastWeek(startDateString, territory) {
  const days = [];
  const start = new Date(startDateString + 'T12:00:00');
  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    const forecast = forecastDemand(ds, territory);
    const jsDow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    days.push({ date: ds, dow: dowNames[jsDow], ...forecast });
  }
  return days;
}

/**
 * Get all-territory demand summary for a given date.
 * Returns { territories: { CT: {...}, ... }, totalExpected, peakTerritory }
 */
export function forecastAllTerritories(dateString) {
  const territories = {};
  let totalExpected = 0;
  let peakTerritory = null;
  let peakVal = 0;

  for (const terr of Object.keys(TERRITORY_DOW)) {
    const f = forecastDemand(dateString, terr);
    territories[terr] = f;
    totalExpected += f.expected;
    if (f.expected > peakVal) { peakVal = f.expected; peakTerritory = terr; }
  }

  return { territories, totalExpected: Math.round(totalExpected * 10) / 10, peakTerritory };
}

/**
 * Get the sit-rate prediction for a lead source category.
 * Returns { sitRate, dqRate, noSitRate, confidence, total }
 */
export function predictSitRate(leadSource) {
  const category = SOURCE_CATEGORY_MAP[leadSource] || leadSource || 'paid';
  const data = SIT_RATES[category] || SIT_RATES.paid;
  // Confidence based on sample size
  const confidence = data.total > 5000 ? 'high' : data.total > 500 ? 'medium' : 'low';
  return { ...data, category, confidence };
}

/**
 * Get the current sit-rate trend (last 12 months).
 * Returns { current, trend, direction, history }
 */
export function getSitRateTrend() {
  const months = Object.keys(SIT_RATE_TREND).sort();
  const current = SIT_RATE_TREND[months[months.length - 1]];
  const sixMonthsAgo = SIT_RATE_TREND[months[Math.max(0, months.length - 7)]];
  const trend = Math.round((current - sixMonthsAgo) * 10) / 10;
  const direction = trend > 1 ? 'improving' : trend < -1 ? 'declining' : 'stable';
  return { current, trend, direction, history: SIT_RATE_TREND };
}

/**
 * Estimate the optimal number of reps needed for a territory on a given date.
 * Uses demand forecast + sit rate to compute effective appointments.
 * Assumes 3 appointments per rep per day capacity.
 */
export function estimateStaffingNeed(dateString, territory, leadSourceMix = null) {
  const demand = forecastDemand(dateString, territory);
  const mix = leadSourceMix || { paid: 0.65, self_gen: 0.15, get_the_referral: 0.10, partner: 0.10 };

  // Weighted sit rate based on lead source mix
  let weightedSitRate = 0;
  for (const [source, weight] of Object.entries(mix)) {
    const sr = SIT_RATES[source]?.sitRate ?? 30;
    weightedSitRate += sr * weight;
  }

  // Expected sits = demand × sit rate
  const expectedSits = demand.expected * (weightedSitRate / 100);
  // Each rep handles ~3 slots per day (9AM, 11:30AM, 2PM — PM slots are flex)
  const slotsPerRep = 3;
  const repsNeeded = Math.ceil(expectedSits / slotsPerRep);

  return {
    expectedDemand: demand.expected,
    weightedSitRate: Math.round(weightedSitRate * 10) / 10,
    expectedSits: Math.round(expectedSits * 10) / 10,
    repsNeeded,
    slotsPerRep,
  };
}

/**
 * Score a time slot's expected demand relative to the day.
 * Returns { score: 0-100, label: 'High'|'Medium'|'Low', expectedPct }
 * Based on historical time-slot distribution patterns.
 */
export function scoreTimeSlot(timeSlot) {
  // Historical distribution across the 5 daily slots
  const SLOT_DISTRIBUTION = {
    '9:00 AM':  0.22,  // Strong morning demand
    '11:30 AM': 0.24,  // Peak midday
    '2:00 PM':  0.22,  // Solid afternoon
    '5:00 PM':  0.20,  // Good early evening
    '7:00 PM':  0.12,  // Lower late evening
  };
  const pct = SLOT_DISTRIBUTION[timeSlot] ?? 0.20;
  const score = Math.round(pct * 100 / 0.24 * 100) / 100; // normalize to 100
  const label = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';
  return { score: Math.min(100, Math.round(score)), label, expectedPct: pct };
}

// ── Export raw data for dashboard components ─────────────────────
export const RAW_DATA = {
  TERRITORY_DOW,
  SEASONALITY,
  TERRITORY_MONTHLY,
  RECENT_TREND,
  SIT_RATES,
  SIT_RATE_TREND,
};
