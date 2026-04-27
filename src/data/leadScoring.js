/**
 * Composite Lead Scoring Engine
 *
 * Scores leads 0–100 based on multiple signals beyond TSRF.
 * Modeled after what Enerflo, Powur, SubBase, and Sunrun use:
 *
 *   Signal              Weight   Source
 *   ─────────────────── ──────── ────────────────────���───
 *   TSRF (roof quality) 20%      Aurora
 *   Home value          15%      Zillow / ATTOM / manual
 *   Utility spend       15%      Utility bill / estimate
 *   Homeowner tenure    10%      Property records / SFDC
 *   Credit tier         10%      Soft pull / self-reported
 *   Lead source quality 10%      Historical close rates
 *   Engagement signals  10%      Responsiveness, confirms
 *   Deal velocity       10%      Days from lead to appt
 *
 * Returns: { score: 0-100, grade: A/B/C/D/F, factors: [...], color }
 */

// ─── Weights (must sum to 1.0) ──────────────────────────────────────

const WEIGHTS = {
  tsrf:           0.20,
  homeValue:      0.15,
  utilitySpend:   0.15,
  ownerTenure:    0.10,
  creditTier:     0.10,
  leadSource:     0.10,
  engagement:     0.10,
  dealVelocity:   0.10,
};

// ─── Scoring functions (each returns 0–100) ─────────────────────────

function scoreTsrf(tsrf) {
  if (tsrf == null) return 50; // unknown = neutral
  if (tsrf >= 85) return 100;
  if (tsrf >= 75) return 80;
  if (tsrf >= 65) return 60;
  if (tsrf >= 55) return 40;
  return 20;
}

function scoreHomeValue(value) {
  // Sweet spot for solar ROI: $250k–$750k
  if (value == null) return 50;
  if (value >= 350000 && value <= 750000) return 100;
  if (value >= 250000 && value < 350000) return 85;
  if (value >= 750000 && value < 1200000) return 75;
  if (value >= 150000 && value < 250000) return 55;
  if (value < 150000) return 30;
  return 60; // very high value (>1.2M) — could go either way
}

function scoreUtilitySpend(monthlyBill) {
  // Higher bill = more savings potential = higher motivation
  if (monthlyBill == null) return 50;
  if (monthlyBill >= 250) return 100;
  if (monthlyBill >= 200) return 90;
  if (monthlyBill >= 150) return 75;
  if (monthlyBill >= 100) return 55;
  if (monthlyBill >= 75) return 35;
  return 15; // Below $75/mo — economics rarely work
}

function scoreOwnerTenure(yearsOwned) {
  // Longer tenure = more committed to property = more likely to invest
  if (yearsOwned == null) return 50;
  if (yearsOwned >= 10) return 100;
  if (yearsOwned >= 5) return 85;
  if (yearsOwned >= 3) return 70;
  if (yearsOwned >= 1) return 50;
  return 25; // Very new owner — may not be ready
}

function scoreCreditTier(tier) {
  // Financing approval is critical for close
  const tiers = {
    excellent: 100,  // 750+
    good: 80,        // 700-749
    fair: 50,        // 650-699
    poor: 20,        // below 650
    unknown: 50,
  };
  return tiers[(tier || 'unknown').toLowerCase()] ?? 50;
}

// Historical close rates by lead source (from repPerformance.js patterns)
const SOURCE_SCORES = {
  get_the_referral: 95,
  self_gen: 85,
  referral: 90,
  retail: 70,
  inbound: 65,
  partner: 60,
  paid: 50,
  event: 45,
  canvass: 40,
};

function scoreLeadSource(source) {
  if (!source) return 50;
  return SOURCE_SCORES[source.toLowerCase()] ?? SOURCE_SCORES[source.replace(/\s+/g, '_').toLowerCase()] ?? 50;
}

function scoreEngagement(signals) {
  // signals: { confirmedAppt, respondedToText, openedEmail, clickedLink, referredOthers }
  if (!signals) return 50;
  let score = 30; // baseline
  if (signals.confirmedAppt) score += 20;
  if (signals.respondedToText) score += 15;
  if (signals.openedEmail) score += 10;
  if (signals.clickedLink) score += 10;
  if (signals.referredOthers) score += 15;
  return Math.min(100, score);
}

function scoreDealVelocity(daysFromLeadToAppt) {
  // Faster = hotter lead
  if (daysFromLeadToAppt == null) return 50;
  if (daysFromLeadToAppt <= 1) return 100;
  if (daysFromLeadToAppt <= 3) return 85;
  if (daysFromLeadToAppt <= 7) return 70;
  if (daysFromLeadToAppt <= 14) return 50;
  if (daysFromLeadToAppt <= 30) return 35;
  return 20; // Over a month — lead is cooling
}

// ─── Main scoring function ──────────────────────────────────────────

/**
 * Score a lead with all available signals.
 *
 * @param {Object} lead
 * @param {number|null}  lead.tsrf            - Aurora TSRF (0-100)
 * @param {number|null}  lead.homeValue       - Estimated home value in dollars
 * @param {number|null}  lead.utilitySpend    - Monthly utility bill in dollars
 * @param {number|null}  lead.ownerTenure     - Years homeowner has owned property
 * @param {string|null}  lead.creditTier      - 'excellent'|'good'|'fair'|'poor'|'unknown'
 * @param {string|null}  lead.leadSource      - Lead source key
 * @param {Object|null}  lead.engagement      - Engagement signal flags
 * @param {number|null}  lead.daysToAppt      - Days from lead creation to appointment
 *
 * @returns {{ score: number, grade: string, color: string, factors: Array<{name, score, weight, weighted, label}> }}
 */
export function scoreLead(lead = {}) {
  const factors = [
    { name: 'tsrf',         label: 'Roof Quality (TSRF)',    score: scoreTsrf(lead.tsrf),                 weight: WEIGHTS.tsrf },
    { name: 'homeValue',    label: 'Home Value',             score: scoreHomeValue(lead.homeValue),        weight: WEIGHTS.homeValue },
    { name: 'utilitySpend', label: 'Utility Spend',          score: scoreUtilitySpend(lead.utilitySpend),  weight: WEIGHTS.utilitySpend },
    { name: 'ownerTenure',  label: 'Owner Tenure',           score: scoreOwnerTenure(lead.ownerTenure),    weight: WEIGHTS.ownerTenure },
    { name: 'creditTier',   label: 'Credit Tier',            score: scoreCreditTier(lead.creditTier),      weight: WEIGHTS.creditTier },
    { name: 'leadSource',   label: 'Lead Source Quality',    score: scoreLeadSource(lead.leadSource),      weight: WEIGHTS.leadSource },
    { name: 'engagement',   label: 'Engagement',             score: scoreEngagement(lead.engagement),      weight: WEIGHTS.engagement },
    { name: 'dealVelocity', label: 'Deal Velocity',          score: scoreDealVelocity(lead.daysToAppt),    weight: WEIGHTS.dealVelocity },
  ];

  // Compute weighted scores
  factors.forEach(f => {
    f.weighted = Math.round(f.score * f.weight);
  });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.weighted, 0));
  const grade = getGrade(totalScore);
  const color = getGradeColor(grade);

  return { score: totalScore, grade, color, factors };
}

function getGrade(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getGradeColor(grade) {
  const colors = { A: '#2DD4A8', B: '#22C55E', C: '#F0A830', D: '#F97316', F: '#F87171' };
  return colors[grade] || '#8B95A3';
}

/**
 * Generate a mock lead score for demo purposes.
 * Uses appointment data to derive plausible signals.
 */
export function mockLeadScore(appointment) {
  const leadSource = appointment.leadSource || 'paid';
  const tsrf = appointment.tsrf ?? null;

  // Derive plausible signals from what we know
  const homeValue = deriveHomeValue(appointment.zipCode);
  const utilitySpend = deriveUtilitySpend(appointment.zipCode, appointment.state);
  const ownerTenure = appointment.isOwner ? (5 + Math.floor(hashCode(appointment.customer || '') % 15)) : null;
  const creditTier = deriveCreditTier(appointment.customer || '');
  const daysToAppt = Math.floor(hashCode((appointment.id || '') + 'vel') % 21) + 1;

  const engagement = {
    confirmedAppt: appointment.status === 'confirmed' || appointment.status === 'completed',
    respondedToText: hashCode((appointment.id || '') + 'sms') % 3 !== 0,
    openedEmail: hashCode((appointment.id || '') + 'email') % 4 !== 0,
    clickedLink: hashCode((appointment.id || '') + 'click') % 5 !== 0,
    referredOthers: leadSource === 'get_the_referral',
  };

  return scoreLead({ tsrf, homeValue, utilitySpend, ownerTenure, creditTier, leadSource, engagement, daysToAppt });
}

// ─── Helper derivation functions (for mock data) ────────────────────

function deriveHomeValue(zip) {
  if (!zip) return null;
  // Rough zip-based home value estimates
  const prefix = zip.toString().substring(0, 3);
  const highValue = ['100', '101', '104', '068', '069', '060', '061', '028', '021'];
  const midValue = ['077', '078', '070', '119', '112', '117', '208', '212'];
  if (highValue.includes(prefix)) return 450000 + (hashCode(zip) % 300000);
  if (midValue.includes(prefix)) return 300000 + (hashCode(zip) % 200000);
  return 200000 + (hashCode(zip) % 250000);
}

function deriveUtilitySpend(zip, state) {
  // Regional utility cost estimates
  const highCost = ['CT', 'MA', 'RI', 'NH', 'ME']; // New England = expensive
  const midCost = ['NY', 'NJ', 'PA', 'MD', 'DC'];
  const base = highCost.includes(state) ? 180 : midCost.includes(state) ? 150 : 120;
  return base + (hashCode(zip || '00000') % 100);
}

function deriveCreditTier(name) {
  const h = hashCode(name);
  if (h % 10 >= 7) return 'excellent';
  if (h % 10 >= 4) return 'good';
  if (h % 10 >= 2) return 'fair';
  return 'poor';
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// ─── Exports ────────────────────────────────────────────────────────

export { WEIGHTS, SOURCE_SCORES };
