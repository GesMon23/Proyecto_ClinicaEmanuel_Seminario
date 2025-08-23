import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

export default function RoleRoute({ children, allow = [] }) {
  const { user, loading } = useAuth() || {};
  if (loading) return null; // spinner si quieres
  const roles = user?.roles || [];
  const ok = allow.length === 0 || roles.some(r => allow.includes(r));
  return ok ? children : <Navigate to="/layout/dashboard" replace />;
}
