import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

const ProfileRouter = ({ studentComponent, staffComponent, adminComponent }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If user is admin and adminComponent is provided, show admin profile component
    if (user?.role === 'ADMIN' && adminComponent) {
        return adminComponent;
    }

    // If user is admin (without admin component) or staff, show staff profile component
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
        return staffComponent;
    }

    // Otherwise, show student profile (default)
    return studentComponent;
};

export default ProfileRouter;