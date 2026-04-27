import { useState, useRef, useEffect } from 'react';
import { T, fonts, APPOINTMENT_STATUSES, TERRITORIES, APPOINTMENT_TYPES } from '../data/theme.js';
import { mockAppointments, getConsultantName } from '../data/mockData.js';
import useIsMobile from '../hooks/useIsMobile.js';

export default function SearchBar({ onSelectAppointment, onClose }) {
  const isMobile = useIsMobile();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Normalize search text for matching
  const normalizedSearch = searchText.toLowerCase().trim();

  // Filter appointments
  const filteredResults = mockAppointments
    .filter(apt => {
      if (apt.isPlaceholder) return false;

      // Text search
      const searchLower = normalizedSearch.toLowerCase();
      const matches =
        apt.customer.toLowerCase().includes(searchLower) ||
        apt.address.toLowerCase().includes(searchLower) ||
        apt.zipCode.includes(searchLower) ||
        apt.id.toLowerCase().includes(searchLower) ||
        getConsultantName(apt.consultant)?.toLowerCase().includes(searchLower);
      if (!matches) return false;

      // Status filter
      if (statusFilter && apt.status !== statusFilter) return false;

      // Territory filter
      if (territoryFilter && apt.territory !== territoryFilter) return false;

      // Date range filter
      if (dateFromFilter && apt.date < dateFromFilter) return false;
      if (dateToFilter && apt.date > dateToFilter) return false;

      // Lead source filter
      if (leadSourceFilter && apt.leadSource !== leadSourceFilter) return false;

      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter' && filteredResults.length > 0) {
      e.preventDefault();
      const selected = filteredResults[selectedResultIndex];
      onSelectAppointment(selected);
      onClose();
    }
  };

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && selectedResultIndex >= 0 && filteredResults.length > 0) {
      const resultItems = resultsRef.current.querySelectorAll('[data-result-index]');
      if (resultItems[selectedResultIndex]) {
        resultItems[selectedResultIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedResultIndex, filteredResults.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getTerritoryColor = (territory) => TERRITORIES[territory]?.color || '#ccc';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: T.surface,
          borderRadius: '8px',
          border: `1px solid ${T.border}`,
          maxWidth: '600px',
          width: '100%',
          maxHeight: isMobile ? '90vh' : '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${T.border}` }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by customer name, address, zip, rep name, or appointment ID..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setSelectedResultIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              fontFamily: fonts.ui,
              backgroundColor: T.bg,
              color: T.text,
              border: `1px solid ${T.border}`,
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '12px',
            }}
          />

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              <option value="">All statuses</option>
              {Object.entries(APPOINTMENT_STATUSES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name}
                </option>
              ))}
            </select>

            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              <option value="">All territories</option>
              {Object.entries(TERRITORIES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
              }}
              placeholder="From"
            />

            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
              }}
              placeholder="To"
            />

            <select
              value={leadSourceFilter}
              onChange={(e) => setLeadSourceFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
                gridColumn: '1 / -1',
              }}
            >
              <option value="">All lead sources</option>
              <option value="paid">Paid</option>
              <option value="self_gen">Self Gen</option>
              <option value="get_the_referral">Get The Referral</option>
            </select>
          </div>
        </div>

        {/* Match count */}
        <div style={{ padding: '8px 16px', fontSize: '12px', color: T.muted, fontFamily: fonts.data }}>
          {filteredResults.length} match{filteredResults.length !== 1 ? 'es' : ''}
        </div>

        {/* Results list */}
        <div
          ref={resultsRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {filteredResults.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: T.muted }}>
              No appointments found
            </div>
          ) : (
            filteredResults.map((apt, idx) => (
              <div
                key={apt.id}
                data-result-index={idx}
                onClick={() => {
                  onSelectAppointment(apt);
                  onClose();
                }}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  backgroundColor: idx === selectedResultIndex ? T.surfaceHover : 'transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: T.text, fontFamily: fonts.ui }}>
                      {apt.customer}
                    </div>
                    <div style={{ fontSize: '12px', color: T.muted, marginTop: '4px', fontFamily: fonts.ui }}>
                      {apt.address} • {apt.zipCode}
                    </div>
                    <div style={{ fontSize: '11px', color: T.dim, marginTop: '4px', fontFamily: fonts.data }}>
                      {apt.date} @ {apt.time}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    {/* Rep name */}
                    <div style={{ color: T.text, fontFamily: fonts.ui, marginBottom: '4px' }}>
                      {getConsultantName(apt.consultant) || 'Unassigned'}
                    </div>

                    {/* Territory dot */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getTerritoryColor(apt.territory),
                        }}
                      />

                      {/* Status pill */}
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          backgroundColor: APPOINTMENT_STATUSES[apt.status]?.color || T.muted,
                          opacity: 0.2,
                          color: APPOINTMENT_STATUSES[apt.status]?.color || T.muted,
                          fontWeight: '500',
                        }}
                      >
                        {APPOINTMENT_STATUSES[apt.status]?.name || apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
