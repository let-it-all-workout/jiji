import { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import ResultTable from '../components/ResultTable';

const LEVELS = [100, 200, 300, 400, 500];
const SEMESTERS = [
  { value: 1, label: '1st Semester' },
  { value: 2, label: '2nd Semester' },
];

export default function StudentLookup() {
  const { settings } = useSettings();
  const [reg, setReg] = useState('');
  const [session, setSession] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [sessions, setSessions] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verify registration state
  const [showVerify, setShowVerify] = useState(false);
  const [verifyReg, setVerifyReg] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    api.get('/settings/sessions')
      .then(res => {
        const data = res.data ?? [];
        setSessions(data);
        if (data.length > 0) setSession(data[0]);
      })
      .catch(() => { setSessions([]); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResultData(null);

    if (!reg || !session || !level || !semester) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/results', {
        params: { reg: reg.trim(), session, level, semester },
      });
      setResultData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const url = `${api.defaults.baseURL}/pdf/result?reg=${encodeURIComponent(reg.trim())}&session=${encodeURIComponent(session)}&level=${level}&semester=${semester}`;
    window.open(url, '_blank');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyReg.trim()) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await api.get('/students/verify', { params: { reg: verifyReg.trim() } });
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({ found: false, error: err.response?.data?.error || 'Verification failed' });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="hero" style={{ background: `linear-gradient(135deg, ${settings.primary_color || '#0c2d5e'} 0%, ${settings.primary_color || '#0c2d5e'}cc 50%, ${settings.primary_color || '#0c2d5e'}99 100%)` }}>
        <div className="hero-content">
          {settings.school_logo_url && (
            <img src={settings.school_logo_url} alt="Logo" className="hero-logo" />
          )}
          <h1>{settings.school_name || 'School Result Checker'}</h1>
          {settings.school_motto && <p className="hero-subtitle">{settings.school_motto}</p>}
          <span className="hero-tag">Student Result Portal</span>
        </div>
      </div>

      <div className="container">
        {/* Verify Registration Section — prominent card */}
        <div className="card" style={{ maxWidth: 750, margin: '0 auto 1.5rem', padding: '1.25rem 1.5rem', border: `2px solid ${settings.primary_color || '#0c2d5e'}33`, background: `${settings.primary_color || '#0c2d5e'}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: showVerify ? '1rem' : 0, cursor: 'pointer' }} onClick={() => { setShowVerify(!showVerify); setVerifyResult(null); }}>
            <span style={{ fontSize: '1.4rem' }}>&#128269;</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: settings.primary_color || '#0c2d5e' }}>
                Verify My Registration
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                Check if your registration number is recognized in the school portal
              </p>
            </div>
            <span style={{ fontSize: '1.2rem', transform: showVerify ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>&#9660;</span>
          </div>

          {showVerify && (
            <div>
              <form onSubmit={handleVerify} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={verifyReg}
                  onChange={(e) => setVerifyReg(e.target.value.toUpperCase())}
                  placeholder="Enter your Reg Number (e.g. 2022/CSC/010)"
                  required
                  style={{ flex: 1, minWidth: 200 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={verifyLoading}>
                  {verifyLoading ? 'Checking...' : 'Check Now'}
                </button>
              </form>

              {verifyResult && (
                <div style={{ marginTop: '0.75rem' }}>
                  {verifyResult.found ? (
                    <div className="alert alert-success" style={{ margin: 0 }}>
                      <strong>Confirmed!</strong> You are registered &mdash; <strong>{verifyResult.full_name}</strong>, {verifyResult.department} Department
                    </div>
                  ) : (
                    <div className="alert alert-error" style={{ margin: 0 }}>
                      {verifyResult.error || 'Registration number not found in the school portal. Please contact the Registrar\'s office.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <form className="lookup-form card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg">Registration Number</label>
              <input
                id="reg"
                type="text"
                value={reg}
                onChange={(e) => setReg(e.target.value.toUpperCase())}
                placeholder="e.g. 2022/CSC/010"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="session">Academic Session</label>
              <select
                id="session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                required
              >
                <option value="">Select Session</option>
                {sessions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
              >
                <option value="">Select Level</option>
                {LEVELS.map(l => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="semester">Semester</label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              >
                <option value="">Select Semester</option>
                {SEMESTERS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-accent btn-block" disabled={loading}>
            {loading ? 'Checking...' : 'Check Result'}
          </button>
        </form>

        {error && <div className="alert alert-error" style={{ maxWidth: 750, margin: '1rem auto' }}>{error}</div>}
        {resultData && <ResultTable data={resultData} onDownloadPDF={handleDownloadPDF} />}
      </div>

      <footer className="footer">
        <strong>{settings.school_name || 'School'}</strong> &mdash; Student Result Portal &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
