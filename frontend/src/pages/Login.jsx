import { useState, useEffect } from 'react'; // Thêm useEffect nếu cần xử lý focus hoặc logic khác
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom'; // Thêm useLocation
import { useAuth } from '../contexts/AuthContext'; // Sử dụng context đã sửa
import { toast } from 'react-hot-toast'; // Import toast để hiển thị lỗi (nếu context/interceptor chưa làm)

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State để hiển thị lỗi trên form
  const { login, user, loading: authLoading } = useAuth(); // Lấy user và loading từ context, đổi tên loading để tránh trùng
  const navigate = useNavigate(); // Vẫn cần navigate cho các trường hợp khác (nếu có)
  const location = useLocation(); // Lấy location để biết trang trước đó (nếu cần)

  // State loading cục bộ cho nút submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chuyển hướng nếu đã đăng nhập (kiểm tra bằng user thay vì authenticated)
  // Chạy kiểm tra này sau khi authLoading ban đầu hoàn tất
  if (!authLoading && user) {
    const from = location.state?.from?.pathname || '/dashboard'; // Lấy đích đến từ state hoặc mặc định
    console.log(`[Login Page] User already authenticated. Redirecting to: ${from}`);
    return <Navigate to={from} replace />;
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Xóa lỗi cũ
    setIsSubmitting(true); // Bắt đầu submit, khóa nút

    try {
      // Gọi hàm login từ context, truyền object credentials
      await login({ email, password });
      // Không cần navigate ở đây nữa, AuthContext sẽ xử lý điều hướng sau khi thành công
      // navigate('/dashboard');
    } catch (caughtError) {
      // Hàm login trong context đã throw lỗi (có thể từ API hoặc validation)
      console.error('[Login Page] Login failed:', caughtError);
      const errorMessage = caughtError.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errorMessage); // Hiển thị lỗi trên form
      // Không cần toast ở đây nếu interceptor hoặc context đã hiển thị
      // toast.error(errorMessage);
    } finally {
      setIsSubmitting(false); // Luôn mở khóa nút sau khi xử lý xong
    }
  };

  // Nếu đang kiểm tra auth ban đầu, có thể hiển thị loading toàn trang
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>; // Hoặc Spinner
  }

  return (
    // --- Phần JSX giữ nguyên cấu trúc ---
    <div className="min-h-screen flex items-center justify-center relative bg-gray-100">
      {/* Hình nền */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/loginformbackground.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/70 via-purple-900/60 to-black/70" /> {/* Gradient đẹp hơn */}
      </div>

      {/* Biểu mẫu đăng nhập */}
      <div className="w-full max-w-md z-10 px-4 sm:px-0"> {/* Thêm padding cho mobile */}
        <div className="bg-white/95 backdrop-blur-md px-8 py-10 rounded-xl shadow-2xl border border-gray-200/50"> {/* Style đẹp hơn */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <img
                className="h-14 w-auto" // Tăng kích thước logo
                src="/LOGO.svg"
                alt="Dormitory Management System"
              />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              QUẢN LÝ KÝ TÚC XÁ
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Đăng nhập vào hệ thống
            </p>
          </div>

          {/* Hiển thị lỗi */}
          {error && (
            <div role="alert" className="mb-4 rounded border-s-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.557 13.004c1.155 2-.262 4.5-2.599 4.5H4.443c-2.336 0-3.754-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <strong className="block font-medium"> Lỗi đăng nhập: </strong>
              </div>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900" // Cập nhật class
              >
                Email
              </label>
              <div className="mt-2"> {/* Thêm div bọc */}
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" // Class mới
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting} // Disable khi đang submit
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Mật khẩu
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" // Class mới
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting} // Disable khi đang submit
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* <div className="flex items-center"> // Bỏ ghi nhớ nếu không dùng
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-3 block text-sm leading-6 text-gray-900"
                                >
                                    Ghi nhớ tôi
                                </label>
                            </div> */}
              <div className="text-sm leading-6"> {/* Đẩy Quên mật khẩu sang phải */}
                {/* Giữ lại div trống để đẩy sang phải nếu bỏ remember me */}
              </div>

              <div className="text-sm leading-6">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting} // Disable nút khi đang submit
                className={`flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-150 ${isSubmitting
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {isSubmitting ? ( // Hiển thị chữ khác khi đang loading
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>

          {/* Thông tin đăng nhập thử nghiệm (có thể xóa trong production) */}
          <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
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