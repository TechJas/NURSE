import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — guards routes by auth + role/adminRole.
 * Props:
 *   role        = "nurse" | "admin"
 *   adminRole   = "platform_admin" | "hospital_admin" | "dept_head" (optional)
 */

function adminHome(adminRole) {
  if (adminRole === 'hospital_admin') return '/hospital-admin';
  if (adminRole === 'dept_head')      return '/dept';
  return '/admin';
}

export default function ProtectedRoute({ children, role, adminRole }) {
  const { token, user, isTokenExpired } = useAuth();

  if (!token || isTokenExpired()) {
    return <Navigate to="/login" replace />;
  }

  // Wrong top-level role
  if (role && user?.role !== role) {
    const home = user?.role === 'admin' ? adminHome(user?.admin_role) : '/dashboard';
    return <Navigate to={home} replace />;
  }

  // Admin sub-role guard
  if (adminRole && user?.admin_role !== adminRole) {
    return <Navigate to={adminHome(user?.admin_role)} replace />;
  }

  return children;
}
