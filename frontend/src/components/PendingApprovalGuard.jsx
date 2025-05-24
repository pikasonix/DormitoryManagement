import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';
import { toast } from 'react-hot-toast';


const PendingApprovalGuard = ({ children }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // Debug logging
    console.log(`[PendingApprovalGuard] Checking path: ${location.pathname}`);

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If not authenticated, let PrivateRoute handle it
    if (!user) {
        return children;
    }

    // Only apply to students
    if (user.role !== 'STUDENT') {
        return children;
    }

    // Check student status from multiple possible sources
    const studentStatus = user?.profile?.status ||
        user?.studentProfile?.status ||
        user?.status;    // If student has PENDING_APPROVAL status, redirect to profile edit
    if (studentStatus === 'PENDING_APPROVAL') {
        // Danh sách các đường dẫn được phép truy cập
        const allowedPaths = [
            '/profile',
            '/profile/edit',
            '/login',
            '/dashboard'
        ];

        // Đường dẫn hiện tại
        const currentPath = location.pathname;

        // Kiểm tra xem đường dẫn hiện tại có trong danh sách cho phép không
        const isAllowedPath = allowedPaths.some(path => currentPath === path);

        if (isAllowedPath) {
            return children;
        }

        // Block cụ thể từng loại trang
        if (currentPath.startsWith('/rooms') ||
            currentPath.startsWith('/maintenance') ||
            currentPath.startsWith('/invoices') ||
            currentPath.startsWith('/vehicles') ||
            currentPath.startsWith('/transfers')) {

            console.log(`[PendingApprovalGuard] Blocking access to restricted area ${currentPath}`);

            // Hiển thị thông báo yêu cầu cập nhật
            toast.error('Vui lòng cập nhật hồ sơ cá nhân trước khi truy cập tính năng này', {
                id: 'pending-approval-restriction',
                duration: 5000
            });
        } else {
            console.log(`[PendingApprovalGuard] Blocking access to ${currentPath} for student with PENDING_APPROVAL status`);
        }

        // Chuyển hướng đến trang chỉnh sửa hồ sơ với thông báo
        return <Navigate to="/profile/edit" state={{ pendingApproval: true }} replace />;
    }

    // For all other cases, render children normally
    return children;
};

export default PendingApprovalGuard;
