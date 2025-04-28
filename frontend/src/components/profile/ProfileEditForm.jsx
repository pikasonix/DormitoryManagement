import React, { useState, useEffect, useRef } from 'react'; // Thêm useEffect, useRef nếu cần
import { CameraIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button, Select, Textarea } from '../shared'; // **Import các component chung**

// Định nghĩa các tùy chọn cho Select (ví dụ)
const genderOptions = [
    { value: 'MALE', label: 'Nam' },
    { value: 'FEMALE', label: 'Nữ' },
    { value: 'OTHER', label: 'Khác' }, // Thêm tùy chọn khác nếu cần
];

const ProfileEditForm = ({ user, onCancel, onSaveSuccess }) => {
    const { checkAuthStatus } = useAuth(); // Lấy hàm refresh user context

    // --- State Initialization ---
    const [formData, setFormData] = useState(() => {
        const profile = user?.profile || {};
        const isStudent = user?.role === 'STUDENT';
        const isStaff = user?.role === 'STAFF'; // Thêm biến isStaff

        return {
            // --- Chung ---
            fullName: profile.fullName || user?.name || '', // Fallback về user.name nếu profile.fullName chưa có
            phoneNumber: profile.phoneNumber || '',
            gender: profile.gender || '',
            // Format date đúng chuẩn YYYY-MM-DD cho input type="date"
            birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
            identityCardNumber: profile.identityCardNumber || '',

            // --- Riêng Student ---
            ...(isStudent && {
                studentId: profile.studentId || '',
                faculty: profile.faculty || '',
                courseYear: profile.courseYear || '',
                className: profile.className || '',
                personalEmail: profile.personalEmail || '',
                ethnicity: profile.ethnicity || '',
                religion: profile.religion || '',
                priorityObject: profile.priorityObject || '',
                permanentProvince: profile.permanentProvince || '',
                permanentDistrict: profile.permanentDistrict || '',
                permanentAddress: profile.permanentAddress || '',
                fatherName: profile.fatherName || '',
                fatherDobYear: profile.fatherDobYear || '',
                fatherPhone: profile.fatherPhone || '',
                fatherAddress: profile.fatherAddress || '',
                motherName: profile.motherName || '',
                motherDobYear: profile.motherDobYear || '',
                motherPhone: profile.motherPhone || '',
                motherAddress: profile.motherAddress || '',
                emergencyContactRelation: profile.emergencyContactRelation || '',
                emergencyContactPhone: profile.emergencyContactPhone || '',
                emergencyContactAddress: profile.emergencyContactAddress || '',
            }),

            // --- Riêng Staff ---
            ...(isStaff && { // Sử dụng isStaff
                position: profile.position || '',
                address: profile.address || '', // Có thể trùng với permanentAddress? Làm rõ
                // Thêm các trường khác của Staff nếu có
            }),
            // Không bao gồm avatarId, roomId, status...
        };
    });

    const [newAvatarFile, setNewAvatarFile] = useState(null);
    const [newAvatarPreview, setNewAvatarPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null); // Ref cho input file để reset

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB
                toast.error("Kích thước ảnh không được vượt quá 5MB.");
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input file
                return;
            }
            setNewAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setNewAvatarPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setNewAvatarFile(null); // Đánh dấu là muốn xóa/reset
        setNewAvatarPreview(null); // Xóa preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input file
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let uploadedAvatarId = user?.avatar?.id || null; // Giữ avatarId cũ mặc định

        // 1. Upload avatar mới nếu có
        if (newAvatarFile) {
            setIsUploading(true);
            const uploadFormData = new FormData();
            uploadFormData.append('file', newAvatarFile);
            // Thêm context nếu cần (vd: 'user-avatar')
            // uploadFormData.append('context', 'user-avatar');
            try {
                // **Sử dụng endpoint upload media chính xác**
                const response = await apiClient.post('/media/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // **Lấy ID từ response upload chính xác** (Kiểm tra lại cấu trúc API /media/upload)
                uploadedAvatarId = response.data?.data?.id; // Giả sử trả về { success: true, data: { id: '...' } }
                if (!uploadedAvatarId) throw new Error("Không nhận được ID ảnh sau khi tải lên.");
                toast.success('Tải ảnh đại diện mới thành công!');
            } catch (uploadError) {
                console.error("Lỗi tải ảnh đại diện:", uploadError);
                toast.error(uploadError.response?.data?.message || 'Tải ảnh đại diện thất bại.');
                setIsUploading(false);
                setIsSaving(false);
                return; // Dừng lại nếu upload lỗi
            } finally {
                setIsUploading(false);
            }
        } else if (newAvatarFile === null && newAvatarPreview === null && user?.avatar) {
            // Trường hợp người dùng bấm xóa avatar hiện tại
            uploadedAvatarId = null; // Gửi null để xóa
        }

        // 2. Chuẩn bị payload cập nhật profile
        const updatePayload = { ...formData };
        // Dọn dẹp payload: Chuyển đổi kiểu, loại bỏ undefined, xử lý rỗng -> null
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
                return;
            }
            if (typeof updatePayload[key] === 'string') {
                updatePayload[key] = updatePayload[key].trim(); // Trim khoảng trắng
                if (updatePayload[key] === '') {
                    // Chỉ chuyển thành null cho các trường không bắt buộc và date
                    if (!['fullName', 'phoneNumber', 'gender', 'identityCardNumber', 'studentId'].includes(key) || key === 'birthDate') {
                        updatePayload[key] = null;
                    }
                }
            }
            // Chuyển đổi các trường số nguyên
            if (['courseYear', 'fatherDobYear', 'motherDobYear'].includes(key) && updatePayload[key] !== null) {
                const num = parseInt(updatePayload[key], 10);
                updatePayload[key] = isNaN(num) ? null : num;
            }
        });

        // Thêm avatarId vào payload (có thể là null nếu muốn xóa)
        if (newAvatarFile || (newAvatarFile === null && newAvatarPreview === null)) {
            updatePayload.avatarId = uploadedAvatarId;
        }


        // 3. Gọi API cập nhật profile
        try {
            // **Sử dụng endpoint cập nhật profile chính xác**
            const apiUrl = `/users/${user.id}/profile`; // Hoặc `/profile` nếu API thiết kế vậy
            await apiClient.put(apiUrl, updatePayload);

            // Thành công
            onSaveSuccess(); // Gọi callback để Profile.jsx xử lý tiếp (đã bao gồm toast và refresh)

        } catch (error) {
            console.error("Lỗi cập nhật hồ sơ:", error);
            let errorMsg = 'Cập nhật hồ sơ thất bại.';
            if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            // Hiển thị lỗi validation chi tiết nếu có
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const validationErrors = error.response.data.errors.map(err => `- ${err.field ? `${err.field}: ` : ''}${err.message}`).join('\n');
                errorMsg += `\nChi tiết:\n${validationErrors}`;
            }
            toast.error(errorMsg, { duration: 6000 });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Xác định Avatar URL ---
    const UPLOADS_BASE_URL = (import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL)?.replace('/api', '');
    const currentAvatarUrl = user?.avatar?.path
        ? (user.avatar.path.startsWith('http') ? user.avatar.path : `${UPLOADS_BASE_URL || ''}${user.avatar.path.startsWith('/') ? '' : '/'}${user.avatar.path}`)
        : '/default-avatar.png'; // Đặt ảnh default ở public

    return (
        <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 space-y-8 divide-y divide-gray-200">
                {/* Phần Ảnh đại diện */}
                <div>
                    <h3 className="text-base font-semibold leading-7 text-gray-900">Ảnh đại diện</h3>
                    <div className="mt-4 flex items-center gap-x-4">
                        <img className="h-20 w-20 rounded-full object-cover bg-gray-200" src={newAvatarPreview || currentAvatarUrl} alt="Avatar Preview" onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png' }} />
                        <div className='flex flex-col sm:flex-row gap-3'>
                            <label htmlFor="avatar-upload" className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 inline-flex items-center justify-center">
                                <CameraIcon className="h-5 w-5 mr-1.5 text-gray-500" aria-hidden="true" />
                                <span>{user?.avatar || newAvatarFile ? 'Thay đổi' : 'Tải lên'}</span>
                            </label>
                            <input id="avatar-upload" name="avatar" type="file" className="sr-only" onChange={handleAvatarChange} accept="image/*" ref={fileInputRef} />
                            {/* Nút xóa/reset avatar */}
                            {(user?.avatar || newAvatarFile) && (
                                <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={isSaving || isUploading}>
                                    Xóa ảnh
                                </Button>
                            )}
                        </div>
                    </div>
                    {newAvatarFile && <p className="mt-2 text-xs text-gray-500">Đã chọn: {newAvatarFile.name}</p>}
                    <p className="mt-1 text-xs leading-5 text-gray-500">Cho phép JPG, GIF hoặc PNG. Tối đa 5MB.</p>
                </div>

                {/* Phần Thông tin cá nhân */}
                <div className="pt-8">
                    <h3 className="text-base font-semibold leading-7 text-gray-900">Thông tin cá nhân</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Cập nhật thông tin cá nhân của bạn.</p>
                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Sử dụng component Input */}
                        <div className="sm:col-span-3">
                            <Input label="Họ và tên *" id="fullName" name="fullName" required value={formData.fullName} onChange={handleChange} disabled={isSaving} />
                        </div>
                        <div className="sm:col-span-3">
                            <Input label="Email" id="email" type="email" value={user?.email || ''} disabled readOnly hint="Email không thể thay đổi." />
                        </div>
                        <div className="sm:col-span-3">
                            <Input label="Số điện thoại *" id="phoneNumber" name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={handleChange} disabled={isSaving} />
                        </div>
                        <div className="sm:col-span-3">
                            {/* Sử dụng component Select cho Gender */}
                            <Select label="Giới tính *" id="gender" name="gender" required value={formData.gender} onChange={handleChange} options={genderOptions} disabled={isSaving} placeholder="-- Chọn giới tính --" />
                        </div>
                        <div className="sm:col-span-3">
                            <Input label="Ngày sinh *" id="birthDate" name="birthDate" type="date" required value={formData.birthDate} onChange={handleChange} disabled={isSaving} max={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="sm:col-span-3">
                            <Input label="Số CCCD/CMND *" id="identityCardNumber" name="identityCardNumber" required value={formData.identityCardNumber} onChange={handleChange} disabled={isSaving} />
                        </div>
                    </div>
                </div>

                {/* --- Các trường riêng cho STUDENT --- */}
                {user?.role === 'STUDENT' && (
                    <div className="pt-8">
                        <h3 className="text-base font-semibold leading-7 text-gray-900">Thông tin Sinh viên</h3>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            {/* --- BỔ SUNG CÁC TRƯỜNG INPUT/SELECT/TEXTAREA CHO STUDENT TẠI ĐÂY --- */}
                            <div className="sm:col-span-2">
                                <Input label="Mã Sinh viên *" id="studentId" name="studentId" required value={formData.studentId} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="sm:col-span-2">
                                <Input label="Lớp" id="className" name="className" value={formData.className} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="sm:col-span-2">
                                <Input label="Khóa học (năm)" id="courseYear" name="courseYear" type="number" value={formData.courseYear} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="sm:col-span-3">
                                <Input label="Khoa/Viện" id="faculty" name="faculty" value={formData.faculty} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="sm:col-span-3">
                                <Input label="Email cá nhân" id="personalEmail" name="personalEmail" type="email" value={formData.personalEmail} onChange={handleChange} disabled={isSaving} />
                            </div>
                            {/* Thêm các trường khác tương tự: ethnicity, religion, priorityObject, địa chỉ, thông tin phụ huynh... */}
                            <div className="sm:col-span-full">
                                <Textarea label="Địa chỉ thường trú" id="permanentAddress" name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} disabled={isSaving} rows={3} />
                            </div>
                            {/* ... các trường khác ... */}
                        </div>
                    </div>
                )}

                {/* --- Các trường riêng cho STAFF --- */}
                {user?.role === 'STAFF' && (
                    <div className="pt-8">
                        <h3 className="text-base font-semibold leading-7 text-gray-900">Thông tin Nhân viên</h3>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            {/* --- BỔ SUNG CÁC TRƯỜNG INPUT/SELECT CHO STAFF TẠI ĐÂY --- */}
                            <div className="sm:col-span-3">
                                <Input label="Chức vụ" id="position" name="position" value={formData.position} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="sm:col-span-full">
                                <Textarea label="Địa chỉ liên hệ" id="address" name="address" value={formData.address} onChange={handleChange} disabled={isSaving} rows={3} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Nút Lưu/Hủy */}
            <div className="flex items-center justify-end gap-x-3 border-t border-gray-900/10 px-4 py-4 sm:px-6">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving || isUploading}>
                    Hủy
                </Button>
                <Button type="submit" disabled={isSaving || isUploading} isLoading={isSaving || isUploading}>
                    Lưu thay đổi
                </Button>
            </div>
        </form>
    );
};

export default ProfileEditForm;