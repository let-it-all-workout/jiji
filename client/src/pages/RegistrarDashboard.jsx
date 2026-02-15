import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function RegistrarDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();

  return (
    <div className="page dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Registrar Dashboard</h1>
          <p>Welcome, {user?.full_name} &mdash; Student Registration Management</p>
        </div>

        <StudentsManager />
      </div>
      <footer className="footer">
        <strong>{settings.school_name || 'School'}</strong> &mdash; Result Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ============ Students Manager (Registrar - all departments) ============ */
function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [form, setForm] = useState({ reg_number: '', full_name: '', department: '' });
  const [addLoading, setAddLoading] = useState(false);
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
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      const res = await api.get('/students', { params });
      setStudents(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [deptFilter]);

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
        <h2>Manage Students (All Departments)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={downloadStudentTemplate}>
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
          <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
            <option value="">Select Department</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
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
            CSV format: <strong>reg_number, full_name, department</strong> (one student per line).
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

      {/* Search + Department Filter */}
      <div className="search-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or reg number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); }} style={{ minWidth: 150 }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>Search</button>
      </div>

      {/* Students Table */}
      {loading ? <p className="loading">Loading...</p> : (
        <>
          <p className="hint" style={{ marginBottom: '0.5rem' }}>{students.length} students found</p>
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
