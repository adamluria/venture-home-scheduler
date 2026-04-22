import React, { useState, useRef, useEffect } from 'react';
import { Zap, CornerDownLeft, X, AlertTriangle } from 'lucide-react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { parseQuickAdd } from '../utils/quickAddParser.js';

/**
 * Natural-language quick-add command bar.
 *
 * Type something like:
 *   "Sat 2pm Sanchez 123 Oak St Norwalk CT 06851 paid virtual"
 * and hit Enter to fire onCreate(formData).
 *
 * Shows a live parse preview under the input so the operator can verify
 * before committing. If required fields are missing we surface warnings
 * and the Enter key opens the NewAppointmentModal prefilled instead of
 * committing directly.
 *
 * Props:
 *   onCreate(formData)    — user hit Enter and parse was ok
 *   onOpenModal(formData) — user hit Cmd+Enter or parse was incomplete
 */
export default function QuickAddBar({ onCreate, onOpenModal }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Parse on every keystroke — it's pure and fast (regex only).
  const parsed = value.trim() ? parseQuickAdd(value) : null;

  // Cmd-K / Ctrl-K to focus
  useEffect(() => {
    const onKey = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!parsed) return;
    // Modifier key or incomplete parse → open the modal for review
    const openInModal = (e && (e.metaKey || e.ctrlKey || e.shiftKey)) || !parsed.ok;
    if (openInModal) {
      onOpenModal?.(parsed.fields);
    } else {
      onCreate?.(parsed.fields);
    }
    setValue('');
  };

  const clear = () => {
    setValue('');
    inputRef.current?.focus();
  };

  const showPreview = focused && !!parsed;

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: T.surface,
          border: `1px solid ${focused ? T.accent : T.border}`,
          borderRadius: '8px',
          transition: 'border-color 0.15s',
        }}>
          <Zap size={16} color={T.accent} />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)} // allow click on preview actions
            placeholder={'Quick add — "Sat 2pm Sanchez 123 Oak St Norwalk CT 06851 paid"   (⌘K to focus)'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: T.text, fontSize: '14px', fontFamily: fonts.ui,
              minWidth: 0,
            }}
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              style={{
                background: 'transparent', border: 'none', padding: 4,
                color: T.muted, cursor: 'pointer', display: 'flex',
              }}
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: T.muted, fontSize: '11px', fontFamily: fonts.data,
            padding: '4px 8px', borderRadius: '4px',
            background: T.bg, border: `1px solid ${T.border}`,
          }}>
            <CornerDownLeft size={11} /> Enter
          </span>
        </div>
      </form>

      {showPreview && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '8px', padding: '12px 14px', zIndex: 60,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          fontFamily: fonts.ui,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: parsed.warnings.length ? '10px' : 0 }}>
            {parsed.matched.map((m, i) => (
              <Chip key={i} label={labelFor(m)} tone={toneFor(m.what)} />
            ))}
            {parsed.matched.length === 0 && (
              <span style={{ fontSize: '12px', color: T.muted }}>
                Keep typing — include a day, time, customer name, and zip.
              </span>
            )}
          </div>

          {parsed.warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {parsed.warnings.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '11px', color: T.accent,
                }}>
                  <AlertTriangle size={11} /> {w}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '11px', color: T.muted,
          }}>
            <span>
              {parsed.ok
                ? <>Press <b style={{ color: T.text }}>Enter</b> to book, <b style={{ color: T.text }}>⌘/Ctrl+Enter</b> to review first.</>
                : <>Press <b style={{ color: T.text }}>Enter</b> to open the form with what we parsed so far.</>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── visual helpers ─────────────────────────────────────────────────

function labelFor(m) {
  switch (m.what) {
    case 'date':       return `📅 ${m.value}`;
    case 'time':       return `🕒 ${m.value}`;
    case 'customer':   return `👤 ${m.value}`;
    case 'address':    return `📍 ${m.value}`;
    case 'zip':        return `📮 ${m.value}`;
    case 'state':      return `🗺 ${m.value}`;
    case 'leadSource': return `🏷 ${leadSourceLabel(m.value)}`;
    case 'virtual':    return `📹 ${m.value}`;
    default:           return `${m.what}: ${m.value}`;
  }
}

function leadSourceLabel(id) {
  return ({
    paid: 'Paid',
    self_gen: 'Self Gen',
    get_the_referral: 'Get the Referral',
    partner: 'Partner',
    inbound: 'Inbound',
    retail: 'Retail',
    event: 'Event',
  })[id] || id;
}

function toneFor(what) {
  if (['date', 'time'].includes(what)) return 'accent';
  if (['customer'].includes(what)) return 'text';
  if (['virtual', 'leadSource'].includes(what)) return 'green';
  return 'muted';
}

function Chip({ label, tone }) {
  const colors = {
    accent: { fg: T.accent, bg: T.accentDim, br: T.accent + '60' },
    green:  { fg: T.green,  bg: T.greenDim,  br: T.green + '60' },
    muted:  { fg: T.muted,  bg: T.bg,        br: T.border },
    text:   { fg: T.text,   bg: T.bg,        br: T.borderLight },
  }[tone] || { fg: T.text, bg: T.bg, br: T.border };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
      borderRadius: '14px', background: colors.bg, color: colors.fg,
      border: `1px solid ${colors.br}`, fontSize: '11px',
      fontFamily: fonts.ui, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
