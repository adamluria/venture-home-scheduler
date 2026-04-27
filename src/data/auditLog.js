// In-memory audit log for all appointment changes
// action: 'create' | 'reschedule' | 'reassign' | 'status_change' | 'note_added' | 'cancel' | 'no_show' | 'edit'

const _log = [];

// Generate unique entry ID
function generateEntryId() {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an action to the audit trail
 * @param {object} config - { appointmentId, action, field, oldValue, newValue, actor }
 * @returns {object} the created audit entry
 */
export function logAction({ appointmentId, action, field = null, oldValue = null, newValue = null, actor = 'Dispatcher' }) {
  const entry = {
    id: generateEntryId(),
    appointmentId,
    action,
    field,
    oldValue,
    newValue,
    actor,
    timestamp: Date.now(),
  };

  _log.push(entry);
  return entry;
}

/**
 * Get audit log for a specific appointment, sorted by timestamp desc
 * @param {string} appointmentId
 * @returns {array} entries sorted by timestamp descending
 */
export function getAuditLog(appointmentId) {
  return _log
    .filter(entry => entry.appointmentId === appointmentId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get all audit log entries across appointments, recent first
 * @param {object} options - { limit }
 * @returns {array} recent entries
 */
export function getAllAuditLog({ limit = 100 } = {}) {
  return _log
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get count of audit entries for an appointment
 * @param {string} appointmentId
 * @returns {number}
 */
export function getAuditLogCount(appointmentId) {
  return _log.filter(entry => entry.appointmentId === appointmentId).length;
}
