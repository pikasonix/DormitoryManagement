import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="bg-indigo-600 px-4 py-8 flex flex-col items-center">
                    <h1 className="text-white text-6xl font-bold mb-2">404</h1>
                    <div className="flex items-center justify-center w-24 h-24 bg-white rounded-full">
                        <svg className="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm0-9a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 6a1 1 0 100 2 1 1 0 000-2z" />
                        </svg>
                    </div>
                    <p className="text-white text-xl font-medium mt-4">Trang không tìm thấy</p>
                </div>

                <div className="p-8">
                    <p className="text-gray-600 text-center mb-6">
                        Có vẻ như bạn đã lạc đường trong ký túc xá.<br />
                        Trang này có vẻ không tồn tại hoặc đã bị xóa.
                    </p>

                    <div className="flex flex-col space-y-3">
                        <Link
                            to="/"
                            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            <HomeIcon className="h-5 w-5 mr-2" />
                            Trở về trang chủ
                        </Link>

                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Quay lại trang trước
                        </button>
                    </div>
                </div>

                <div className="px-8 py-4 bg-gray-50 border-t">
                    <p className="text-sm text-gray-500 text-center">
                        Mọi thắc mắc vui lòng liên hệ với <span className="text-indigo-600">Ban quản lý KTX</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFound;