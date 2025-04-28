import React, { useState } from 'react';
import apiClient from '../../api/axios'; // Đường dẫn đúng
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';

const SecuritySettings = () => {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error('Mật khẩu mới và xác nhận không khớp.');
        }
        if (passwords.newPassword.length < 6) {
            return toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', {
                oldPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            toast.success('Đổi mật khẩu thành công!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error("Lỗi đổi mật khẩu:", error);
            toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Đổi mật khẩu</h3>
                </div>
                <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6"> {/* Thêm padding p-6 */}
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium leading-6 text-gray-900">Mật khẩu hiện tại</label>
                        <div className="mt-2">
                            <input type="password" name="currentPassword" id="currentPassword" required value={passwords.currentPassword} onChange={handlePasswordChange} disabled={loading} autoComplete="current-password" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium leading-6 text-gray-900">Mật khẩu mới</label>
                        <div className="mt-2">
                            <input type="password" name="newPassword" id="newPassword" required value={passwords.newPassword} onChange={handlePasswordChange} disabled={loading} autoComplete="new-password" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50" />
                        </div>
                        <p className="mt-2 text-sm text-gray-500" id="password-description">Phải có ít nhất 6 ký tự.</p>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">Xác nhận mật khẩu mới</label>
                        <div className="mt-2">
                            <input type="password" name="confirmPassword" id="confirmPassword" required value={passwords.confirmPassword} onChange={handlePasswordChange} disabled={loading} autoComplete="new-password" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={loading} className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
                            {loading ? <><LoadingSpinner size="sm" className="mr-2" /> Đang xử lý...</> : 'Cập nhật mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SecuritySettings;