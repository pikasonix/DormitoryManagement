import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { mediaService } from '../../services/media.service';
import { Button, Card } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PencilSquareIcon, KeyIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import AdminLoginHistory from '../../components/profile/AdminLoginHistory';
import SecuritySettings from '../../components/profile/SecuritySettings';
import Tabs from '../../components/shared/Tabs';
import Tab from '../../components/shared/Tab';

// Helper format functions
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
};

const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi }); }
    catch (e) { return dateString; }
};

const formatAddress = (...parts) => {
    return parts.filter(part => part && typeof part === 'string' && part.trim() !== '').join(', ') || '-';
};

const AdminProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [avatarFile, setAvatarFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getMe();
                // Check if the user is an admin
                if (response?.user?.role !== 'ADMIN') {
                    setError('Bạn không có quyền truy cập trang này.');
                    return;
                }

                if (response?.user) {
                    setProfile(response.user);
                } else {
                    setError('Không tìm thấy thông tin hồ sơ admin');
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError(err?.message || 'Không thể tải thông tin hồ sơ');
                toast.error('Không thể tải thông tin hồ sơ');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // Render a detail row
    const renderDetailRow = (label, value, isGray = false, valueClassName = "text-gray-900") => (
        <div className={`px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${isGray ? 'bg-gray-50' : 'bg-white'}`}>
            <dt className="text-sm font-medium text-gray-600">{label}</dt>
            <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${valueClassName}`}>
                {(value !== null && value !== undefined && value !== '') ? value : <span className="text-gray-400">-</span>}
            </dd>
        </div>
    );

    // Get avatar URL
    const getAvatarUrl = (user) => {
        const baseUrl = import.meta.env.VITE_UPLOADS_URL || '';
        if (user?.avatar?.path) {
            const path = user.avatar.path;
            return path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
        }
        return '/src/assets/default-avatar.png';
    };

    // Handle avatar change
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file hình ảnh');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước file quá lớn (tối đa 5MB)');
            return;
        }

        setAvatarFile(file);
        await uploadAvatar(file);
    };

    // Upload avatar
    const uploadAvatar = async (file) => {
        try {
            setIsUploading(true);
            const uploadResult = await mediaService.uploadMedia(file, 'user-avatar', 'USER_AVATAR');

            if (uploadResult && uploadResult.id) {
                // Update profile with new avatar
                const updateData = {
                    id: profile.staffProfile?.id,
                    avatarId: uploadResult.id
                };

                const updateResult = await authService.updateProfile(updateData);

                if (updateResult.success) {
                    toast.success('Avatar đã được cập nhật');
                    // Refresh profile data
                    const refreshedProfile = await authService.getMe();
                    setProfile(refreshedProfile.user);
                }
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Không thể tải lên avatar');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <h2 className="font-bold mb-2">Lỗi</h2>
                <p>{error || 'Không thể tải thông tin hồ sơ.'}</p>
            </div>
        );
    }

    const staffProfile = profile.staffProfile || {};
    const avatarUrl = getAvatarUrl(profile);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Hồ sơ Quản trị viên</h1>
                {/* Edit button is hidden for admin */}
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Header with avatar and basic info */}
                <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center gap-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <img
                                src={avatarUrl}
                                alt={`Avatar của ${staffProfile.fullName || profile.email}`}
                                className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-500"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/src/assets/default-avatar.png' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <label htmlFor="avatar-upload" className="cursor-pointer w-full h-full flex items-center justify-center text-white">
                                    <PencilSquareIcon className="h-6 w-6" />
                                    <span className="sr-only">Thay đổi avatar</span>
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={isUploading}
                                />
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-70">
                                    <LoadingSpinner size="sm" color="white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{staffProfile.fullName || 'Admin'}</h2>
                            <p className="text-sm text-gray-500">
                                {profile.email}
                            </p>
                            <div className="mt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Quản trị viên
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs for different sections */}
                <Tabs activeTab={activeTab} onChange={setActiveTab}>
                    <Tab id="basic" label="Thông tin cơ bản" icon={UserGroupIcon}>
                        <div className="border-t border-gray-200">
                            <dl className="divide-y divide-gray-100">
                                {/* Thông tin chung */}
                                <div className="px-4 pt-4 pb-2 sm:px-6">
                                    <h3 className="text-base font-semibold text-gray-900">Thông tin cá nhân</h3>
                                </div>
                                {/* Removed unnecessary fields for admin */}
                                {renderDetailRow('Email', profile.email, false, "text-gray-700")}
                                {renderDetailRow('Chức vụ', staffProfile.position || 'Quản trị viên', true)}

                                {/* Thông tin hệ thống */}
                                <div className="px-4 pt-4 pb-2 sm:px-6">
                                    <h3 className="text-base font-semibold text-gray-900">Thông tin hệ thống</h3>
                                </div>
                                {renderDetailRow('Ngày tạo tài khoản', formatDateTime(profile.createdAt), false)}
                                {renderDetailRow('Cập nhật lần cuối', formatDateTime(staffProfile.updatedAt), true)}
                            </dl>
                        </div>
                    </Tab>
                    <Tab id="login-history" label="Lịch sử đăng nhập" icon={ClockIcon}>
                        <AdminLoginHistory userId={profile.id} />
                    </Tab>
                    <Tab id="security" label="Bảo mật" icon={KeyIcon}>
                        <SecuritySettings />
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminProfilePage;