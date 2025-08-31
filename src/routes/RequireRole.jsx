import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

// Uso: <RequireRole roles={["RolLaboratorios"]}><Componente/></RequireRole>
export default function RequireRole({ roles = [], children }) {
  const { user, loading } = useAuth() || {};
  if (loading) return null; // o spinner
  if (!user) return <Navigate to="/" replace />;

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const hasRole = roles.length === 0 || roles.some(r => userRoles.includes(r));
  if (!hasRole) return <Navigate to="/layout/dashboard" replace />;

  return children;
}
