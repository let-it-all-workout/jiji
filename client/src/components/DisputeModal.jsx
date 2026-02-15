import { useState } from 'react';
import api from '../api';

export default function DisputeModal({ result, regNumber, onClose }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please describe your complaint');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/disputes', {
        reg_number: regNumber,
        result_id: result.id,
        message: message.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Dispute Result</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div className="modal-body">
            <div className="alert alert-success">
              Your dispute has been submitted successfully. The admin will review it.
            </div>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="dispute-info">
              <p><strong>Course:</strong> {result.course_code} - {result.course_name}</p>
              <p><strong>Current Score:</strong> {result.score} ({result.grade})</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Describe your complaint:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="E.g., I believe my score was incorrectly entered. I scored higher in the exam..."
                rows={4}
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
