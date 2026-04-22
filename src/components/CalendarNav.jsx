import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { T, fonts } from '../data/theme.js';

export default function CalendarNav({ viewMode, onViewModeChange, onPrev, onNext, onToday, label }) {
  const viewOptions = [
    { key: 'day',   label: 'Day' },
    { key: 'week',  label: 'Week' },
    { key: 'slots', label: 'Open Slots' },
    { key: 'rep',   label: 'By Rep' },
    { key: 'depth', label: 'Depth Chart' },
  ];

  return (
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
            padding: '6px 14px',
            color: T.text,
            fontSize: '13px',
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
            padding: '6px 8px',
            color: T.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={onNext}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            padding: '6px 8px',
            color: T.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={16} />
        </button>

        <span style={{
          fontSize: '16px',
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
        overflow: 'hidden',
      }}>
        {viewOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => onViewModeChange(opt.key)}
            style={{
              padding: '6px 16px',
              border: 'none',
              background: viewMode === opt.key ? T.accent : 'transparent',
              color: viewMode === opt.key ? T.bg : T.muted,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: fonts.ui,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
