import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Đường dẫn đến context
import LoadingSpinner from './shared/LoadingSpinner'; // Component spinner
import DashboardLayout from '../layouts/DashboardLayout'; // Import layout

const PrivateRoute = () => {
  const { user, isLoading } = useAuth(); // Lấy user và trạng thái loading
  const location = useLocation(); // Lấy vị trí hiện tại để redirect lại sau login

  // Trường hợp 1: Đang kiểm tra trạng thái đăng nhập ban đầu
  if (isLoading) {
    // Hiển thị spinner toàn trang hoặc một layout chờ tối giản
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Trường hợp 2: Kiểm tra xong, chưa đăng nhập
  if (!user) {
    // Chuyển hướng đến trang login, lưu lại trang người dùng muốn vào
    // state={{ from: location }} giúp trang Login biết được cần redirect về đâu
    console.log('[PrivateRoute] User not logged in. Redirecting to /login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Trường hợp 3: Đã đăng nhập
  // Render DashboardLayout và Outlet để hiển thị các route con bên trong layout này
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default PrivateRoute;