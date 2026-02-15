import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Navbar from './components/Navbar';
import StudentLookup from './pages/StudentLookup';
import Login from './pages/Login';
import LecturerDashboard from './pages/LecturerDashboard';
import HODDashboard from './pages/HODDashboard';
import RegistrarDashboard from './pages/RegistrarDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    // Redirect to the correct dashboard
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'hod') return <Navigate to="/hod" />;
    if (user.role === 'registrar') return <Navigate to="/registrar" />;
    return <Navigate to="/lecturer" />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StudentLookup />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/lecturer"
        element={
          <ProtectedRoute roles={['lecturer', 'hod', 'admin']}>
            <LecturerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod"
        element={
          <ProtectedRoute roles={['hod', 'admin']}>
            <HODDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrar"
        element={
          <ProtectedRoute roles={['registrar', 'admin']}>
            <RegistrarDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Navbar />
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
