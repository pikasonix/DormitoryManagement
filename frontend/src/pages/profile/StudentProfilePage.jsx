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

// Get status badge color and text
const getStatusBadge = (status) => {
    switch (status) {
        case 'RENTING': return { color: 'green', text: 'Đang ở' };
        case 'PENDING_APPROVAL': return { color: 'yellow', text: 'Chờ duyệt' };
        case 'CHECKED_OUT': return { color: 'gray', text: 'Đã rời đi' };
        case 'EVICTED': return { color: 'red', text: 'Buộc thôi ở' };
        default: return { color: 'gray', text: status || 'N/A' };
    }
};

const StudentProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getMe();
                if (response?.user?.studentProfile) {
                    setProfile(response.user.studentProfile);
                } else {
                    setError('Không tìm thấy thông tin hồ sơ sinh viên');
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

    const room = profile.room;
    const building = room?.building;
    const statusBadge = getStatusBadge(profile.status);
    const avatarUrl = getAvatarUrl(profile.user);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Hồ sơ sinh viên</h1>
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
                                MSSV: <span className="font-mono">{profile.studentId}</span> | {profile.user?.email}
                            </p>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusBadge.color}-100 text-${statusBadge.color}-800`}>
                                    {statusBadge.text}
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
                        {renderDetailRow('Mã sinh viên', profile.studentId, true, "font-semibold font-mono")}
                        {renderDetailRow('Email', profile.user?.email, false, "text-gray-700")}
                        {renderDetailRow('Số điện thoại', profile.phoneNumber, true)}
                        {renderDetailRow('Giới tính', profile.gender === 'MALE' ? 'Nam' : (profile.gender === 'FEMALE' ? 'Nữ' : profile.gender), false)}
                        {renderDetailRow('Ngày sinh', formatDate(profile.birthDate), true)}
                        {renderDetailRow('Số CCCD/CMND', profile.identityCardNumber, false)}

                        {/* Thông tin học tập */}
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Thông tin học tập</h3>
                        </div>
                        {renderDetailRow('Khoa/Viện', profile.faculty, false)}
                        {renderDetailRow('Khóa', profile.courseYear, true)}
                        {renderDetailRow('Lớp', profile.className, false)}
                        {renderDetailRow('Email cá nhân', profile.personalEmail, true)}
                        {renderDetailRow('Dân tộc', profile.ethnicity, false)}
                        {renderDetailRow('Tôn giáo', profile.religion, true)}
                        {renderDetailRow('Đối tượng ưu tiên', profile.priorityObject, false)}
                        {renderDetailRow('Địa chỉ thường trú', formatAddress(profile.permanentAddress, profile.permanentDistrict, profile.permanentProvince), true)}

                        {/* Thông tin ký túc xá */}
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Thông tin ký túc xá</h3>
                        </div>
                        {renderDetailRow('Tòa nhà', building?.name, false)}
                        {renderDetailRow('Phòng số', room?.number, true)}
                        {renderDetailRow('Tầng', room?.floor, false)}
                        {renderDetailRow('Loại phòng', room?.type, true)}
                        {renderDetailRow('Số lượng người ở', `${room?.actualOccupancy || 0}/${room?.capacity || 0}`, false)}
                        {renderDetailRow('Giá phòng', room?.price ? `${parseInt(room.price).toLocaleString('vi-VN')} VNĐ` : '-', true)}
                        {renderDetailRow('Ngày bắt đầu ở', formatDate(profile.startDate), false)}
                        {renderDetailRow('Ngày check-in', formatDate(profile.checkInDate), true)}
                        {renderDetailRow('Ngày check-out', formatDate(profile.checkOutDate), false)}
                        {renderDetailRow('Ngày hết hạn hợp đồng', formatDate(profile.contractEndDate), true)}

                        {/* Thông tin gia đình - Cha */}
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Thông tin gia đình</h3>
                        </div>
                        <div className="px-4 pt-2 pb-1 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-600">Thông tin Cha</dt>
                        </div>
                        {renderDetailRow('Họ tên', profile.fatherName, true)}
                        {renderDetailRow('Năm sinh', profile.fatherDobYear, false)}
                        {renderDetailRow('Số điện thoại', profile.fatherPhone, true)}
                        {renderDetailRow('Địa chỉ', profile.fatherAddress, false)}

                        {/* Thông tin gia đình - Mẹ */}
                        <div className="px-4 pt-2 pb-1 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-600">Thông tin Mẹ</dt>
                        </div>
                        {renderDetailRow('Họ tên', profile.motherName, true)}
                        {renderDetailRow('Năm sinh', profile.motherDobYear, false)}
                        {renderDetailRow('Số điện thoại', profile.motherPhone, true)}
                        {renderDetailRow('Địa chỉ', profile.motherAddress, false)}

                        {/* Thông tin khẩn cấp */}
                        <div className="px-4 pt-2 pb-1 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-600">Liên hệ khẩn cấp</dt>
                        </div>
                        {renderDetailRow('Người liên hệ', profile.emergencyContactRelation, true)}
                        {renderDetailRow('Số điện thoại', profile.emergencyContactPhone, false)}
                        {renderDetailRow('Địa chỉ', profile.emergencyContactAddress, true)}

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

export default StudentProfilePage; 