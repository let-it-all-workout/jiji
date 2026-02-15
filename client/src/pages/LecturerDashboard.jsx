import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [tab, setTab] = useState('upload');

  // Upload form state
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [academicSession, setAcademicSession] = useState('2024/2025');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [rows, setRows] = useState([{ reg_number: '', score: '' }]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Uploaded results state
  const [uploadedResults, setUploadedResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Disputes state
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    loadCourses();
  }, [filterLevel, filterSemester]);

  const loadCourses = async () => {
    try {
      const params = {};
      if (filterLevel) params.level = filterLevel;
      if (filterSemester) params.semester = filterSemester;
      const res = await api.get('/courses', { params });
      setCourses(res.data);
    } catch (err) {
      console.error('Failed to load courses');
    }
  };

  const addRow = () => {
    setRows([...rows, { reg_number: '', score: '' }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !academicSession) {
      alert('Please select a course and enter academic session');
      return;
    }

    const validRows = rows.filter(r => r.reg_number && r.score);
    if (validRows.length === 0) {
      alert('Please enter at least one result');
      return;
    }

    setUploadLoading(true);
    setUploadResult(null);
    try {
      const res = await api.post('/results/upload', {
        course_id: parseInt(selectedCourse),
        academic_session: academicSession,
        results: validRows,
      });
      setUploadResult(res.data);
      setRows([{ reg_number: '', score: '' }]);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const newRows = [];

      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('reg') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 2) {
          newRows.push({ reg_number: parts[0], score: parts[1] });
        }
      }

      if (newRows.length > 0) {
        setRows(newRows);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadUploadedResults = async () => {
    setResultsLoading(true);
    try {
      const res = await api.get('/results/uploaded');
      setUploadedResults(res.data);
    } catch (err) {
      console.error('Failed to load results');
    } finally {
      setResultsLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const res = await api.get('/disputes');
      setDisputes(res.data);
    } catch (err) {
      console.error('Failed to load disputes');
    }
  };

  useEffect(() => {
    if (tab === 'results') loadUploadedResults();
    if (tab === 'disputes') loadDisputes();
  }, [tab]);

  return (
    <div className="page dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Lecturer Dashboard</h1>
          <p>Welcome, {user?.full_name}</p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            Upload Results
          </button>
          <button className={`tab ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>
            Uploaded Results
          </button>
          <button className={`tab ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>
            Disputes
          </button>
        </div>

        {/* Upload Tab */}
        {tab === 'upload' && (
          <div className="card">
            <h2>Upload Results</h2>
            <form onSubmit={handleUpload}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Academic Session</label>
                  <input
                    type="text"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    placeholder="e.g. 2024/2025"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Filter by Level</label>
                  <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                    <option value="">All Levels</option>
                    {[100,200,300,400,500].map(l => <option key={l} value={l}>{l} Level</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Filter by Semester</label>
                  <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Course</label>
                  <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.course_name} ({c.level}L S{c.semester})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="upload-section">
                <div className="upload-header">
                  <h3>Enter Results</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-outline btn-sm" disabled={!selectedCourse} onClick={async () => {
                      if (!selectedCourse) { alert('Please select a course first'); return; }
                      try {
                        const res = await api.get('/students');
                        const students = res.data || [];
                        if (students.length === 0) { alert('No students found in the system'); return; }
                        const csv = 'reg_number,score\n' + students.map(s => `${s.reg_number},`).join('\n') + '\n';
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const courseName = courses.find(c => String(c.id) === String(selectedCourse))?.course_code || 'results';
                        a.download = `${courseName}_result_template.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) { alert('Failed to generate template'); }
                    }}>
                      Download Template
                    </button>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      Import CSV
                      <input type="file" accept=".csv" onChange={handleCSVUpload} hidden />
                    </label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
                      + Add Row
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="upload-table">
                    <thead>
                      <tr>
                        <th style={{width: 50}}>S/N</th>
                        <th>Reg Number</th>
                        <th style={{width: 120}}>Score</th>
                        <th style={{width: 60}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={row.reg_number}
                              onChange={(e) => updateRow(i, 'reg_number', e.target.value)}
                              placeholder="2022/CSC/010"
                              className="table-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={row.score}
                              onChange={(e) => updateRow(i, 'score', e.target.value)}
                              placeholder="0-100"
                              min="0"
                              max="100"
                              className="table-input"
                            />
                          </td>
                          <td className="center">
                            <button type="button" className="btn-icon" onClick={() => removeRow(i)} title="Remove">
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="hint">Grade and remark are auto-calculated from the score. Click <strong>Download Template</strong> to get a CSV pre-filled with student reg numbers, fill in scores in Excel, then use <strong>Import CSV</strong> to upload.</p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : 'Submit Results'}
              </button>
            </form>

            {uploadResult && (
              <div className="upload-result">
                <div className="alert alert-success">
                  {uploadResult.message}
                </div>
                {uploadResult.errors?.length > 0 && (
                  <div className="alert alert-error">
                    <strong>Errors:</strong>
                    <ul>
                      {uploadResult.errors.map((e, i) => (
                        <li key={i}>{e.reg_number}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Uploaded Results Tab */}
        {tab === 'results' && (
          <div className="card">
            <h2>Uploaded Results</h2>
            {resultsLoading ? (
              <p>Loading...</p>
            ) : uploadedResults.length === 0 ? (
              <p className="empty-state">No results uploaded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>Reg Number</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Session</th>
                      <th>Score</th>
                      <th>Grade</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedResults.map(r => (
                      <tr key={r.id}>
                        <td>{r.reg_number}</td>
                        <td>{r.student_name}</td>
                        <td>{r.course_code}</td>
                        <td>{r.academic_session}</td>
                        <td className="center">{r.score}</td>
                        <td className="center bold">{r.grade}</td>
                        <td className={`center ${r.remark === 'Fail' ? 'text-red' : 'text-green'}`}>
                          {r.remark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Disputes Tab */}
        {tab === 'disputes' && (
          <div className="card">
            <h2>Result Disputes</h2>
            <p className="hint">These are disputes filed by students for courses you uploaded. Only admin can resolve them.</p>
            {disputes.length === 0 ? (
              <p className="empty-state">No disputes found.</p>
            ) : (
              <div className="table-responsive">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Score</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.map(d => (
                      <tr key={d.id}>
                        <td>{d.student_name} ({d.reg_number})</td>
                        <td>{d.course_code}</td>
                        <td className="center">{d.score} ({d.grade})</td>
                        <td>{d.message}</td>
                        <td className={`center badge badge-${d.status}`}>{d.status}</td>
                        <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="footer">
        <strong>{settings.school_name || 'School'}</strong> &mdash; Result Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
