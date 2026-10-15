import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import Cargando from '@/components/Cargando';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth() || {};
  if (loading) return <Cargando variante="pantalla" texto="Verificando sesión..." className="min-h-screen bg-slate-100 dark:bg-slate-950" />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
