import { Routes, Route, Navigate } from 'react-router-dom';
import { Login, Dashboard, Users, Structure, Reports, Backup, Logs } from './pages';
import AdminLayout from './layouts/AdminLayout';
import RequireAuth from './routes/RequireAuth';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="structure" element={<Structure />} />
          <Route path="reports" element={<Reports />} />
          <Route path="backup" element={<Backup />} />
          <Route path="logs" element={<Logs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
