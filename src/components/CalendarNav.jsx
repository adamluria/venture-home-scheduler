import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import useIsMobile from '../hooks/useIsMobile.js';

export default function CalendarNav({ viewMode, onViewModeChange, onPrev, onNext, onToday, label }) {
  const isMobile = useIsMobile();

  const viewOptions = [
    { key: 'day',   label: 'Day', mobileLabel: 'Day' },
    { key: 'week',  label: 'Week', mobileLabel: 'Week' },
    { key: 'month', label: 'Month', mobileLabel: 'Month' },
    { key: 'slots', label: 'Open Slots', mobileLabel: 'Slots' },
    { key: 'rep',   label: 'By Rep', mobileLabel: 'Rep' },
    { key: 'depth', label: 'Depth Chart', mobileLabel: 'Depth' },
    { key: 'swimlane', label: 'Pipeline', mobileLabel: 'Pipeline' },
    { key: 'state', label: 'By State', mobileLabel: 'State' },
    { key: 'team',  label: 'By Team', mobileLabel: 'Team' },
    { key: 'analytics', label: 'Analytics', mobileLabel: 'Stats' },
  ];

  return (
    <>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Left: date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onToday}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            padding: isMobile ? '5px 10px' : '6px 14px',
            color: T.text,
            fontSize: isMobile ? '12px' : '13px',
            cursor: 'pointer',
            fontFamily: fonts.ui,
          }}
        >
          Today
        </button>

        <button
          onClick={onPrev}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            padding: isMobile ? '5px 6px' : '6px 8px',
            color: T.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={isMobile ? 14 : 16} />
        </button>

        <button
          onClick={onNext}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            padding: isMobile ? '5px 6px' : '6px 8px',
            color: T.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={isMobile ? 14 : 16} />
        </button>

        <span style={{
          fontSize: isMobile ? '14px' : '16px',
          fontWeight: '500',
          color: T.text,
          fontFamily: fonts.ui,
          marginLeft: '4px',
        }}>
          {label}
        </span>
      </div>

      {/* Right: view mode toggle */}
      <div style={{
        display: 'flex',
        background: T.bg,
        borderRadius: '6px',
        border: `1px solid ${T.border}`,
        overflow: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
        scrollbarWidth: isMobile ? 'none' : 'auto',
        flexWrap: isMobile ? 'nowrap' : 'nowrap',
      }}
      className={isMobile ? 'hide-scrollbar' : ''}
      >
        {viewOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => onViewModeChange(opt.key)}
            style={{
              padding: isMobile ? '6px 10px' : '6px 16px',
              border: 'none',
              background: viewMode === opt.key ? T.accent : 'transparent',
              color: viewMode === opt.key ? T.bg : T.muted,
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: fonts.ui,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isMobile ? opt.mobileLabel : opt.label}
          </button>
        ))}
      </div>
    </div>

    <style>{`
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `}</style>
    </>
  );
}
