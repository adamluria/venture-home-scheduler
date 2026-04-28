// Design tokens — shared across all components
// Fonts: JetBrains Mono for data/numbers, Outfit for UI text
// Theme: dark background, amber (#F0A830) accent

export const T = {
  bg: "#0A0D10",
  surface: "#11151A",
  surfaceHover: "#161B22",
  border: "#1E2530",
  borderLight: "#2A3240",
  accent: "#F0A830",
  accentDim: "rgba(240, 168, 48, 0.15)",
  green: "#2DD4A8",
  greenDim: "rgba(45, 212, 168, 0.15)",
  red: "#F87171",
  redDim: "rgba(248, 113, 113, 0.15)",
  purple: "#9333EA",
  purpleDim: "rgba(147, 51, 234, 0.15)",
  pink: "#EC4899",
  cyan: "#06B6D4",
  text: "#E8EDF3",
  muted: "#8B95A3",
  dim: "#4A5568",
};

export const fonts = {
  ui: "'Outfit', sans-serif",
  data: "'JetBrains Mono', monospace",
};

// Appointment Subjects — displayed as "Subject" in the UI.
// To add a new subject, just add a new entry here with a unique key.
// The key is stored on each appointment as `apt.type` (legacy field name).
export const APPOINTMENT_TYPES = {
  appointment:      { name: 'Appointment',          color: T.accent,  duration: 90 },
  'follow-up':      { name: 'Follow Up Appointment', color: T.green,  duration: 60 },
  contract:         { name: 'Contract Signing',     color: T.purple,  duration: 90 },
  'change-order':   { name: 'Change Order',         color: T.pink,    duration: 60 },
  'cancel-save':    { name: 'Cancel/Save',          color: T.red,     duration: 60 },
};

// Appointment statuses
export const APPOINTMENT_STATUSES = {
  scheduled:          { name: 'Scheduled',          color: T.muted  },
  confirmed:          { name: 'Confirmed',          color: T.green  },
  completed:          { name: 'Completed',          color: T.purple },
  'needs-reschedule': { name: 'Needs Reschedule',   color: T.accent },
  rescheduled:        { name: 'Rescheduled',        color: T.cyan   },
  canceled:           { name: 'Canceled',            color: T.red    },
  disqualified:       { name: 'Disqualified',        color: T.dim    },
};

// Time slots for scheduling
export const TIME_SLOTS = ['9:00 AM', '11:30 AM', '2:00 PM', '5:00 PM', '7:00 PM'];

// Territories with display colors
export const TERRITORIES = {
  NYE:  { code: 'NYE',  name: 'NY East',      color: '#F0A830', states: ['NY'], areas: 'Queens, Nassau, Suffolk' },
  NYW:  { code: 'NYW',  name: 'NY West',      color: '#2DD4A8', states: ['NY'], areas: 'Brooklyn, Bronx, Staten Island, Westchester, Rockland, Putnam, Dutchess, Orange' },
  CT:   { code: 'CT',   name: 'Connecticut',   color: '#8B95A3' },
  MARI: { code: 'MARI', name: 'MA/RI',         color: '#F87171' },
  MENH: { code: 'MENH', name: 'ME/NH',         color: '#9333EA' },
  NJPA: { code: 'NJPA', name: 'NJ/PA',         color: '#EC4899' },
  MD:   { code: 'MD',   name: 'Maryland',      color: '#06B6D4' },
};
