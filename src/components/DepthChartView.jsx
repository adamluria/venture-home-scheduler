import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { getDepthChart, getRepSourceBreakdown, SIT_RATE_BY_SOURCE } from '../data/repPerformance.js';

/**
 * Depth Chart — ranks reps by performance.
 *
 * Two modes:
 *   - "overall"     : all reps ranked by assigned→close %
 *   - "by source"   : matrix of reps × lead sources showing close %
 *
 * Filters: territory (inherits from parent), metric, lead source.
 * Expanding a rep reveals their per-lead-source breakdown.
 */

const METRICS = {
  assignedToClose: { label: 'Close % (Assigned → Closed)', suffix: '%', desc: 'Headline conversion: what % of assigned appts close' },
  closeRate:       { label: 'Close Rate (Sits → Closed)',  suffix: '%', desc: 'Of the appointments that sat, how many closed' },
  sitRate:         { label: 'Sit Rate (Assigned → Sat)',    suffix: '%', desc: 'How often assigned appts actually sit' },
  closeCount:      { label: 'Closed Deals (90d)',           suffix: '',  desc: 'Total closed deals in the last 90 days' },
};

const LEAD_SOURCES = Object.keys(SIT_RATE_BY_SOURCE);

export default function DepthChartView({ selectedRegions }) {
  const [mode, setMode] = useState('overall');      // overall | source
  const [metric, setMetric] = useState('assignedToClose');
  const [leadSource, setLeadSource] = useState('paid');
  const [expandedRep, setExpandedRep] = useState(null);

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        marginBottom: '16px', alignItems: 'center',
      }}>
        {/* Mode toggle */}
        <div style={segmentGroup}>
          <SegBtn active={mode === 'overall'} onClick={() => setMode('overall')}>
            <Trophy size={12} /> Overall
          </SegBtn>
          <SegBtn active={mode === 'source'} onClick={() => setMode('source')}>
            <TrendingUp size={12} /> By Lead Source
          </SegBtn>
        </div>

        {mode === 'overall' && (
          <select value={metric} onChange={e => setMetric(e.target.value)} style={selectStyle}>
            {Object.entries(METRICS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        )}
      </div>

      {mode === 'overall'
        ? <OverallDepthChart
            selectedRegions={selectedRegions}
            metric={metric}
            expandedRep={expandedRep}
            setExpandedRep={setExpandedRep}
          />
        : <BySourceDepthChart
            selectedRegions={selectedRegions}
          />
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Overall ranked table
// ═══════════════════════════════════════════════════════════════════

function OverallDepthChart({ selectedRegions, metric, expandedRep, setExpandedRep }) {
  const chart = useMemo(() => {
    // Get depth chart per territory, then combine
    const byTerritory = selectedRegions.map(t => getDepthChart({ metric, territory: t }));
    // Flatten and dedupe (reps can serve multiple territories)
    const seen = new Set();
    const combined = [];
    for (const list of byTerritory) {
      for (const entry of list) {
        if (!seen.has(entry.rep.id)) {
          seen.add(entry.rep.id);
          combined.push(entry);
        }
      }
    }
    return combined.sort((a, b) => b.value - a.value);
  }, [selectedRegions.join(','), metric]);

  const maxValue = chart[0]?.value || 1;
  const spec = METRICS[metric];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Caption */}
      <div style={{
        fontSize: '11px', color: T.muted, marginBottom: '6px',
        fontFamily: fonts.ui,
      }}>
        {spec.desc}
      </div>

      {chart.map((entry, idx) => {
        const { rep, value, stats } = entry;
        const pct = (value / maxValue) * 100;
        const territoryColor = TERRITORIES[rep.team]?.color || T.muted;
        const isExpanded = expandedRep === rep.id;

        return (
          <div key={rep.id} style={{
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            overflow: 'hidden',
            background: T.surface,
          }}>
            <button
              onClick={() => setExpandedRep(isExpanded ? null : rep.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px minmax(180px, 1.4fr) 1fr 90px 18px',
                gap: '10px',
                padding: '10px 14px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: T.text,
                cursor: 'pointer',
                alignItems: 'center',
                textAlign: 'left',
                fontFamily: fonts.ui,
              }}
            >
              {/* Rank */}
              <div style={{
                fontFamily: fonts.data,
                fontSize: '15px',
                fontWeight: 700,
                color: idx === 0 ? T.accent : idx < 3 ? T.text : T.muted,
              }}>
                #{idx + 1}
              </div>

              {/* Rep */}
              <div style={{ borderLeft: `3px solid ${territoryColor}`, paddingLeft: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{rep.name}</div>
                <div style={{ fontSize: '10px', color: T.muted, display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <span>{rep.team}</span>
                  <span>·</span>
                  <span>{positionLabel(rep.position)}</span>
                  <span>·</span>
                  <span style={{ fontFamily: fonts.data }}>{stats.assigned} assigned 90d</span>
                </div>
              </div>

              {/* Bar */}
              <div style={{
                height: '20px',
                background: T.bg,
                borderRadius: '3px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: `${pct}%`,
                  background: idx === 0 ? T.accent : idx < 3 ? T.green : T.muted,
                  opacity: idx === 0 ? 1 : 0.55,
                  transition: 'width 0.3s',
                }} />
              </div>

              {/* Value */}
              <div style={{
                fontFamily: fonts.data,
                fontSize: '15px',
                fontWeight: 700,
                textAlign: 'right',
                color: idx === 0 ? T.accent : T.text,
              }}>
                {value}{METRICS[metric].suffix}
              </div>

              {/* Chevron */}
              <div style={{ color: T.muted, display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {isExpanded && <RepSourceBreakdown repId={rep.id} />}
          </div>
        );
      })}

      {chart.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontFamily: fonts.ui }}>
          No reps in the selected territories.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Per-lead-source matrix
// ═══════════════════════════════════════════════════════════════════

function BySourceDepthChart({ selectedRegions }) {
  const chartBySource = useMemo(() => {
    const result = {};
    for (const src of LEAD_SOURCES) {
      const per = selectedRegions.flatMap(t =>
        getDepthChart({ metric: 'closeRate', leadSource: src, territory: t })
      );
      const dedup = [];
      const seen = new Set();
      for (const e of per) {
        if (!seen.has(e.rep.id)) { seen.add(e.rep.id); dedup.push(e); }
      }
      dedup.sort((a, b) => b.value - a.value);
      result[src] = dedup;
    }
    return result;
  }, [selectedRegions.join(',')]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {LEAD_SOURCES.map(src => {
        const reps = chartBySource[src] || [];
        const top3 = reps.slice(0, 3);
        const baseline = SIT_RATE_BY_SOURCE[src];

        return (
          <div key={src} style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            padding: '14px 16px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: '10px',
              gap: '10px', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: T.accent }}>
                  {leadSourceLabel(src)}
                </div>
                <div style={{ fontSize: '10px', color: T.muted, fontFamily: fonts.data, marginTop: '2px' }}>
                  Baseline sit rate: {baseline}% · {reps.length} reps
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: T.muted }}>
                <span>Top 3 closers ↓</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {top3.map((e, i) => (
                <div key={e.rep.id} style={{
                  background: T.bg,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  border: `1px solid ${i === 0 ? T.accent + '60' : T.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: i === 0 ? T.accent : T.muted, marginRight: '6px', fontFamily: fonts.data }}>#{i + 1}</span>
                      {e.rep.name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px', fontWeight: 700, fontFamily: fonts.data,
                    color: i === 0 ? T.accent : T.text, marginTop: '4px',
                  }}>
                    {e.value}%
                  </div>
                  <div style={{ fontSize: '10px', color: T.muted, marginTop: '2px', fontFamily: fonts.data }}>
                    {e.stats.closeCount} closes · {e.stats.sits} sits
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsed long tail */}
            {reps.length > 3 && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{
                  cursor: 'pointer', fontSize: '11px', color: T.muted,
                  fontFamily: fonts.ui, listStyle: 'none',
                }}>
                  Show all {reps.length} reps ranked →
                </summary>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {reps.slice(3).map((e, i) => (
                    <div key={e.rep.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 60px 80px',
                      gap: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      color: T.muted,
                      background: T.bg,
                      borderRadius: '3px',
                      fontFamily: fonts.ui,
                    }}>
                      <span style={{ fontFamily: fonts.data }}>#{i + 4}</span>
                      <span style={{ color: T.text }}>{e.rep.name}</span>
                      <span style={{ fontFamily: fonts.data, textAlign: 'right' }}>{e.value}%</span>
                      <span style={{ fontFamily: fonts.data, textAlign: 'right' }}>{e.stats.closeCount} closes</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Rep expand → per-lead-source detail
// ═══════════════════════════════════════════════════════════════════

function RepSourceBreakdown({ repId }) {
  const breakdown = useMemo(() => getRepSourceBreakdown(repId), [repId]);

  return (
    <div style={{
      background: T.bg,
      borderTop: `1px solid ${T.border}`,
      padding: '12px 16px',
    }}>
      <div style={{ fontSize: '10px', color: T.muted, letterSpacing: '0.5px',
                    textTransform: 'uppercase', fontFamily: fonts.ui, marginBottom: '8px' }}>
        Performance by Lead Source (last 90d)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
        {breakdown.map(b => (
          <div key={b.leadSource} style={{
            background: T.surface,
            borderRadius: '5px',
            padding: '8px 10px',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {leadSourceLabel(b.leadSource)}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: fonts.data, color: T.text, marginTop: '2px' }}>
              {b.closeRate}% <span style={{ fontSize: '9px', color: T.muted, fontWeight: 400 }}>close</span>
            </div>
            <div style={{ fontSize: '10px', color: T.muted, fontFamily: fonts.data, marginTop: '2px' }}>
              {b.closeCount} closes · {b.sits} sits · {b.assigned} assigned
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function positionLabel(pos) {
  return ({
    sr_solar_consultant: 'Sr. SC',
    solar_consultant: 'SC',
    regional_sales_manager: 'RSM',
    design_expert: 'Design Expert',
  })[pos] || pos;
}

function leadSourceLabel(src) {
  return ({
    paid: 'Paid',
    partner: 'Partner',
    self_gen: 'Self Gen',
    get_the_referral: 'Get the Referral',
    inbound: 'Inbound',
    retail: 'Retail',
    event: 'Event',
  })[src] || src;
}

const segmentGroup = {
  display: 'flex',
  background: T.bg,
  borderRadius: '6px',
  border: `1px solid ${T.border}`,
  overflow: 'hidden',
};

function SegBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        border: 'none',
        background: active ? T.accent : 'transparent',
        color: active ? T.bg : T.muted,
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: fonts.ui,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
      }}
    >
      {children}
    </button>
  );
}

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  background: T.bg,
  border: `1px solid ${T.border}`,
  color: T.text,
  fontSize: '12px',
  fontFamily: fonts.ui,
  outline: 'none',
};
