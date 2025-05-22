import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

/**
 * Route component that allows only students to access the route.
 * Redirects to home if user is not authenticated or doesn't have STUDENT role.
 */
const StudentRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
    }

    // Check if user exists AND has STUDENT role
    const isAuthorized = user && user.role === 'STUDENT';

    if (!isAuthorized) {
        console.warn('[StudentRoute] Access denied. User is not a student or not logged in. Redirecting to /');
        return <Navigate to="/" replace />;
    }

    // If authorized, render content
    return children ? children : <Outlet />;
};

export default StudentRoute;
