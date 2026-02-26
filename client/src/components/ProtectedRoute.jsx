import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }) {
    const { isAuthenticated, hasRole } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && !roles.some((r) => hasRole(r))) return <Navigate to="/dashboard" replace />;

    return <Outlet />;
}
