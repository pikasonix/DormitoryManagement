import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { Link, useNavigate, Navigate } from 'react-router-dom'; // Thêm Navigate
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button } from '../components/shared'; // **Import component chung**
import LoadingSpinner from '../components/shared/LoadingSpinner'; // **Import LoadingSpinner**

const Register = () => {
  const navigate = useNavigate();
  const { register, user, isLoading: isAuthLoading } = useAuth(); // Lấy register, user, isLoading từ context
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState({}); // State cho lỗi validation
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading cục bộ

  // Chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/', { replace: true }); // Chuyển về trang chủ nếu đã đăng nhập
    }
  }, [isAuthLoading, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Xóa lỗi khi người dùng nhập lại
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (name === 'confirmPassword' && errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên.';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Địa chỉ email không hợp lệ.';
    if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu.';
    else if (formData.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear old errors

    if (!validateForm()) {
      return; // Stop submission if client validation fails
    }

    setIsSubmitting(true);
    try {
      // Loại bỏ confirmPassword trước khi gửi đi
      const { confirmPassword, ...registerData } = formData;

      // Gọi hàm register từ context
      const response = await register(registerData);

      // Hiển thị thông báo thành công từ response hoặc mặc định
      toast.success(response?.message || 'Đăng ký tài khoản thành công!');
      navigate('/login'); // Chuyển hướng đến trang đăng nhập sau khi thành công

    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      // Interceptor đã hiển thị toast lỗi chung
      // Hiển thị lỗi cụ thể nếu có từ server
      if (error?.errors && Array.isArray(error.errors)) {
        const serverErrors = {};
        error.errors.forEach(err => {
          if (err.field) serverErrors[err.field] = err.message;
          else serverErrors.general = err.message;
        });
        setErrors(serverErrors);
        if (serverErrors.general) toast.error(serverErrors.general); // Show general server error via toast
      } else {
        // Set lỗi chung nếu không có lỗi cụ thể
        setErrors({ general: error?.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
        // Toast đã hiển thị bởi interceptor/service
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị loading nếu context đang kiểm tra auth ban đầu
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Nếu đã đăng nhập, Navigate sẽ xử lý (useEffect)
  if (user) return null;

  return (
    // **Sử dụng lại layout tương tự trang Login**
    <div className="min-h-screen flex items-center justify-center relative bg-gray-100 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/loginformbackground.jpg")' }} // **Sử dụng cùng background**
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/70 via-purple-700/60 to-black/70" />

      {/* Register Form Container */}
      <div className="w-full max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-8 sm:px-10 sm:py-10 rounded-xl shadow-2xl border border-white/10">
          {/* Header */}
          <div className="text-center mb-6">
            <img
              className="mx-auto h-12 w-auto mb-4"
              src="/LOGO.svg" // **Sử dụng logo**
              alt="Dormitory Management System"
            />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Đăng ký tài khoản mới
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Tham gia hệ thống quản lý ký túc xá
            </p>
          </div>

          {/* Form Error Display */}
          {errors.general && (
            <div role="alert" className="mb-4 rounded border-s-4 border-red-500 bg-red-50 p-3">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Form Fields */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Sử dụng component Input */}
            <Input
              label="Họ và tên *"
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.fullName}
              autoComplete="name"
            />
            <Input
              label="Địa chỉ Email *"
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Mã sinh viên"
              id="studentId"
              name="studentId"
              type="text"
              value={formData.studentId}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.studentId}
              placeholder="Nhập mã sinh viên (nếu có)"
            />
            <Input
              label="Số điện thoại"
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.phoneNumber}
              placeholder="Nhập số điện thoại của bạn"
              autoComplete="tel"
            />
            <Input
              label="Mật khẩu *"
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.password}
              autoComplete="new-password"
              aria-describedby="password-hint"
            />
            <p className="text-xs text-gray-500 -mt-3" id="password-hint">
              Ít nhất 6 ký tự.
            </p>
            <Input
              label="Xác nhận mật khẩu *"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full mt-2" // Thêm margin top
                disabled={isSubmitting}
                isLoading={isSubmitting} // Prop isLoading cho Button
              >
                Đăng ký
              </Button>
            </div>
          </form>

          <div className="mt-6 text-sm text-center">
            <span className="text-gray-600">Đã có tài khoản? </span>
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;