import React, { useState, useEffect } from 'react'; // Import React
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button } from '../components/shared'; // **Import component chung**
import LoadingSpinner from '../components/shared/LoadingSpinner'; // **Import LoadingSpinner**
// Toast không cần import ở đây vì Context/Interceptor xử lý

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(''); // State lỗi riêng cho form
  const { login, user, isLoading: isAuthLoading } = useAuth(); // Đổi tên loading context
  const navigate = useNavigate(); // Giữ lại navigate nếu cần
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false); // Loading cục bộ cho form
  // Chuyển hướng nếu đã đăng nhập (Kiểm tra sau khi auth context load xong)
  useEffect(() => {
    if (!isAuthLoading && user) {
      const from = location.state?.from?.pathname || '/'; // Mặc định về trang chủ
      console.log(`[Login Page] User authenticated. Redirecting to: ${from}`);
      navigate(from, { replace: true });
    }
    // Chỉ chạy lại khi isAuthLoading hoặc user thay đổi
  }, [isAuthLoading, user, navigate, location.state]);

  // Listen for auth refresh events
  useEffect(() => {
    const handleAuthRefreshed = (event) => {
      if (event.detail && event.detail.user) {
        // If we're on the login page but receive an auth refresh event with a valid user,
        // that means auth was successful, so redirect
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    };

    window.addEventListener('auth-refreshed', handleAuthRefreshed);
    return () => {
      window.removeEventListener('auth-refreshed', handleAuthRefreshed);
    };
  }, [navigate, location.state]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); // Clear previous form errors
    if (isSubmitting) return; // Prevent double-submit

    // Input validation
    if (!email.trim()) {
      setFormError('Vui lòng nhập email của bạn.');
      return;
    }

    if (!password) {
      setFormError('Vui lòng nhập mật khẩu của bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call login from auth context with the updated implementation
      console.log('[Login Page] Attempting login...');
      const success = await login({ email, password });

      if (!success) {
        setFormError('Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      } else {
        console.log('[Login Page] Login successful. Auth context will handle redirection.');
        // The auth context will handle both setting the user and redirecting
      }
    } catch (caughtError) {
      // Handle exceptions thrown by the login function
      console.error('[Login Page] Login process error:', caughtError);
      setFormError(caughtError.message || 'Đăng nhập thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị loading toàn trang nếu context đang kiểm tra auth ban đầu
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Không render form nếu đã đăng nhập (đã được xử lý bởi useEffect)
  if (user) {
    return null; // Hoặc một spinner nhỏ nếu muốn
  }


  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gray-100 overflow-hidden"> {/* Thêm overflow-hidden */}
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/loginformbackground.jpg")' }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/70 via-purple-700/60 to-black/70" />

      {/* Login Form Container */}
      <div className="w-full max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-8 sm:px-10 sm:py-10 rounded-xl shadow-2xl border border-white/10">
          {/* Header */}
          <div className="text-center mb-6">
            <img
              className="mx-auto h-12 w-auto mb-4" // Căn giữa logo
              src="/LOGO.svg"
              alt="Dormitory Management System"
            />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              QUẢN LÝ KÝ TÚC XÁ
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Đăng nhập để tiếp tục
            </p>
          </div>

          {/* Form Error Display */}
          {formError && (
            <div role="alert" className="mb-4 rounded border-s-4 border-red-500 bg-red-50 p-3">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          {/* Form Fields */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <Input
                label="Email"
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                disabled={isSubmitting} // Disable khi đang submit
              />
            </div>

            {/* Password Input */}
            <div>
              <Input
                label="Mật khẩu"
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                disabled={isSubmitting} // Disable khi đang submit
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right text-sm">
              <Link
                to="/forgot-password"
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full" // Button full width
                disabled={isSubmitting} // Disable khi đang submit
                isLoading={isSubmitting} // Prop isLoading cho Button component
              >
                Đăng nhập
              </Button>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-sm text-center">
            <span className="text-gray-600">Chưa có tài khoản? </span>
            <Link
              to="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Đăng ký ngay
            </Link>
          </div>

          {/* Demo Credentials (Optional) */}
          {/* (Giữ nguyên phần thông tin đăng nhập thử nghiệm nếu bạn muốn) */}
          <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
            <p className="font-medium">Tài khoản thử nghiệm:</p>
            <p>Admin: admin@example.com / admin123</p>
            <p>Staff: staff1@example.com / staff123</p>
            <p>Student: student1@example.com / student123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;