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
  // Initialize user state from storage
  const [user, setUser] = useState(getUserFromStorage());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for user-updated events from other components
  useEffect(() => {
    const handleUserUpdated = (event) => {
      if (event.detail && event.detail.user) {
        setUser(event.detail.user);
      }
    };

    window.addEventListener('user-updated', handleUserUpdated);
    return () => {
      window.removeEventListener('user-updated', handleUserUpdated);
    };
  }, []);
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
      // Get fresh user data from server
      const response = await authService.getMe();

      // Process the response structure (may have data.user or just user)
      const userData = response.data?.user || response.user;

      if (userData) {
        // Update user data in state and storage
        setUser(userData);
        setUserInStorage(userData);

        // Broadcast the updated user data to any components that might need it
        window.dispatchEvent(new CustomEvent('auth-refreshed', {
          detail: { user: userData }
        }));
      } else {
        console.warn('[AuthContext] Server returned success but no user data');
        // Handle invalid user data - clear auth state
        setUser(null);
        removeTokenFromStorage();
        removeUserFromStorage();
      }
    } catch (error) {
      // Only log non-401 errors as they're not expected
      // 401s happen normally when token expires
      if (error?.response?.status !== 401) {
        console.error('[AuthContext] Auth check failed (non-401):', error);
      } else {
        console.log('[AuthContext] Token expired or invalid - logging out');
      }

      // Clear authentication state
      setUser(null);
      removeTokenFromStorage();
      removeUserFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, []); useEffect(() => {
    // Check authentication status when the component mounts
    checkAuthStatus();
  }, [checkAuthStatus]);
  // --- Login Function ---
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials.email, credentials.password);      // Xử lý cấu trúc phản hồi mới
      const data = response.data || response;
      const userData = data.user;
      const profile = data.profile;
      const token = data.token;

      if (!userData || !token) {
        throw new Error('Dữ liệu đăng nhập không hợp lệ');
      }

      // Thêm profileId vào userData nếu có
      if (profile && profile.id) {
        userData.profileId = profile.id;
        console.log('Added profileId', profile.id, 'to user data');
      }

      // First set token in storage
      setTokenInStorage(token);

      // Then set user in storage
      setUserInStorage(userData);

      // Set user in state
      setUser(userData);

      // Ensure we have the latest user data from the server
      await checkAuthStatus();

      // Navigate to the intended page after authentication is confirmed
      const from = location.state?.from?.pathname || '/';

      // Add a short delay to ensure state updates propagate before navigation
      setTimeout(() => {
        navigate(from, { replace: true });
        toast.success('Đăng nhập thành công!');
      }, 100);

      return true;
    } catch (error) {
      console.error("[AuthContext] Login failed:", error);
      // Display error toast but don't navigate away
      toast.error(error.message || 'Đăng nhập thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  };  // --- Update User (dùng cho cập nhật thông tin, kể cả avatar) ---
  const updateUserInfo = async (newUserData) => {
    try {
      // Add profileId if missing but exists in profile
      if (!newUserData.profileId && newUserData.profile && newUserData.profile.id) {
        newUserData.profileId = newUserData.profile.id;
      }

      // First, update the user data in state and storage
      const updatedUser = { ...user, ...newUserData };
      setUser(updatedUser);
      setUserInStorage(updatedUser);

      // Then ensure that other components get the updated user info
      // by dispatching a custom event
      window.dispatchEvent(new CustomEvent('user-updated', {
        detail: { user: updatedUser }
      }));

      return updatedUser;
    } catch (error) {
      console.error("[AuthContext] Failed to update user info:", error);
      toast.error("Không thể cập nhật thông tin người dùng");
      throw error;
    }
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