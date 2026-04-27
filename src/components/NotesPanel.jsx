import { useState, useEffect } from 'react';
import { T, fonts } from '../data/theme.js';
import { addNote, getNotes, deleteNote, togglePin, getNotesCount } from '../data/notesService.js';

export default function NotesPanel({ appointmentId }) {
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Load notes on mount and whenever appointmentId changes
  useEffect(() => {
    setNotes(getNotes(appointmentId));
  }, [appointmentId]);

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;

    const note = addNote(appointmentId, newNoteText);
    if (note) {
      setNotes(getNotes(appointmentId));
      setNewNoteText('');
      setIsAdding(false);
    }
  };

  const handleDeleteNote = (noteId) => {
    if (deleteNote(appointmentId, noteId)) {
      setNotes(getNotes(appointmentId));
    }
  };

  const handleTogglePin = (noteId) => {
    togglePin(appointmentId, noteId);
    setNotes(getNotes(appointmentId));
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

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Add note section */}
      <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
        {isAdding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add a note..."
              style={{
                width: '100%',
                minHeight: '60px',
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
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewNoteText('');
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontFamily: fonts.ui,
                  backgroundColor: T.bg,
                  color: T.muted,
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
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontFamily: fonts.ui,
                  backgroundColor: T.accent,
                  color: T.bg,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
              >
                Add Note
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              fontFamily: fonts.ui,
              backgroundColor: T.bg,
              color: T.muted,
              border: `1px dashed ${T.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = T.surfaceHover;
              e.target.style.color = T.text;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = T.bg;
              e.target.style.color = T.muted;
            }}
          >
            + Add a note
          </button>
        )}
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: T.muted, fontSize: '13px' }}>
            No notes yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  backgroundColor: T.bg,
                  border: note.pinned ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                  borderLeftWidth: note.pinned ? '3px' : '1px',
                  borderLeftColor: note.pinned ? T.accent : undefined,
                }}
              >
                {/* Note header: author, time, actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: T.muted, fontFamily: fonts.ui }}>
                    <span style={{ fontWeight: '500' }}>{note.author}</span>
                    {' · '}
                    <span>{formatTime(note.timestamp)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Pin button */}
                    <button
                      onClick={() => handleTogglePin(note.id)}
                      title={note.pinned ? 'Unpin' : 'Pin to top'}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontFamily: fonts.ui,
                        backgroundColor: 'transparent',
                        color: note.pinned ? T.accent : T.dim,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = T.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = note.pinned ? T.accent : T.dim;
                      }}
                    >
                      📌
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete note"
                      style={{
                        padding: '2px 4px',
                        fontSize: '11px',
                        fontFamily: fonts.ui,
                        backgroundColor: 'transparent',
                        color: T.dim,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = T.red;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = T.dim;
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Note text */}
                <div style={{ fontSize: '13px', color: T.text, fontFamily: fonts.ui, lineHeight: '1.4' }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
