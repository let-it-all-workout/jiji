import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [tab, setTab] = useState('results');

  return (
    <div className="page dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.full_name}</p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>Results</button>
          <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
          <button className={`tab ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>Disputes</button>
          <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Students</button>
          <button className={`tab ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>Courses</button>
          <button className={`tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>Departments</button>
          <button className={`tab ${tab === 'lecturers' ? 'active' : ''}`} onClick={() => setTab('lecturers')}>Staff</button>
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</button>
        </div>

        {tab === 'results' && <ResultsManager />}
        {tab === 'upload' && <UploadSection />}
        {tab === 'disputes' && <DisputesManager />}
        {tab === 'students' && <StudentsManager />}
        {tab === 'courses' && <CoursesManager />}
        {tab === 'departments' && <DepartmentsManager />}
        {tab === 'lecturers' && <LecturersManager />}
        {tab === 'settings' && <SettingsManager settings={settings} updateSettings={updateSettings} />}
      </div>
      <footer className="footer">
        <strong>{settings.school_name || 'School'}</strong> &mdash; Result Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ============ Results Manager ============ */
function ResultsManager() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ reg_number: '', academic_session: '', level: '', semester: '' });
  const [editingId, setEditingId] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/results/all', { params });
      setResults(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, []);

  const handleEdit = (r) => { setEditingId(r.id); setEditScore(String(r.score)); };

  const handleSave = async (id) => {
    const score = parseFloat(editScore);
    if (isNaN(score) || score < 0 || score > 100) {
      alert('Score must be between 0 and 100');
      return;
    }
    setSavingId(id);
    try {
      await api.put(`/results/${id}`, { score });
      setEditingId(null);
      loadResults();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="card">
      <h2>Manage Results</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label>Reg Number</label>
          <input value={filters.reg_number} onChange={e => setFilters({...filters, reg_number: e.target.value})} placeholder="Search..." />
        </div>
        <div className="form-group">
          <label>Session</label>
          <input value={filters.academic_session} onChange={e => setFilters({...filters, academic_session: e.target.value})} placeholder="e.g. 2024/2025" />
        </div>
        <div className="form-group">
          <label>Level</label>
          <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})}>
            <option value="">All</option>
            {[100,200,300,400,500].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Semester</label>
          <select value={filters.semester} onChange={e => setFilters({...filters, semester: e.target.value})}>
            <option value="">All</option>
            <option value="1">1st</option>
            <option value="2">2nd</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={loadResults} disabled={loading} style={{marginBottom: 16}}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      {loading ? <p className="loading">Loading results...</p> : (
        <div className="table-responsive">
          <table className="result-table">
            <thead>
              <tr>
                <th>Reg No.</th>
                <th>Student</th>
                <th>Course</th>
                <th>Session</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Remark</th>
                <th>Uploaded By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <td>{r.reg_number}</td>
                  <td>{r.student_name}</td>
                  <td>{r.course_code}</td>
                  <td>{r.academic_session}</td>
                  <td className="center">
                    {editingId === r.id ? (
                      <input type="number" value={editScore} onChange={e => setEditScore(e.target.value)} min="0" max="100" className="table-input" style={{width:70}} />
                    ) : r.score}
                  </td>
                  <td className="center bold">{r.grade}</td>
                  <td className={`center ${r.remark==='Fail' ? 'text-red' : 'text-green'}`}>{r.remark}</td>
                  <td>{r.uploaded_by_name}</td>
                  <td className="center">
                    {editingId === r.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSave(r.id)} disabled={savingId === r.id}>
                          {savingId === r.id ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)} disabled={savingId === r.id} style={{marginLeft:4}}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(r)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && <p className="empty-state">No results found.</p>}
        </div>
      )}
    </div>
  );
}

/* ============ Upload Section ============ */
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

    // Validate all scores
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
                    <td><input type="text" value={row.reg_number} onChange={e => updateRow(i,'reg_number',e.target.value)} className="table-input" /></td>
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

/* ============ Disputes Manager ============ */
function DisputesManager() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [newScore, setNewScore] = useState('');
  const [error, setError] = useState('');

  const loadDisputes = async () => {
    setError('');
    try {
      const res = await api.get('/disputes');
      setDisputes(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load disputes');
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDisputes(); }, []);

  const handleResolve = async (id, status) => {
    if (newScore) {
      const score = parseFloat(newScore);
      if (isNaN(score) || score < 0 || score > 100) {
        alert('New score must be between 0 and 100');
        return;
      }
    }
    setResolvingLoading(true);
    try {
      const body = { status, admin_response: response };
      if (status === 'resolved' && newScore) body.new_score = parseFloat(newScore);
      await api.put(`/disputes/${id}`, body);
      setResolving(null); setResponse(''); setNewScore('');
      loadDisputes();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setResolvingLoading(false);
    }
  };

  if (loading) return <div className="card"><p className="loading">Loading disputes...</p></div>;

  return (
    <div className="card">
      <h2>Result Disputes</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {disputes.length === 0 ? <p className="empty-state">No disputes found.</p> : (
        <div className="disputes-list">
          {disputes.map(d => (
            <div key={d.id} className={`dispute-card dispute-${d.status}`}>
              <div className="dispute-header">
                <div>
                  <strong>{d.student_name}</strong> ({d.reg_number}) — {d.department}
                </div>
                <span className={`badge badge-${d.status}`}>{d.status}</span>
              </div>
              <div className="dispute-body">
                <p><strong>Course:</strong> {d.course_code} - {d.course_name} ({d.level}L S{d.semester})</p>
                <p><strong>Current Score:</strong> {d.score} ({d.grade}) — {d.remark}</p>
                <p><strong>Session:</strong> {d.academic_session}</p>
                <p><strong>Complaint:</strong> {d.message}</p>
                <p className="dispute-date">Filed: {new Date(d.created_at).toLocaleString()}</p>
              </div>
              {d.status === 'pending' && (
                resolving === d.id ? (
                  <div className="dispute-resolve">
                    <div className="form-group">
                      <label>New Score (leave blank to keep current)</label>
                      <input type="number" value={newScore} onChange={e => setNewScore(e.target.value)} min="0" max="100" placeholder="Optional" />
                    </div>
                    <div className="form-group">
                      <label>Response to Student</label>
                      <textarea value={response} onChange={e => setResponse(e.target.value)} rows={2} placeholder="Your response..." />
                    </div>
                    <div className="dispute-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleResolve(d.id, 'resolved')} disabled={resolvingLoading}>
                        {resolvingLoading ? 'Saving...' : 'Resolve'}
                      </button>
                      <button className="btn btn-sm btn-outline text-red" onClick={() => handleResolve(d.id, 'rejected')} disabled={resolvingLoading}>
                        {resolvingLoading ? 'Saving...' : 'Reject'}
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => setResolving(null)} disabled={resolvingLoading}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-primary" onClick={() => setResolving(d.id)}>Review</button>
                )
              )}
              {d.admin_response && <p className="dispute-response"><strong>Admin Response:</strong> {d.admin_response}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Students Manager ============ */
function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [form, setForm] = useState({ reg_number: '', full_name: '', department: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

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
    if (!form.reg_number.trim() || !form.full_name.trim() || !form.department.trim()) {
      alert('All fields are required');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/students', form);
      setForm({ reg_number: '', full_name: '', department: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add student');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student and all their results?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/students/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCSVFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      const start = lines[0].toLowerCase().includes('reg') || lines[0].toLowerCase().includes('name') ? 1 : 0;
      const rows = [];
      for (let i = start; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim());
        if (parts.length >= 3) {
          rows.push({ reg_number: parts[0], full_name: parts[1], department: parts[2] });
        } else if (parts.length === 2) {
          rows.push({ reg_number: parts[0], full_name: parts[1], department: '' });
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
    const missing = csvRows.filter(r => !r.department.trim());
    if (missing.length > 0) {
      alert(`${missing.length} row(s) are missing a department. Please fix your CSV.`);
      return;
    }
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

  const downloadStudentTemplate = () => {
    const csv = 'reg_number,full_name,department\n2022/CSC/010,John Doe,Computer Science\n2022/CSC/011,Jane Smith,Computer Science\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Manage Students</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={downloadStudentTemplate}>Download Template</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowCSV(!showCSV); setShowForm(false); }}>{showCSV ? 'Cancel' : 'Import CSV'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setShowCSV(false); }}>{showForm ? 'Cancel' : '+ Add Student'}</button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* CSV Import */}
      {showCSV && (
        <div className="csv-section" style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Import Students from CSV</h3>
          <p className="hint" style={{ marginBottom: '0.75rem' }}>
            CSV format: <strong>reg_number, full_name, department</strong>. Tip: Click <strong>Download Template</strong> above first.
          </p>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginBottom: '0.75rem', display: 'inline-flex' }}>
            Choose CSV File
            <input type="file" accept=".csv,.txt" onChange={handleCSVFile} hidden />
          </label>
          {csvRows.length > 0 && (
            <>
              <p style={{ fontWeight: 600, margin: '0.5rem 0' }}>Preview: {csvRows.length} students found</p>
              <div className="table-responsive" style={{ maxHeight: 250, overflowY: 'auto', marginBottom: '0.75rem' }}>
                <table className="result-table">
                  <thead><tr><th>S/N</th><th>Reg Number</th><th>Full Name</th><th>Department</th></tr></thead>
                  <tbody>
                    {csvRows.map((r, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td>{r.reg_number}</td>
                        <td>{r.full_name}</td>
                        <td>{r.department || <span style={{ color: 'red' }}>Missing!</span>}</td>
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

      {showForm && (
        <form onSubmit={handleAdd} className="inline-form">
          <input placeholder="Reg Number" value={form.reg_number} onChange={e => setForm({...form, reg_number: e.target.value})} required />
          <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
          <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
            <option value="">Select Department</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>{addLoading ? 'Saving...' : 'Save'}</button>
        </form>
      )}
      <div className="search-bar">
        <input placeholder="Search by name or reg number..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>Search</button>
      </div>
      {loading ? <p className="loading">Loading...</p> : (
        <div className="table-responsive">
          <table className="result-table">
            <thead><tr><th>Reg Number</th><th>Full Name</th><th>Department</th><th>Action</th></tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.reg_number}</td><td>{s.full_name}</td><td>{s.department}</td>
                  <td>
                    <button className="btn btn-sm btn-outline text-red" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}>
                      {deletingId === s.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p className="empty-state">No students found.</p>}
        </div>
      )}
    </div>
  );
}

/* ============ Courses Manager ============ */
function CoursesManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code:'', course_name:'', credit_units:'', department:'', level:'', semester:'' });
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setError('');
    try {
      const res = await api.get('/courses');
      setCourses(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const units = parseInt(form.credit_units);
    if (isNaN(units) || units < 1 || units > 10) {
      alert('Credit units must be between 1 and 10');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/courses', form);
      setForm({ course_code:'', course_name:'', credit_units:'', department:'', level:'', semester:'' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add course');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course and all its results?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/courses/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Manage Courses</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Course'}</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {showForm && (
        <form onSubmit={handleAdd} className="inline-form">
          <input placeholder="Course Code" value={form.course_code} onChange={e => setForm({...form, course_code: e.target.value})} required />
          <input placeholder="Course Name" value={form.course_name} onChange={e => setForm({...form, course_name: e.target.value})} required />
          <input type="number" placeholder="Credit Units" value={form.credit_units} onChange={e => setForm({...form, credit_units: e.target.value})} min="1" max="10" required />
          <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
            <option value="">Department</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} required>
            <option value="">Level</option>{[100,200,300,400,500].map(l=><option key={l} value={l}>{l}</option>)}
          </select>
          <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} required>
            <option value="">Semester</option><option value="1">1st</option><option value="2">2nd</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>{addLoading ? 'Saving...' : 'Save'}</button>
        </form>
      )}
      {loading ? <p className="loading">Loading...</p> : (
        <div className="table-responsive">
          <table className="result-table">
            <thead><tr><th>Code</th><th>Name</th><th>Units</th><th>Dept</th><th>Level</th><th>Semester</th><th>Action</th></tr></thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td className="bold">{c.course_code}</td><td>{c.course_name}</td><td className="center">{c.credit_units}</td>
                  <td>{c.department}</td><td className="center">{c.level}</td><td className="center">{c.semester === 1 ? '1st' : '2nd'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline text-red" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>
                      {deletingId === c.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && <p className="empty-state">No courses found.</p>}
        </div>
      )}
    </div>
  );
}

/* ============ Staff Manager (Lecturers & HODs) ============ */
function LecturersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', password:'', department:'', role:'lecturer' });
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setError('');
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (form.role === 'hod' && !form.department.trim()) {
      alert('Department is required for HOD role');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/users', form);
      setForm({ full_name:'', email:'', password:'', department:'', role:'lecturer' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Manage Staff</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Staff'}</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {showForm && (
        <form onSubmit={handleAdd} className="inline-form">
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required style={{ minWidth: 100 }}>
            <option value="lecturer">Lecturer</option>
            <option value="hod">HOD</option>
            <option value="registrar">Registrar</option>
          </select>
          <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
          <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} required={form.role === 'hod'}>
            <option value="">{form.role === 'hod' ? 'Department (required)' : 'Department (optional)'}</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>{addLoading ? 'Saving...' : 'Save'}</button>
        </form>
      )}
      {loading ? <p className="loading">Loading...</p> : (
        <div className="table-responsive">
          <table className="result-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Action</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td><td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>{u.department}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className="btn btn-sm btn-outline text-red" onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}>
                        {deletingId === u.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============ Departments Manager ============ */
function DepartmentsManager() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Department name is required'); return; }
    setAddLoading(true);
    try {
      await api.post('/departments', { name: name.trim() });
      setName('');
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add department');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSave = async (id) => {
    if (!editName.trim()) { alert('Name is required'); return; }
    setSavingId(id);
    try {
      await api.put(`/departments/${id}`, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to rename');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department? Only possible if no students, staff, or courses use it.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/departments/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Manage Departments</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Department'}</button>
      </div>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        Departments defined here appear as dropdown options when adding students, courses, and staff. Renaming a department updates it everywhere automatically.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {showForm && (
        <form onSubmit={handleAdd} className="inline-form" style={{ marginBottom: '1rem' }}>
          <input placeholder="Department name (e.g. Computer Science)" value={name} onChange={e => setName(e.target.value)} required style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>{addLoading ? 'Saving...' : 'Save'}</button>
        </form>
      )}
      {loading ? <p className="loading">Loading...</p> : (
        <div className="table-responsive">
          <table className="result-table">
            <thead><tr><th>S/N</th><th>Department Name</th><th>Actions</th></tr></thead>
            <tbody>
              {departments.map((d, i) => (
                <tr key={d.id}>
                  <td className="center">{i + 1}</td>
                  <td>
                    {editingId === d.id ? (
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="table-input" style={{ width: '100%' }} />
                    ) : d.name}
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {editingId === d.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSave(d.id)} disabled={savingId === d.id}>
                          {savingId === d.id ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)} disabled={savingId === d.id}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => { setEditingId(d.id); setEditName(d.name); }}>Rename</button>
                        <button className="btn btn-sm btn-outline text-red" onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}>
                          {deletingId === d.id ? '...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {departments.length === 0 && <p className="empty-state">No departments yet. Add one to get started.</p>}
        </div>
      )}
    </div>
  );
}

/* ============ Settings Manager ============ */
function SettingsManager({ settings, updateSettings }) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', form);
      updateSettings(res.data);
      alert('Settings saved!');
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card">
      <h2>School Settings</h2>
      <form onSubmit={handleSave}>
        <div className="form-grid">
          <div className="form-group">
            <label>School Name</label>
            <input value={form.school_name || ''} onChange={e => setForm({...form, school_name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>School Motto</label>
            <input value={form.school_motto || ''} onChange={e => setForm({...form, school_motto: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Logo URL</label>
            <input value={form.school_logo_url || ''} onChange={e => setForm({...form, school_logo_url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Primary Color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.primary_color || '#1a365d'} onChange={e => setForm({...form, primary_color: e.target.value})} style={{ width: 50, height: 38, padding: 2 }} />
              <input value={form.primary_color || ''} onChange={e => setForm({...form, primary_color: e.target.value})} style={{ flex: 1 }} />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </form>
    </div>
  );
}
