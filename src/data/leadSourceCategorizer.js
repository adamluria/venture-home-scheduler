// leadSourceCategorizer.js
//
// Maps any of the 495 LEAD_SOURCES picklist values to one of 7 canonical
// synergy categories used by `LEAD_SOURCE_SYNERGY` in repPerformance.js:
//
//   paid              — paid lead aggregators (Modernize, Adnet, etc.)
//   self_gen          — rep-generated leads, add-ons, reactivations
//   get_the_referral  — customer/family/friend referrals
//   partner           — roofing, HVAC, electrical, installer channels
//   inbound           — website, call-in, web forms, chats
//   retail            — Costco, BJ's, Tesla showroom, kiosks
//   event             — home shows, tournaments, golf outings, fairs
//
// Method: cascading rule-set with overrides for known specific values
// first, then keyword regex on a normalized lowercase string. Default
// catch-all is `paid` because the bulk of unrecognized vendor names in
// the picklist are paid lead sources.
//
// This is a heuristic — accuracy is ~80%, not 100%. The right long-term
// fix is per-rep × per-source close-rate data from SF (which lands in
// Slice A's `/api/sfdc/performance/by-source` endpoint). The categorizer
// just keeps the synergy badge + ranking sensible across the whole
// picklist until the real-data version takes over.

const CATEGORIES = ['paid', 'self_gen', 'get_the_referral', 'partner', 'inbound', 'retail', 'event'];

// Specific values where heuristics would mis-categorize.
// Add to this map as edge cases surface during testing.
const OVERRIDES = {
  // Get the Referral system (Venture Home's specific referral platform)
  'Get the Referral':       'get_the_referral',
  'GTR':                    'get_the_referral',
  '2 Meter Referral':       'get_the_referral',

  // Self-gen explicit
  'Self Gen':               'self_gen',
  'Self-Gen':               'self_gen',
  'Add-on':                 'self_gen',
  'Reactivation':           'self_gen',

  // Known partners (per CLAUDE.md project context)
  'Greenwatt Leads':        'partner',
  'Greenwatt':              'partner',
  'Verse':                  'partner',
  'SunLink':                'partner',
  'Lo Mano':                'partner',
  'Lomanno A (Signal)':     'partner',
  'Lomanno B':              'partner',
  'Lomanno C':              'partner',
  'Remix Dynamics':         'partner',
  'Remix Dynamix':          'partner',

  // Known paid aggregators
  'Modernize':              'paid',
  'Adnet':                  'paid',
  'Adnet LLC':              'paid',
  'SolarReviews':           'paid',
  'Solar Reviews':          'paid',
  'Energy Bill Cruncher':   'paid',
  'Clean Energy Experts':   'paid',
  'Aurora':                 'paid',
  'Aurora (paid)':          'paid',
  'Angi Leads':             'paid',
  'Bark.com':               'paid',
  'Birdeye':                'paid',
  'Astoria Company':        'paid',

  // Inbound
  'Website':                'inbound',
  'Call In':                'inbound',
  'Demand IQ':              'inbound',
  'Live Admin':             'inbound',
  'AOL':                    'inbound',
  'BBB':                    'inbound',
  'BeLocal':                'inbound',

  // 1099 reps generate their own deals
  '1099 Salesperson':       'self_gen',
};

// Keyword-based heuristic rules, evaluated in order. First match wins.
const RULES = [
  // ── Referrals (highest priority — explicit signal) ──
  { test: /\b(referral|referrals|gtr)\b/i,                          cat: 'get_the_referral' },
  { test: /\bword\s*of\s*mouth\b/i,                                 cat: 'get_the_referral' },

  // ── Self-gen / add-on / reactivation ──
  { test: /\bself[\s-]*gen(eration|erated)?\b/i,                     cat: 'self_gen' },
  { test: /\b(add[\s-]?on|cross[\s-]?sell|up[\s-]?sell|reactivat)/i, cat: 'self_gen' },
  { test: /\b1099\b/i,                                               cat: 'self_gen' },

  // ── Events ──
  { test: /\b(home\s*show|trade\s*show|expo|conference|booth)\b/i,   cat: 'event' },
  { test: /\b(tournament|golf|outing|charity|gala)\b/i,              cat: 'event' },
  { test: /\b(fest|festival|fair|fairground|carnival)\b/i,           cat: 'event' },
  { test: /\b(open\s*house|community\s*event)\b/i,                   cat: 'event' },

  // ── Retail (big-box partnerships) ──
  { test: /\bbj'?s\b|wholesale\s*club/i,                             cat: 'retail' },
  { test: /\bcostco\b/i,                                             cat: 'retail' },
  { test: /\b(home\s*depot|lowes|lowe'?s)\b/i,                       cat: 'retail' },
  { test: /\btesla\b/i,                                              cat: 'retail' },
  { test: /\bsam'?s\s*club\b/i,                                      cat: 'retail' },
  { test: /\bkiosk\b/i,                                              cat: 'retail' },

  // ── Inbound (digital + phone-in) ──
  { test: /\b(website|web[\s-]*form|web[\s-]*lead|web[\s-]*inquiry)\b/i, cat: 'inbound' },
  { test: /\b(call[\s-]*in|inbound|chat[\s-]*lead|live[\s-]*chat)\b/i,   cat: 'inbound' },
  { test: /\bapp[\s-]*download\b/i,                                       cat: 'inbound' },

  // ── Partners (contractor channels) ──
  { test: /\b(roofing|roof|hvac|electric|electrical|electrician)\b/i, cat: 'partner' },
  { test: /\b(integrator|contractor|installer|plumbing|plumber)\b/i,   cat: 'partner' },
  { test: /\b(remodel|remodeling|renovation|renovat)/i,                cat: 'partner' },
  { test: /\b(solar\s*pro|solar\s*partner)\b/i,                        cat: 'partner' },
];

const CACHE = new Map();

/**
 * Categorize any picklist value into a synergy category.
 * Returns one of CATEGORIES; defaults to 'paid' for unrecognized values.
 */
export function categorizeLeadSource(s) {
  if (!s || typeof s !== 'string') return 'paid';

  const cached = CACHE.get(s);
  if (cached) return cached;

  // 1. Exact override
  const override = OVERRIDES[s];
  if (override) {
    CACHE.set(s, override);
    return override;
  }

  // 2. Pre-existing snake_case category passed straight through
  // (so callers who already pass 'paid'/'self_gen'/etc. don't break)
  if (CATEGORIES.includes(s)) {
    CACHE.set(s, s);
    return s;
  }

  // 3. Heuristic rules
  for (const { test, cat } of RULES) {
    if (test.test(s)) {
      CACHE.set(s, cat);
      return cat;
    }
  }

  // 4. Fallback — most unrecognized vendor/agency names are paid lead sources
  CACHE.set(s, 'paid');
  return 'paid';
}

/**
 * Diagnostic: returns the count by category for a given list of picklist values.
 * Used during dev to sanity-check coverage. Not called from production code paths.
 */
export function categorizeCoverage(picklistValues) {
  const counts = {};
  for (const cat of CATEGORIES) counts[cat] = 0;
  const samples = {};
  for (const cat of CATEGORIES) samples[cat] = [];
  for (const v of picklistValues) {
    const cat = categorizeLeadSource(v);
    counts[cat] += 1;
    if (samples[cat].length < 5) samples[cat].push(v);
  }
  return { counts, samples };
}

export const SYNERGY_CATEGORIES = CATEGORIES;
