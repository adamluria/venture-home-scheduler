import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, AlertCircle } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import { consultants, mockAppointments, getConsultantName } from '../data/mockData.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * BulkActions — Toolbar for bulk operations on selected appointments
 * Props: { selectedAppointments, onClearSelection, onBulkReassign, onBulkCancel, onBulkReschedule, weekDates, selectedRegions }
 */
export function BulkActions({
  selectedAppointments,
  onClearSelection,
  onBulkReassign,
  onBulkCancel,
  onBulkReschedule,
  weekDates,
  selectedRegions,
}) {
  const isMobile = useIsMobile();
  const [showRepDropdown, setShowRepDropdown] = useState(false);
  const dropdownRef = useRef(null);

  if (selectedAppointments.length === 0) return null;

  // Filter available reps by selected regions
  const availableReps = consultants.filter(
    c => !c.isCloserOnly && selectedRegions.some(r => c.territories.includes(r))
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRepDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReassignRep = (rep) => {
    onBulkReassign(selectedAppointments, rep);
    setShowRepDropdown(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? '80px' : '24px',
        left: isMobile ? '12px' : '50%',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        right: isMobile ? '12px' : 'auto',
        zIndex: 950,
        animation: 'slideInUp 0.3s ease-out',
      }}
    >
      <style>{bulkActionsCss}</style>
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: fonts.ui,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        {/* Count */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: T.accent,
            minWidth: isMobile ? '100%' : 'auto',
            marginBottom: isMobile ? '4px' : '0',
          }}
        >
          {selectedAppointments.length} selected
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', flex: isMobile ? '1 1 auto' : '0 0 auto' }}>
          {/* Reassign dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setShowRepDropdown(!showRepDropdown)}
              style={{
                ...buttonStyle,
                background: T.surfaceHover,
                border: `1px solid ${T.border}`,
                color: T.text,
              }}
            >
              Reassign All
              <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>

            {showRepDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '6px',
                  minWidth: '200px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                }}
              >
                {availableReps.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      fontSize: '12px',
                      color: T.muted,
                      textAlign: 'center',
                    }}
                  >
                    No reps available in selected regions
                  </div>
                ) : (
                  availableReps.map(rep => (
                    <button
                      key={rep.id}
                      onClick={() => handleReassignRep(rep)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${T.border}`,
                        cursor: 'pointer',
                        color: T.text,
                        fontSize: '12px',
                        fontFamily: fonts.ui,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.background = T.surfaceHover)}
                      onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 500 }}>{rep.name}</div>
                      <div style={{ fontSize: '11px', color: T.muted }}>{rep.territories.join(', ')}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cancel All */}
          <button
            onClick={() => {
              onBulkCancel(selectedAppointments);
              onClearSelection();
            }}
            style={{
              ...buttonStyle,
              background: T.redDim,
              color: T.red,
              border: `1px solid ${T.red}40`,
            }}
          >
            Cancel All
          </button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            style={{
              ...buttonStyle,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.muted,
              padding: '8px',
              minWidth: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * RepIsOutButton — Quick action to handle "rep is out" scenarios
 * Props: { onReassign, weekDates, selectedRegions }
 */
export function RepIsOutButton({ onReassign, weekDates, selectedRegions }) {
  const isMobile = useIsMobile();
  const [showModal, setShowModal] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(weekDates?.[0] || null);
  const [repAppts, setRepAppts] = useState([]);

  const availableReps = consultants.filter(
    c => !c.isCloserOnly && selectedRegions.some(r => c.territories.includes(r))
  );

  const handleSelectRep = (repId) => {
    setSelectedRepId(repId);
    // Load appointments for this rep on selected date
    const appts = mockAppointments.filter(
      a => a.consultant === repId && a.date === selectedDate && !a.isPlaceholder
    );
    setRepAppts(appts);
  };

  const handleReassignAll = () => {
    if (selectedRepId && selectedDate) {
      onReassign(selectedRepId, selectedDate);
      setShowModal(false);
      setSelectedRepId(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '10px 14px',
          background: T.redDim,
          border: `1px solid ${T.red}40`,
          color: T.red,
          borderRadius: '6px',
          fontFamily: fonts.ui,
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.target.style.background = T.redDim)}
        onMouseLeave={(e) => (e.target.style.background = T.redDim)}
      >
        <AlertCircle size={14} />
        Rep is Out
      </button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div
            style={{
              background: T.surface,
              borderRadius: '12px',
              border: `1px solid ${T.border}`,
              padding: '24px',
              maxWidth: '500px',
              width: isMobile ? '90vw' : '100%',
              fontFamily: fonts.ui,
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: '16px' }}>
              Reassign Rep's Schedule
            </h2>

            {/* Rep Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: T.muted, fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Select Rep
              </label>
              <select
                value={selectedRepId || ''}
                onChange={(e) => handleSelectRep(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: T.surfaceHover,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.text,
                  fontFamily: fonts.ui,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Choose a rep...</option>
                {availableReps.map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} ({rep.territories.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: T.muted, fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Select Date
              </label>
              <select
                value={selectedDate || ''}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedRepId(null);
                  setRepAppts([]);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: T.surfaceHover,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.text,
                  fontFamily: fonts.ui,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {weekDates.map(date => {
                  const d = new Date(date + 'T12:00:00');
                  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <option key={date} value={date}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Appointments List */}
            {selectedRepId && repAppts.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: T.bg, borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: T.muted, fontWeight: 600, marginBottom: '8px' }}>
                  {repAppts.length} appointment{repAppts.length !== 1 ? 's' : ''} to reassign:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {repAppts.map(apt => (
                    <div
                      key={apt.id}
                      style={{
                        fontSize: '11px',
                        color: T.text,
                        padding: '6px 8px',
                        background: T.surfaceHover,
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{apt.time} — {apt.customer}</div>
                      <div style={{ color: T.muted, fontSize: '10px' }}>{apt.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRepId && repAppts.length === 0 && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px',
                  background: T.greenDim,
                  border: `1px solid ${T.green}40`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: T.green,
                }}
              >
                No appointments on this date
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  ...buttonStyle,
                  background: T.surfaceHover,
                  border: `1px solid ${T.border}`,
                  color: T.text,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReassignAll}
                disabled={!selectedRepId || !selectedDate}
                style={{
                  ...buttonStyle,
                  background: selectedRepId && selectedDate ? T.accent : T.dim,
                  color: T.bg,
                  cursor: selectedRepId && selectedDate ? 'pointer' : 'not-allowed',
                  opacity: selectedRepId && selectedDate ? 1 : 0.5,
                }}
              >
                Reassign All to Best Available
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * Modal overlay component
 */
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  fontFamily: fonts.ui,
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: 'background 0.2s, border-color 0.2s',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const bulkActionsCss = `
  @keyframes slideInUp {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
`;
