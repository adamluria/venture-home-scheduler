// ═══════════════════════════════════════════════════════════════════
// Slot Suggestion Engine
//
// Given a customer (address/zip, lead source) and a date window,
// ranks open (slot × rep) pairings by EXPECTED CLOSE PROBABILITY:
//
//   P(close) = P(sit) × P(close | sit)
//
//   P(sit)       = sit_rate(leadSource)                    // from forecastEngine
//                  × slot_show_modifier(timeSlot)
//                  × proximity_modifier(rep.homeZip ↔ customer.zip)
//
//   P(close|sit) = getRepCloseRate(rep, {timeSlot, leadSource})  // repPerformance
//
// Also returns:
//   - Top 3 highest-likelihood slots (for "suggested slot" UI)
//   - Full ranked list (for grid display)
//   - "Best closer" pick per slot
//   - Reasons (so the dispatcher understands WHY this slot is #1)
// ═══════════════════════════════════════════════════════════════════

import { consultants } from './mockData.js';
import { getRepCloseRate } from './repPerformance.js';
import { predictSitRate } from './forecastEngine.js';
import { TIME_SLOTS } from './theme.js';
import { getSlotAvailability } from './calendarService.js';
import { tsrfCloseMultiplier, getTsrfTier } from './tsrf.js';

// ── Slot-level sit-show modifiers ────────────────────────────────────
// Historical: 5pm has the best show rate (both spouses home after work),
// 9am has the worst (people oversleep / reschedule).
const SLOT_SHOW_MODIFIER = {
  '9:00 AM':  0.88,
  '11:30 AM': 0.95,
  '2:00 PM':  1.02,
  '5:00 PM':  1.10,
  '7:00 PM':  1.05,
};

// ── Weekend rules ────────────────────────────────────────────────────
const WEEKEND_BLOCKED_SLOTS = ['7:00 PM'];  // no 7 PM on Sat/Sun

// ═══════════════════════════════════════════════════════════════════
// Proximity scoring (zip-prefix based)
// ═══════════════════════════════════════════════════════════════════
// Full drive-time matrix would require a routing API. As a proxy we use
// the first-3 digits of the zip code: same ZCTA = near, same first-2 =
// medium, else far.
function proximityScore(repZip, customerZip) {
  if (!repZip || !customerZip) return 0.85;
  if (repZip === customerZip) return 1.00;
  const r3 = repZip.slice(0, 3), c3 = customerZip.slice(0, 3);
  if (r3 === c3) return 0.98;
  const r2 = repZip.slice(0, 2), c2 = customerZip.slice(0, 2);
  if (r2 === c2) return 0.92;
  const r1 = repZip.slice(0, 1), c1 = customerZip.slice(0, 1);
  if (r1 === c1) return 0.84;
  return 0.72;  // far — out of region, still possible if hybrid
}

// ═══════════════════════════════════════════════════════════════════
// Constraint checks
// ═══════════════════════════════════════════════════════════════════
function repBlockedForSlot(rep, { timeSlot, dateString, city, state, isVirtual }) {
  if (!rep.constraints?.blockedSlots) return null;
  for (const block of rep.constraints.blockedSlots) {
    if (block.times && !block.times.includes(timeSlot)) continue;
    if (block.dayOfWeek !== undefined) {
      const dow = new Date(dateString + 'T12:00:00').getDay();
      if (dow !== block.dayOfWeek) continue;
    }
    if (block.cities && city && !block.cities.includes(city)) continue;
    if (block.state && state && block.state !== state) continue;
    if (block.condition === 'in_person_only' && isVirtual) continue;
    return `Rep blocked: ${block.cities?.join(', ') || ''} ${timeSlot} ${block.condition || ''}`.trim();
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Core scoring
// ═══════════════════════════════════════════════════════════════════

/**
 * Score a single (rep, date, slot) combination.
 * Returns { score, breakdown, reasons }
 */
export function scoreRepSlot({
  rep,
  dateString,
  timeSlot,
  leadSource = 'paid',
  customerZip = '',
  customerCity = '',
  customerState = '',
  isVirtual = false,
  tsrf = null,               // Aurora avg TSRF (0-100); null = unknown
}) {
  const reasons = [];

  // Hard blocks first — if any fail, return 0
  if (rep.isCloserOnly && !isVirtual) {
    return { score: 0, breakdown: null, reasons: ['Closer-only rep — virtual only'], blocked: true };
  }
  const dow = new Date(dateString + 'T12:00:00').getDay();
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend && WEEKEND_BLOCKED_SLOTS.includes(timeSlot)) {
    return { score: 0, breakdown: null, reasons: ['No 7 PM on weekends'], blocked: true };
  }
  const constraintReason = repBlockedForSlot(rep, {
    timeSlot, dateString, city: customerCity, state: customerState, isVirtual,
  });
  if (constraintReason) {
    return { score: 0, breakdown: null, reasons: [constraintReason], blocked: true };
  }

  // Component 1: P(sit) — probability the appointment actually happens
  const baseSit = predictSitRate(leadSource) / 100;            // e.g. 0.303 for paid
  const showMod = SLOT_SHOW_MODIFIER[timeSlot] ?? 1.0;
  const proxMod = proximityScore(rep.homeZip, customerZip);
  const pSit = Math.min(0.9, baseSit * showMod * proxMod);

  // Component 2: P(close | sit) — rep-specific
  const pCloseGivenSitRaw = getRepCloseRate(rep.id, { timeSlot, leadSource });

  // Component 3: TSRF modifier — sunnier roof → higher close probability.
  // Kept as a gentle multiplier so it acts as a tiebreaker, not a dominant factor.
  // Premium (≥85): ×1.10  Strong (75-84): ×1.03  Fair (65-74): ×0.95  Weak (<65): ×0.85
  const tsrfMod = tsrfCloseMultiplier(tsrf);
  const pCloseGivenSit = Math.min(0.65, pCloseGivenSitRaw * tsrfMod); // respect existing cap

  // Combined
  const pClose = pSit * pCloseGivenSit;

  // Reason generation
  if (proxMod >= 0.98) reasons.push('Rep lives near customer');
  else if (proxMod >= 0.92) reasons.push('Rep in same area');
  else if (proxMod < 0.80) reasons.push('Rep is far from customer');

  if (showMod >= 1.05) reasons.push(`${timeSlot} has high sit-show rate`);
  else if (showMod < 0.95) reasons.push(`${timeSlot} tends to reschedule`);

  if (pCloseGivenSit >= 0.35) reasons.push('Top-tier closer');
  else if (pCloseGivenSit >= 0.30) reasons.push('Strong closer');

  if (rep.isHybrid) reasons.push('Hybrid rep — flexible');

  const tsrfTier = getTsrfTier(tsrf);
  if (tsrfTier.key === 'premium') reasons.push('Premium roof (TSRF ≥ 85)');
  else if (tsrfTier.key === 'weak') reasons.push('Weak roof — expect shade pushback');

  return {
    score: pClose,
    breakdown: {
      pSit: Math.round(pSit * 1000) / 10,           // % with 1 decimal
      pCloseGivenSit: Math.round(pCloseGivenSit * 1000) / 10,
      pClose: Math.round(pClose * 1000) / 10,
      baseSit: Math.round(baseSit * 1000) / 10,
      slotShowMod: showMod,
      proxMod: Math.round(proxMod * 100) / 100,
      tsrfMod: Math.round(tsrfMod * 100) / 100,
      tsrfTier: tsrfTier.key,
    },
    reasons,
    blocked: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// High-level API — rank slots across a date window
// ═══════════════════════════════════════════════════════════════════

/**
 * Rank all open (date, slot, rep) combinations in a window by P(close).
 *
 * @param {Object} ctx
 * @param {string} ctx.territory       Territory code
 * @param {string} ctx.customerZip     Customer zip (for proximity)
 * @param {string} ctx.customerCity
 * @param {string} ctx.customerState
 * @param {string} ctx.leadSource      Lead source category
 * @param {boolean} ctx.isVirtual
 * @param {string} ctx.startDate       YYYY-MM-DD (default today)
 * @param {number} ctx.days            How many days to scan (default 7)
 * @param {number} ctx.topN            How many top suggestions to return
 *
 * @returns {Promise<{ top, all, bestCloserBySlot }>}
 */
export async function suggestSlots(ctx) {
  const {
    territory,
    customerZip = '',
    customerCity = '',
    customerState = '',
    leadSource = 'paid',
    isVirtual = false,
    startDate,
    days = 7,
    topN = 3,
  } = ctx;

  const today = startDate || new Date().toISOString().split('T')[0];
  const eligibleReps = consultants.filter(c =>
    c.territories.includes(territory) &&
    // Field reps for in-person, any closer for virtual
    (isVirtual ? true : !c.isCloserOnly)
  );
  if (eligibleReps.length === 0) return { top: [], all: [], bestCloserBySlot: {} };

  // Build date list
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Fetch availability for each date in parallel
  const availabilityByDate = {};
  await Promise.all(dates.map(async (date) => {
    availabilityByDate[date] = await getSlotAvailability(date, eligibleReps.map(r => r.id));
  }));

  const all = [];
  for (const date of dates) {
    for (const slot of TIME_SLOTS) {
      for (const rep of eligibleReps) {
        // Skip if rep is busy on calendar
        const avail = availabilityByDate[date]?.[rep.id]?.[slot];
        if (!avail || avail.available === false) continue;

        const scored = scoreRepSlot({
          rep, dateString: date, timeSlot: slot,
          leadSource, customerZip, customerCity, customerState, isVirtual,
        });
        if (scored.blocked) continue;

        all.push({
          date,
          slot,
          repId: rep.id,
          repName: rep.name,
          repPosition: rep.position,
          repTeam: rep.team,
          isHybrid: !!rep.isHybrid,
          ...scored,
        });
      }
    }
  }

  all.sort((a, b) => b.score - a.score);

  // Top overall
  const top = [];
  const seenDateSlot = new Set();  // enforce unique (date,slot) in top-N
  for (const entry of all) {
    const key = `${entry.date}|${entry.slot}`;
    if (seenDateSlot.has(key)) continue;
    seenDateSlot.add(key);
    top.push(entry);
    if (top.length >= topN) break;
  }

  // Best closer (rep) per slot-across-window — useful for "who should own this?"
  const bestCloserBySlot = {};
  for (const entry of all) {
    const key = `${entry.date}|${entry.slot}`;
    if (!bestCloserBySlot[key] || entry.score > bestCloserBySlot[key].score) {
      bestCloserBySlot[key] = entry;
    }
  }

  return { top, all, bestCloserBySlot, datesScanned: dates.length, totalOptions: all.length };
}

/**
 * Lighter helper: for a fixed (date, slot), who are the best N reps?
 */
export async function rankRepsForSlot({ date, slot, territory, leadSource, customerZip, customerCity, customerState, isVirtual, topN = 5 }) {
  const eligibleReps = consultants.filter(c =>
    c.territories.includes(territory) &&
    (isVirtual ? true : !c.isCloserOnly)
  );

  const ids = eligibleReps.map(r => r.id);
  const availability = await getSlotAvailability(date, ids);

  const ranked = eligibleReps
    .filter(rep => availability[rep.id]?.[slot]?.available)
    .map(rep => {
      const scored = scoreRepSlot({
        rep, dateString: date, timeSlot: slot,
        leadSource, customerZip, customerCity, customerState, isVirtual,
      });
      return { repId: rep.id, repName: rep.name, repTeam: rep.team, ...scored };
    })
    .filter(r => !r.blocked)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return ranked;
}

export { SLOT_SHOW_MODIFIER };
