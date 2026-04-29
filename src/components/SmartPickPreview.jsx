// SmartPickPreview.jsx
//
// Renders inside NewAppointmentModal directly under the "Assign Consultant"
// dropdown when the user has selected "Auto-assign (recommended)".
//
// Purpose: TRANSPARENCY. Show the rep that auto-assign would pick BEFORE the
// user clicks Schedule, with a per-factor breakdown so management can audit
// that the engine is actually applying the agreed scoring rules.
//
// Factors visible (matches the formula in slotSuggestionEngine.scoreRepSlot):
//   • P(close)              — final composite probability (sit × close-given-sit)
//   • Close rate            — pCloseGivenSit (rep's close skill, factoring time-of-day + lead-source synergy)
//   • Sit rate              — pSit (probability the appointment actually happens)
//   • Cancellation history  — Chris's factor #1 (penalty for high-cancel reps)
//   • Today's workload      — Chris's factor #2 (penalty for already-loaded reps)
//   • Drive proximity       — geo modifier
//
// Live-updates as the user changes date/time/territory/leadSource.

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import { rankRepsForSlot } from '../data/slotSuggestionEngine.js';
import { isRealDataAvailable } from '../data/sfPerformance.js';

const PCT = (v) => (v == null ? '—' : `${v}%`);
const NUM = (v) => (v == null ? '—' : v.toString());

export default function SmartPickPreview({ form }) {
  const [ranked, setRanked] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Re-rank whenever any input the engine cares about changes
  useEffect(() => {
    if (!form?.territory || !form?.date || !form?.time) {
      setRanked(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    rankRepsForSlot({
      date:        form.date,
      slot:        form.time,
      territory:   form.territory,
      leadSource:  form.leadSource,
      customerZip: form.zipCode,
      isVirtual:   !!form.isVirtual,
      topN:        5,
    })
      .then(result => { if (!cancelled) setRanked(result || []); })
      .catch(() => { if (!cancelled) setRanked([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [form?.territory, form?.date, form?.time, form?.leadSource, form?.zipCode, form?.isVirtual]);

  const top = ranked && ranked.length > 0 ? ranked[0] : null;

  if (!form?.territory) {
    return (
      <PreviewShell>
        <Subtle>Pick a territory to preview the smart-assign recommendation.</Subtle>
      </PreviewShell>
    );
  }

  if (loading && !ranked) {
    return <PreviewShell><Subtle>Calculating ranking...</Subtle></PreviewShell>;
  }

  if (!top) {
    return (
      <PreviewShell tone="warning">
        <RowAcross>
          <AlertCircle size={14} style={{ color: '#F59E0B' }} />
          <strong style={{ color: T.text, fontSize: 13 }}>No eligible reps available</strong>
        </RowAcross>
        <Subtle>This date/time/territory combination has no rep available. The appointment will save as Unassigned.</Subtle>
      </PreviewShell>
    );
  }

  const b = top.breakdown || {};

  return (
    <PreviewShell tone="success">
      <RowAcross>
        <CheckCircle2 size={14} style={{ color: '#10B981' }} />
        <strong style={{ color: T.text, fontSize: 13 }}>
          Smart pick: {top.repName}
        </strong>
        <Pill>P(close): {PCT(b.pClose)}</Pill>
        <DataSourcePill />
        <button
          onClick={() => setExpanded(v => !v)}
          style={chevronBtn}
          title={expanded ? 'Hide breakdown' : 'Show factor breakdown'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </RowAcross>

      {/* Always show the headline factors as a one-liner */}
      <Subtle>
        Close-when-sat {PCT(b.pCloseGivenSit)} · Sit rate {PCT(b.pSit)} ·
        Cancel history {PCT(b.cancelRate)} · Today's load {NUM(b.todayAppts)}
      </Subtle>

      {/* Expanded: full breakdown matching Chris's formula columns */}
      {expanded && (
        <div style={breakdownGrid}>
          <Factor label="P(close) — composite"   value={PCT(b.pClose)}            note="Final score: P(sit) × P(close|sit) × cancel × workload" />
          <Factor label="P(close | sit)"          value={PCT(b.pCloseGivenSit)}    note="Rep's close skill at this time slot for this lead source" />
          <Factor label="P(sit)"                  value={PCT(b.pSit)}              note={`Lead-source baseline ${PCT(b.baseSit)} × time-of-day × proximity`} />
          <Factor label="Cancellation rate"       value={PCT(b.cancelRate)}        note={`Chris's factor — penalty multiplier ${b.cancelMultiplier}×`} />
          <Factor label="Today's appts"           value={NUM(b.todayAppts)}        note={`Chris's factor — workload multiplier ${b.workloadMultiplier}×`} />
          <Factor label="Drive proximity"         value={b.proxMod}                note="1.0 = same area, <0.85 = far" />
          {top.reasons && top.reasons.length > 0 && (
            <div style={{ ...factorCell, gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <span style={factorLabel}>Why this rep</span>
              <span style={{ color: T.text, fontSize: 12 }}>{top.reasons.join(' · ')}</span>
            </div>
          )}

          {/* Alternatives */}
          {ranked.length > 1 && (
            <div style={{ ...factorCell, gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <span style={factorLabel}>Alternatives (top 4)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {ranked.slice(1, 5).map(r => (
                  <div key={r.repId} style={{ fontSize: 12, color: T.muted, fontFamily: fonts.mono }}>
                    {r.repName} — P(close) {PCT(r.breakdown?.pClose)} · today {NUM(r.breakdown?.todayAppts)} · cancel {PCT(r.breakdown?.cancelRate)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PreviewShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function PreviewShell({ tone = 'info', children }) {
  const accent = tone === 'success' ? '#10B981'
               : tone === 'warning' ? '#F59E0B'
               : T.accent;
  return (
    <div style={{
      marginTop: 6, padding: '10px 12px',
      background: T.surface, border: `1px solid ${accent}40`,
      borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: fonts.ui,
    }}>
      {children}
    </div>
  );
}

function RowAcross({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{children}</div>;
}

function Subtle({ children }) {
  return <div style={{ color: T.muted, fontSize: 12, fontFamily: fonts.ui }}>{children}</div>;
}

function Pill({ children }) {
  return (
    <span style={{
      fontFamily: fonts.mono, fontSize: 11, color: T.accent,
      background: T.accentDim, padding: '2px 8px', borderRadius: 10,
    }}>{children}</span>
  );
}

function DataSourcePill() {
  // Honest indicator of whether ranking is using real SF performance data
  // or the synthetic fallback. Flips to "Live" within ~1s of auth being
  // confirmed (sfPerformance prefetch completes from SfdcAuthBanner).
  const live = isRealDataAvailable();
  const color = live ? '#10B981' : T.muted;
  const label = live ? 'Live SF data' : 'Synthetic';
  return (
    <span style={{
      fontFamily: fonts.ui, fontSize: 10, fontWeight: 600, color,
      border: `1px solid ${color}`, padding: '1px 6px', borderRadius: 8,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }} title={live
      ? 'Cancel and close rates are from real Appointment__c history in your SF org.'
      : 'Real SF data not yet loaded — using deterministic synthetic estimates.'
    }>{label}</span>
  );
}

function Factor({ label, value, note }) {
  return (
    <div style={factorCell}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={factorLabel}>{label}</span>
        <span style={factorValue}>{value}</span>
      </div>
      {note && <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

const breakdownGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px 14px',
  marginTop: 4,
};

const factorCell = {
  display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0',
};

const factorLabel = {
  color: T.muted, fontSize: 11, fontFamily: fonts.ui, textTransform: 'uppercase', letterSpacing: 0.5,
};

const factorValue = {
  color: T.text, fontSize: 13, fontFamily: fonts.mono, fontWeight: 600,
};

const chevronBtn = {
  marginLeft: 'auto', background: 'transparent', border: 'none',
  color: T.muted, cursor: 'pointer', padding: 2,
  display: 'flex', alignItems: 'center',
};
