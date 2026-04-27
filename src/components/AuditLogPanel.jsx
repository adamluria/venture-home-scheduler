import { useState, useEffect } from 'react';
import { T, fonts } from '../data/theme.js';
import { getAuditLog } from '../data/auditLog.js';
import { getConsultantName } from '../data/mockData.js';

export default function AuditLogPanel({ appointmentId }) {
  const [entries, setEntries] = useState([]);

  // Load audit log on mount and whenever appointmentId changes
  useEffect(() => {
    setEntries(getAuditLog(appointmentId));
  }, [appointmentId]);

  const getActionLabel = (action) => {
    const labels = {
      create: 'Created',
      reschedule: 'Rescheduled',
      reassign: 'Reassigned',
      status_change: 'Status Changed',
      note_added: 'Note Added',
      cancel: 'Canceled',
      no_show: 'No-Show',
      edit: 'Edited',
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      create: T.green,
      reschedule: T.accent,
      reassign: T.cyan,
      status_change: T.accent,
      note_added: T.purple,
      cancel: T.red,
      no_show: T.red,
      edit: T.accent,
    };
    return colors[action] || T.muted;
  };

  const getActionIcon = (action) => {
    const icons = {
      create: '✓',
      reschedule: '↻',
      reassign: '→',
      status_change: '◆',
      note_added: '♦',
      cancel: '✕',
      no_show: '✕',
      edit: '✎',
    };
    return icons[action] || '•';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const renderChangeDescription = (entry) => {
    const { action, field, oldValue, newValue, actor } = entry;

    if (action === 'reassign') {
      const oldName = getConsultantName(oldValue) || oldValue || 'Unassigned';
      const newName = getConsultantName(newValue) || newValue || 'Unassigned';
      return `${actor} reassigned from ${oldName} to ${newName}`;
    }

    if (action === 'reschedule') {
      return `${actor} rescheduled from ${oldValue} to ${newValue}`;
    }

    if (action === 'status_change') {
      return `${actor} changed status from ${oldValue} to ${newValue}`;
    }

    if (action === 'edit') {
      return `${actor} edited ${field}: "${oldValue}" → "${newValue}"`;
    }

    if (action === 'note_added') {
      return `${actor} added a note`;
    }

    if (action === 'cancel') {
      return `${actor} canceled the appointment`;
    }

    if (action === 'no_show') {
      return `${actor} marked as no-show`;
    }

    if (action === 'create') {
      return `${actor} created this appointment`;
    }

    return `${actor} ${action}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {entries.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: '13px' }}>
          No changes recorded
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 0' }}>
            {entries.map((entry, idx) => {
              const actionColor = getActionColor(entry.action);
              const actionIcon = getActionIcon(entry.action);
              const isLast = idx === entries.length - 1;

              return (
                <div key={entry.id} style={{ position: 'relative', paddingLeft: '24px', paddingBottom: '16px' }}>
                  {/* Timeline line */}
                  {!isLast && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '20px',
                        bottom: '-16px',
                        width: '1px',
                        backgroundColor: T.border,
                      }}
                    />
                  )}

                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: actionColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: T.bg,
                    }}
                  >
                    {actionIcon}
                  </div>

                  {/* Entry content */}
                  <div>
                    <div style={{ fontSize: '12px', color: T.text, fontFamily: fonts.ui, marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{getActionLabel(entry.action)}</span>
                    </div>

                    <div style={{ fontSize: '12px', color: T.muted, fontFamily: fonts.ui, lineHeight: '1.4' }}>
                      {renderChangeDescription(entry)}
                    </div>

                    <div style={{ fontSize: '10px', color: T.dim, fontFamily: fonts.data, marginTop: '4px' }}>
                      {formatTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
