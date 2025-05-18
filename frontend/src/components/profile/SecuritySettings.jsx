import React, { useState } from 'react';
import { authService } from '../../services/auth.service'; // **Import authService**
import { toast } from 'react-hot-toast';
import { Input, Button } from '../shared'; // **Import Input, Button**
import LoadingSpinner from '../shared/LoadingSpinner'; // Giữ lại LoadingSpinner nếu Button không tự xử lý

const SecuritySettings = () => {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [errors, setErrors] = useState({}); // State để lưu lỗi validation cụ thể
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
        // Xóa lỗi khi người dùng bắt đầu nhập lại
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        if (name === 'confirmPassword' && errors.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: null }));
        }
        if (name === 'newPassword' && errors.newPassword) {
            setErrors(prev => ({ ...prev, newPassword: null }));
        }
    }; const validateForm = () => {
        const newErrors = {};
        if (!passwords.currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
        }
        if (!passwords.newPassword) {
            newErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
        } else if (passwords.newPassword.length < 6) {
            newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        }
        if (!passwords.confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
        } else if (passwords.newPassword && passwords.newPassword !== passwords.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // Xóa lỗi cũ trước khi validate

        if (!validateForm()) {
            return; // Dừng nếu validation phía client thất bại
        }

        setIsLoading(true);
        try {
            // **Gọi hàm changePassword từ authService**
            const response = await authService.changePassword(
                passwords.currentPassword,
                passwords.newPassword
            );

            toast.success(response?.message || 'Đổi mật khẩu thành công!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Reset form

        } catch (error) {
            console.error("Lỗi đổi mật khẩu:", error);
            const errorMsg = error?.message || 'Đổi mật khẩu thất bại.';

            // Xử lý lỗi khi endpoint không tồn tại
            if (error.response?.status === 404) {
                toast.error('API endpoint không tồn tại. Vui lòng kiểm tra cấu hình backend.');
                setErrors({ general: 'Endpoint không tồn tại. Vui lòng liên hệ quản trị viên.' });
                return;
            }

            // **Hiển thị lỗi cụ thể từ server nếu có**
            if (error?.errors && Array.isArray(error.errors)) {
                const serverErrors = {};
                error.errors.forEach(err => {
                    // Map lỗi server vào đúng trường input (cần backend trả về field)
                    if (err.field === 'oldPassword') serverErrors.currentPassword = err.message;
                    else if (err.field === 'newPassword') serverErrors.newPassword = err.message;
                    else serverErrors.general = err.message; // Lỗi chung
                });
                setErrors(serverErrors);
                if (serverErrors.general) toast.error(serverErrors.general); // Hiển thị lỗi chung bằng toast
            } else if (error.response?.data?.message) {
                // Hiển thị thông báo lỗi từ server
                const serverMessage = error.response.data.message;

                // Map thông báo lỗi vào trường phù hợp
                if (serverMessage.includes('cũ không chính xác')) {
                    setErrors({ currentPassword: serverMessage });
                } else if (serverMessage.includes('mật khẩu mới')) {
                    setErrors({ newPassword: serverMessage });
                } else {
                    setErrors({ general: serverMessage });
                }
                toast.error(serverMessage);
            } else {
                // Nếu không có lỗi cụ thể từ server, hiển thị lỗi chung
                setErrors({ general: errorMsg });
                toast.error(errorMsg); // Interceptor có thể đã hiển thị rồi, nhưng hiển thị lại cho chắc
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200"> {/* Thêm border */}
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Đổi mật khẩu</h3>
                    <p className="mt-1 text-sm text-gray-500">Thay đổi mật khẩu đăng nhập của bạn.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="px-4 py-5 sm:p-6 space-y-4"> {/* Giảm space-y */}
                        {/* Hiển thị lỗi chung của form */}
                        {errors.general && (
                            <div role="alert" className="rounded border-s-4 border-red-500 bg-red-50 p-3">
                                <p className="text-sm text-red-700">{errors.general}</p>
                            </div>
                        )}
                        {/* Sử dụng component Input */}
                        <Input
                            label="Mật khẩu hiện tại *"
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            required
                            value={passwords.currentPassword}
                            onChange={handlePasswordChange}
                            disabled={isLoading}
                            autoComplete="current-password"
                            error={errors.currentPassword} // Truyền lỗi vào Input component
                        />
                        <Input
                            label="Mật khẩu mới *"
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            required
                            value={passwords.newPassword}
                            onChange={handlePasswordChange}
                            disabled={isLoading}
                            autoComplete="new-password"
                            aria-describedby="password-description"
                            error={errors.newPassword} // Truyền lỗi
                        />
                        <p className="text-xs text-gray-500" id="password-description">
                            Phải có ít nhất 6 ký tự. Nên sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                        </p>
                        <Input
                            label="Xác nhận mật khẩu mới *"
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={passwords.confirmPassword}
                            onChange={handlePasswordChange}
                            disabled={isLoading}
                            autoComplete="new-password"
                            error={errors.confirmPassword} // Truyền lỗi
                        />
                    </div>
                    {/* Nút Submit */}
                    <div className="flex items-center justify-end gap-x-3 border-t border-gray-900/10 px-4 py-4 sm:px-6">
                        {/* Có thể thêm nút Reset form nếu muốn */}
                        {/* <Button type="button" variant="secondary" onClick={() => setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })} disabled={isLoading}>
                            Reset
                         </Button> */}
                        <Button type="submit" disabled={isLoading} isLoading={isLoading}>
                            Cập nhật mật khẩu
                        </Button>
                    </div>
                </form>
            </div>

            {/* Có thể thêm các cài đặt bảo mật khác ở đây */}
            {/* Ví dụ: Xác thực 2 yếu tố, Quản lý phiên đăng nhập... */}
            {/* <div className="bg-white shadow sm:rounded-lg mt-6"> ... </div> */}
        </div>
    );
};

export default SecuritySettings;