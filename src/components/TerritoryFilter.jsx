import React from 'react';
import { T, fonts, TERRITORIES } from '../data/theme.js';

export default function TerritoryFilter({ selectedRegions, onChange }) {
  const territories = Object.values(TERRITORIES);

  const toggle = (code) => {
    if (selectedRegions.includes(code)) {
      onChange(selectedRegions.filter(r => r !== code));
    } else {
      onChange([...selectedRegions, code]);
    }
  };

  const allSelected = selectedRegions.length === territories.length;

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* All toggle */}
      <div
        onClick={() => onChange(allSelected ? [] : territories.map(t => t.code))}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          background: allSelected ? T.surface : 'transparent',
          border: `1px solid ${T.border}`,
          color: allSelected ? T.text : T.muted,
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          fontFamily: fonts.ui,
        }}
      >
        All
      </div>

      {territories.map(t => {
        const isSelected = selectedRegions.includes(t.code);
        return (
          <div
            key={t.code}
            onClick={() => toggle(t.code)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: isSelected ? t.color : 'transparent',
              border: `1px solid ${isSelected ? t.color : T.border}`,
              color: isSelected ? T.bg : T.muted,
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: fonts.ui,
              transition: 'all 0.15s',
            }}
          >
            {t.code}
          </div>
        );
      })}
    </div>
  );
}
