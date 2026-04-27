// ═══════════════════════════════════════════════════════════════════
// Property Data Service — Owner verification & name mismatch detection
//
// Adapter pattern: swap between mock and a real property data provider
// (ATTOM, CoreLogic, county assessor API) without touching callers.
//
// Providers:
//   - 'mock'    (default) — deterministic fake owner data based on address hash
//   - 'attom'   — ATTOM Data Solutions API (plug in ATTOM_API_KEY)
//   - 'corelogic' — CoreLogic Property API (plug in CORELOGIC_API_KEY)
//
// Usage:
//   const result = await lookupPropertyOwner({ address, zipCode, customerName });
//   // → { owner, match, mismatch, confidence, details }
//
// The mismatch flag is the key output: true = customer probably isn't the
// property owner (likely a renter), which means they can't sign a solar
// contract without landlord approval.
// ═══════════════════════════════════════════════════════════════════

import { T } from './theme.js';

// ─── Name matching utilities ─────────────────────────────────────

/**
 * Normalize a name for comparison: lowercase, strip suffixes, trim.
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v|esq|md|phd|dds)\b\.?/gi, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check if two names are likely the same person.
 * Handles: last-name match, first+last match, partial first name,
 * reversed order, married name (customer "Jane Smith" vs owner "John & Jane Smith").
 *
 * Returns: { match: boolean, confidence: 'high'|'medium'|'low'|'none', reason: string }
 */
function compareNames(customerName, ownerName) {
  const cNorm = normalizeName(customerName);
  const oNorm = normalizeName(ownerName);

  if (!cNorm || !oNorm) return { match: false, confidence: 'none', reason: 'Missing name' };

  // Exact match
  if (cNorm === oNorm) return { match: true, confidence: 'high', reason: 'Exact match' };

  const cParts = cNorm.split(' ');
  const oParts = oNorm.split(' ');

  const cFirst = cParts[0];
  const cLast = cParts[cParts.length - 1];
  const oFirst = oParts[0];
  const oLast = oParts[oParts.length - 1];

  // Last name match + first name match
  if (cLast === oLast && cFirst === oFirst) {
    return { match: true, confidence: 'high', reason: 'First and last name match' };
  }

  // Last name match only
  if (cLast === oLast) {
    return { match: true, confidence: 'medium', reason: 'Last name matches (possible family member)' };
  }

  // Check if customer name appears in a joint owner string ("John & Jane Smith")
  const ownerJoint = oNorm.replace(/\s*[&+]\s*/g, ' ');
  if (ownerJoint.includes(cFirst) && ownerJoint.includes(cLast)) {
    return { match: true, confidence: 'high', reason: 'Customer found in joint ownership' };
  }

  // Check for reversed name order
  if (cParts.length >= 2 && `${cLast} ${cFirst}` === oNorm) {
    return { match: true, confidence: 'high', reason: 'Name order reversed' };
  }

  // Partial first name (e.g., "Rob" vs "Robert")
  if (cLast === oLast && (cFirst.startsWith(oFirst) || oFirst.startsWith(cFirst)) && Math.min(cFirst.length, oFirst.length) >= 3) {
    return { match: true, confidence: 'medium', reason: 'Last name + partial first name match' };
  }

  return { match: false, confidence: 'none', reason: 'No match — likely renter or different owner' };
}

// ─── Mock property data ──────────────────────────────────────────

// DJB2 hash for deterministic mock data
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}

// Common last names for mock owners
const MOCK_LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore',
  'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez',
  'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
];

const MOCK_FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael',
  'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan',
  'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
];

/**
 * Generate a deterministic mock property owner from an address.
 * ~70% of the time the owner name matches the customer (owner-occupied),
 * ~20% partial match (family member), ~10% total mismatch (renter).
 */
function mockOwnerLookup(address, zipCode, customerName) {
  const key = `${address}|${zipCode}`;
  const hash = djb2(key);
  const roll = (hash % 100);

  const cParts = normalizeName(customerName).split(' ');
  const cLast = cParts[cParts.length - 1] || 'smith';
  const cFirst = cParts[0] || 'john';

  let ownerName;
  let ownerSince;
  let propertyType;

  // 70%: owner-occupied — same name as customer
  if (roll < 70) {
    ownerName = customerName;
    ownerSince = 2005 + (hash % 18); // 2005-2022
    propertyType = 'Single Family';
  }
  // 15%: family member — same last name, different first
  else if (roll < 85) {
    const fi = (hash >> 4) % MOCK_FIRST_NAMES.length;
    const mockFirst = MOCK_FIRST_NAMES[fi];
    // Use customer's last name with a different first name
    const formattedLast = cLast.charAt(0).toUpperCase() + cLast.slice(1);
    ownerName = `${mockFirst} ${formattedLast}`;
    ownerSince = 1998 + (hash % 25);
    propertyType = 'Single Family';
  }
  // 10%: total mismatch — likely renter
  else if (roll < 95) {
    const fi = (hash >> 3) % MOCK_FIRST_NAMES.length;
    const li = (hash >> 5) % MOCK_LAST_NAMES.length;
    ownerName = `${MOCK_FIRST_NAMES[fi]} ${MOCK_LAST_NAMES[li]}`;
    ownerSince = 2000 + (hash % 23);
    propertyType = (hash % 3 === 0) ? 'Multi-Family' : 'Single Family';
  }
  // 5%: LLC / trust ownership
  else {
    const li = (hash >> 2) % MOCK_LAST_NAMES.length;
    ownerName = `${MOCK_LAST_NAMES[li]} Family Trust`;
    ownerSince = 2010 + (hash % 13);
    propertyType = 'Single Family';
  }

  return {
    ownerName,
    ownerSince,
    propertyType,
    assessedValue: 250000 + (hash % 500) * 1000, // $250k-$750k
    lotSqFt: 4000 + (hash % 80) * 100,           // 4k-12k sqft
    yearBuilt: 1960 + (hash % 55),               // 1960-2014
    source: 'mock',
  };
}

// ─── Mismatch status tiers ───────────────────────────────────────

export const OWNER_MATCH_STATUS = {
  verified:  { key: 'verified',  label: 'Owner verified',       short: 'Verified',  color: T.green,  bg: T.greenDim,  icon: '✓' },
  likely:    { key: 'likely',    label: 'Likely owner',          short: 'Likely',    color: '#A3E635', bg: 'rgba(163, 230, 53, 0.15)', icon: '~' },
  mismatch:  { key: 'mismatch',  label: 'Name mismatch',        short: 'Mismatch',  color: T.red,    bg: T.redDim,    icon: '!' },
  trust_llc: { key: 'trust_llc', label: 'Trust/LLC ownership',  short: 'Trust/LLC', color: T.accent, bg: T.accentDim, icon: '?' },
  unknown:   { key: 'unknown',   label: 'Not checked',          short: 'Unknown',   color: T.dim,    bg: 'transparent', icon: '—' },
};

function getMatchStatus(comparison, propertyData) {
  if (!propertyData || propertyData.source === 'error') return OWNER_MATCH_STATUS.unknown;

  // Trust/LLC check
  if (/\b(trust|llc|inc|corp|estate|holdings)\b/i.test(propertyData.ownerName)) {
    return OWNER_MATCH_STATUS.trust_llc;
  }

  if (comparison.confidence === 'high') return OWNER_MATCH_STATUS.verified;
  if (comparison.confidence === 'medium') return OWNER_MATCH_STATUS.likely;
  return OWNER_MATCH_STATUS.mismatch;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Look up property owner and check for name mismatch.
 *
 * @param {Object} params
 * @param {string} params.address     Street address
 * @param {string} params.zipCode     Zip code
 * @param {string} params.customerName Customer name to compare
 * @param {string} [params.provider]  'mock' | 'attom' | 'corelogic'
 *
 * @returns {Promise<{
 *   ownerName: string,
 *   customerName: string,
 *   match: boolean,
 *   status: object,      // OWNER_MATCH_STATUS entry
 *   comparison: object,  // { match, confidence, reason }
 *   property: object,    // { ownerSince, propertyType, assessedValue, ... }
 * }>}
 */
export async function lookupPropertyOwner({
  address,
  zipCode,
  customerName,
  provider = 'mock',
}) {
  if (!address || !customerName) {
    return {
      ownerName: null,
      customerName,
      match: false,
      status: OWNER_MATCH_STATUS.unknown,
      comparison: { match: false, confidence: 'none', reason: 'Missing address or name' },
      property: null,
    };
  }

  let propertyData;

  if (provider === 'mock') {
    // Simulate a small network delay for realism
    await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
    propertyData = mockOwnerLookup(address, zipCode, customerName);
  } else if (provider === 'attom') {
    // Real ATTOM API call — POST to backend so client never sees the key
    try {
      const res = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, zipCode, provider: 'attom' }),
      });
      propertyData = await res.json();
    } catch (err) {
      propertyData = { ownerName: null, source: 'error', error: err.message };
    }
  } else if (provider === 'corelogic') {
    try {
      const res = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, zipCode, provider: 'corelogic' }),
      });
      propertyData = await res.json();
    } catch (err) {
      propertyData = { ownerName: null, source: 'error', error: err.message };
    }
  }

  const comparison = compareNames(customerName, propertyData?.ownerName || '');
  const status = getMatchStatus(comparison, propertyData);

  return {
    ownerName: propertyData?.ownerName || null,
    customerName,
    match: comparison.match,
    status,
    comparison,
    property: propertyData,
  };
}

/**
 * Quick check — just returns the match status without full property details.
 * Useful for badge rendering on cards.
 */
export async function checkOwnerMatch({ address, zipCode, customerName, provider = 'mock' }) {
  const result = await lookupPropertyOwner({ address, zipCode, customerName, provider });
  return result.status;
}

export { compareNames, normalizeName };
