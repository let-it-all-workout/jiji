import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function HODDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [tab, setTab] = useState('students');

  return (
    <div className="page dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>HOD Dashboard</h1>
          <p>Welcome, {user?.full_name} — <strong>{user?.department}</strong> Department</p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
            Students
          </button>
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

        {tab === 'students' && <StudentsManager department={user?.department} />}
        {tab === 'upload' && <UploadSection />}
        {tab === 'results' && <UploadedResults />}
        {tab === 'disputes' && <DisputesView />}
      </div>
      <footer className="footer">
        <strong>{settings.school_name || 'School'}</strong> &mdash; Result Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ============ Students Manager (HOD) ============ */
function StudentsManager({ department }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [form, setForm] = useState({ reg_number: '', full_name: '', department: department || '' });
  const [addLoading, setAddLoading] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const res = await api.get('/students', { params: search ? { search } : {} });
      setStudents(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.reg_number.trim() || !form.full_name.trim()) {
      alert('All fields are required');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/students', { ...form, department: department });
      setForm({ reg_number: '', full_name: '', department: department || '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add student');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCSVFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      // Skip header if present
      const start = lines[0].toLowerCase().includes('reg') || lines[0].toLowerCase().includes('name') ? 1 : 0;
      const rows = [];
      for (let i = start; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim());
        if (parts.length >= 2) {
          rows.push({
            reg_number: parts[0],
            full_name: parts[1],
            department: parts[2] || department,
          });
        }
      }
      setCsvRows(rows);
      setCsvResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVUpload = async () => {
    if (csvRows.length === 0) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const res = await api.post('/students/bulk', { students: csvRows });
      setCsvResult(res.data);
      setCsvRows([]);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Students — {department}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => {
            const csv = `reg_number,full_name\n2022/CSC/010,John Doe\n2022/CSC/011,Jane Smith\n`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'student_import_template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}>
            Download Template
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowCSV(!showCSV); setShowForm(false); }}>
            {showCSV ? 'Cancel' : 'Import CSV'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setShowCSV(false); }}>
            {showForm ? 'Cancel' : '+ Add Student'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Manual Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="inline-form">
          <input placeholder="Reg Number (e.g. 2022/CSC/010)" value={form.reg_number} onChange={e => setForm({...form, reg_number: e.target.value})} required />
          <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
          <input value={department} disabled style={{ opacity: 0.6 }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>
            {addLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
      )}

      {/* CSV Import */}
      {showCSV && (
        <div className="csv-section" style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Import Students from CSV</h3>
          <p className="hint" style={{ marginBottom: '0.75rem' }}>
            CSV format: <strong>reg_number, full_name</strong> (one student per line).
            Department will be auto-set to <strong>{department}</strong>.
          </p>
          <p className="hint" style={{ marginBottom: '0.75rem' }}>
            Tip: Click <strong>Download Template</strong> above to get a ready-to-fill CSV file.
          </p>

          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginBottom: '0.75rem', display: 'inline-flex' }}>
            Choose CSV File
            <input type="file" accept=".csv,.txt" onChange={handleCSVFile} hidden />
          </label>

          {csvRows.length > 0 && (
            <>
              <p style={{ fontWeight: 600, margin: '0.5rem 0' }}>
                Preview: {csvRows.length} students found
              </p>
              <div className="table-responsive" style={{ maxHeight: 250, overflowY: 'auto', marginBottom: '0.75rem' }}>
                <table className="result-table">
                  <thead><tr><th>S/N</th><th>Reg Number</th><th>Full Name</th><th>Department</th></tr></thead>
                  <tbody>
                    {csvRows.map((r, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td>{r.reg_number}</td>
                        <td>{r.full_name}</td>
                        <td>{r.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleCSVUpload} disabled={csvUploading}>
                {csvUploading ? 'Uploading...' : `Upload ${csvRows.length} Students`}
              </button>
            </>
          )}

          {csvResult && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="alert alert-success">{csvResult.message}</div>
              {csvResult.errors?.length > 0 && (
                <div className="alert alert-error">
                  <strong>Errors:</strong>
                  <ul>{csvResult.errors.map((e, i) => <li key={i}>{e.reg_number}: {e.error}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder="Search by name or reg number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
        />
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>Search</button>
      </div>

      {/* Students Table */}
      {loading ? <p className="loading">Loading...</p> : (
        <>
          <p className="hint" style={{ marginBottom: '0.5rem' }}>{students.length} students in {department}</p>
          <div className="table-responsive">
            <table className="result-table">
              <thead><tr><th>S/N</th><th>Reg Number</th><th>Full Name</th><th>Department</th></tr></thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="center">{i + 1}</td>
                    <td>{s.reg_number}</td>
                    <td>{s.full_name}</td>
                    <td>{s.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && <p className="empty-state">No students found. Add students manually or import a CSV file.</p>}
          </div>
        </>
      )}
    </div>
  );
}

/* ============ Upload Results (same as lecturer) ============ */
function UploadSection() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [academicSession, setAcademicSession] = useState('2024/2025');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [rows, setRows] = useState([{ reg_number: '', score: '' }]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCoursesLoading(true);
    const params = {};
    if (filterLevel) params.level = filterLevel;
    if (filterSemester) params.semester = filterSemester;
    api.get('/courses', { params })
      .then(res => { if (!cancelled) setCourses(res.data || []); })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setCoursesLoading(false); });
    return () => { cancelled = true; };
  }, [filterLevel, filterSemester]);

  const addRow = () => setRows([...rows, { reg_number: '', score: '' }]);
  const removeRow = (i) => { if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i)); };
  const updateRow = (i, field, value) => { const nr = [...rows]; nr[i][field] = value; setRows(nr); };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      const start = lines[0].toLowerCase().includes('reg') ? 1 : 0;
      const newRows = [];
      for (let i = start; i < lines.length; i++) {
        const p = lines[i].split(',').map(s => s.trim());
        if (p.length >= 2) newRows.push({ reg_number: p[0], score: p[1] });
      }
      if (newRows.length) setRows(newRows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.reg_number.trim() && r.score !== '');
    if (!selectedCourse || !academicSession.trim()) { alert('Please select a course and enter academic session'); return; }
    if (!validRows.length) { alert('Please enter at least one result'); return; }
    for (const row of validRows) {
      const score = parseFloat(row.score);
      if (isNaN(score) || score < 0 || score > 100) {
        alert(`Invalid score "${row.score}" for ${row.reg_number}. Must be 0-100.`);
        return;
      }
    }
    setUploadLoading(true); setUploadResult(null);
    try {
      const res = await api.post('/results/upload', { course_id: parseInt(selectedCourse), academic_session: academicSession.trim(), results: validRows });
      setUploadResult(res.data); setRows([{ reg_number: '', score: '' }]);
    } catch (err) { alert(err.response?.data?.error || 'Upload failed'); }
    finally { setUploadLoading(false); }
  };

  return (
    <div className="card">
      <h2>Upload Results</h2>
      <form onSubmit={handleUpload}>
        <div className="form-grid">
          <div className="form-group"><label>Session</label><input value={academicSession} onChange={e => setAcademicSession(e.target.value)} required /></div>
          <div className="form-group"><label>Level</label>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}><option value="">All</option>{[100,200,300,400,500].map(l=><option key={l} value={l}>{l}</option>)}</select>
          </div>
          <div className="form-group"><label>Semester</label>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}><option value="">All</option><option value="1">1st</option><option value="2">2nd</option></select>
          </div>
          <div className="form-group"><label>Course</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} required disabled={coursesLoading}>
              <option value="">{coursesLoading ? 'Loading...' : 'Select Course'}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>)}
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
                  const studs = res.data || [];
                  if (studs.length === 0) { alert('No students found'); return; }
                  const csv = 'reg_number,score\n' + studs.map(s => `${s.reg_number},`).join('\n') + '\n';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const courseName = courses.find(c => String(c.id) === String(selectedCourse))?.course_code || 'results';
                  a.download = `${courseName}_result_template.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) { alert('Failed to generate template'); }
              }}>Download Template</button>
              <label className="btn btn-outline btn-sm" style={{cursor:'pointer'}}>Import CSV<input type="file" accept=".csv" onChange={handleCSVUpload} hidden /></label>
              <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>+ Add Row</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="upload-table">
              <thead><tr><th style={{width:50}}>S/N</th><th>Reg Number</th><th style={{width:120}}>Score</th><th style={{width:60}}></th></tr></thead>
              <tbody>
                {rows.map((row,i) => (
                  <tr key={i}>
                    <td className="center">{i+1}</td>
                    <td><input type="text" value={row.reg_number} onChange={e => updateRow(i,'reg_number',e.target.value)} className="table-input" placeholder="2022/CSC/010" /></td>
                    <td><input type="number" value={row.score} onChange={e => updateRow(i,'score',e.target.value)} min="0" max="100" className="table-input" /></td>
                    <td className="center"><button type="button" className="btn-icon" onClick={() => removeRow(i)}>&times;</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Click <strong>Download Template</strong> to get a CSV pre-filled with student reg numbers, fill in scores in Excel, then <strong>Import CSV</strong>.</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={uploadLoading}>{uploadLoading ? 'Uploading...' : 'Submit Results'}</button>
      </form>
      {uploadResult && (
        <div className="upload-result">
          <div className="alert alert-success">{uploadResult.message}</div>
          {uploadResult.errors?.length > 0 && <div className="alert alert-error"><strong>Errors:</strong><ul>{uploadResult.errors.map((e,i)=><li key={i}>{e.reg_number}: {e.error}</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}

/* ============ Uploaded Results ============ */
function UploadedResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/results/uploaded')
      .then(res => setResults(res.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p className="loading">Loading...</p></div>;

  return (
    <div className="card">
      <h2>Uploaded Results</h2>
      {results.length === 0 ? (
        <p className="empty-state">No results uploaded yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="result-table">
            <thead>
              <tr><th>Reg Number</th><th>Student</th><th>Course</th><th>Session</th><th>Score</th><th>Grade</th><th>Remark</th></tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <td>{r.reg_number}</td>
                  <td>{r.student_name}</td>
                  <td>{r.course_code}</td>
                  <td>{r.academic_session}</td>
                  <td className="center">{r.score}</td>
                  <td className="center bold">{r.grade}</td>
                  <td className={`center ${r.remark === 'Fail' ? 'text-red' : 'text-green'}`}>{r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============ Disputes View (read-only for HOD) ============ */
function DisputesView() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/disputes')
      .then(res => setDisputes(res.data || []))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p className="loading">Loading...</p></div>;

  return (
    <div className="card">
      <h2>Result Disputes</h2>
      <p className="hint" style={{ marginBottom: '1rem' }}>Disputes for courses you uploaded. Only admin can resolve them.</p>
      {disputes.length === 0 ? (
        <p className="empty-state">No disputes found.</p>
      ) : (
        <div className="disputes-list">
          {disputes.map(d => (
            <div key={d.id} className={`dispute-card dispute-${d.status}`}>
              <div className="dispute-header">
                <div><strong>{d.student_name}</strong> ({d.reg_number})</div>
                <span className={`badge badge-${d.status}`}>{d.status}</span>
              </div>
              <div className="dispute-body">
                <p><strong>Course:</strong> {d.course_code} - {d.course_name}</p>
                <p><strong>Score:</strong> {d.score} ({d.grade}) — {d.remark}</p>
                <p><strong>Complaint:</strong> {d.message}</p>
                <p className="dispute-date">Filed: {new Date(d.created_at).toLocaleString()}</p>
              </div>
              {d.admin_response && <p className="dispute-response"><strong>Admin Response:</strong> {d.admin_response}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
