import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Keyboard, Calendar, Users, Search, Zap, BarChart3, MapPin, Phone, Settings, X } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import useIsMobile from '../hooks/useIsMobile.js';

const USER_SECTIONS = [
  {
    title: 'Scheduling Appointments',
    icon: <Calendar size={14} />,
    items: [
      { q: 'How do I create an appointment?', a: 'Click the "+ New" button (top-right on desktop, bottom bar on mobile), fill in the customer details, select a date/time, and the system will auto-assign the best rep. You can also use Quick Add — type something like "John Smith 3pm tomorrow 85281" and press Enter.' },
      { q: 'How do I reschedule?', a: 'Drag and drop the appointment to a new time slot on the Day or Week view. The system will warn you about travel buffer conflicts and show the impact on close probability.' },
      { q: 'How do I cancel or mark a no-show?', a: 'Click the appointment to open details, then click "Cancel / No-Show" at the bottom. Select a reason — this data helps improve scheduling over time.' },
    ],
  },
  {
    title: 'Calendar Views',
    icon: <Calendar size={14} />,
    items: [
      { q: 'What views are available?', a: 'Day, Week, Month, Swimlane (by status pipeline), By State, By Team, Depth Chart (slot coverage), Rep View (individual rep schedule), and Available Slots.' },
      { q: 'How do I filter by territory?', a: 'Use the territory chips below the calendar navigation. Click to toggle territories on/off — the calendar and analytics update in real time.' },
    ],
  },
  {
    title: 'Rep Assignment & Best Rep',
    icon: <Users size={14} />,
    items: [
      { q: 'How does Best Rep work?', a: 'The system ranks reps for each slot based on close rate, sit rate, territory familiarity, travel distance, current load, and lead source history. Open any appointment detail to see the ranked list and one-click reassign.' },
      { q: 'How do I mark a rep as out?', a: 'Click "Rep is Out" in the toolbar, select the rep and date. Their appointments will be flagged for reassignment.' },
      { q: 'What are bulk operations?', a: 'Select multiple appointments (checkboxes in Day/Week view), then use the bulk toolbar to reassign, cancel, or reschedule all at once.' },
    ],
  },
  {
    title: 'Search & Navigation',
    icon: <Search size={14} />,
    items: [
      { q: 'How do I search?', a: 'Press Cmd+/ (or Ctrl+/) or click the Search button. Search by customer name, address, zip code, or rep name. Results are clickable — jump directly to any appointment.' },
      { q: 'What are the keyboard shortcuts?', a: 'Cmd+/ = Search, Cmd+Z = Undo last action, Arrow keys = navigate dates in Day/Week view.' },
    ],
  },
  {
    title: 'TSRF & Owner Badges',
    icon: <Zap size={14} />,
    items: [
      { q: 'What is the TSRF badge?', a: 'TSRF (Total Solar Resource Fraction) measures roof quality from Aurora. Higher TSRF = less shade = better economics = higher close probability. Green ≥ 80, yellow 60–79, red < 60.' },
      { q: 'What is the Owner badge?', a: 'Shows whether the customer is the verified property owner. Renters cannot sign solar agreements — verify ownership before the appointment.' },
    ],
  },
  {
    title: 'Analytics & Forecast',
    icon: <BarChart3 size={14} />,
    items: [
      { q: 'Where are the analytics?', a: 'Switch to the Analytics view from the view selector. See close rates, sit rates, revenue pipeline, and territory heat maps.' },
      { q: 'What is the Forecast panel?', a: 'The right sidebar shows demand forecasts by territory for the next 30/60/90 days, helping you staff appropriately.' },
    ],
  },
  {
    title: 'Customer Booking & Partners',
    icon: <Phone size={14} />,
    items: [
      { q: 'How does customer self-booking work?', a: 'Share the link: your-url/#/book — customers pick a time slot, enter their info, and the appointment appears on the calendar. They get an SMS/email confirmation automatically.' },
      { q: 'How do partner booking pages work?', a: 'Each lead partner (Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics) has a branded booking page at /#/book/partner-slug. The page uses the partner\'s brand color, shows availability only in their territories, and includes a Salesforce lookup so existing leads/contacts are auto-matched by phone or email.' },
      { q: 'What partner pages are live?', a: '/#/book/greenwatt, /#/book/verse, /#/book/sunlink, /#/book/lomano, /#/book/remix-dynamics. To add a new partner, just add an entry to src/data/partners.js — the page is auto-generated.' },
      { q: 'How does the SFDC lookup on partner pages work?', a: 'When a partner enters a phone or email, the system searches Salesforce for matching Leads or Contacts. If found, the form auto-fills with SFDC data and the appointment is linked to the existing record. If not found, a new Lead is created on booking.' },
    ],
  },
];

const ADMIN_SECTIONS = [
  {
    title: 'Making Changes to the Tool',
    icon: <Settings size={14} />,
    items: [
      { q: 'How do I add a new territory or state?', a: 'This requires a code change to src/data/theme.js (the TERRITORIES object) and src/data/mockData.js (zip-to-territory mapping). Ask Claude to add it — provide the territory name, code, color, and which zip prefixes it covers.' },
      { q: 'How do I add a new rep or consultant?', a: 'Add one line to the consultants array in src/data/mockData.js. Copy an existing rep entry and update: id (territory-number), name, position (solar_consultant, sr_solar_consultant, design_expert, or regional_sales_manager), homeZip, territories, team, phone, notes, and flags (isCloserOnly, isVirtualOnly, isHybrid). The rep auto-appears in the depth chart, rep view, and assignment engine. Ask Claude to add them — just provide name, territory, and role.' },
      { q: 'How do I change appointment types?', a: 'Modify APPOINTMENT_TYPES in src/data/theme.js. Each type has a name, color, and default duration. Ask Claude to add new types.' },
      { q: 'How do I add a new partner booking page?', a: 'Add the partner to src/data/partners.js with their slug, name, logo URL, brand color, territories, and contact email. The booking page is auto-generated at /#/book/partner-slug with their branding, territory-filtered availability, and Salesforce lookup. Ask Claude to add a new partner — just provide the company name, territories they cover, and brand color.' },
    ],
  },
  {
    title: 'Salesforce Integration',
    icon: <Zap size={14} />,
    items: [
      { q: 'How do I set up the Salesforce connection?', a: 'Create a Connected App in Salesforce Setup, then set SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_REDIRECT_URI as environment variables on Cloud Run. Visit /auth/salesforce to complete the OAuth flow.' },
      { q: 'How do I add the booking button to Opportunities?', a: 'Follow the guide in docs/salesforce-button-setup.md — create a URL button on the Opportunity object that deep-links to the scheduler with pre-filled fields.' },
      { q: 'How do I add the booking button to Leads?', a: 'Follow docs/salesforce-lead-button-setup.md — same process but on the Lead object. Leads are auto-converted to Opportunities when booked.' },
      { q: 'What is the Appointment__c object?', a: 'A custom Salesforce object that mirrors appointments created in this tool. It links to the Opportunity (or converted Lead), stores status, assigned rep, date/time, and syncs automatically.' },
    ],
  },
  {
    title: 'Deployment & Infrastructure',
    icon: <MapPin size={14} />,
    items: [
      { q: 'How do I deploy changes?', a: 'Run: gcloud run deploy venture-home-scheduler --source . --region us-east1 --allow-unauthenticated. The build takes about 2 minutes.' },
      { q: 'Where is the code?', a: 'GitHub: github.com/adamluria/venture-home-scheduler (private repo). Stack: React + Vite frontend, Express backend, deployed on Google Cloud Run.' },
      { q: 'When should I ask Claude vs. make changes myself?', a: 'Ask Claude for: new features, bug fixes, Salesforce field changes, new views/components, partner pages, styling changes. Do yourself: environment variables, Salesforce admin setup (buttons, layouts, permissions), Cloud Run deploy commands.' },
    ],
  },
];

export default function HelpPanel({ onClose }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('user'); // user | admin
  const [expanded, setExpanded] = useState({});

  const sections = tab === 'user' ? USER_SECTIONS : ADMIN_SECTIONS;

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: isMobile ? '100vw' : '420px',
      maxWidth: '100vw',
      background: T.surface,
      borderLeft: `1px solid ${T.border}`,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-8px 0 30px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HelpCircle size={20} color={T.accent} />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Help & Training</h2>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', padding: '12px 20px', gap: '8px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        {[
          { key: 'user', label: 'User Guide' },
          { key: 'admin', label: 'Admin Guide' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
              fontWeight: tab === t.key ? '600' : '400',
              background: tab === t.key ? T.accent : 'transparent',
              color: tab === t.key ? T.bg : T.muted,
              border: tab === t.key ? 'none' : `1px solid ${T.border}`,
              cursor: 'pointer', fontFamily: fonts.ui,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '16px' }}>
            <div
              onClick={() => toggle(`${tab}-${si}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 0', cursor: 'pointer', userSelect: 'none',
              }}
            >
              {expanded[`${tab}-${si}`] ? <ChevronDown size={14} color={T.muted} /> : <ChevronRight size={14} color={T.muted} />}
              <span style={{ color: T.accent, flexShrink: 0 }}>{section.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: T.text }}>{section.title}</span>
            </div>
            {expanded[`${tab}-${si}`] && (
              <div style={{ paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                {section.items.map((item, ii) => (
                  <div key={ii}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '4px' }}>
                      {item.q}
                    </div>
                    <div style={{ fontSize: '12px', color: T.muted, lineHeight: '1.5' }}>
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer tip */}
        <div style={{
          marginTop: '20px', padding: '12px', borderRadius: '8px',
          background: T.accentDim, border: `1px solid ${T.accent}30`,
          fontSize: '12px', color: T.muted, lineHeight: '1.5',
        }}>
          <strong style={{ color: T.accent }}>Tip:</strong> For any changes or new features, open Claude in Cowork mode and ask. Describe what you want in plain English — Claude has full context of this codebase and can make changes, deploy, and update documentation.
        </div>
      </div>
    </div>
  );
}
