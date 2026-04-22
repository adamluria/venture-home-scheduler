// ═══════════════════════════════════════════════════════════════════
// Natural-language quick-add parser
//
// Takes a free-text string like:
//   "Sat 2pm Sanchez 123 Oak St Norwalk CT 06851 paid virtual"
// and returns a partial appointment form:
//   { date, time, customer, address, zipCode, territory, leadSource, isVirtual }
//
// Design goals:
//   1. Never throws — returns { ok: false, warnings: [...] } on unparseable input
//   2. Always preserves unmatched text so the operator can review/correct
//   3. Fits the existing NewAppointmentModal form shape
// ═══════════════════════════════════════════════════════════════════

import { TIME_SLOTS } from '../data/theme.js';

// Short zip-prefix → territory (same table the modal uses — kept in sync manually).
const ZIP_TO_TERRITORY = {
  '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
  '111': 'NYE', '113': 'NYE', '114': 'NYE', '115': 'NYE', '116': 'NYE', '117': 'NYE', '118': 'NYE', '119': 'NYE',
  '100': 'NYW', '101': 'NYW', '102': 'NYW', '103': 'NYW', '104': 'NYW', '105': 'NYW', '106': 'NYW', '107': 'NYW', '108': 'NYW', '109': 'NYW', '110': 'NYW', '112': 'NYW', '125': 'NYW', '126': 'NYW', '127': 'NYW', '128': 'NYW',
  '010': 'MARI', '012': 'MARI', '013': 'MARI', '014': 'MARI', '015': 'MARI', '016': 'MARI', '017': 'MARI', '018': 'MARI', '019': 'MARI',
  '020': 'MARI', '021': 'MARI', '022': 'MARI', '023': 'MARI', '024': 'MARI', '025': 'MARI', '026': 'MARI', '027': 'MARI', '028': 'MARI', '029': 'MARI',
  '030': 'MENH', '031': 'MENH', '032': 'MENH', '033': 'MENH', '034': 'MENH', '036': 'MENH', '037': 'MENH', '038': 'MENH', '039': 'MENH',
  '040': 'MENH', '041': 'MENH', '042': 'MENH', '043': 'MENH', '044': 'MENH', '045': 'MENH', '046': 'MENH', '047': 'MENH', '048': 'MENH', '049': 'MENH',
  '070': 'NJPA', '071': 'NJPA', '072': 'NJPA', '073': 'NJPA', '074': 'NJPA', '075': 'NJPA', '076': 'NJPA', '077': 'NJPA', '078': 'NJPA', '079': 'NJPA',
  '080': 'NJPA', '081': 'NJPA', '082': 'NJPA', '083': 'NJPA', '084': 'NJPA', '085': 'NJPA', '086': 'NJPA', '087': 'NJPA', '088': 'NJPA', '089': 'NJPA',
  '190': 'NJPA', '191': 'NJPA', '192': 'NJPA', '193': 'NJPA', '194': 'NJPA',
  '200': 'MD', '201': 'MD', '202': 'MD', '203': 'MD', '204': 'MD', '205': 'MD', '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD',
  '210': 'MD', '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD', '216': 'MD', '217': 'MD', '218': 'MD', '219': 'MD',
};

const DOW_NAMES = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

// Keywords → canonical lead source id (matches NewAppointmentModal options)
const LEAD_SOURCE_TOKENS = {
  paid: 'paid',
  'self gen': 'self_gen',
  'self-gen': 'self_gen',
  selfgen: 'self_gen',
  gtr: 'get_the_referral',
  referral: 'get_the_referral',
  'get the referral': 'get_the_referral',
  partner: 'partner',
  inbound: 'inbound',
  retail: 'retail',
  event: 'event',
};

const VIRTUAL_TOKENS = ['virtual', 'zoom', 'online', 'remote', 'video', 'meet'];

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

// ── Helpers ────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Given "sat" today = Monday → jump to the NEXT Saturday
function nextDowIso(dowTarget, baseDate = todayIso()) {
  const base = new Date(baseDate + 'T12:00:00');
  const baseDow = base.getDay();
  let delta = dowTarget - baseDow;
  if (delta <= 0) delta += 7;
  return addDays(baseDate, delta);
}

// Canonicalize a time-ish string to one of TIME_SLOTS, or null if no match.
// Accepts "2pm", "2 pm", "2:00 PM", "11:30", "11:30am", "1430".
function canonicalizeTime(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\s+/g, '');
  // Try each TIME_SLOTS value's normalized form
  const norm = (v) => v.toLowerCase().replace(/\s+/g, '').replace(':00', '');
  for (const slot of TIME_SLOTS) {
    // slot is e.g. "11:30 AM"
    const base = slot.toLowerCase().replace(/\s+/g, ''); // "11:30am"
    const short = base.replace(':00', '');               // "9am", "11:30am"
    if (s === base || s === short) return slot;
    // also allow without meridian when unambiguous (9→9am, 2→2pm, 5→5pm, 7→7pm)
    if (s === base.replace(/am|pm/, '') || s === short.replace(/am|pm/, '')) return slot;
  }
  return null;
}

// Regex to spot "2pm", "11:30am", "9:00 AM" anywhere in a string.
// Returns { matched: string, canonical: TIME_SLOTS[i] } or null.
function findTimeToken(text) {
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const hh = m[1];
    const mm = m[2] || '00';
    const ap = (m[3] || '').replace(/\./g, '').toLowerCase();
    const candidate = `${hh}:${mm} ${ap || ''}`.trim();
    const canon = canonicalizeTime(candidate);
    if (canon) return { matched: m[0], canonical: canon };
    // Try without meridian for canonical hours that are unambiguous
    if (!ap) {
      const canon2 = canonicalizeTime(`${hh}:${mm}`);
      if (canon2) return { matched: m[0], canonical: canon2 };
    }
  }
  return null;
}

// Find a date token. Returns { matched: string, iso: 'YYYY-MM-DD' } or null.
function findDateToken(text) {
  const lower = text.toLowerCase();

  // "today" / "tomorrow" / "tmrw"
  if (/\btoday\b/i.test(text)) {
    return { matched: lower.match(/\btoday\b/)[0], iso: todayIso() };
  }
  if (/\btomorrow\b|\btmrw\b/i.test(text)) {
    const m = lower.match(/\btomorrow\b|\btmrw\b/)[0];
    return { matched: m, iso: addDays(todayIso(), 1) };
  }

  // Weekday name
  const dowRe = /\b(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/i;
  const dowMatch = text.match(dowRe);
  if (dowMatch) {
    const dow = DOW_NAMES[dowMatch[1].toLowerCase()];
    return { matched: dowMatch[0], iso: nextDowIso(dow) };
  }

  // M/D or M/D/YY(YY) or M-D-Y
  const slashRe = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
  const slashMatch = text.match(slashRe);
  if (slashMatch) {
    const mo = Number(slashMatch[1]);
    const da = Number(slashMatch[2]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const now = new Date();
      let yr = slashMatch[3] ? Number(slashMatch[3]) : now.getFullYear();
      if (yr < 100) yr += 2000;
      // If the date has already passed this year (and no year given), assume next year
      const cand = new Date(yr, mo - 1, da);
      if (!slashMatch[3] && cand < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        yr += 1;
      }
      const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
      return { matched: slashMatch[0], iso };
    }
  }

  return null;
}

function findZipToken(text) {
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (!m) return null;
  return { matched: m[0], zip: m[1] };
}

function findStateToken(text) {
  // Match a standalone 2-letter state (uppercase) followed by a word boundary
  const re = /\b([A-Z]{2})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (US_STATES.has(m[1])) return { matched: m[0], state: m[1] };
  }
  return null;
}

function findLeadSourceToken(text) {
  const lower = text.toLowerCase();
  // Try longest keys first so "self gen" beats "gen"
  const keys = Object.keys(LEAD_SOURCE_TOKENS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const re = new RegExp(`\\b${k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    const m = lower.match(re);
    if (m) return { matched: m[0], leadSource: LEAD_SOURCE_TOKENS[k] };
  }
  return null;
}

function findVirtualToken(text) {
  for (const t of VIRTUAL_TOKENS) {
    const re = new RegExp(`\\b${t}\\b`, 'i');
    const m = text.match(re);
    if (m) return { matched: m[0] };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Main parser
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse a free-text scheduling command.
 * Returns { ok, fields, matched, warnings, remaining }
 *   fields:   { date, time, customer, address, zipCode, territory,
 *               state, leadSource, isVirtual }
 *   matched:  list of { what, value, raw } for preview chips
 *   warnings: list of strings
 */
export function parseQuickAdd(input) {
  const fields = {
    date: null,
    time: null,
    customer: '',
    address: '',
    zipCode: '',
    territory: '',
    state: '',
    leadSource: 'paid',
    isVirtual: false,
  };
  const matched = [];
  const warnings = [];

  if (!input || !input.trim()) {
    return { ok: false, fields, matched, warnings: ['Empty input'], remaining: '' };
  }

  let remaining = input.trim();

  // Helper to strip a matched substring (case-insensitive)
  const strip = (sub) => {
    if (!sub) return;
    const idx = remaining.toLowerCase().indexOf(sub.toLowerCase());
    if (idx >= 0) {
      remaining = (remaining.slice(0, idx) + ' ' + remaining.slice(idx + sub.length)).trim().replace(/\s+/g, ' ');
    }
  };

  // Virtual flag (greedy, remove early so it doesn't get mistaken for customer)
  const virt = findVirtualToken(remaining);
  if (virt) {
    fields.isVirtual = true;
    matched.push({ what: 'virtual', value: 'Virtual (Google Meet)', raw: virt.matched });
    strip(virt.matched);
  }

  // Lead source
  const src = findLeadSourceToken(remaining);
  if (src) {
    fields.leadSource = src.leadSource;
    matched.push({ what: 'leadSource', value: src.leadSource, raw: src.matched });
    strip(src.matched);
  }

  // Date
  const dateTok = findDateToken(remaining);
  if (dateTok) {
    fields.date = dateTok.iso;
    matched.push({ what: 'date', value: dateTok.iso, raw: dateTok.matched });
    strip(dateTok.matched);
  } else {
    fields.date = todayIso();
    warnings.push('No date found — defaulting to today');
  }

  // Time
  const timeTok = findTimeToken(remaining);
  if (timeTok) {
    fields.time = timeTok.canonical;
    matched.push({ what: 'time', value: timeTok.canonical, raw: timeTok.matched });
    strip(timeTok.matched);
  } else {
    fields.time = '2:00 PM'; // sensible default
    warnings.push(`No time slot found — defaulting to 2:00 PM. Valid slots: ${TIME_SLOTS.join(', ')}`);
  }

  // Zip
  const zipTok = findZipToken(remaining);
  if (zipTok) {
    fields.zipCode = zipTok.zip;
    const territory = ZIP_TO_TERRITORY[zipTok.zip.slice(0, 3)];
    if (territory) fields.territory = territory;
    matched.push({ what: 'zip', value: territory ? `${zipTok.zip} → ${territory}` : zipTok.zip, raw: zipTok.matched });
    strip(zipTok.matched);
  }

  // State (only match UPPERCASE in original — less noisy than scanning lowercase "ct" etc.)
  const stateTok = findStateToken(remaining);
  if (stateTok) {
    fields.state = stateTok.state;
    matched.push({ what: 'state', value: stateTok.state, raw: stateTok.matched });
    strip(stateTok.matched);
  }

  // Whatever's left: first word(s) → customer, the rest → address.
  // Heuristic: if there's a digit (probably a street number), split at first digit.
  // Everything before the digit is the customer; everything from the digit on is the address.
  // If no digit, take the first 1–2 capitalized tokens as customer name and the rest as address.
  const leftover = remaining.trim().replace(/\s+/g, ' ');
  if (leftover) {
    const firstDigit = leftover.search(/\d/);
    if (firstDigit > 0) {
      fields.customer = leftover.slice(0, firstDigit).trim().replace(/[,;]+$/, '');
      fields.address = leftover.slice(firstDigit).trim();
      matched.push({ what: 'customer', value: fields.customer, raw: fields.customer });
      matched.push({ what: 'address', value: fields.address, raw: fields.address });
    } else {
      // No street number. Treat whole thing as customer if short; else split at first comma.
      if (leftover.includes(',')) {
        const [first, ...rest] = leftover.split(',');
        fields.customer = first.trim();
        fields.address = rest.join(',').trim();
      } else {
        fields.customer = leftover;
      }
      if (fields.customer) matched.push({ what: 'customer', value: fields.customer, raw: fields.customer });
      if (fields.address) matched.push({ what: 'address', value: fields.address, raw: fields.address });
    }
  } else {
    warnings.push('No customer name detected');
  }

  // Territory fallback: if we got a state but no territory, try a single-state mapping
  if (!fields.territory && fields.state) {
    const stateToTerritory = { CT: 'CT', MA: 'MARI', RI: 'MARI', ME: 'MENH', NH: 'MENH', NJ: 'NJPA', PA: 'NJPA', MD: 'MD', DC: 'MD' };
    if (stateToTerritory[fields.state]) fields.territory = stateToTerritory[fields.state];
  }

  const ok = !!(fields.date && fields.time && fields.customer);
  return { ok, fields, matched, warnings, remaining: leftover };
}

// Exposed for tests
export const _internal = { findTimeToken, findDateToken, findZipToken, findStateToken, findLeadSourceToken, findVirtualToken, ZIP_TO_TERRITORY };
