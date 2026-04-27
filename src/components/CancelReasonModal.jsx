import { useState } from 'react';
import { T, fonts } from '../data/theme.js';

const CANCEL_REASONS = [
  "Customer no-answer / unreachable",
  "Customer requested cancellation",
  "Customer rescheduled",
  "Bad lead / wrong info",
  "Weather / emergency",
  "Rep unavailable",
  "Other",
];

export default function CancelReasonModal({ appointment, onConfirm, onClose }) {
  const [cancelMode, setCancelMode] = useState('cancel'); // 'cancel' or 'no-show'
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;

    const status = cancelMode === 'no-show' ? 'no-show' : 'canceled';
    onConfirm({
      reason: selectedReason,
      details,
      status,
    });
  };

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
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${T.border}` }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: T.text, fontFamily: fonts.ui, margin: '0 0 12px 0' }}>
            {appointment.customer}
          </h2>
          <p style={{ fontSize: '12px', color: T.muted, fontFamily: fonts.ui, margin: 0 }}>
            {appointment.date} @ {appointment.time}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Cancel vs No-Show toggle */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: T.muted, fontFamily: fonts.ui, display: 'block', marginBottom: '8px' }}>
              Appointment Status
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCancelMode('cancel')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: fonts.ui,
                  fontWeight: '500',
                  backgroundColor: cancelMode === 'cancel' ? T.accent : T.bg,
                  color: cancelMode === 'cancel' ? T.bg : T.text,
                  border: `1px solid ${cancelMode === 'cancel' ? T.accent : T.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancellation
              </button>
              <button
                onClick={() => setCancelMode('no-show')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: fonts.ui,
                  fontWeight: '500',
                  backgroundColor: cancelMode === 'no-show' ? T.accent : T.bg,
                  color: cancelMode === 'no-show' ? T.bg : T.text,
                  border: `1px solid ${cancelMode === 'no-show' ? T.accent : T.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                No-Show
              </button>
            </div>
          </div>

          {/* Reason selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: T.muted, fontFamily: fonts.ui, display: 'block', marginBottom: '8px' }}>
              Reason
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    backgroundColor: selectedReason === reason ? T.accentDim : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedReason !== reason) {
                      e.currentTarget.style.backgroundColor = `${T.border}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedReason !== reason) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={{ cursor: 'pointer', accentColor: T.accent }}
                  />
                  <span style={{ fontSize: '13px', color: T.text, fontFamily: fonts.ui, flex: 1 }}>
                    {reason}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional details */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: T.muted, fontFamily: fonts.ui, display: 'block', marginBottom: '6px' }}>
              Additional Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any relevant information about this cancellation..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: fonts.ui,
                backgroundColor: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontFamily: fonts.ui,
              fontWeight: '500',
              backgroundColor: T.bg,
              color: T.text,
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = T.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = T.bg;
            }}
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontFamily: fonts.ui,
              fontWeight: '500',
              backgroundColor: selectedReason ? T.red : T.dim,
              color: T.bg,
              border: 'none',
              borderRadius: '4px',
              cursor: selectedReason ? 'pointer' : 'not-allowed',
              opacity: selectedReason ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedReason) {
                e.target.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedReason) {
                e.target.style.opacity = '1';
              }
            }}
          >
            Confirm {cancelMode === 'no-show' ? 'No-Show' : 'Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
