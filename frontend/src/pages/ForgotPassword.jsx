import React, { useState } from 'react'; // Import React
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service'; // **Import từ auth.service.js**
import { Input, Button } from '../components/shared'; // **Sử dụng component Input, Button đã có**
import LoadingSpinner from '../components/shared/LoadingSpinner'; // **Sử dụng LoadingSpinner**
import { toast } from 'react-hot-toast'; // Sử dụng toast thay vì state status riêng

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  // const [status, setStatus] = useState({ type: '', message: '' }); // **Loại bỏ state status**
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // State để biết đã gửi thành công chưa

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setIsSuccess(false); // Reset trạng thái success
    // setStatus({ type: '', message: '' }); // Không cần nữa

    try {
      // **Gọi hàm từ authService**
      const response = await authService.requestPasswordReset(email);

      // **Sử dụng toast cho thành công**
      toast.success(response.message || 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam).');
      setIsSuccess(true); // Đánh dấu thành công để hiển thị message
      setEmail(''); // Xóa email sau khi gửi thành công

    } catch (error) {
      console.error('Lỗi quên mật khẩu:', error);
      // **Interceptor đã hiển thị toast lỗi, không cần làm gì thêm ở đây**
      // setStatus({ type: 'error', message: error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu' }); // Không cần nữa
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Có thể thêm logo ở đây */}
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Quên mật khẩu
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nhập địa chỉ email đã đăng ký của bạn.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isSuccess ? ( // **Hiển thị thông báo thành công dựa trên state isSuccess**
            <div className="rounded-md bg-green-50 p-4 text-center">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Yêu cầu đã được gửi!
              </h3>
              <p className="text-sm text-green-700">
                Vui lòng kiểm tra hộp thư email của bạn (bao gồm cả mục Spam/Junk) để tìm liên kết đặt lại mật khẩu.
              </p>
              <div className="mt-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Quay lại trang đăng nhập
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* **Không cần hiển thị lỗi ở đây vì đã có toast** */}
              {/* {status.type === 'error' && ( ... )} */}

              <div>
                {/* **Sử dụng component Input** */}
                <Input
                  label="Địa chỉ Email"
                  id="email"
                  type="email"
                  name="email" // Thêm name cho input
                  autoComplete="email" // Thêm autocomplete
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                {/* **Sử dụng component Button** */}
                <Button
                  type="submit"
                  className="w-full" // Thêm class w-full nếu cần Button full width
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" /> // Hiển thị spinner trong button
                  ) : (
                    'Gửi liên kết đặt lại'
                  )}
                </Button>
              </div>

              <div className="text-sm text-center">
                <Link
                  to="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Quay lại trang đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;