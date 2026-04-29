// SmartAssignmentView.jsx
//
// A standalone view (separate from the Smart Schedule modal) for inside-sales
// reps doing volume booking. Workflow:
//
//   1. Search Salesforce for a customer (by name/phone/email)
//   2. Auto-loads customer info + interaction history (prior leads/opps/calls)
//   3. Pick a date and time slot from the right-column grid
//   4. See ranked rep recommendations with the same factor breakdown the modal shows
//   5. Click "Book" → opens NewAppointmentModal pre-filled with customer + slot + rep
//
// Adapted from CSVenture1/venture-home-sales-intelligence
// (src/app.jsx → AppointmentAssignmentView, lines 1242-1539).
// Differences from Chris's prototype:
//   - Real SF data via LeadPicker + LeadHistoryPanel + sfPerformance
//   - Real ranking via slotSuggestionEngine (no synthetic perfScore composite)
//   - Real date/time selection that drives availability lookup
//   - Booking handoff goes through NewAppointmentModal so SF write-back works

import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar as CalendarIcon, Clock,
  CheckCircle2, AlertCircle, Star, ChevronRight,
} from 'lucide-react';
import { T, fonts, TIME_SLOTS, TERRITORIES } from '../data/theme.js';
import { rankRepsForSlot } from '../data/slotSuggestionEngine.js';
import { isRealDataAvailable } from '../data/sfPerformance.js';
import { leadToFormValues } from '../data/leadMapper.js';
import LeadPicker from './LeadPicker.jsx';
import LeadHistoryPanel from './LeadHistoryPanel.jsx';

// Default to today + 6 working days for the date picker
function buildDateOptions(daysAhead = 7) {
  const out = [];
  const start = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    out.push({ value: iso, label });
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────

export default function SmartAssignmentView({ onBook }) {
  const [lead, setLead] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [territory, setTerritory] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [loadingRank, setLoadingRank] = useState(false);

  const dateOptions = useMemo(() => buildDateOptions(10), []);

  // Auto-detect territory from zip when a lead is selected
  useEffect(() => {
    if (!lead) { setTerritory(null); return; }
    const zip = (lead.zip || '').slice(0, 3);
    // Simple zip-prefix lookup — same map NewAppointmentModal uses
    const map = TERRITORY_BY_ZIP3;
    setTerritory(map[zip] || null);
  }, [lead]);

  // Re-rank when slot/lead/date/territory change
  useEffect(() => {
    if (!territory || !selectedDate || !selectedSlot) {
      setRanked([]);
      return;
    }
    let cancelled = false;
    setLoadingRank(true);
    rankRepsForSlot({
      date:        selectedDate,
      slot:        selectedSlot,
      territory,
      leadSource:  lead?.source || 'paid',
      customerZip: lead?.zip,
      isVirtual:   false,
      topN:        5,
    })
      .then(r => { if (!cancelled) setRanked(r || []); })
      .catch(() => { if (!cancelled) setRanked([]); })
      .finally(() => { if (!cancelled) setLoadingRank(false); });
    return () => { cancelled = true; };
  }, [territory, selectedDate, selectedSlot, lead?.source, lead?.zip]);

  const handleBookRep = (rep) => {
    if (!lead || !selectedSlot) return;
    const formData = {
      ...leadToFormValues(lead),
      date:       selectedDate,
      time:       selectedSlot,
      consultant: rep.repId,
      territory,
      leadSource: lead.source || 'paid',
    };
    if (onBook) onBook(formData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: fonts.ui }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: T.text, fontSize: 20, fontWeight: 600 }}>Smart Assignments</h2>
          <p style={{ margin: '2px 0 0', color: T.muted, fontSize: 13 }}>
            Search a Salesforce lead, pick a slot, book the top-ranked rep — with factor transparency.
          </p>
        </div>
        <DataPill />
      </div>

      {/* Lead picker — real SF search */}
      <Card>
        <Label>Find Customer in Salesforce</Label>
        <LeadPicker onSelect={setLead} />
        {!lead && (
          <div style={{ marginTop: 8, color: T.muted, fontSize: 12 }}>
            Type a name, phone, or email to load customer details and interaction history.
          </div>
        )}
      </Card>

      {/* Two-column layout once a lead is picked */}
      {lead && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}>
          {/* LEFT — customer info + history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CustomerCard lead={lead} territory={territory} />
            <Card>
              <Label>Interaction History</Label>
              <LeadHistoryPanel phone={(lead.mobilePhone || lead.phone || '').replace(/\D/g, '').slice(-10)} />
            </Card>
          </div>

          {/* RIGHT — slot picker + ranked reps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <Label>Select Date</Label>
              <div style={dateGrid}>
                {dateOptions.map(d => (
                  <SlotButton
                    key={d.value}
                    selected={selectedDate === d.value}
                    onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                  >
                    {d.label}
                  </SlotButton>
                ))}
              </div>
            </Card>

            <Card>
              <Label>Select Time Slot</Label>
              <div style={timeSlotGrid}>
                {(TIME_SLOTS || ['9:00 AM','11:30 AM','2:00 PM','5:00 PM','7:00 PM']).map(slot => (
                  <SlotButton
                    key={slot}
                    selected={selectedSlot === slot}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </SlotButton>
                ))}
              </div>
            </Card>

            <Card>
              <Label>Recommended Reps</Label>
              <RankedReps
                ranked={ranked}
                loading={loadingRank}
                hasContext={!!(territory && selectedSlot)}
                noTerritory={!territory}
                noSlot={!selectedSlot}
                leadSource={lead.source}
                onBook={handleBookRep}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function CustomerCard({ lead, territory }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <User size={14} style={{ color: T.accent }} />
        <strong style={{ color: T.text, fontSize: 16 }}>{lead.name}</strong>
        {lead.status && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: T.accent,
            background: T.accentDim, padding: '2px 8px', borderRadius: 10,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {lead.status}
          </span>
        )}
      </div>
      <Field icon={Phone} label="Phone" value={lead.mobilePhone || lead.phone} />
      <Field icon={Mail}  label="Email" value={lead.email} />
      <Field icon={MapPin} label="Address" value={[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ') || '—'} />
      <Field icon={Star}  label="Lead Source" value={lead.source || '—'} />
      {territory && (
        <Field icon={MapPin} label="Territory" value={`${TERRITORIES[territory]?.name || territory} (${territory})`} />
      )}
      {!territory && lead.zip && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#F59E0B' }}>
          <AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Zip {lead.zip} doesn't match a known territory — ranking unavailable.
        </div>
      )}
    </Card>
  );
}

function RankedReps({ ranked, loading, hasContext, noTerritory, noSlot, leadSource, onBook }) {
  if (noTerritory) {
    return <Subtle>Pick a customer with a known zip first.</Subtle>;
  }
  if (noSlot) {
    return <Subtle>Pick a date and time slot to see ranked reps.</Subtle>;
  }
  if (loading) {
    return <Subtle>Calculating ranking...</Subtle>;
  }
  if (!hasContext || ranked.length === 0) {
    return <Subtle>No reps available for this slot in this territory.</Subtle>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((rep, idx) => (
        <RepCard
          key={rep.repId}
          rep={rep}
          rank={idx + 1}
          isTop={idx === 0}
          leadSource={leadSource}
          onBook={() => onBook(rep)}
        />
      ))}
    </div>
  );
}

function RepCard({ rep, rank, isTop, leadSource, onBook }) {
  const b = rep.breakdown || {};
  const rankColor = rank === 1 ? '#10B981' : rank === 2 ? T.accent : T.muted;
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
      padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: rankColor, color: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, fontFamily: fonts.mono,
        }}>{rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{rep.repName}</div>
          {rep.repTeam && <div style={{ color: T.muted, fontSize: 11 }}>{rep.repTeam}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: T.accent, fontFamily: fonts.mono, fontSize: 14, fontWeight: 600 }}>
            {b.pClose != null ? `${b.pClose}%` : '—'}
          </div>
          <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>P(close)</div>
        </div>
        <button onClick={onBook} style={bookButton}>
          Book <ChevronRight size={12} />
        </button>
      </div>

      {/* Factor breakdown */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
        fontSize: 11, color: T.muted, fontFamily: fonts.mono,
      }}>
        <Stat label="Close|sit" value={b.pCloseGivenSit != null ? `${b.pCloseGivenSit}%` : '—'} />
        <Stat label="Sit"       value={b.pSit != null ? `${b.pSit}%` : '—'} />
        <Stat label="Cancel"    value={b.cancelRate != null ? `${b.cancelRate}%` : '—'} />
        <Stat label="Today"     value={b.todayAppts != null ? b.todayAppts : '—'} />
      </div>

      {rep.reasons && rep.reasons.length > 0 && (
        <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>
          {rep.reasons.slice(0, 3).join(' · ')}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ color: T.text, fontWeight: 600 }}>{value}</span>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: 16,
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: T.muted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
      <Icon size={12} style={{ color: T.muted, flexShrink: 0 }} />
      <span style={{ color: T.muted, minWidth: 78 }}>{label}</span>
      <span style={{ color: T.text }}>{value}</span>
    </div>
  );
}

function Subtle({ children }) {
  return <div style={{ color: T.muted, fontSize: 12 }}>{children}</div>;
}

function SlotButton({ selected, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 12px', borderRadius: 6,
      background: selected ? T.accent : T.bg,
      color: selected ? T.bg : T.text,
      border: `1px solid ${selected ? T.accent : T.border}`,
      cursor: 'pointer', fontFamily: fonts.ui, fontSize: 13, fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

function DataPill() {
  const live = isRealDataAvailable();
  const color = live ? '#10B981' : T.muted;
  return (
    <span style={{
      fontFamily: fonts.ui, fontSize: 11, fontWeight: 600, color,
      border: `1px solid ${color}`, padding: '3px 10px', borderRadius: 12,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {live ? 'Live SF data' : 'Synthetic'}
    </span>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const dateGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8,
};

const timeSlotGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8,
};

const bookButton = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: T.accent, color: T.bg,
  border: 'none', borderRadius: 6,
  padding: '6px 10px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: fonts.ui, whiteSpace: 'nowrap',
};

// ─── Zip-prefix → territory map (subset; same intent as NewAppointmentModal) ──

const TERRITORY_BY_ZIP3 = {
  // CT
  '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT',
  '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
  // NYE
  '111': 'NYE', '113': 'NYE', '114': 'NYE', '115': 'NYE', '116': 'NYE',
  '117': 'NYE', '118': 'NYE', '119': 'NYE',
  // NYW
  '100': 'NYW', '101': 'NYW', '102': 'NYW', '103': 'NYW', '104': 'NYW',
  '105': 'NYW', '106': 'NYW', '107': 'NYW', '108': 'NYW', '109': 'NYW',
  '110': 'NYW', '112': 'NYW',
  '125': 'NYW', '126': 'NYW', '127': 'NYW', '128': 'NYW',
  '122': 'NYW', '130': 'NYW', '132': 'NYW', '140': 'NYW', '146': 'NYW',
  // MARI
  '010': 'MARI', '012': 'MARI', '013': 'MARI', '014': 'MARI', '015': 'MARI',
  '016': 'MARI', '017': 'MARI', '018': 'MARI', '019': 'MARI',
  '020': 'MARI', '021': 'MARI', '022': 'MARI', '023': 'MARI', '024': 'MARI',
  '025': 'MARI', '026': 'MARI', '027': 'MARI', '028': 'MARI', '029': 'MARI',
  // MENH
  '030': 'MENH', '031': 'MENH', '032': 'MENH', '033': 'MENH', '034': 'MENH',
  '036': 'MENH', '037': 'MENH', '038': 'MENH', '039': 'MENH',
  '040': 'MENH', '041': 'MENH', '042': 'MENH', '043': 'MENH', '044': 'MENH',
  '045': 'MENH', '046': 'MENH', '047': 'MENH', '048': 'MENH', '049': 'MENH',
  // NJPA
  '070': 'NJPA', '071': 'NJPA', '072': 'NJPA', '073': 'NJPA', '074': 'NJPA',
  '075': 'NJPA', '076': 'NJPA', '077': 'NJPA', '078': 'NJPA', '079': 'NJPA',
  '080': 'NJPA', '081': 'NJPA', '082': 'NJPA', '083': 'NJPA', '084': 'NJPA',
  '085': 'NJPA', '086': 'NJPA', '087': 'NJPA', '088': 'NJPA', '089': 'NJPA',
  '190': 'NJPA', '191': 'NJPA', '192': 'NJPA', '193': 'NJPA', '194': 'NJPA',
  // MD
  '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD', '210': 'MD',
  '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD', '216': 'MD',
  '217': 'MD', '218': 'MD', '219': 'MD',
  '200': 'MD', '201': 'MD', '202': 'MD', '203': 'MD', '204': 'MD', '205': 'MD',
};
