import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button, Card } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

// Helper format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
};

// Helper format datetime
const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi }); }
    catch (e) { return dateString; }
};

// Helper format address
const formatAddress = (...parts) => {
    return parts.filter(part => part && typeof part === 'string' && part.trim() !== '').join(', ') || '-';
};

const StaffProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getMe();
                // Check different possible locations for staff profile data
                const staffProfile = response?.user?.staffProfile ||
                    response?.profile ||
                    response?.data?.user?.staffProfile ||
                    response?.data?.profile;

                if (staffProfile) {
                    console.log('Staff profile data retrieved:', staffProfile);
                    setProfile(staffProfile);
                } else {
                    console.error('Staff profile not found in response:', response);
                    setError('Không tìm thấy thông tin hồ sơ nhân viên');
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

    const managedBuilding = profile.managedBuilding;
    const avatarUrl = getAvatarUrl(profile.user);
    const userRole = profile.user?.role || '';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Hồ sơ {userRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</h1>
                <Button
                    onClick={() => navigate('/profile/edit')}
                    icon={PencilSquareIcon}
                >
                    Chỉnh sửa
                </Button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Header with avatar and basic info */}
                <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center gap-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <img
                            src={avatarUrl}
                            alt={`Avatar của ${profile.fullName}`}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-500"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/src/assets/default-avatar.png' }}
                        />
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{profile.fullName}</h2>
                            <p className="text-sm text-gray-500">
                                {profile.position || (userRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên')} | {profile.user?.email}
                            </p>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800`}>
                                    {userRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body - detailed info */}
                <div className="border-t border-gray-200">
                    <dl className="divide-y divide-gray-100">
                        {/* Thông tin chung */}
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Thông tin cơ bản</h3>
                        </div>
                        {renderDetailRow('Họ và tên', profile.fullName, false)}
                        {renderDetailRow('Chức vụ', profile.position, true)}
                        {renderDetailRow('Email', profile.user?.email, false, "text-gray-700")}
                        {renderDetailRow('Số điện thoại', profile.phoneNumber, true)}
                        {renderDetailRow('Giới tính', profile.gender === 'MALE' ? 'Nam' : (profile.gender === 'FEMALE' ? 'Nữ' : profile.gender), false)}
                        {renderDetailRow('Ngày sinh', formatDate(profile.birthDate), true)}
                        {renderDetailRow('Số CCCD/CMND', profile.identityCardNumber, false)}
                        {renderDetailRow('Địa chỉ', profile.address, true)}

                        {/* Thông tin quản lý */}
                        {managedBuilding && (
                            <>
                                <div className="px-4 pt-4 pb-2 sm:px-6">
                                    <h3 className="text-base font-semibold text-gray-900">Thông tin quản lý</h3>
                                </div>
                                {renderDetailRow('Tòa nhà quản lý', managedBuilding.name, false)}
                                {renderDetailRow('Địa chỉ tòa nhà', managedBuilding.address, true)}
                                {renderDetailRow('Mô tả', managedBuilding.description, false)}
                            </>
                        )}

                        {/* Thông tin hệ thống */}
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Thông tin hệ thống</h3>
                        </div>
                        {renderDetailRow('Ngày tạo hồ sơ', formatDateTime(profile.createdAt), false)}
                        {renderDetailRow('Cập nhật lần cuối', formatDateTime(profile.updatedAt), true)}
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default StaffProfilePage;