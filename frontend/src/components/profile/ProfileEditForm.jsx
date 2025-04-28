import React, { useState } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/axios'; // Đường dẫn đúng
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner'; // Import spinner
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth

const ProfileEditForm = ({ user, onCancel, onSaveSuccess }) => {
    const [formData, setFormData] = useState(() => {
        const profile = user?.profile || {};
        const isStudent = user?.role === 'STUDENT';
        return {
            // Chung
            fullName: profile.fullName || '',
            phoneNumber: profile.phoneNumber || '',
            gender: profile.gender || '',
            birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
            identityCardNumber: profile.identityCardNumber || '',
            // Riêng Student
            studentId: isStudent ? (profile.studentId || '') : undefined,
            faculty: isStudent ? (profile.faculty || '') : undefined,
            courseYear: isStudent ? (profile.courseYear || '') : undefined,
            className: isStudent ? (profile.className || '') : undefined,
            personalEmail: isStudent ? (profile.personalEmail || '') : undefined,
            ethnicity: isStudent ? (profile.ethnicity || '') : undefined,
            religion: isStudent ? (profile.religion || '') : undefined,
            priorityObject: isStudent ? (profile.priorityObject || '') : undefined,
            permanentProvince: isStudent ? (profile.permanentProvince || '') : undefined,
            permanentDistrict: isStudent ? (profile.permanentDistrict || '') : undefined,
            permanentAddress: isStudent ? (profile.permanentAddress || '') : undefined,
            fatherName: isStudent ? (profile.fatherName || '') : undefined,
            fatherDobYear: isStudent ? (profile.fatherDobYear || '') : undefined,
            fatherPhone: isStudent ? (profile.fatherPhone || '') : undefined,
            fatherAddress: isStudent ? (profile.fatherAddress || '') : undefined,
            motherName: isStudent ? (profile.motherName || '') : undefined,
            motherDobYear: isStudent ? (profile.motherDobYear || '') : undefined,
            motherPhone: isStudent ? (profile.motherPhone || '') : undefined,
            motherAddress: isStudent ? (profile.motherAddress || '') : undefined,
            emergencyContactRelation: isStudent ? (profile.emergencyContactRelation || '') : undefined,
            emergencyContactPhone: isStudent ? (profile.emergencyContactPhone || '') : undefined,
            emergencyContactAddress: isStudent ? (profile.emergencyContactAddress || '') : undefined,
            // Riêng Staff
            position: !isStudent && profile ? (profile.position || '') : undefined,
            address: !isStudent && profile ? (profile.address || '') : undefined,
            // Không bao gồm avatarId ở đây, sẽ xử lý riêng
            // Không bao gồm roomId, status, v.v... vì user không tự sửa được
        };
    });
    const [newAvatarFile, setNewAvatarFile] = useState(null);
    const [newAvatarPreview, setNewAvatarPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { checkAuthStatus } = useAuth(); // Lấy hàm checkAuthStatus

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Xử lý cho radio button gender
        if (name === 'gender') {
            setFormData({ ...formData, gender: value });
        } else {
            setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB ví dụ
                toast.error("Kích thước ảnh đại diện không được vượt quá 5MB.");
                return;
            }
            setNewAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setNewAvatarPreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setNewAvatarFile(null);
            setNewAvatarPreview(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let newAvatarId = null;

        if (newAvatarFile) {
            setIsUploading(true);
            const uploadFormData = new FormData();
            uploadFormData.append('file', newAvatarFile);
            uploadFormData.append('mediaType', 'USER_AVATAR');
            try {
                const response = await apiClient.post('/media/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                newAvatarId = response.data?.media?.id;
                toast.success('Tải ảnh đại diện mới thành công!');
            } catch (uploadError) {
                console.error("Lỗi tải ảnh đại diện:", uploadError);
                toast.error(uploadError.response?.data?.message || 'Tải ảnh đại diện thất bại.');
                setIsUploading(false);
                setIsSaving(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        // Chuẩn bị payload, chỉ gửi các trường có giá trị hoặc null nếu muốn xóa
        const updatePayload = { ...formData };
        Object.keys(updatePayload).forEach(key => {
            // Chuyển đổi các trường số
            if (['courseYear', 'fatherDobYear', 'motherDobYear'].includes(key) && updatePayload[key]) {
                updatePayload[key] = parseInt(updatePayload[key], 10);
                if (isNaN(updatePayload[key])) updatePayload[key] = null; // Hoặc xử lý lỗi
            }
            // Xử lý ngày sinh rỗng -> null
            if (key === 'birthDate' && updatePayload[key] === '') {
                updatePayload[key] = null;
            }
            // Xóa các key undefined (trường riêng của role khác)
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        if (newAvatarId !== null) {
            updatePayload.avatarId = newAvatarId;
        }
        // Logic xóa avatar (nếu cần):
        // else if (newAvatarFile === null && newAvatarPreview === null && user?.avatar) {
        //     updatePayload.avatarId = null; // Gửi null để xóa avatar
        // }


        try {
            const response = await apiClient.put(`/users/${user.id}/profile`, updatePayload);
            toast.success('Cập nhật hồ sơ thành công!');
            await checkAuthStatus(); // Cập nhật context
            onSaveSuccess();
        } catch (error) {
            console.error("Lỗi cập nhật hồ sơ:", error);
            toast.error(error.response?.data?.message || 'Cập nhật hồ sơ thất bại.');
        } finally {
            setIsSaving(false);
        }
    };

    const currentAvatarUrl = user?.avatar?.path
        ? (user.avatar.path.startsWith('http') ? user.avatar.path : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${user.avatar.path}`)
        : '/src/assets/default-avatar.png';

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
            <div className="space-y-8 divide-y divide-gray-200">
                {/* Phần Ảnh đại diện */}
                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Ảnh đại diện</h3>
                    <div className="mt-6 flex items-center gap-x-5">
                        <img className="h-20 w-20 rounded-full object-cover" src={newAvatarPreview || currentAvatarUrl} alt="Current Avatar" />
                        <label htmlFor="avatar-upload" className="cursor-pointer rounded-md bg-white py-1.5 px-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            <CameraIcon className="inline h-5 w-5 mr-1 align-text-bottom" aria-hidden="true" />
                            Thay đổi
                        </label>
                        <input id="avatar-upload" name="avatar" type="file" className="sr-only" onChange={handleAvatarChange} accept="image/png, image/jpeg, image/gif" />
                        {newAvatarFile && <span className="text-sm text-gray-500">Đã chọn: {newAvatarFile.name}</span>}
                    </div>
                </div>

                {/* Phần Thông tin cá nhân */}
                <div className="pt-8">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin cá nhân</h3>
                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Họ và tên *</label>
                            <input type="text" name="fullName" id="fullName" required value={formData.fullName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" id="email" value={user?.email || ''} disabled className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Số điện thoại *</label>
                            <input type="tel" name="phoneNumber" id="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Giới tính *</label>
                            <fieldset className="mt-2">
                                <legend className="sr-only">Giới tính</legend>
                                <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
                                    <div className="flex items-center">
                                        <input id="gender-male" name="gender" type="radio" value="MALE" checked={formData.gender === 'MALE'} onChange={handleChange} required className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                        <label htmlFor="gender-male" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Nam</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input id="gender-female" name="gender" type="radio" value="FEMALE" checked={formData.gender === 'FEMALE'} onChange={handleChange} required className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                        <label htmlFor="gender-female" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Nữ</label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">Ngày sinh *</label>
                            <input type="date" name="birthDate" id="birthDate" required value={formData.birthDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="identityCardNumber" className="block text-sm font-medium text-gray-700">Số CCCD/CMND *</label>
                            <input type="text" name="identityCardNumber" id="identityCardNumber" required value={formData.identityCardNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                    </div>
                </div>

                {/* --- Các trường riêng --- */}
                {user?.role === 'STUDENT' && (
                    <div className="pt-8">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin Sinh viên</h3>
                        {/* BẠN CẦN THÊM CÁC INPUT CHO TẤT CẢ CÁC TRƯỜNG STUDENT Ở ĐÂY */}
                        {/* Ví dụ: studentId, faculty, courseYear, className, personalEmail... */}
                        {/* ... */}
                        <p className="text-center text-red-500 my-4">(Thêm các trường input cho sinh viên ở đây)</p>
                    </div>
                )}
                {user?.role !== 'STUDENT' && user?.profile && (
                    <div className="pt-8">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin Nhân viên</h3>
                        {/* BẠN CẦN THÊM CÁC INPUT CHO CÁC TRƯỜNG STAFF Ở ĐÂY */}
                        {/* Ví dụ: position, address... */}
                        {/* ... */}
                        <p className="text-center text-red-500 my-4">(Thêm các trường input cho nhân viên ở đây)</p>
                    </div>
                )}


            </div>

            {/* Nút Lưu/Hủy */}
            <div className="pt-5">
                <div className="flex justify-end gap-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving || isUploading}
                        className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || isUploading}
                        className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                    >
                        {isUploading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </form>
    );
};

