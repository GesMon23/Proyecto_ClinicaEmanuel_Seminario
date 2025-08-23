import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth() || {};
  if (loading) return null; // puedes renderizar un spinner
  if (!user) return <Navigate to="/" replace />;
  return children;
}
