// Mock data layer — mirrors the real data model shapes
// Keep this working at all times; useMock flag switches between mock and live
// Rep roster sourced from actual Venture Home depth map (April 2026)

import { TERRITORIES } from './theme.js';

// ─── Consultants — Real Venture Home Roster (55 reps, updated 2026-04-28) ──
// Source: depth chart "Updated depth for Claude Scheduler.xlsx" (2026-04-28).
// Existing IDs are preserved across roster changes so historical appointment
// references stay stable; removed reps' IDs are simply retired (orphaned
// appointments will display 'Unknown' until manually reassigned).
export const consultants = [
  // ── NEW YORK WEST ──────────────────────────────────────────────────
  { id: 'nyw-rsm', name: 'Josh Rosen',          position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '10009', territories: ['NYW'],              team: 'NYW',  phone: '(973) 477-8587', notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY", languages: ['en'], isHybrid: false },
  { id: 'nyw-1',   name: 'Arturo Bustamante',   position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '11222', territories: ['NYW'],              team: 'NYW',  phone: '(347) 263-0218', notes: 'Speaks Spanish', languages: ['en', 'es'], isHybrid: false },
  { id: 'nyw-2',   name: 'Cole Gimbel',         position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '10001', territories: ['NYW'],              team: 'NYW',  phone: '(347) 523-3794', notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nyw-3',   name: 'Kent Sednaoui',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '10507', territories: ['NYW'],              team: 'NYW',  phone: '(914) 525-9185', notes: 'HYBRID REP - Speaks French', languages: ['en', 'fr'], isHybrid: true },
  // nyw-4 retired (Jonathan Curtis — off team 2026-04-28)
  { id: 'nyw-5',   name: 'Keith Hubbard',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11232', territories: ['NYW'],              team: 'NYW',  phone: '(570) 650-3419', notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nyw-6',   name: 'Avanna Mair',         position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11234', territories: ['NYW'],              team: 'NYW',  phone: '(347) 267-3273', notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nyw-7',   name: 'Maurice Haughton',    position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11422', territories: ['NYW'],              team: 'NYW',  phone: '(917) 846-6259', notes: 'HYBRID REP', languages: ['en'], isHybrid: true },

  // ── NEW JERSEY / PENNSYLVANIA ─────────────────────────────────────
  { id: 'njpa-rsm', name: 'Joe MacKinnon',      position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['NJPA', 'NYW'],    team: 'NJPA', phone: '781-948-8118',   notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY", languages: ['en'], isHybrid: false },
  { id: 'de-bk',    name: 'Boris Kaiser',       position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['NJPA', 'NYW'],    team: 'NJPA', phone: '(609) 847-2717', notes: 'Last resort for virtual appts, check closer schedule before assigning', languages: ['en'], isHybrid: false },
  { id: 'njpa-1',   name: 'Alastair Cornell',   position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '07726', territories: ['NJPA', 'NYE', 'NYW'], team: 'NJPA', phone: '(732) 470-8832', notes: null, languages: ['en'], isHybrid: false },
  { id: 'njpa-2',   name: 'Fariza Masudova',    position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '19114', territories: ['NJPA'],             team: 'NJPA', phone: '',               notes: "NO Newark, NJ or Trenton, NJ 5pm's and 7pm's", languages: ['en'], isHybrid: false,
    constraints: { blockedSlots: [{ cities: ['Newark', 'Trenton'], state: 'NJ', times: ['5:00 PM', '7:00 PM'] }] }
  },
  { id: 'njpa-3',   name: 'Piotr Sypytkowski',  position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '07002', territories: ['NJPA'],             team: 'NJPA', phone: '551-225-7456',   notes: null, languages: ['en'], isHybrid: false },

  // ── NEW YORK EAST ──────────────────────────────────────────────────
  { id: 'nye-rsm',  name: 'Rubail Nasir',       position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '11731', territories: ['NYE'],              team: 'NYE',  phone: '347-229-4683',   notes: 'NO FRIDAY 2PM', languages: ['en'], isHybrid: false,
    constraints: { blockedSlots: [{ dayOfWeek: 5, times: ['2:00 PM'] }] }
  },
  { id: 'nye-1',    name: 'Antonio Montiel',    position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '11377', territories: ['NYE'],              team: 'NYE',  phone: '786-296-6670',   notes: 'NO 7pm In Person, Only 7pm Virtual', languages: ['en'], isHybrid: false,
    constraints: { blockedSlots: [{ times: ['7:00 PM'], condition: 'in_person_only' }] }
  },
  { id: 'nye-2',    name: 'Kin Dodd-Law',       position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '11953', territories: ['NYE'],              team: 'NYE',  phone: '516-688-9011',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'nye-3',    name: 'Gert Ford',          position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11757', territories: ['NYE'],              team: 'NYE',  phone: '917-324-8631',   notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nye-4',    name: 'Steven Paez',        position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11563', territories: ['NYE'],              team: 'NYE',  phone: '516-697-0379',   notes: 'HYBRID REP - Speaks Spanish', languages: ['en', 'es'], isHybrid: true },
  { id: 'nye-5',    name: 'Spencer Ganley',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11501', territories: ['NYE'],              team: 'NYE',  phone: '516-404-7851',   notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nye-6',    name: 'Najib Meleschi',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11510', territories: ['NYE'],              team: 'NYE',  phone: '646-508-6305',   notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nye-7',    name: 'Nicole Jones',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11763', territories: ['NYE'],              team: 'NYE',  phone: '917-562-1990',   notes: 'HYBRID REP', languages: ['en'], isHybrid: true },
  { id: 'nye-8',    name: 'MD Tahsin',          position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '11764', territories: ['NYE'],              team: 'NYE',  phone: '929-393-5086',   notes: 'HYBRID REP', languages: ['en'], isHybrid: true },

  // ── CONNECTICUT ────────────────────────────────────────────────────
  { id: 'ct-rsm',   name: 'Skylar Ernst',       position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['CT'],              team: 'CT',   phone: '',               notes: null, languages: ['en'], isHybrid: false },
  { id: 'de-jr',    name: 'Justin Robinson',    position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: true,  homeZip: '06489', territories: ['CT'],              team: 'CT',   phone: '619-430-0151',   notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY + GTR", languages: ['en'], isHybrid: false },
  { id: 'de-mm',    name: 'Max McNamara',       position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['CT'],              team: 'CT',   phone: '978-879-3172',   notes: 'NO APPTS, VIRTUAL CLOSER', languages: ['en'], isHybrid: false },
  { id: 'ct-1',     name: 'Claire Sharkey',     position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '06851', territories: ['CT'],              team: 'CT',   phone: '203-559-4690',   notes: 'Stamford first look', languages: ['en'], isHybrid: false },
  { id: 'ct-2',     name: 'Michael Ficarra',    position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '06082', territories: ['CT'],              team: 'CT',   phone: '727-551-1821',   notes: 'Ask for 7pms, tough but ask. ON CT 1 check drive time', languages: ['en'], isHybrid: false },
  { id: 'ct-3',     name: 'Dominick Nuzzo',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '06067', territories: ['CT'],              team: 'CT',   phone: '',               notes: null, languages: ['en'], isHybrid: false },
  { id: 'ct-4',     name: 'Steve Platt',        position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '06470', territories: ['CT'],              team: 'CT',   phone: '(203) 948-7715', notes: null, languages: ['en'], isHybrid: false },
  { id: 'ct-5',     name: 'Darrid Sharkey',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '06851', territories: ['CT'],              team: 'CT',   phone: '',               notes: null, languages: ['en'], isHybrid: false },
  { id: 'ct-6',     name: 'Suzanne Schulz',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '06880', territories: ['CT'],              team: 'CT',   phone: '',               notes: null, languages: ['en'], isHybrid: false },

  // ── MASSACHUSETTS / RHODE ISLAND ──────────────────────────────────
  { id: 'mari-rsm', name: 'Kaya Ulcay',         position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['MARI'],            team: 'MARI', phone: '857-294-8169',   notes: 'Will sometimes run virtual no bills in MASS, add ons, phone-call battery only', languages: ['en'], isHybrid: false },
  { id: 'mari-1',   name: 'Steven Spector',     position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '01748', territories: ['MARI'],            team: 'MARI', phone: '(508) 380-0388', notes: null, languages: ['en'], isHybrid: false },
  { id: 'mari-2',   name: 'Laureena Giorgi',    position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '02911', territories: ['MARI'],            team: 'MARI', phone: '401-230-6442',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'mari-3',   name: 'Zac Brown',          position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '02121', territories: ['MARI'],            team: 'MARI', phone: '774-641-5646',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'mari-4',   name: 'Isabel Mota',        position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '02886', territories: ['MARI'],            team: 'MARI', phone: '',               notes: null, languages: ['en'], isHybrid: false },
  { id: 'mari-5',   name: 'Ian Griffith',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '02421', territories: ['MARI'],            team: 'MARI', phone: '',               notes: null, languages: ['en'], isHybrid: false },
  { id: 'de-nm',    name: 'Nonni Muller',       position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: false, homeZip: '06234', territories: ['MARI', 'CT'],      team: 'MARI', phone: '(860) 428-5114', notes: 'KEEP DRIVE TIME UNDER 1 hour for 9am and 7:30PM', languages: ['en'], isHybrid: false,
    constraints: { maxDriveMinutes: { '9:00 AM': 60, '7:00 PM': 60 } }
  },
  { id: 'mari-6',   name: 'Robel Mahari',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '02145', territories: ['MARI'],            team: 'MARI', phone: '',               notes: null, languages: ['en'], isHybrid: false },

  // ── MAINE & NEW HAMPSHIRE ─────────────────────────────────────────
  { id: 'menh-rsm', name: 'Nicholas Pagliaro',  position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '04092', territories: ['MENH'],            team: 'MENH', phone: '(978) 869-8157', notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY", languages: ['en'], isHybrid: false },
  { id: 'de-sg',    name: 'Shane Gammell',      position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: true,  homeZip: '',      territories: ['MENH'],            team: 'MENH', phone: '978-277-8009',   notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY + GTR", languages: ['en'], isHybrid: false },
  { id: 'de-sd',    name: 'Shawn Davis',        position: 'design_expert',          isCloserOnly: true,  isVirtualOnly: true,  homeZip: '04032', territories: ['MENH'],            team: 'MENH', phone: '(908) 285-1617', notes: "NO APPTS, VIRTUAL CLOSER, REF'S ONLY", languages: ['en', 'es'], isHybrid: false },
  { id: 'menh-1',   name: 'Brian Graham',       position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '04104', territories: ['MENH'],            team: 'MENH', phone: '207-329-9736',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'menh-2',   name: 'Abubaker Elsheikh',  position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '03106', territories: ['MENH'],            team: 'MENH', phone: '(603) 715-0248', notes: null, languages: ['en'], isHybrid: false },
  { id: 'menh-3',   name: 'Nicole Barna',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '04101', territories: ['MENH'],            team: 'MENH', phone: '(207) 450-5046', notes: null, languages: ['en'], isHybrid: false },
  { id: 'menh-4',   name: 'Craig Enslin',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '03825', territories: ['MENH'],            team: 'MENH', phone: '603-973-2119',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'menh-5',   name: 'Justin Tinsman',     position: 'sr_solar_consultant',    isCloserOnly: false, isVirtualOnly: false, homeZip: '04917', territories: ['MENH'],            team: 'MENH', phone: '207-215-7407',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'menh-6',   name: 'Alexis Loring',      position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '04401', territories: ['MENH'],            team: 'MENH', phone: '',               notes: 'one person area', languages: ['en'], isHybrid: false },
  { id: 'menh-7',   name: 'Kiyanna Hutchins',   position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '03820', territories: ['MENH'],            team: 'MENH', phone: '',               notes: 'Covers Dover (03820) and Portsmouth (03801)', languages: ['en'], isHybrid: false },
  // menh-8 retired (Mike Bellamente — off team 2026-04-28)

  // ── MARYLAND / DC ─────────────────────────────────────────────────
  { id: 'md-rsm',   name: 'Cameron Doherty',    position: 'regional_sales_manager', isCloserOnly: true,  isVirtualOnly: true,  homeZip: '22209', territories: ['MD'],              team: 'MD',   phone: '401-924-3370',   notes: 'No in person, except referrals', languages: ['en'], isHybrid: false },
  { id: 'md-1',     name: 'Mike Palmore',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '20707', territories: ['MD'],              team: 'MD',   phone: '301-835-3108',   notes: null, languages: ['en'], isHybrid: false },
  // md-2 retired (Ernesto Mitre — off team 2026-04-28)
  { id: 'md-3',     name: 'Abraham Boakye',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '20910', territories: ['MD'],              team: 'MD',   phone: '240-961-2691',   notes: null, languages: ['en'], isHybrid: false },
  // md-4 retired (Angus Maclae — off team 2026-04-28)
  { id: 'md-5',     name: 'Joe Flannery',       position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '20001', territories: ['MD'],              team: 'MD',   phone: '314-686-1911',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'md-6',     name: 'Nicholas Karcz',     position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '21204', territories: ['MD'],              team: 'MD',   phone: '410-733-2585',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'md-7',     name: 'Chris Alexander',    position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '',      territories: ['MD'],              team: 'MD',   phone: '301-665-0976',   notes: null, languages: ['en'], isHybrid: false },
  { id: 'md-8',     name: 'Herbert Ngu',        position: 'solar_consultant',       isCloserOnly: false, isVirtualOnly: false, homeZip: '',      territories: ['MD'],              team: 'MD',   phone: '346-387-4400',   notes: null, languages: ['en'], isHybrid: false },
];

// ─── Roster summary helpers ─────────────────────────────────────────
export function getFieldReps(territory) {
  return consultants.filter(c =>
    !c.isCloserOnly && c.territories.includes(territory)
  );
}

export function getClosers(territory) {
  return consultants.filter(c =>
    c.isCloserOnly && c.territories.includes(territory)
  );
}

export function getRSM(territory) {
  return consultants.find(c =>
    c.position === 'regional_sales_manager' && c.territories.includes(territory)
  );
}

// ─── Helper: generate dates relative to today ────────────────────────
function dayOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(offset) {
  return dayOffset(offset).toISOString().split('T')[0];
}

// ─── Mock Appointments (spread across current week, using real rep IDs) ─
export const mockAppointments = [
  // Today
  { id: 'a1',  date: dateStr(0), time: '9:00 AM',   type: 'appointment',  status: 'confirmed',          customer: 'Johnson Family',    address: '123 Oak St, Norwalk, CT 06851',           zipCode: '06851', consultant: 'ct-1',   designExpert: 'de-jr', territory: 'CT',   isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a2',  date: dateStr(0), time: '11:30 AM',  type: 'follow-up',    status: 'scheduled',          customer: 'Rodriguez Family',  address: '456 Pine Ave, Brooklyn, NY 11222',        zipCode: '11222', consultant: 'nyw-1',  designExpert: 'de-bk', territory: 'NYW',  isVirtual: true,  isPlaceholder: false, leadSource: 'paid' },
  { id: 'a3',  date: dateStr(0), time: '2:00 PM',   type: 'contract',     status: 'confirmed',          customer: 'Chen Residence',    address: '789 Elm Dr, Manalapan, NJ 07726',        zipCode: '07726', consultant: 'njpa-1', designExpert: null,    territory: 'NJPA', isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },
  { id: 'a4',  date: dateStr(0), time: '5:00 PM',   type: 'appointment',  status: 'needs-reschedule',   customer: 'Williams Family',   address: '321 Maple St, Portland, ME 04104',        zipCode: '04104', consultant: 'menh-1', designExpert: 'de-sg', territory: 'MENH', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a5',  date: dateStr(0), time: '9:00 AM',   type: 'appointment',  status: 'confirmed',          customer: 'Garcia Family',     address: '55 Broad St, Enfield, CT 06082',          zipCode: '06082', consultant: 'ct-2',   designExpert: 'de-jr', territory: 'CT',   isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a6',  date: dateStr(0), time: '2:00 PM',   type: 'follow-up',    status: 'confirmed',          customer: 'Thompson Family',   address: '18 Harbor Rd, Baltimore, MD 21201',       zipCode: '21201', consultant: 'md-6',   designExpert: null,    territory: 'MD',   isVirtual: true,  isPlaceholder: false, leadSource: 'get_the_referral' },
  { id: 'a7',  date: dateStr(0), time: '7:00 PM',   type: 'appointment',  status: 'scheduled',          customer: 'Patel Family',      address: '90 Sunrise Blvd, Stamford, CT 06902',     zipCode: '06902', consultant: 'ct-4',   designExpert: null,    territory: 'CT',   isVirtual: false, isPlaceholder: false, leadSource: 'paid' },

  // Tomorrow
  { id: 'a8',  date: dateStr(1), time: '9:00 AM',   type: 'appointment',  status: 'scheduled',          customer: 'Murphy Family',     address: '200 Congress St, Hopkinton, MA 01748',    zipCode: '01748', consultant: 'mari-1', designExpert: 'de-nm', territory: 'MARI', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a9',  date: dateStr(1), time: '11:30 AM',  type: 'change-order', status: 'confirmed',          customer: 'Lee Family',        address: '44 River Rd, Bayonne, NJ 07002',          zipCode: '07002', consultant: 'njpa-3', designExpert: null,    territory: 'NJPA', isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },
  { id: 'a10', date: dateStr(1), time: '2:00 PM',   type: 'appointment',  status: 'scheduled',          customer: 'Davis Residence',   address: '75 Oak Ave, Manhattan, NY 10001',         zipCode: '10001', consultant: 'nyw-2',  designExpert: 'de-bk', territory: 'NYW',  isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a11', date: dateStr(1), time: '5:00 PM',   type: 'cancel-save',  status: 'scheduled',          customer: 'Kim Family',        address: '310 Elm St, Silver Spring, MD 20910',     zipCode: '20910', consultant: 'md-3',   designExpert: null,    territory: 'MD',   isVirtual: true,  isPlaceholder: false, leadSource: 'paid' },
  { id: 'a12', date: dateStr(1), time: '9:00 AM',   type: 'follow-up',    status: 'confirmed',          customer: 'Brown Family',      address: '8 Pine Hill Dr, Newtown, CT 06470',       zipCode: '06470', consultant: 'ct-4',   designExpert: 'de-jr', territory: 'CT',   isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },

  // Day +2
  { id: 'a13', date: dateStr(2), time: '9:00 AM',   type: 'appointment',  status: 'scheduled',          customer: 'Wilson Family',     address: '550 Main St, Dorchester, MA 02121',       zipCode: '02121', consultant: 'mari-3', designExpert: 'de-nm', territory: 'MARI', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a14', date: dateStr(2), time: '11:30 AM',  type: 'appointment',  status: 'scheduled',          customer: 'Anderson Family',   address: '23 Market St, Philadelphia, PA 19114',    zipCode: '19114', consultant: 'njpa-2', designExpert: null,    territory: 'NJPA', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a15', date: dateStr(2), time: '2:00 PM',   type: 'contract',     status: 'confirmed',          customer: 'Taylor Residence',  address: '400 Prospect St, N. Providence, RI 02911', zipCode: '02911', consultant: 'mari-2', designExpert: null,   territory: 'MARI', isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },
  { id: 'a16', date: dateStr(2), time: '5:00 PM',   type: 'appointment',  status: 'scheduled',          customer: 'Moore Family',      address: '12 Waterfront Dr, Lindenhurst, NY 11757', zipCode: '11757', consultant: 'nye-3',  designExpert: null,    territory: 'NYE',  isVirtual: false, isPlaceholder: false, leadSource: 'paid' },

  // Day +3
  { id: 'a17', date: dateStr(3), time: '9:00 AM',   type: 'appointment',  status: 'scheduled',          customer: 'Clark Family',      address: '67 Willow St, Portsmouth, NH 03801',      zipCode: '03801', consultant: 'menh-7', designExpert: 'de-sg', territory: 'MENH', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a18', date: dateStr(3), time: '11:30 AM',  type: 'follow-up',    status: 'scheduled',          customer: 'Martinez Family',   address: '290 State St, Rocky Hill, CT 06067',      zipCode: '06067', consultant: 'ct-3',   designExpert: 'de-jr', territory: 'CT',   isVirtual: true,  isPlaceholder: false, leadSource: 'paid' },
  { id: 'a19', date: dateStr(3), time: '2:00 PM',   type: 'appointment',  status: 'scheduled',          customer: 'Jackson Residence', address: '135 Broadway, Queens, NY 11377',           zipCode: '11377', consultant: 'nye-1',  designExpert: null,    territory: 'NYE',  isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a20', date: dateStr(3), time: '5:00 PM',   type: 'change-order', status: 'confirmed',          customer: 'White Family',      address: '88 Columbia Rd, Towson, MD 21204',        zipCode: '21204', consultant: 'md-6',   designExpert: null,    territory: 'MD',   isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },

  // Day +4
  { id: 'a21', date: dateStr(4), time: '9:00 AM',   type: 'appointment',  status: 'scheduled',          customer: 'Thomas Family',     address: '42 Grand Ave, Bedford Hills, NY 10507',   zipCode: '10507', consultant: 'nyw-3',  designExpert: 'de-bk', territory: 'NYW',  isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a22', date: dateStr(4), time: '11:30 AM',  type: 'appointment',  status: 'scheduled',          customer: 'Harris Family',     address: '15 School St, Hookset, NH 03106',         zipCode: '03106', consultant: 'menh-2', designExpert: 'de-sd', territory: 'MENH', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a23', date: dateStr(4), time: '2:00 PM',   type: 'follow-up',    status: 'confirmed',          customer: 'Robinson Family',   address: '560 Park Ave, Manalapan, NJ 07726',       zipCode: '07726', consultant: 'njpa-1', designExpert: null,    territory: 'NJPA', isVirtual: true,  isPlaceholder: false, leadSource: 'get_the_referral' },

  // Day +5
  { id: 'a24', date: dateStr(5), time: '9:00 AM',   type: 'appointment',  status: 'scheduled',          customer: 'Lewis Family',      address: '23 Main St, Bangor, ME 04401',            zipCode: '04401', consultant: 'menh-6', designExpert: null,    territory: 'MENH', isVirtual: false, isPlaceholder: false, leadSource: 'paid' },
  { id: 'a25', date: dateStr(5), time: '11:30 AM',  type: 'contract',     status: 'confirmed',          customer: 'Walker Residence',  address: '700 Central Ave, Warwick, RI 02886',      zipCode: '02886', consultant: 'mari-4', designExpert: 'de-nm', territory: 'MARI', isVirtual: false, isPlaceholder: false, leadSource: 'self_gen' },

  // Placeholder / overbooking slot example
  { id: 'a26', date: dateStr(1), time: '7:00 PM',   type: 'appointment',  status: 'scheduled',          customer: 'PLACEHOLDER',       address: '',                                        zipCode: '',      consultant: null,     designExpert: null,    territory: 'CT',   isVirtual: false, isPlaceholder: true,  leadSource: null },
];

// ─── Seed Aurora TSRF on every appointment ───────────────────────────
// Real value will come from `Opportunity.Aurora_Avg_TSRF__c` in Salesforce.
// For now a deterministic hash-of-id gives stable % across reloads.
import { seedMockTsrf } from './tsrf.js';
for (const apt of mockAppointments) {
  if (apt.isPlaceholder) continue;
  if (apt.tsrf === undefined) apt.tsrf = seedMockTsrf(apt.id);
}

// ─── Helper functions for querying mock data ─────────────────────────

export function getConsultant(id) {
  return consultants.find(c => c.id === id) || null;
}

export function getConsultantName(id) {
  const c = getConsultant(id);
  return c ? c.name : null;
}

export function getAppointmentsForDate(dateString, territoryFilter = null) {
  return mockAppointments.filter(apt => {
    const dateMatch = apt.date === dateString;
    const territoryMatch = !territoryFilter || territoryFilter.length === 0 || territoryFilter.includes(apt.territory);
    return dateMatch && territoryMatch;
  });
}

export function getAppointmentsForDateRange(startDate, endDate, territoryFilter = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return mockAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const dateMatch = aptDate >= start && aptDate <= end;
    const territoryMatch = !territoryFilter || territoryFilter.length === 0 || territoryFilter.includes(apt.territory);
    return dateMatch && territoryMatch;
  });
}

export function getRegionStats(dateString) {
  const dayAppts = mockAppointments.filter(a => a.date === dateString && !a.isPlaceholder);
  const stats = {};
  for (const t of Object.keys(TERRITORIES)) {
    stats[t] = dayAppts.filter(a => a.territory === t).length;
  }
  return stats;
}

export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function formatDateDisplay(dateString) {
  const d = new Date(dateString + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateFull(dateString) {
  const d = new Date(dateString + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getWeekStart(dateString) {
  const d = new Date(dateString + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export function getWeekDates(mondayString) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayString + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
