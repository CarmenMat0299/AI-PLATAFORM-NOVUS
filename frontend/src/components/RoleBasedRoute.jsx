import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, this should be handled by ProtectedRoute
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no roles specified, allow all authenticated users
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user's role is in the allowed roles
  const userRole = user?.role;
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    // Redirect to dashboard if user doesn't have access
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleBasedRoute;
