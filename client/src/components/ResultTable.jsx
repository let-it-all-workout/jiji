import { useState } from 'react';
import DisputeModal from './DisputeModal';

export default function ResultTable({ data, onDownloadPDF }) {
  const [disputeResult, setDisputeResult] = useState(null);

  if (!data) return null;

  const student = data.student || {};
  const query = data.query || {};
  const results = Array.isArray(data.results) ? data.results : [];
  const summary = data.summary || {};

  return (
    <div className="result-container">
      {/* Student Info Header */}
      <div className="result-header">
        <h2>Student Result</h2>
        <div className="student-info">
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{student.full_name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Reg Number:</span>
            <span className="info-value">{student.reg_number || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Department:</span>
            <span className="info-value">{student.department || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Session:</span>
            <span className="info-value">{query.academic_session || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Level:</span>
            <span className="info-value">{query.level ? `${query.level} Level` : '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Semester:</span>
            <span className="info-value">{query.semester === 1 ? '1st' : query.semester === 2 ? '2nd' : '—'} Semester</span>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <p>No results found for the selected session, level, and semester.</p>
        </div>
      ) : (
        <>
          {/* Result Table */}
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="result-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Credit Units</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.id || i} className={r.remark === 'Fail' ? 'row-fail' : ''}>
                    <td className="center">{i + 1}</td>
                    <td className="bold">{r.course_code}</td>
                    <td>{r.course_name}</td>
                    <td className="center">{r.credit_units}</td>
                    <td className="center">{r.score}</td>
                    <td className="center bold">{r.grade}</td>
                    <td className={`center ${r.remark === 'Fail' ? 'text-red' : 'text-green'}`}>
                      {r.remark}
                    </td>
                    <td className="center">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDisputeResult(r)}
                      >
                        Dispute
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="result-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Courses</span>
                <span className="summary-value">{summary.total_courses ?? 0}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Credit Units</span>
                <span className="summary-value">{summary.total_credit_units ?? 0}</span>
              </div>
              <div className="summary-item highlight">
                <span className="summary-label">Semester GPA</span>
                <span className="summary-value">{(summary.gpa ?? 0).toFixed(2)}</span>
              </div>
              <div className="summary-item highlight">
                <span className="summary-label">Cumulative GPA</span>
                <span className="summary-value">{(summary.cgpa ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="result-actions">
            <button className="btn btn-accent" onClick={onDownloadPDF}>
              Download Result (PDF)
            </button>
          </div>

          <p className="disclaimer">
            This result is subject to Senate approval.
          </p>
        </>
      )}

      {/* Dispute Modal */}
      {disputeResult && (
        <DisputeModal
          result={disputeResult}
          regNumber={student.reg_number}
          onClose={() => setDisputeResult(null)}
        />
      )}
    </div>
  );
}
