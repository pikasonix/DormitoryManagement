import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import LoadingSpinner from '../shared/LoadingSpinner';
import { authService } from '../../services/auth.service';
import { toast } from 'react-hot-toast';

const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: vi });
    } catch (e) {
        return dateString;
    }
};

const AdminLoginHistory = ({ userId }) => {
    const [loginHistory, setLoginHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    useEffect(() => {
        const fetchLoginHistory = async () => {
            setIsLoading(true);
            try {
                // Sử dụng API thực tế để lấy dữ liệu đăng nhập
                const result = await authService.getLoginHistory(userId, page, pageSize);

                setLoginHistory(result.data);
                setTotalPages(result.meta.totalPages);
                setError(null);
            } catch (err) {
                console.error('Error fetching login history:', err);
                setError(err.message || 'Không thể tải lịch sử đăng nhập');
                toast.error('Không thể tải lịch sử đăng nhập');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLoginHistory();
    }, [userId, page, pageSize]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (isLoading && page === 1) {
        return (
            <div className="flex justify-center items-center p-8">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                <p>{error}</p>
            </div>
        );
    }

    if (loginHistory.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Không có lịch sử đăng nhập nào được ghi nhận.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Lịch sử đăng nhập tài khoản</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Các phiên đăng nhập gần đây của tài khoản này.
                </p>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-12 mb-4">
                    <LoadingSpinner size="sm" />
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                Thời gian
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                IP
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Vị trí
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Trạng thái
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loginHistory.map((login) => (
                            <tr key={login.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                    {formatDateTime(login.timestamp)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                                    {login.ipAddress || '-'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {login.location || '-'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${login.status === 'SUCCESS'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {login.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${page === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Trước
                        </button>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${page === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Sau
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Hiển thị <span className="font-medium">{((page - 1) * pageSize) + 1}</span> đến{' '}
                                <span className="font-medium">{Math.min(page * pageSize, (totalPages - 1) * pageSize + loginHistory.length)}</span> trong tổng số{' '}
                                <span className="font-medium">{((totalPages - 1) * pageSize) + loginHistory.length}</span> lượt đăng nhập
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${page === 1
                                            ? 'cursor-not-allowed'
                                            : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                        }`}
                                >
                                    <span className="sr-only">Trang trước</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    // Logic hiển thị số trang
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        // Nếu tổng số trang <= 5, hiển thị tất cả
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        // Nếu đang ở đầu, hiển thị 1-5
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        // Nếu đang ở cuối, hiển thị totalPages-4 đến totalPages
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        // Nếu ở giữa, hiển thị page-2 đến page+2
                                        pageNum = page - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            aria-current={page === pageNum ? 'page' : undefined}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${page === pageNum
                                                    ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${page === totalPages
                                            ? 'cursor-not-allowed'
                                            : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                        }`}
                                >
                                    <span className="sr-only">Trang sau</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLoginHistory;