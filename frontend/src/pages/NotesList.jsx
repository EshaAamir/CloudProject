import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getUser, clearAuth } from '../utils/auth';
import './Notes.css';

const NotesList = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUser();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notes');
      setNotes(response.data.data.notes);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter(note => note.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="notes-container">
      <header className="notes-header">
        <div className="container">
          <h1>My Notes</h1>
          <div className="header-actions">
            <span className="user-info">Welcome, {user?.username}!</span>
            <Link to="/notes/new" className="btn btn-primary">Create Note</Link>
            <Link to="/upload" className="btn btn-secondary">Upload File</Link>
            <button onClick={handleLogout} className="btn btn-danger">Logout</button>
          </div>
        </div>
      </header>

      <main className="container">
        {error && <div className="error-message">{error}</div>}

        {notes.length === 0 ? (
          <div className="empty-state">
            <h3>No notes yet</h3>
            <p>Create your first note to get started!</p>
            <Link to="/notes/new" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Create Note
            </Link>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map(note => (
              <div key={note.id} className="note-card">
                {note.imageUrl && (
                  <div className="note-image">
                    <img src={note.imageUrl} alt={note.title} />
                  </div>
                )}
                <div className="note-content">
                  <h3>{note.title}</h3>
                  <p>{note.content || 'No content'}</p>
                  <div className="note-meta">
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="note-actions">
                    <Link to={`/notes/${note.id}/edit`} className="btn btn-secondary">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotesList;

