import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, MapPin, Clock, Loader2 } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import { suggestSlots } from '../data/slotSuggestionEngine.js';

/**
 * Shows the top-3 highest-likelihood-to-close (slot × rep) pairings
 * for the current customer context. Click a suggestion to auto-fill
 * the date/time/consultant fields in the parent form.
 *
 * Props:
 *   - territory, customerZip, customerCity, customerState, leadSource, isVirtual
 *   - onApply({ date, slot, repId })  — called when user picks a suggestion
 */
export default function SlotSuggestions({
  territory, customerZip, customerCity, customerState,
  leadSource = 'paid', isVirtual = false,
  onApply,
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!territory) { setResult(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    suggestSlots({
      territory, customerZip, customerCity, customerState,
      leadSource, isVirtual, days: 10, topN: 3,
    })
      .then(r => { if (alive) { setResult(r); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [territory, customerZip, customerCity, customerState, leadSource, isVirtual]);

  if (!territory) return null;

  return (
    <div style={{
      background: T.accentDim,
      border: `1px solid ${T.accent}40`,
      borderRadius: '8px',
      padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '10px',
      }}>
        <Sparkles size={14} color={T.accent} />
        <span style={{
          fontSize: '12px', fontWeight: '600',
          color: T.accent, fontFamily: fonts.ui,
          letterSpacing: '0.3px', textTransform: 'uppercase',
        }}>
          Highest-Likelihood-To-Close Slots
        </span>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.muted, fontSize: '12px' }}>
          <Loader2 size={14} className="spin" />
          Scanning next 10 days…
        </div>
      )}

      {error && (
        <div style={{ fontSize: '12px', color: T.red }}>{error}</div>
      )}

      {!loading && !error && result && result.top.length === 0 && (
        <div style={{ fontSize: '12px', color: T.muted }}>
          No open slots in the next 10 days for this territory.
        </div>
      )}

      {!loading && !error && result && result.top.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {result.top.map((entry, idx) => (
            <SuggestionRow key={`${entry.date}-${entry.slot}-${entry.repId}`}
              entry={entry} rank={idx + 1}
              onApply={() => onApply?.({ date: entry.date, slot: entry.slot, repId: entry.repId })}
            />
          ))}
          <div style={{
            marginTop: '4px', fontSize: '11px', color: T.dim,
            fontFamily: fonts.data,
          }}>
            Scored {result.totalOptions} options across {result.datesScanned} days
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ entry, rank, onApply }) {
  const { date, slot, repName, repTeam, breakdown, reasons } = entry;
  const d = new Date(date + 'T12:00:00');
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <button onClick={onApply} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '6px',
      background: rank === 1 ? T.accent : T.surface,
      color: rank === 1 ? T.bg : T.text,
      border: `1px solid ${rank === 1 ? T.accent : T.border}`,
      cursor: 'pointer', textAlign: 'left',
      fontFamily: fonts.ui, width: '100%',
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => {
        if (rank !== 1) e.currentTarget.style.background = T.surfaceHover;
      }}
      onMouseLeave={e => {
        if (rank !== 1) e.currentTarget.style.background = T.surface;
      }}
    >
      <div style={{
        width: '22px', height: '22px', borderRadius: '4px',
        background: rank === 1 ? T.bg : T.accentDim,
        color: rank === 1 ? T.accent : T.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: '700', fontFamily: fonts.data,
        flexShrink: 0,
      }}>
        #{rank}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: '8px',
          fontSize: '13px', fontWeight: '600',
        }}>
          <span style={{ fontFamily: fonts.data }}>{dayLabel}</span>
          <span style={{ fontFamily: fonts.data, opacity: 0.9 }}>· {slot}</span>
          <span style={{ opacity: 0.85 }}>· {repName}</span>
          <span style={{
            fontSize: '10px', opacity: 0.7,
            fontFamily: fonts.data, letterSpacing: '0.5px',
          }}>
            [{repTeam}]
          </span>
        </div>
        <div style={{
          marginTop: '3px', fontSize: '11px', opacity: 0.85,
          display: 'flex', flexWrap: 'wrap', gap: '6px',
        }}>
          {reasons.slice(0, 3).map((r, i) => (
            <span key={i} style={{
              padding: '1px 7px', borderRadius: '10px',
              background: rank === 1 ? 'rgba(0,0,0,0.15)' : T.accentDim,
              color: rank === 1 ? T.bg : T.accent,
              fontSize: '10px',
            }}>
              {r}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        textAlign: 'right', flexShrink: 0,
        fontFamily: fonts.data,
      }}>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>
          {breakdown?.pClose?.toFixed(1)}%
        </div>
        <div style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Close Prob
        </div>
      </div>
    </button>
  );
}
