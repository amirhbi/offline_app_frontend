import { Routes, Route, Navigate } from 'react-router-dom';
import { Login, Dashboard, Users, Structure, Reports, Backup, Logs, L2Dashboard, L3Users, L2Data, L2Reports, L2Export, L3Dashboard, L3DataEntry, L3Export, FormData } from './pages';
import AdminLayout from './layouts/AdminLayout';
import L2Layout from './layouts/L2Layout';
import L3Layout from './layouts/L3Layout';
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
          <Route path="structure/data/:formId" element={<FormData />} />
          <Route path="reports" element={<Reports />} />
          <Route path="backup" element={<Backup />} />
          <Route path="logs" element={<Logs />} />
        </Route>
        <Route
          path="/l2"
          element={
            <RequireAuth>
              <L2Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/l2/dashboard" replace />} />
          <Route path="dashboard" element={<L2Dashboard />} />
          <Route path="l3-users" element={<L3Users />} />
          <Route path="data" element={<Structure />} />
          <Route path="reports" element={<L2Reports />} />
          <Route path="export" element={<L2Export />} />
        </Route>
        <Route
          path="/l3"
          element={
            <RequireAuth>
              <L3Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/l3/dashboard" replace />} />
          <Route path="dashboard" element={<L3Dashboard />} />
          <Route path="data" element={<Structure />} />
          <Route path="export" element={<L3Export />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
