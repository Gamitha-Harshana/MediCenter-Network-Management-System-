import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * ProtectedRoute — renders children only when:
 *  1. The user is authenticated (valid token in context)
 *  2. The user's role matches one of the `allowedRoles` (optional)
 *
 * Props:
 *   children     - what to render when access is granted
 *   allowedRoles - string | string[] of permitted roles (omit = any role)
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Wait for localStorage rehydration before deciding
  if (loading) return <LoadingSpinner />;

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Role check (if specified)
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      // Redirect to the user's own dashboard
      const dashboardMap = {
        SysAdmin: '/sysadmin/dashboard',
        MediCenterAdmin: '/admin/dashboard',
        Doctor: '/doctor/dashboard',
        Patient: '/patient/home',
      };
      return <Navigate to={dashboardMap[user.role] ?? '/login'} replace />;
    }
  }

  return children;
}
