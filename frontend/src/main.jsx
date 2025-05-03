import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx'; // Import AuthProvider
import { Toaster } from 'react-hot-toast'; // Import Toaster

// Cấu hình toasts với style rõ ràng cho từng loại thông báo
const toastOptions = {
  success: {
    style: {
      background: '#10B981', // Green background
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#10B981',
    },
    duration: 3000, // 3 seconds
  },
  error: {
    style: {
      background: '#EF4444', // Red background
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#EF4444',
    },
    duration: 4000, // 4 seconds for errors
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Bọc toàn bộ ứng dụng bằng BrowserRouter */}
    <BrowserRouter>
      {/* 2. Bọc App bằng AuthProvider để cung cấp context */}
      <AuthProvider>
        <App />
        {/* 3. Đặt Toaster ở đây để hiển thị thông báo global với cấu hình tùy chỉnh */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={toastOptions}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);