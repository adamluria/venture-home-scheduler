import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';
import { T, fonts, TIME_SLOTS, APPOINTMENT_TYPES, TERRITORIES } from '../data/theme.js';
import { LEAD_SOURCES } from '../data/leadSources.js';
import { consultants } from '../data/mockData.js';
import { getSlotAvailability } from '../data/calendarService.js';
import { leadToFormValues } from '../data/leadMapper.js';
import SlotSuggestions from './SlotSuggestions.jsx';
import LeadPicker from './LeadPicker.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

export default function NewAppointmentModal({ onClose, onSave, defaultDate, defaultForm }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    customer: '',
    address: '',
    zipCode: '',
    phone: '',
    email: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    time: '9:00 AM',
    type: 'appointment',
    territory: '',
    consultant: '',
    designExpert: '',
    isVirtual: false,
    leadSource: 'paid',
    // Merge any prefilled values from quick-add (these override the defaults above)
    ...(defaultForm || {}),
  });

  const [zipSuggestion, setZipSuggestion] = useState(null);
  const [slotAvailability, setSlotAvailability] = useState(null);

  // Fetch availability when date or territory changes
  useEffect(() => {
    if (!form.date || !form.territory) { setSlotAvailability(null); return; }
    const territoryConsultants = consultants
      .filter(c => c.territories.includes(form.territory))
      .map(c => c.id);
    if (territoryConsultants.length === 0) return;

    getSlotAvailability(form.date, territoryConsultants)
      .then(setSlotAvailability)
      .catch(() => setSlotAvailability(null));
  }, [form.date, form.territory]);

  // Check if a specific consultant is busy at the selected slot
  const isConsultantBusy = (consultantId) => {
    if (!slotAvailability || !consultantId) return false;
    return slotAvailability[consultantId]?.[form.time]?.available === false;
  };

  const handleZipChange = (zip) => {
    setForm({ ...form, zipCode: zip });
    // Mock territory lookup by zip prefix
    if (zip.length >= 3) {
      const zipPrefix = zip.substring(0, 3);
      const territoryMap = {
        // CT
        '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
        // NYE = Queens, Nassau, Suffolk
        '111': 'NYE', '113': 'NYE', '114': 'NYE',   // Queens
        '115': 'NYE', '116': 'NYE',                   // Nassau
        '117': 'NYE', '118': 'NYE', '119': 'NYE',   // Suffolk
        // NYW = Brooklyn, Bronx, Staten Island, Westchester, Rockland, Putnam, Dutchess, Orange
        '100': 'NYW', '101': 'NYW', '102': 'NYW',   // Manhattan
        '103': 'NYW',                                  // Staten Island
        '104': 'NYW',                                  // Bronx
        '105': 'NYW', '106': 'NYW', '107': 'NYW', '108': 'NYW', '109': 'NYW', '110': 'NYW',  // Westchester, Rockland
        '112': 'NYW',                                  // Brooklyn
        '125': 'NYW', '126': 'NYW',                   // Putnam, Dutchess
        '127': 'NYW', '128': 'NYW',                   // Orange county
        '122': 'NYW', '130': 'NYW', '132': 'NYW', '140': 'NYW', '146': 'NYW',  // Upstate
        // MARI = MA + RI
        '010': 'MARI', '012': 'MARI', '013': 'MARI', '014': 'MARI', '015': 'MARI', '016': 'MARI', '017': 'MARI', '018': 'MARI', '019': 'MARI',
        '020': 'MARI', '021': 'MARI', '022': 'MARI', '023': 'MARI', '024': 'MARI', '025': 'MARI', '026': 'MARI', '027': 'MARI', '028': 'MARI', '029': 'MARI',
        // MENH = ME + NH
        '030': 'MENH', '031': 'MENH', '032': 'MENH', '033': 'MENH', '034': 'MENH', '036': 'MENH', '037': 'MENH', '038': 'MENH', '039': 'MENH',
        '040': 'MENH', '041': 'MENH', '042': 'MENH', '043': 'MENH', '044': 'MENH', '045': 'MENH', '046': 'MENH', '047': 'MENH', '048': 'MENH', '049': 'MENH',
        // NJPA = NJ + Eastern PA
        '070': 'NJPA', '071': 'NJPA', '072': 'NJPA', '073': 'NJPA', '074': 'NJPA', '075': 'NJPA', '076': 'NJPA', '077': 'NJPA', '078': 'NJPA', '079': 'NJPA',
        '080': 'NJPA', '081': 'NJPA', '082': 'NJPA', '083': 'NJPA', '084': 'NJPA', '085': 'NJPA', '086': 'NJPA', '087': 'NJPA', '088': 'NJPA', '089': 'NJPA',
        '190': 'NJPA', '191': 'NJPA', '192': 'NJPA', '193': 'NJPA', '194': 'NJPA',  // Eastern PA
        // MD = Maryland + DC
        '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD', '210': 'MD', '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD', '216': 'MD', '217': 'MD', '218': 'MD', '219': 'MD',
        '200': 'MD', '201': 'MD', '202': 'MD', '203': 'MD', '204': 'MD', '205': 'MD',  // DC
      };
      const matchedTerritory = territoryMap[zipPrefix];
      if (matchedTerritory) {
        setZipSuggestion(matchedTerritory);
        setForm(prev => ({ ...prev, territory: matchedTerritory }));
      } else {
        setZipSuggestion(null);
      }
    }
  };

  const availableConsultants = consultants.filter(c => {
    if (!form.territory) return true;
    return c.territories.includes(form.territory) && !c.isCloserOnly;
  });

  const availableExperts = consultants.filter(c => {
    if (!form.territory) return c.isCloserOnly;
    return c.territories.includes(form.territory) && c.isCloserOnly;
  });

  const handleSubmit = () => {
    if (!form.customer || !form.date || !form.time) return;
    onSave && onSave(form);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }} onClick={onClose}>
      <div
        style={{
          background: T.surface,
          borderRadius: isMobile ? 0 : '12px',
          border: isMobile ? 'none' : `1px solid ${T.border}`,
          width: isMobile ? '100%' : '520px',
          maxWidth: isMobile ? '100%' : '95vw',
          maxHeight: isMobile ? '100vh' : '90vh',
          minHeight: isMobile ? '100vh' : 'auto',
          overflow: 'auto',
          boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px' : '20px 24px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: isMobile ? 'sticky' : 'static',
          top: 0,
          background: T.surface,
          zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Schedule Appointment</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{
          padding: isMobile ? '16px' : '24px',
          display: 'flex', flexDirection: 'column',
          gap: isMobile ? '14px' : '16px',
          flex: 1,
        }}>
          {/* Salesforce Lead/Contact lookup — type to search, click to prefill */}
          <FormField label="Lookup Customer in Salesforce">
            <LeadPicker
              onSelect={(lead) => {
                const mapped = leadToFormValues(lead);
                setForm(prev => ({ ...prev, ...mapped }));
                // Trigger zip-based territory detection on the prefilled zip.
                if (mapped.zipCode) handleZipChange(mapped.zipCode);
              }}
            />
          </FormField>

          {/* Customer */}
          <FormField label="Customer Name">
            <Input value={form.customer} onChange={v => setForm({ ...form, customer: v })} placeholder="Last name or family name" />
          </FormField>

          {/* Address + Zip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 120px',
            gap: '12px',
          }}>
            <FormField label="Address">
              <Input value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="Street address" />
            </FormField>
            <FormField label="Zip Code">
              <Input value={form.zipCode} onChange={v => handleZipChange(v)} placeholder="06851" />
            </FormField>
          </div>

          {zipSuggestion && (
            <div style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
              background: T.accentDim, color: T.accent,
            }}>
              Territory detected: <strong>{TERRITORIES[zipSuggestion]?.name}</strong> ({zipSuggestion})
            </div>
          )}

          {/* Phone + Email — prefilled from Salesforce Lead lookup or deep-link */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
          }}>
            <FormField label="Phone">
              <Input value={form.phone || ''} onChange={v => setForm({ ...form, phone: v })} placeholder="(555) 123-4567" />
            </FormField>
            <FormField label="Email">
              <Input value={form.email || ''} onChange={v => setForm({ ...form, email: v })} placeholder="customer@email.com" />
            </FormField>
          </div>

          {/* Suggested slots (highest likelihood to close) */}
          {form.territory && (
            <SlotSuggestions
              territory={form.territory}
              customerZip={form.zipCode}
              customerCity={parseAddressPart(form.address, 'city')}
              customerState={parseAddressPart(form.address, 'state')}
              leadSource={form.leadSource}
              isVirtual={form.isVirtual}
              onApply={({ date, slot, repId }) =>
                setForm(prev => ({ ...prev, date, time: slot, consultant: repId }))
              }
            />
          )}

          {/* Date + Time + Type */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
            gap: '12px',
          }}>
            <FormField label="Date">
              <Input type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
            </FormField>
            <FormField label="Time Slot">
              <Select value={form.time} onChange={v => setForm({ ...form, time: v })} options={TIME_SLOTS.map(s => {
                if (!slotAvailability) return { value: s, label: s };
                const ids = Object.keys(slotAvailability);
                const avail = ids.filter(id => slotAvailability[id]?.[s]?.available).length;
                return { value: s, label: avail === 0 ? `${s}  (full)` : `${s}  (${avail} free)` };
              })} />
            </FormField>
            <FormField label="Subject">
              <Select value={form.type} onChange={v => setForm({ ...form, type: v })} options={Object.entries(APPOINTMENT_TYPES).map(([k, v]) => ({ value: k, label: v.name }))} />
            </FormField>
          </div>

          {/* Appointment Type */}
          <FormField label="Appointment Type">
            <Select
              value={form.isVirtual ? 'online' : 'in-person'}
              onChange={v => setForm({ ...form, isVirtual: v === 'online' })}
              options={[
                { value: 'in-person', label: 'In-Person' },
                { value: 'online', label: 'Online Meeting' },
              ]}
            />
          </FormField>

          {/* Consultant */}
          <FormField label="Assign Consultant">
            <Select
              value={form.consultant}
              onChange={v => setForm({ ...form, consultant: v })}
              options={[{ value: '', label: 'Auto-assign (recommended)' }, ...availableConsultants.map(c => ({ value: c.id, label: `${c.name} — ${c.team}` }))]}
            />
          </FormField>

          {/* Busy warning */}
          {form.consultant && isConsultantBusy(form.consultant) && (
            <div style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
              background: 'rgba(239,68,68,0.1)', color: '#EF4444',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <AlertCircle size={14} />
              This consultant has a calendar conflict at {form.time} on this date.
            </div>
          )}

          {/* Design Expert */}
          <FormField label="Design Expert (Closer)">
            <Select
              value={form.designExpert}
              onChange={v => setForm({ ...form, designExpert: v })}
              options={[{ value: '', label: 'None' }, ...availableExperts.map(c => ({ value: c.id, label: `${c.name}${c.isVirtualOnly ? ' (virtual)' : ''}` }))]}
            />
          </FormField>

          {/* Lead source */}
          <FormField label="Lead Source">
            <SearchableSelect
              value={form.leadSource}
              onChange={v => setForm({ ...form, leadSource: v })}
              options={LEAD_SOURCES}
              placeholder="Search lead sources…"
            />
          </FormField>
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)' : '16px 24px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          position: isMobile ? 'sticky' : 'static',
          bottom: 0,
          background: T.surface,
          zIndex: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '6px',
            background: 'transparent', border: `1px solid ${T.border}`,
            color: T.text, fontSize: '14px', cursor: 'pointer', fontFamily: fonts.ui,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{
            padding: '10px 24px', borderRadius: '6px',
            background: T.accent, border: 'none',
            color: T.bg, fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: fonts.ui,
          }}>
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable form elements ──────────────────────────────────────────

function FormField({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', marginBottom: '4px', fontSize: '12px',
        fontWeight: '500', color: T.muted, fontFamily: fonts.ui,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: '6px',
        background: T.bg, border: `1px solid ${T.border}`,
        color: T.text, fontSize: '14px', fontFamily: fonts.ui,
        outline: 'none', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = T.accent}
      onBlur={e => e.target.style.borderColor = T.border}
    />
  );
}

// Pull "city" or "state" out of an address like "123 Oak St, Norwalk, CT 06851"
function parseAddressPart(address, part) {
  if (!address) return '';
  const chunks = address.split(',').map(s => s.trim()).filter(Boolean);
  if (chunks.length < 2) return '';
  if (part === 'city') return chunks[chunks.length - 2] || '';
  if (part === 'state') {
    const last = chunks[chunks.length - 1] || '';
    // "CT 06851" → "CT"
    return last.split(/\s+/)[0] || '';
  }
  return '';
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: '6px',
        background: T.bg, border: `1px solid ${T.border}`,
        color: T.text, fontSize: '14px', fontFamily: fonts.ui,
        outline: 'none', boxSizing: 'border-box',
        appearance: 'none',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return options.slice(0, 100);
    return options.filter(o => o.toLowerCase().includes(q)).slice(0, 100);
  }, [query, options]);

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    background: T.bg, border: `1px solid ${T.border}`,
    color: T.text, fontSize: '14px', fontFamily: fonts.ui,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? query : (value || '')}
        placeholder={placeholder || 'Search…'}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
        style={inputStyle}
      />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          maxHeight: '240px', overflowY: 'auto', zIndex: 50,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', color: T.muted, fontSize: '13px' }}>No matches</div>
          ) : filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setQuery(''); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: '14px', color: T.text, cursor: 'pointer',
                background: opt === value ? T.surfaceHover : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = opt === value ? T.surfaceHover : 'transparent'}
            >
              {opt}
            </div>
          ))}
          {filtered.length === 100 && (
            <div style={{ padding: '6px 12px', fontSize: '12px', color: T.muted, fontStyle: 'italic', borderTop: `1px solid ${T.border}` }}>
              Showing first 100 — keep typing to narrow
            </div>
          )}
        </div>
      )}
    </div>
  );
}

