// LeadPicker.jsx
//
// In-form Salesforce Lead/Contact picker. Type a name, phone, or email; the
// component debounces against /api/sfdc/search and shows matches. Clicking a
// result calls onSelect(lead) — the parent (NewAppointmentModal) feeds that
// through leadToFormValues() to prefill the appointment form.
//
// Routing logic (mirrors how reps actually search):
//   - All digits (+/spaces/dashes ok)        → ?phone=<digits>
//   - Contains '@'                           → ?email=<term>
//   - Anything else (>=2 chars)              → ?name=<term> (SOSL)
//
// Dark-theme inline styles match the rest of the modal (no CSS file).

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, Building2, AlertCircle } from 'lucide-react';
import { T, fonts } from '../data/theme.js';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export default function LeadPicker({ onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ leads: [], contacts: [] });
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);
  const reqIdRef = useRef(0);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_CHARS) {
      setResults({ leads: [], contacts: [] });
      setLoading(false);
      setError(null);
      return;
    }

    const t = setTimeout(() => {
      const myReqId = ++reqIdRef.current;
      const params = new URLSearchParams();
      // Heuristic routing
      const digits = term.replace(/[^\d]/g, '');
      if (term.includes('@')) {
        params.set('email', term);
      } else if (digits.length >= 7 && digits.length === term.replace(/[\s\-+()]/g, '').length) {
        params.set('phone', digits);
      } else {
        params.set('name', term);
      }

      setLoading(true);
      setError(null);
      fetch(`/api/sfdc/search?${params.toString()}`)
        .then(async r => {
          if (!r.ok) {
            // 401 = SF not authed. Show a helpful message instead of swallowing.
            if (r.status === 401) throw new Error('Salesforce not connected — connect via Settings to enable lookup.');
            throw new Error(`Lookup failed (${r.status})`);
          }
          return r.json();
        })
        .then(data => {
          // Drop stale responses
          if (myReqId !== reqIdRef.current) return;
          setResults({
            leads: Array.isArray(data?.leads) ? data.leads : [],
            contacts: Array.isArray(data?.contacts) ? data.contacts : [],
          });
        })
        .catch(err => {
          if (myReqId !== reqIdRef.current) return;
          setError(err.message || 'Lookup failed');
          setResults({ leads: [], contacts: [] });
        })
        .finally(() => {
          if (myReqId !== reqIdRef.current) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  const flatResults = useMemo(() => {
    const leads = (results.leads || []).map(r => ({ ...r, _kind: 'lead' }));
    const contacts = (results.contacts || []).map(r => ({ ...r, _kind: 'contact' }));
    // Leads first (they're the primary booking target), then contacts.
    return [...leads, ...contacts];
  }, [results]);

  const handlePick = (rec) => {
    onSelect && onSelect(rec);
    setOpen(false);
    setQuery('');
    setResults({ leads: [], contacts: [] });
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px',
    background: T.bg, border: `1px solid ${T.border}`,
    color: T.text, fontSize: '14px', fontFamily: fonts.ui,
    outline: 'none', boxSizing: 'border-box',
  };

  const showDropdown = open && query.trim().length >= MIN_CHARS;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={query}
          placeholder="Type a name, phone, or email…"
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          style={inputStyle}
        />
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          maxHeight: '300px', overflowY: 'auto', zIndex: 60,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {loading && (
            <div style={{ padding: '10px 12px', color: T.muted, fontSize: '13px', fontFamily: fonts.ui }}>
              Searching Salesforce…
            </div>
          )}

          {!loading && error && (
            <div style={{
              padding: '10px 12px', fontSize: '13px', color: '#EF4444',
              display: 'flex', alignItems: 'center', gap: '6px', fontFamily: fonts.ui,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {!loading && !error && flatResults.length === 0 && (
            <div style={{ padding: '10px 12px', color: T.muted, fontSize: '13px', fontFamily: fonts.ui }}>
              No matches in Salesforce
            </div>
          )}

          {!loading && !error && flatResults.map((rec) => (
            <ResultRow key={`${rec._kind}-${rec.id}`} rec={rec} onPick={handlePick} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ rec, onPick }) {
  const [hover, setHover] = useState(false);
  const isLead = rec._kind === 'lead';
  const Icon = isLead ? User : Building2;
  const subtitle = [
    rec.phone || rec.mobilePhone,
    rec.email,
    [rec.city, rec.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(' • ');

  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); onPick(rec); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 12px', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: hover ? T.surfaceHover : 'transparent',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <Icon size={14} style={{ marginTop: '2px', color: isLead ? T.accent : T.muted, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', color: T.text, fontFamily: fonts.ui,
          fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {rec.name || `${rec.firstName || ''} ${rec.lastName || ''}`.trim() || '(unnamed)'}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '12px', color: T.muted, fontFamily: fonts.ui, marginTop: '2px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <span style={{
        fontSize: '10px', color: T.muted, fontFamily: fonts.ui,
        background: T.bg, border: `1px solid ${T.border}`,
        padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {isLead ? 'Lead' : 'Contact'}
      </span>
    </div>
  );
}
