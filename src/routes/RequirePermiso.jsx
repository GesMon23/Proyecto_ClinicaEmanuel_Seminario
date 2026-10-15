import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { permisosDeModulo, tieneAlguno } from '@/constants/permisos';
import Cargando from '@/components/Cargando';

// Uso: <RequirePermiso modulo="turnos"><Turnos/></RequirePermiso>
// Deja entrar si el usuario tiene alguna pestaña del módulo (constants/permisos.js); si no, vuelve al inicio.
export default function RequirePermiso({ modulo, children }) {
  const { user, loading } = useAuth() || {};
  if (loading) return <Cargando variante="pantalla" texto="Verificando permisos..." />;
  if (!user) return <Navigate to="/" replace />;
  if (!tieneAlguno(user, permisosDeModulo(modulo))) return <Navigate to="/layout/dashboard" replace />;
  return children;
}
