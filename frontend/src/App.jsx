import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage               from './pages/Login';
import RegisterPage            from './pages/Register';
import NurseDashboard          from './pages/NurseDashboard';
import AdminDashboard          from './pages/AdminDashboard';
import HospitalAdminDashboard  from './pages/HospitalAdminDashboard';
import NurseRegistry           from './pages/NurseRegistry';
import InterviewsPage          from './pages/Interviews';
import RequestsPage            from './pages/Requests';
import DocumentsPage           from './pages/Documents';
import WorkingShift            from './pages/WorkingShift';
import SystemIDGeneration      from './pages/SystemIDGeneration';
import DutyPage                from './pages/DutyPage';
import DeptHeadDashboard       from './pages/DeptHeadDashboard';
import SetNewPassword          from './pages/SetNewPassword';
import ProfileSettings         from './pages/ProfileSettings';
import HospitalAdminManagement from './pages/HospitalAdminManagement';

function RootRedirect() {
  const { token, user, isTokenExpired } = useAuth();
  if (!token || isTokenExpired()) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') {
    if (user?.admin_role === 'dept_head') return <Navigate to="/dept" replace />;
    return <Navigate to={user?.admin_role === 'hospital_admin' ? '/hospital-admin' : '/admin'} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Nurse routes */}
          <Route path="/dashboard"     element={<ProtectedRoute role="nurse"><NurseDashboard /></ProtectedRoute>} />
          <Route path="/requests"      element={<ProtectedRoute role="nurse"><RequestsPage /></ProtectedRoute>} />
          <Route path="/documents"     element={<ProtectedRoute role="nurse"><DocumentsPage /></ProtectedRoute>} />
          <Route path="/working-shift" element={<ProtectedRoute role="nurse"><WorkingShift /></ProtectedRoute>} />
          <Route path="/duty"          element={<ProtectedRoute role="nurse"><DutyPage /></ProtectedRoute>} />

          {/* Platform Admin routes */}
          <Route path="/admin"                element={<ProtectedRoute role="admin" adminRole="platform_admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/nurses"         element={<ProtectedRoute role="admin" adminRole="platform_admin"><NurseRegistry /></ProtectedRoute>} />
          <Route path="/admin/interviews"     element={<ProtectedRoute role="admin" adminRole="platform_admin"><InterviewsPage /></ProtectedRoute>} />
          <Route path="/admin/system-id"      element={<ProtectedRoute role="admin" adminRole="platform_admin"><SystemIDGeneration /></ProtectedRoute>} />
          <Route path="/admin/hospital-admins" element={<ProtectedRoute role="admin" adminRole="platform_admin"><HospitalAdminManagement /></ProtectedRoute>} />

          {/* Hospital Admin routes */}
          <Route path="/hospital-admin"            element={<ProtectedRoute role="admin" adminRole="hospital_admin"><HospitalAdminDashboard /></ProtectedRoute>} />
          <Route path="/hospital-admin/nurses"     element={<ProtectedRoute role="admin" adminRole="hospital_admin"><HospitalAdminDashboard defaultTab="nurses" /></ProtectedRoute>} />
          <Route path="/hospital-admin/tasks"      element={<ProtectedRoute role="admin" adminRole="hospital_admin"><HospitalAdminDashboard defaultTab="tasks" /></ProtectedRoute>} />
          <Route path="/hospital-admin/dept-heads" element={<ProtectedRoute role="admin" adminRole="hospital_admin"><HospitalAdminDashboard defaultTab="dept-heads" /></ProtectedRoute>} />

          {/* Dept Head routes */}
          <Route path="/dept"        element={<ProtectedRoute role="admin" adminRole="dept_head"><DeptHeadDashboard /></ProtectedRoute>} />
          <Route path="/dept/nurses" element={<ProtectedRoute role="admin" adminRole="dept_head"><DeptHeadDashboard defaultTab="nurses" /></ProtectedRoute>} />
          <Route path="/dept/tasks"  element={<ProtectedRoute role="admin" adminRole="dept_head"><DeptHeadDashboard defaultTab="tasks" /></ProtectedRoute>} />

          {/* Profile settings — any authenticated user */}
          <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

          {/* First-login password reset */}
          <Route path="/set-password" element={<ProtectedRoute><SetNewPassword /></ProtectedRoute>} />

          {/* Root */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
