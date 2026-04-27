// In-memory notes system for appointments
// Store: Map of appointmentId → [{ id, text, author, timestamp, pinned }]

const _notes = new Map();

// Generate unique note ID
function generateNoteId() {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Seed mock notes for demo purposes
function seedMockNotes() {
  const mockAppointmentIds = ['a1', 'a2', 'a3', 'a5', 'a8'];

  mockAppointmentIds.forEach((aptId, idx) => {
    const notes = [];

    if (idx === 0) {
      notes.push({
        id: generateNoteId(),
        text: 'Customer mentioned interest in battery storage. Follow up with energy consultant.',
        author: 'Dispatcher',
        timestamp: Date.now() - 3600000,
        pinned: true,
      });
      notes.push({
        id: generateNoteId(),
        text: 'Confirmed appointment time via SMS. Customer received design proposal.',
        author: 'Dispatcher',
        timestamp: Date.now() - 1800000,
        pinned: false,
      });
    } else if (idx === 1) {
      notes.push({
        id: generateNoteId(),
        text: 'Virtual appointment scheduled. Customer prefers Zoom over phone.',
        author: 'Dispatcher',
        timestamp: Date.now() - 7200000,
        pinned: false,
      });
    } else if (idx === 2) {
      notes.push({
        id: generateNoteId(),
        text: 'Ready for contract signing. All documentation reviewed.',
        author: 'Closer',
        timestamp: Date.now() - 5400000,
        pinned: true,
      });
    } else if (idx === 3) {
      notes.push({
        id: generateNoteId(),
        text: 'Customer has questions about warranty period. Schedule call with support.',
        author: 'Dispatcher',
        timestamp: Date.now() - 2700000,
        pinned: false,
      });
    } else if (idx === 4) {
      notes.push({
        id: generateNoteId(),
        text: 'High-value lead. Customer mentioned multiple properties.',
        author: 'Dispatcher',
        timestamp: Date.now() - 10800000,
        pinned: false,
      });
    }

    if (notes.length > 0) {
      _notes.set(aptId, notes);
    }
  });
}

// Initialize mock notes on module load
seedMockNotes();

/**
 * Add a note to an appointment
 * @param {string} appointmentId
 * @param {string} text
 * @param {string} author
 * @returns {object} the created note
 */
export function addNote(appointmentId, text, author = 'Dispatcher') {
  if (!text || !text.trim()) return null;

  const note = {
    id: generateNoteId(),
    text: text.trim(),
    author,
    timestamp: Date.now(),
    pinned: false,
  };

  if (!_notes.has(appointmentId)) {
    _notes.set(appointmentId, []);
  }

  _notes.get(appointmentId).push(note);
  return note;
}

/**
 * Get all notes for an appointment, pinned first, then by timestamp desc
 * @param {string} appointmentId
 * @returns {array} sorted notes
 */
export function getNotes(appointmentId) {
  const notes = _notes.get(appointmentId) || [];
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Delete a note
 * @param {string} appointmentId
 * @param {string} noteId
 * @returns {boolean} true if deleted, false if not found
 */
export function deleteNote(appointmentId, noteId) {
  if (!_notes.has(appointmentId)) return false;
  const notes = _notes.get(appointmentId);
  const idx = notes.findIndex(n => n.id === noteId);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  return true;
}

/**
 * Toggle pin on a note
 * @param {string} appointmentId
 * @param {string} noteId
 * @returns {object|null} updated note or null if not found
 */
export function togglePin(appointmentId, noteId) {
  if (!_notes.has(appointmentId)) return null;
  const notes = _notes.get(appointmentId);
  const note = notes.find(n => n.id === noteId);
  if (!note) return null;
  note.pinned = !note.pinned;
  return note;
}

/**
 * Get count of notes for an appointment
 * @param {string} appointmentId
 * @returns {number}
 */
export function getNotesCount(appointmentId) {
  return (_notes.get(appointmentId) || []).length;
}

/**
 * Check if an appointment has any notes
 * @param {string} appointmentId
 * @returns {boolean}
 */
export function hasNotes(appointmentId) {
  return getNotesCount(appointmentId) > 0;
}
