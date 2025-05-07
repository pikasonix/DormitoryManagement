import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authService } from '../services/auth.service';

// --- Helper Functions for Storage ---
const getTokenFromStorage = () => localStorage.getItem('authToken');
const setTokenInStorage = (token) => localStorage.setItem('authToken', token);
const removeTokenFromStorage = () => localStorage.removeItem('authToken');

const getUserFromStorage = () => {
  const userJson = localStorage.getItem('authUser');
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Lỗi parse user từ localStorage:", error);
    removeUserFromStorage();
    return null;
  }
};
const setUserInStorage = (user) => localStorage.setItem('authUser', JSON.stringify(user));
const removeUserFromStorage = () => localStorage.removeItem('authUser');

// --- Context Creation ---
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUserFromStorage());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Check Authentication ---
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    const token = getTokenFromStorage();

    if (!token) {
      setUser(null);
      removeUserFromStorage();
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.getMe();

      // Xử lý cấu trúc phản hồi mới (có data.user)
      const userData = response.data?.user || response.user;

      if (userData) {
        setUser(userData);
        setUserInStorage(userData);
      } else {
        setUser(null);
        removeTokenFromStorage();
        removeUserFromStorage();
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('[AuthContext] Auth check failed (non-401):', error);
      }
      setUser(null);
      removeTokenFromStorage();
      removeUserFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // --- Login Function ---
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials.email, credentials.password);

      // Xử lý cấu trúc phản hồi mới
      const data = response.data || response;
      const userData = data.user;
      const token = data.token;

      if (!userData || !token) {
        throw new Error('Dữ liệu đăng nhập không hợp lệ');
      }

      setTokenInStorage(token);
      setUserInStorage(userData);
      setUser(userData);

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

      toast.success('Đăng nhập thành công!');
      return true;
    } catch (error) {
      console.error("[AuthContext] Login failed:", error);
      // Display error toast but don't navigate away
      toast.error(error.message || 'Đăng nhập thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Update User (dùng cho cập nhật thông tin, kể cả avatar) ---
  const updateUserInfo = (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    setUserInStorage(updatedUser);
    return updatedUser;
  };

  // --- Logout Function ---
  const logout = useCallback(() => {
    setUser(null);
    removeTokenFromStorage();
    removeUserFromStorage();
    toast.success('Đăng xuất thành công.');
    navigate('/login', { replace: true });
  }, [navigate]);

  // --- Register Function ---
  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      console.error("[AuthContext] Registration failed in context:", error);
      throw error;
    }
  };

  // --- Provide Context Value ---
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    checkAuthStatus,
    updateUserInfo,  // Thêm hàm cập nhật thông tin người dùng
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook to use AuthContext ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};