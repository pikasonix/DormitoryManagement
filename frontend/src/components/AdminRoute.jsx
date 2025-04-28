import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';
import { toast } from 'react-hot-toast'; // Optional: Thông báo từ chối truy cập

const AdminRoute = ({ children }) => { // Nhận children để linh hoạt hơn
    const { user, isLoading } = useAuth();

    // Xử lý loading (có thể hiển thị spinner nhỏ hơn hoặc null)
    if (isLoading) {
        return <div className="flex justify-center py-10"><LoadingSpinner /></div>; // Spinner nhỏ hơn
        // return null; // Hoặc không hiển thị gì trong lúc chờ
    }

    // Kiểm tra user tồn tại VÀ có role là ADMIN
    const isAdmin = user && user.role === 'ADMIN';

    if (!isAdmin) {
        // Nếu không phải Admin (hoặc chưa đăng nhập)
        console.warn('[AdminRoute] Access denied. User is not ADMIN or not logged in. Redirecting to /');
        // Optional: Hiển thị thông báo lỗi nhẹ nhàng
        // toast.error('Bạn không có quyền truy cập khu vực này.');

        // Chuyển hướng về trang dashboard chính hoặc trang chủ
        return <Navigate to="/" replace />;
        // Hoặc chuyển hướng đến trang báo lỗi truy cập riêng:
        // return <Navigate to="/unauthorized" replace />;
    }

    // Nếu là Admin, render nội dung được bảo vệ
    // Ưu tiên render children nếu được truyền vào, nếu không thì render Outlet
    return children ? children : <Outlet />;
};

export default AdminRoute;