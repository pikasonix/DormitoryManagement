import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
// Sửa đường dẫn import apiClient cho đúng
import apiClient from '../api/axios'; // Sử dụng instance Axios đã cấu hình
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // Import toast để thông báo lỗi

// --- Helper Functions for Storage ---
const getTokenFromStorage = () => localStorage.getItem('authToken'); // Đổi tên key nếu cần
const setTokenInStorage = (token) => localStorage.setItem('authToken', token);
const removeTokenFromStorage = () => localStorage.removeItem('authToken');

const getUserFromStorage = () => {
  const userJson = localStorage.getItem('authUser'); // Đổi tên key nếu cần
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    removeUserFromStorage(); // Xóa nếu data bị hỏng
    return null;
  }
};
const setUserInStorage = (user) => localStorage.setItem('authUser', JSON.stringify(user));
const removeUserFromStorage = () => localStorage.removeItem('authUser');

// --- Context Creation ---
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // State: user chứa toàn bộ thông tin (id, email, role, avatar, profile)
  const [user, setUser] = useState(getUserFromStorage()); // Khởi tạo user từ localStorage
  const [loading, setLoading] = useState(true); // Bắt đầu với loading=true để checkAuth
  const navigate = useNavigate();
  const location = useLocation(); // Để lấy state.from khi redirect sau login

  // --- Hàm kiểm tra xác thực ban đầu ---
  // Sử dụng useCallback để tránh tạo lại hàm mỗi lần render
  const checkAuthStatus = useCallback(async () => {
    console.log("[AuthContext] Checking auth status...");
    setLoading(true);
    const token = getTokenFromStorage();

    if (!token) {
      console.log("[AuthContext] No token found. User not authenticated.");
      setUser(null); // Đảm bảo user là null nếu không có token
      removeUserFromStorage(); // Xóa user cũ nếu có
      setLoading(false);
      return;
    }

    try {
      // Không cần set header ở đây, interceptor của apiClient sẽ làm
      // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`; << BỎ ĐI

      // Gọi API /auth/me để lấy thông tin user mới nhất
      // Interceptor sẽ tự động thêm token vào header
      const response = await apiClient.get('/auth/me');

      if (response.data?.user) {
        console.log("[AuthContext] Auth check successful. User data:", response.data.user);
        const userData = response.data.user;
        setUser(userData); // Cập nhật state với thông tin mới nhất
        setUserInStorage(userData); // Lưu lại vào localStorage
      } else {
        // Trường hợp API trả về 200 nhưng không có user? (Bất thường)
        console.warn("[AuthContext] Auth check successful but no user data returned.");
        setUser(null);
        removeTokenFromStorage();
        removeUserFromStorage();
      }
    } catch (error) {
      // Lỗi 401 (Unauthorized) sẽ được interceptor xử lý (xóa token, user, báo lỗi)
      // Chỉ cần xử lý các lỗi khác nếu có (vd: lỗi mạng)
      // Interceptor đã log lỗi rồi, ở đây chỉ cần set state
      console.error('[AuthContext] Auth check failed:', error);
      setUser(null);
      // Token có thể đã bị xóa bởi interceptor, nhưng xóa lại cho chắc
      removeTokenFromStorage();
      removeUserFromStorage();
    } finally {
      setLoading(false); // Luôn set loading false sau khi kiểm tra xong
    }
  }, []); // Dependency rỗng vì nó chỉ chạy 1 lần hoặc khi gọi lại thủ công

  // Chạy checkAuthStatus khi component mount lần đầu
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]); // Thêm checkAuthStatus vào dependency array


  // --- Hàm Đăng nhập ---
  const login = async (credentials) => {
    // credentials là object { email, password }
    console.log("[AuthContext] Attempting login...");
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', credentials);

      if (response.data?.token && response.data?.user) {
        const { token, user: userData, profile } = response.data; // Lấy cả profile nếu backend trả về
        console.log("[AuthContext] Login successful. User:", userData, "Profile:", profile);

        // Lưu token và thông tin user đầy đủ (bao gồm profile nếu có)
        setTokenInStorage(token);
        // Gộp profile vào user data trước khi lưu nếu backend không tự làm
        const userToStore = profile ? { ...userData, profile } : userData;
        setUserInStorage(userToStore);
        setUser(userToStore); // Cập nhật state

        // Điều hướng sau khi đăng nhập
        const from = location.state?.from?.pathname || '/dashboard'; // Lấy đường dẫn trước đó hoặc về dashboard
        navigate(from, { replace: true });

        toast.success('Đăng nhập thành công!');
        return userToStore; // Trả về thông tin user
      } else {
        // Trường hợp API trả về 200 nhưng thiếu token/user?
        throw new Error("Phản hồi đăng nhập không hợp lệ từ máy chủ.");
      }
    } catch (error) {
      console.error("[AuthContext] Login failed:", error);
      // Lỗi đã được interceptor xử lý và hiển thị toast
      // Chỉ cần throw lại lỗi để component Login biết và xử lý (vd: disable button)
      // Có thể lấy message cụ thể hơn từ error.response.data.message nếu interceptor không throw
      const errorMessage = error.response?.data?.message || error.message || 'Đăng nhập thất bại.';
      // Không cần toast ở đây nữa nếu interceptor đã làm
      // toast.error(errorMessage);
      throw new Error(errorMessage); // Ném lỗi để component gọi xử lý
    } finally {
      setLoading(false);
    }
  };

  // --- Hàm Đăng xuất ---
  const logout = useCallback(() => {
    console.log("[AuthContext] Logging out...");
    setUser(null);
    removeTokenFromStorage();
    removeUserFromStorage();
    // Không cần gọi API backend /auth/logout
    // Không cần xóa header trong apiClient vì interceptor sẽ không tìm thấy token để thêm nữa
    toast.success('Đăng xuất thành công.');
    navigate('/login', { replace: true }); // Chuyển về trang login
  }, [navigate]); // Thêm navigate vào dependency


  // Không cần trả về `authenticated` vì `!!user` đã thể hiện điều đó
  // Không cần `error` state vì lỗi được xử lý/hiển thị qua toast/throw
  const value = {
    user, // Object user đầy đủ hoặc null
    loading, // Trạng thái loading khi check auth ban đầu hoặc đang login
    login,   // Hàm để gọi khi đăng nhập
    logout,  // Hàm để gọi khi đăng xuất
    checkAuthStatus // Có thể cung cấp hàm này nếu cần refresh lại thông tin user thủ công
  };

  // Chỉ render children khi loading ban đầu đã xong (tránh FOUC)
  // Hoặc render children ngay cả khi đang loading và để PrivateRoute xử lý loading state
  // Cách 2: Render children ngay, để PrivateRoute/component con xử lý loading
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

  // Cách 1: Chỉ render khi hết loading ban đầu (có thể gây màn hình trắng lâu hơn)
  // return (
  //     <AuthContext.Provider value={value}>
  //         {!loading ? children : <div>Loading Application...</div>}
  //     </AuthContext.Provider>
  // );
};

// Hook tùy chỉnh để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) { // Kiểm tra cả undefined và null
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};