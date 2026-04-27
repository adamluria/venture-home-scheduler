/**
 * Undo/Redo Service for Appointment Mutations
 * Maintains dual stacks for undo and redo operations
 * Tracks appointment mutations with before/after state
 *
 * Usage:
 *   pushUndo({ action: 'reschedule', appointmentId: 'a1', before: {...}, after: {...} })
 *   const { entry, appointment } = undo()
 *   const { entry, appointment } = redo()
 */

const MAX_UNDO = 50;

// Stacks for undo and redo
let _undoStack = [];
let _redoStack = [];

/**
 * Entry structure:
 * {
 *   id: string (unique entry ID)
 *   action: string ('reschedule', 'status_change', 'assign_rep', 'cancel', etc)
 *   appointmentId: string (the appointment being modified)
 *   before: object (appointment state before change)
 *   after: object (appointment state after change)
 *   timestamp: number (when the change happened)
 * }
 */

/**
 * Push a new undo entry and clear the redo stack
 * @param {Object} options - { action, appointmentId, before, after }
 * @returns {Object} The created entry
 */
export function pushUndo({ action, appointmentId, before, after }) {
  if (!action || !appointmentId || !before || !after) {
    throw new Error('pushUndo requires: action, appointmentId, before, after');
  }

  const entry = {
    id: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    appointmentId,
    before: { ...before },
    after: { ...after },
    timestamp: Date.now(),
  };

  // Add to undo stack
  _undoStack.unshift(entry);

  // Enforce max size
  if (_undoStack.length > MAX_UNDO) {
    _undoStack = _undoStack.slice(0, MAX_UNDO);
  }

  // Clear redo stack when new action is taken
  _redoStack = [];

  return entry;
}

/**
 * Undo the most recent change
 * @returns {Object|null} { entry, appointment } with appointment = before state, or null if nothing to undo
 */
export function undo() {
  if (_undoStack.length === 0) {
    return null;
  }

  const entry = _undoStack.shift();

  // Move to redo stack
  _redoStack.unshift(entry);

  return {
    entry,
    appointment: { ...entry.before },
  };
}

/**
 * Redo the most recently undone change
 * @returns {Object|null} { entry, appointment } with appointment = after state, or null if nothing to redo
 */
export function redo() {
  if (_redoStack.length === 0) {
    return null;
  }

  const entry = _redoStack.shift();

  // Move back to undo stack
  _undoStack.unshift(entry);

  return {
    entry,
    appointment: { ...entry.after },
  };
}

/**
 * Check if undo is available
 * @returns {boolean}
 */
export function canUndo() {
  return _undoStack.length > 0;
}

/**
 * Check if redo is available
 * @returns {boolean}
 */
export function canRedo() {
  return _redoStack.length > 0;
}

/**
 * Get the entire undo stack (most recent first)
 * @returns {Array} Copy of undo stack
 */
export function getUndoStack() {
  return [..._undoStack];
}

/**
 * Get the entire redo stack (most recent first)
 * @returns {Array} Copy of redo stack
 */
export function getRedoStack() {
  return [..._redoStack];
}

/**
 * Clear both undo and redo stacks
 */
export function clearUndo() {
  _undoStack = [];
  _redoStack = [];
}

/**
 * Get summary of next undo action (for UI display)
 * @returns {Object|null} { action, appointmentId } or null
 */
export function peekUndo() {
  if (_undoStack.length === 0) return null;
  const entry = _undoStack[0];
  return {
    action: entry.action,
    appointmentId: entry.appointmentId,
  };
}

/**
 * Get summary of next redo action (for UI display)
 * @returns {Object|null} { action, appointmentId } or null
 */
export function peekRedo() {
  if (_redoStack.length === 0) return null;
  const entry = _redoStack[0];
  return {
    action: entry.action,
    appointmentId: entry.appointmentId,
  };
}

/**
 * Get size of undo stack
 * @returns {number}
 */
export function getUndoStackSize() {
  return _undoStack.length;
}

/**
 * Get size of redo stack
 * @returns {number}
 */
export function getRedoStackSize() {
  return _redoStack.length;
}
