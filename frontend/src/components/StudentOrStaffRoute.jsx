import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

/**
 * Route component that allows both students and staff/admin to access the route.
 * Redirects to home if user is not authenticated or has an invalid role.
 */
const StudentOrStaffRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
    }

    // Check if user exists AND has a valid role (STUDENT, STAFF, or ADMIN)
    const isAuthorized = user &&
        (user.role === 'STUDENT' || user.role === 'STAFF' || user.role === 'ADMIN');

    if (!isAuthorized) {
        console.warn('[StudentOrStaffRoute] Access denied. User has invalid role or is not logged in. Redirecting to /');
        return <Navigate to="/" replace />;
    }

    // If authorized, render content
    return children ? children : <Outlet />;
};

export default StudentOrStaffRoute;
