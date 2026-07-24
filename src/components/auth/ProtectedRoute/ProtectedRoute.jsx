import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import { FullPageLoader } from '../../ui/Loader/Loader.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!isAuthenticated) {
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
