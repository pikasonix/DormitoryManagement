import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';
import { toast } from 'react-hot-toast'; // Optional

const StaffRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
    }

    // Kiểm tra user tồn tại VÀ có role là STAFF hoặc ADMIN
    const isAuthorized = user && (user.role === 'STAFF' || user.role === 'ADMIN');

    if (!isAuthorized) {
        console.warn('[StaffRoute] Access denied. User is not STAFF/ADMIN or not logged in. Redirecting to /');
        // Optional: toast.error('Bạn không có quyền truy cập khu vực này.');
        return <Navigate to="/" replace />;
        // return <Navigate to="/unauthorized" replace />;
    }

    // Nếu được phép, render nội dung
    return children ? children : <Outlet />;
};

export default StaffRoute;