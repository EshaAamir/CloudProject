import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Notes.css';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      setUploadedUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadedUrl(response.data.data.url);
      setFile(null);
      // Reset file input
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(uploadedUrl);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="notes-container">
      <header className="notes-header">
        <div className="container">
          <h1>Upload File to S3</h1>
          <Link to="/notes" className="btn btn-secondary">Back to Notes</Link>
        </div>
      </header>

      <main className="container">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="file">Select File</label>
              <input
                type="file"
                id="file"
                name="file"
                onChange={handleFileChange}
                accept="image/*,application/pdf,text/plain"
                required
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                Supported formats: Images (JPEG, PNG, GIF, WebP), PDF, Text files. Max size: 5MB
              </small>
            </div>

            {error && <div className="error-message">{error}</div>}

            {uploadedUrl && (
              <div className="success-message" style={{ marginBottom: '20px' }}>
                <p><strong>File uploaded successfully!</strong></p>
                <div style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
                  <p style={{ wordBreak: 'break-all', marginBottom: '10px' }}>{uploadedUrl}</p>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="btn btn-secondary"
                  >
                    Copy URL
                  </button>
                </div>
                {uploadedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <div style={{ marginTop: '15px' }}>
                    <img
                      src={uploadedUrl}
                      alt="Uploaded"
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '5px' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading || !file}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Upload;

