import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          {settings.school_logo_url && (
            <img src={settings.school_logo_url} alt="Logo" className="navbar-logo" />
          )}
          <div>
            <div className="navbar-school-name">{settings.school_name}</div>
            {settings.school_motto && (
              <div className="navbar-motto">{settings.school_motto}</div>
            )}
          </div>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Result Checker</Link>
          {user ? (
            <>
              <Link
                to={user.role === 'admin' ? '/admin' : user.role === 'hod' ? '/hod' : user.role === 'registrar' ? '/registrar' : '/lecturer'}
                className="nav-link"
              >
                Dashboard
              </Link>
              <span className="nav-user">{user.full_name}</span>
              <button onClick={handleLogout} className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link">Staff Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
