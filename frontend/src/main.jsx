import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx'; // Import AuthProvider
import { Toaster } from 'react-hot-toast'; // Import Toaster

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Bọc toàn bộ ứng dụng bằng BrowserRouter */}
    <BrowserRouter>
      {/* 2. Bọc App bằng AuthProvider để cung cấp context */}
      <AuthProvider>
        <App />
        {/* 3. Đặt Toaster ở đây để hiển thị thông báo global */}
        <Toaster position="top-right" reverseOrder={false} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);