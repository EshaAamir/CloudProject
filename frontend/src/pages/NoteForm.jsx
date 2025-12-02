import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import './Notes.css';

const NoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchNote();
    }
  }, [id]);

  const fetchNote = async () => {
    try {
      const response = await api.get(`/notes/${id}`);
      const note = response.data.data.note;
      setFormData({
        title: note.title,
        content: note.content || '',
        imageUrl: note.imageUrl || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch note');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/notes/${id}`, formData);
      } else {
        await api.post('/notes', formData);
      }
      navigate('/notes');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notes-container">
      <header className="notes-header">
        <div className="container">
          <h1>{isEdit ? 'Edit Note' : 'Create Note'}</h1>
          <Link to="/notes" className="btn btn-secondary">Back to Notes</Link>
        </div>
      </header>

      <main className="container">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="Enter note title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Enter note content"
              />
            </div>

            <div className="form-group">
              <label htmlFor="imageUrl">Image URL</label>
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Enter image URL (or upload a file first)"
              />
              {formData.imageUrl && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '5px' }}
                  />
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Note' : 'Create Note'}
              </button>
              <Link to="/notes" className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NoteForm;

