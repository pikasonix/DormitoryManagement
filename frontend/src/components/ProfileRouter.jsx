import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

const ProfileRouter = ({ studentComponent, staffComponent }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If user is admin or staff, show staff profile component
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
        return staffComponent;
    }

    // Otherwise, show student profile (default)
    return studentComponent;
};

export default ProfileRouter;