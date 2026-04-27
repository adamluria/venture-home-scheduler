import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, Flame, Star, Award, Zap, Monitor, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { consultants, mockAppointments, getConsultantName } from '../data/mockData.js';
import { getRepOverallStats, getRepSourceBreakdown } from '../data/repPerformance.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Rep Leaderboard with Gamification
 *
 * Features:
 * - Daily / Weekly / Monthly / All-time rankings
 * - Multiple metrics: closes, revenue, sit rate, close rate
 * - Badges: streak, personal best, top territory
 * - TV Dashboard mode for office display
 * - Animated rank changes
 */

const PERIODS = {
  today: { label: 'Today', days: 1 },
  week: { label: 'This Week', days: 7 },
  month: { label: 'This Month', days: 30 },
  quarter: { label: 'Quarter', days: 90 },
};

const METRICS = {
  closes: { label: 'Closed Deals', icon: Trophy, suffix: '', desc: 'Total closed appointments' },
  revenue: { label: 'Revenue', icon: TrendingUp, suffix: '', desc: 'Estimated revenue closed', format: v => `$${(v / 1000).toFixed(0)}k` },
  sitRate: { label: 'Sit Rate %', icon: Star, suffix: '%', desc: 'Percentage of appointments that sat' },
  closeRate: { label: 'Close Rate %', icon: Zap, suffix: '%', desc: 'Percentage of sits that closed' },
  appts: { label: 'Appointments', icon: Award, suffix: '', desc: 'Total appointments assigned' },
};

// ─── Badge definitions ──────────────────────────────────────────────

const BADGES = {
  hotStreak:    { icon: '🔥', label: 'Hot Streak',    desc: '3+ closes in a row' },
  perfectWeek:  { icon: '⭐', label: 'Perfect Week',  desc: '100% sit rate this week' },
  topCloser:    { icon: '🏆', label: '#1 Closer',     desc: 'Top close rate overall' },
  volumeKing:   { icon: '👑', label: 'Volume King',   desc: 'Most appointments this period' },
  comeback:     { icon: '📈', label: 'Comeback',      desc: 'Moved up 3+ ranks' },
  rookie:       { icon: '🌟', label: 'Rising Star',   desc: 'New rep in top 5' },
  consistent:   { icon: '🎯', label: 'Consistent',    desc: 'Above avg every week this month' },
};

export default function LeaderboardView({ selectedRegions = [] }) {
  const isMobile = useIsMobile();
  const [board, setBoard] = useState('reps'); // 'reps' | 'setters'
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('closes');
  const [tvMode, setTvMode] = useState(false);
  const [expandedRep, setExpandedRep] = useState(null);

  // Calculate rankings
  const rankings = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PERIODS[period].days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const fieldReps = consultants.filter(c => !c.isCloserOnly);
    const filteredReps = selectedRegions.length > 0
      ? fieldReps.filter(r => r.territories.some(t => selectedRegions.includes(t)))
      : fieldReps;

    return filteredReps.map(rep => {
      const repAppts = mockAppointments.filter(a =>
        a.consultant === rep.id && a.date >= cutoffStr && !a.isPlaceholder
      );

      const total = repAppts.length;
      const sits = repAppts.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
      const closed = repAppts.filter(a => a.status === 'completed').length;
      const noShows = repAppts.filter(a => a.status === 'no-show').length;

      // Mock revenue from overall stats
      const stats = getRepOverallStats(rep.id);
      const estimatedRevenue = closed * (15000 + (hashCode(rep.id) % 10000));

      const sitRate = total > 0 ? ((sits / total) * 100) : 0;
      const closeRate = sits > 0 ? ((closed / sits) * 100) : 0;

      // Determine badges
      const badges = [];
      if (closed >= 3) badges.push('hotStreak');
      if (sitRate >= 99 && total >= 3) badges.push('perfectWeek');
      if (stats.closeRate >= 0.3 && total >= 5) badges.push('consistent');

      // Mock previous rank for animation
      const prevRank = hashCode(rep.id + period) % Math.max(filteredReps.length, 1);

      return {
        rep,
        total,
        sits,
        closed,
        noShows,
        revenue: estimatedRevenue,
        sitRate: parseFloat(sitRate.toFixed(1)),
        closeRate: parseFloat(closeRate.toFixed(1)),
        appts: total,
        badges,
        prevRank,
      };
    })
    .sort((a, b) => {
      const key = metric;
      return (b[key] || 0) - (a[key] || 0);
    })
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      rankChange: entry.prevRank - idx, // positive = moved up
    }));
  }, [period, metric, selectedRegions]);

  // Setter leaderboard — inside sales / appointment setters
  const setterRankings = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PERIODS[period].days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Group appointments by who booked/set them (using leadSource + territory as proxy for setter)
    // In production this would use CreatedById from Salesforce
    const setterMap = {};
    mockAppointments.forEach(apt => {
      if (apt.date < cutoffStr || apt.isPlaceholder) return;
      // Use a mock setter derived from lead source + territory
      const setterId = `setter-${(apt.leadSource || 'paid')}-${(apt.territory || 'CT')}`;
      const setterName = MOCK_SETTERS[setterId] || deriveSetterName(apt.leadSource, apt.territory);
      if (!setterMap[setterId]) {
        setterMap[setterId] = { id: setterId, name: setterName, source: apt.leadSource, territory: apt.territory, appts: [], };
      }
      setterMap[setterId].appts.push(apt);
    });

    return Object.values(setterMap)
      .map(setter => {
        const total = setter.appts.length;
        const sits = setter.appts.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
        const closed = setter.appts.filter(a => a.status === 'completed').length;
        const noShows = setter.appts.filter(a => a.status === 'no-show').length;
        const sitRate = total > 0 ? parseFloat(((sits / total) * 100).toFixed(1)) : 0;
        const closeRate = sits > 0 ? parseFloat(((closed / sits) * 100).toFixed(1)) : 0;
        const setToClose = total > 0 ? parseFloat(((closed / total) * 100).toFixed(1)) : 0;
        const revenue = closed * (15000 + (hashCode(setter.id) % 10000));

        const badges = [];
        if (total >= 10) badges.push('volumeKing');
        if (sitRate >= 80 && total >= 5) badges.push('consistent');
        if (closed >= 3) badges.push('hotStreak');

        return {
          rep: { id: setter.id, name: setter.name, team: setter.source || '—', territories: [setter.territory] },
          total, sits, closed, noShows, revenue, sitRate, closeRate, setToClose,
          appts: total, closes: closed, badges,
          prevRank: hashCode(setter.id + period) % 10,
        };
      })
      .sort((a, b) => {
        const key = metric === 'closeRate' ? 'setToClose' : metric;
        return (b[key] || 0) - (a[key] || 0);
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        rankChange: entry.prevRank - idx,
      }));
  }, [period, metric]);

  const activeRankings = board === 'setters' ? setterRankings : rankings;

  // Assign top badges
  if (activeRankings.length > 0) {
    activeRankings[0].badges = [...new Set([...activeRankings[0].badges, 'topCloser'])];
    const volumeMax = activeRankings.reduce((max, r) => r.total > max.total ? r : max, activeRankings[0]);
    volumeMax.badges = [...new Set([...volumeMax.badges, 'volumeKing'])];
    activeRankings.forEach(r => {
      if (r.rankChange >= 3) r.badges = [...new Set([...r.badges, 'comeback'])];
    });
  }

  // ─── TV Dashboard Mode ────────────────────────────────────────────
  if (tvMode) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: T.bg, fontFamily: fonts.ui, color: T.text,
        display: 'flex', flexDirection: 'column', padding: '40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Trophy size={36} color={T.accent} />
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: T.accent }}>
                Leaderboard
              </h1>
              <p style={{ margin: 0, color: T.muted, fontSize: '16px' }}>
                {PERIODS[period].label} · {METRICS[metric].label}
              </p>
            </div>
          </div>
          <button onClick={() => setTvMode(false)} style={{
            padding: '10px 20px', borderRadius: '6px', background: T.surface,
            border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer',
            fontSize: '14px', fontFamily: fonts.ui,
          }}>
            Exit TV Mode
          </button>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', overflow: 'auto' }}>
          {activeRankings.slice(0, 12).map((entry, idx) => (
            <TvCard key={entry.rep.id} entry={entry} metric={metric} isTop3={idx < 3} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Normal View ──────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: fonts.ui }}>
      {/* Controls */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {/* Board toggle: Reps vs Setters */}
          <div style={segmentGroup}>
            <SegBtn active={board === 'reps'} onClick={() => setBoard('reps')}>
              <Trophy size={12} /> Sales Reps
            </SegBtn>
            <SegBtn active={board === 'setters'} onClick={() => setBoard('setters')}>
              <Flame size={12} /> Setters
            </SegBtn>
          </div>

          {/* Period selector */}
          <div style={segmentGroup}>
            {Object.entries(PERIODS).map(([key, val]) => (
              <SegBtn key={key} active={period === key} onClick={() => setPeriod(key)}>
                {val.label}
              </SegBtn>
            ))}
          </div>

          {/* Metric selector */}
          <select value={metric} onChange={e => setMetric(e.target.value)} style={{
            padding: '6px 10px', borderRadius: '6px', background: T.surface,
            border: `1px solid ${T.border}`, color: T.text, fontSize: '13px', fontFamily: fonts.ui,
          }}>
            {Object.entries(METRICS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <button onClick={() => setTvMode(true)} style={{
          padding: '8px 14px', borderRadius: '6px', background: T.surface,
          border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: fonts.ui,
        }}>
          <Monitor size={14} /> TV Mode
        </button>
      </div>

      {/* Podium — top 3 */}
      {!isMobile && activeRankings.length >= 3 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
          marginBottom: '24px',
        }}>
          {[activeRankings[1], activeRankings[0], activeRankings[2]].map((entry, podiumIdx) => {
            const place = [2, 1, 3][podiumIdx];
            const heights = { 1: '160px', 2: '130px', 3: '110px' };
            const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
            return (
              <div key={entry.rep.id} style={{
                background: T.surface, borderRadius: '10px', border: `1px solid ${T.border}`,
                padding: '20px', textAlign: 'center',
                minHeight: heights[place],
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                ...(place === 1 ? { borderColor: T.accent, boxShadow: `0 0 20px ${T.accent}20` } : {}),
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{medals[place]}</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{entry.rep.name}</div>
                <div style={{ fontSize: '12px', color: T.muted, marginBottom: '8px' }}>{entry.rep.team}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: fonts.data, color: T.accent }}>
                  {formatMetricValue(entry, metric)}
                </div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                  {entry.badges.map(b => (
                    <span key={b} title={BADGES[b]?.desc} style={{
                      fontSize: '14px', cursor: 'default',
                    }}>
                      {BADGES[b]?.icon}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full rankings table */}
      <div style={{
        background: T.surface, borderRadius: '8px', border: `1px solid ${T.border}`,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ ...thStyle, width: '50px' }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Rep</th>
              {!isMobile && <th style={thStyle}>Team</th>}
              <th style={thStyle}>Appts</th>
              <th style={thStyle}>Sits</th>
              <th style={thStyle}>Closes</th>
              <th style={thStyle}>Sit %</th>
              <th style={thStyle}>Close %</th>
              {!isMobile && <th style={thStyle}>Badges</th>}
              <th style={{ ...thStyle, width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {activeRankings.map((entry) => (
              <React.Fragment key={entry.rep.id}>
                <tr
                  onClick={() => setExpandedRep(expandedRep === entry.rep.id ? null : entry.rep.id)}
                  style={{
                    borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                    background: entry.rank <= 3 ? `${T.accent}08` : 'transparent',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: '700', color: entry.rank <= 3 ? T.accent : T.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {entry.rank}
                      <RankChange change={entry.rankChange} />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: '500' }}>
                    {entry.rep.name}
                  </td>
                  {!isMobile && <td style={{ ...tdStyle, color: T.muted, fontSize: '12px' }}>{entry.rep.team}</td>}
                  <td style={{ ...tdStyle, fontFamily: fonts.data }}>{entry.total}</td>
                  <td style={{ ...tdStyle, fontFamily: fonts.data }}>{entry.sits}</td>
                  <td style={{ ...tdStyle, fontFamily: fonts.data, fontWeight: '600', color: T.accent }}>{entry.closed}</td>
                  <td style={{ ...tdStyle, fontFamily: fonts.data }}>{entry.sitRate}%</td>
                  <td style={{ ...tdStyle, fontFamily: fonts.data, fontWeight: '500', color: entry.closeRate >= 30 ? T.green : entry.closeRate >= 15 ? T.accent : T.text }}>
                    {entry.closeRate}%
                  </td>
                  {!isMobile && (
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {entry.badges.slice(0, 3).map(b => (
                          <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '13px' }}>
                            {BADGES[b]?.icon}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                  <td style={tdStyle}>
                    <span style={{ fontSize: '11px', color: T.dim }}>▸</span>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedRep === entry.rep.id && (
                  <tr>
                    <td colSpan={isMobile ? 7 : 10} style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                      <RepDetailPanel entry={entry} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function RankChange({ change }) {
  if (change > 0) return <ArrowUp size={10} color={T.green} />;
  if (change < 0) return <ArrowDown size={10} color={T.red} />;
  return <Minus size={10} color={T.dim} />;
}

function RepDetailPanel({ entry }) {
  const breakdown = getRepSourceBreakdown(entry.rep.id);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      {/* Stats card */}
      <div style={{ background: T.surface, borderRadius: '6px', padding: '12px', border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: '12px', color: T.muted, fontWeight: '600', marginBottom: '8px' }}>Performance Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
          <div>Appointments: <span style={{ fontFamily: fonts.data, color: T.text }}>{entry.total}</span></div>
          <div>Sits: <span style={{ fontFamily: fonts.data, color: T.text }}>{entry.sits}</span></div>
          <div>Closes: <span style={{ fontFamily: fonts.data, color: T.accent }}>{entry.closed}</span></div>
          <div>No-Shows: <span style={{ fontFamily: fonts.data, color: T.red }}>{entry.noShows}</span></div>
          <div>Sit Rate: <span style={{ fontFamily: fonts.data, color: T.text }}>{entry.sitRate}%</span></div>
          <div>Close Rate: <span style={{ fontFamily: fonts.data, color: T.green }}>{entry.closeRate}%</span></div>
        </div>
      </div>

      {/* By lead source */}
      <div style={{ background: T.surface, borderRadius: '6px', padding: '12px', border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: '12px', color: T.muted, fontWeight: '600', marginBottom: '8px' }}>By Lead Source</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          {breakdown.slice(0, 5).map(src => (
            <div key={src.leadSource} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize', color: T.muted }}>{src.leadSource.replace(/_/g, ' ')}</span>
              <span style={{ fontFamily: fonts.data }}>
                {src.closeCount || 0} closes · {((src.closeRate || 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div style={{ background: T.surface, borderRadius: '6px', padding: '12px', border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: '12px', color: T.muted, fontWeight: '600', marginBottom: '8px' }}>Badges & Achievements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entry.badges.length > 0 ? entry.badges.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span style={{ fontSize: '16px' }}>{BADGES[b]?.icon}</span>
              <div>
                <div style={{ fontWeight: '500', color: T.text }}>{BADGES[b]?.label}</div>
                <div style={{ fontSize: '11px', color: T.dim }}>{BADGES[b]?.desc}</div>
              </div>
            </div>
          )) : (
            <div style={{ fontSize: '12px', color: T.dim }}>No badges yet this period</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TvCard({ entry, metric, isTop3 }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <div style={{
      background: T.surface, borderRadius: '12px',
      border: `1px solid ${isTop3 ? T.accent : T.border}`,
      padding: '24px', textAlign: 'center',
      boxShadow: isTop3 ? `0 0 30px ${T.accent}15` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: isTop3 ? T.accent : T.muted }}>
          {medals[entry.rank] || `#${entry.rank}`}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {entry.badges.slice(0, 3).map(b => (
            <span key={b} style={{ fontSize: '16px' }}>{BADGES[b]?.icon}</span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>{entry.rep.name}</div>
      <div style={{ fontSize: '13px', color: T.muted, marginBottom: '16px' }}>{entry.rep.team}</div>
      <div style={{ fontSize: '40px', fontWeight: '700', fontFamily: fonts.data, color: T.accent }}>
        {formatMetricValue(entry, metric)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px', fontSize: '12px', color: T.muted }}>
        <div>Sit {entry.sitRate}%</div>
        <div>Close {entry.closeRate}%</div>
        <div>{entry.total} appts</div>
      </div>
    </div>
  );
}

function formatMetricValue(entry, metric) {
  if (metric === 'revenue') return `$${(entry.revenue / 1000).toFixed(0)}k`;
  if (metric === 'sitRate') return `${entry.sitRate}%`;
  if (metric === 'closeRate') return `${entry.closeRate}%`;
  return entry[metric];
}

// ─── Mock setter names (in production, pulled from SFDC CreatedBy) ──

const MOCK_SETTERS = {};

function deriveSetterName(leadSource, territory) {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Drew', 'Skyler', 'Dakota', 'Reese', 'Jamie', 'Rowan', 'Sage'];
  const lastNames = ['Martinez', 'Chen', 'Williams', 'Patel', 'Kim', 'Davis', 'Garcia', 'Lee', 'Wilson', 'Moore', 'Brown', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];
  const h = hashCode(`${leadSource}-${territory}`);
  return `${firstNames[h % firstNames.length]} ${lastNames[(h >> 4) % lastNames.length]}`;
}

// ─── Styles ─────────────────────────────────────────────────────────

const segmentGroup = {
  display: 'flex', gap: '2px', background: T.bg,
  borderRadius: '6px', padding: '2px', border: `1px solid ${T.border}`,
};

function SegBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: '4px', border: 'none',
      background: active ? T.accent : 'transparent',
      color: active ? T.bg : T.muted,
      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
      fontFamily: fonts.ui, display: 'flex', alignItems: 'center', gap: '4px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

const thStyle = {
  padding: '10px 8px', fontSize: '11px', fontWeight: '600', color: T.muted,
  textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center',
};

const tdStyle = {
  padding: '10px 8px', textAlign: 'center',
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
