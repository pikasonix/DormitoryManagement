import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { Button, Card, Tabs, Tab } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeftIcon,
    PencilSquareIcon,
    UserIcon,
    AcademicCapIcon,
    HomeIcon,
    IdentificationIcon,
    PhoneIcon,
    TruckIcon
} from '@heroicons/react/24/outline';

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

// Helper convert currency
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return parseInt(amount).toLocaleString('vi-VN') + ' VNĐ';
};

// Get status badge color and text
const getStatusBadge = (status) => {
    switch (status) {
        case 'ACTIVE': return { color: 'green', text: 'Đang hoạt động' };
        case 'INACTIVE': return { color: 'gray', text: 'Không hoạt động' };
        case 'RENTING': return { color: 'green', text: 'Đang ở' };
        case 'PENDING_APPROVAL': return { color: 'yellow', text: 'Chờ duyệt' };
        case 'CHECKED_OUT': return { color: 'gray', text: 'Đã rời đi' };
        case 'EVICTED': return { color: 'red', text: 'Buộc thôi ở' };
        case 'GRADUATED': return { color: 'blue', text: 'Đã tốt nghiệp' };
        case 'SUSPENDED': return { color: 'red', text: 'Đình chỉ' };
        default: return { color: 'gray', text: status || 'N/A' };
    }
};

const StudentProfile = ({ overrideStudent = null, hideNavigation = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [isLoading, setIsLoading] = useState(!overrideStudent);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [isUserIdMode, setIsUserIdMode] = useState(false);

    useEffect(() => {
        if (overrideStudent) {
            setStudent(overrideStudent);
            setIsLoading(false);
            return;
        }

        // Only fetch if we have a valid ID
        if (!id) {
            setError('ID không hợp lệ hoặc không được cung cấp.');
            setIsLoading(false);
            return;
        }

        const fetchStudentData = async () => {
            setIsLoading(true);
            try {
                // Thử tìm kiếm theo URL parameter id
                // URL parameter id có thể là:
                // 1. StudentProfile.id (id hồ sơ sinh viên)
                // 2. User.id (id người dùng liên kết với sinh viên)

                // Đầu tiên thử tìm theo StudentProfile ID (mã hồ sơ)
                let data;
                try {
                    data = await studentService.getStudentById(id);
                    setStudent(data);
                    setIsUserIdMode(false);
                } catch (profileError) {
                    console.log("Không tìm thấy sinh viên với Profile ID, thử tìm với User ID", profileError);

                    // Nếu không tìm thấy qua Profile ID, thử tìm qua User ID
                    try {
                        data = await studentService.getStudentByUserId(id);
                        setStudent(data);
                        setIsUserIdMode(true);
                    } catch (userIdError) {
                        // Nếu cả hai cách đều thất bại, ném lỗi
                        throw new Error(`Không tìm thấy sinh viên với ID ${id}`);
                    }
                }
            } catch (err) {
                console.error('Error fetching student profile:', err);
                setError(err?.message || 'Không thể tải thông tin sinh viên.');
                toast.error('Không thể tải thông tin sinh viên.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentData();
    }, [id, overrideStudent]);

    // Render a detail row
    const renderDetailRow = (label, value, isGray = false, valueClassName = "text-gray-900") => (
        <div className={`px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${isGray ? 'bg-gray-50' : 'bg-white'}`}>
            <dt className="text-sm font-medium text-gray-600">{label}</dt>
            <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${valueClassName}`}>
                {(value !== null && value !== undefined && value !== '') ? value : <span className="text-gray-400">-</span>}
            </dd>
        </div>
    );

    // Get avatar URL
    const getAvatarUrl = (profile) => {
        const baseUrl = import.meta.env.VITE_UPLOADS_URL || '';
        if (profile?.user?.avatar?.path) {
            const path = profile.user.avatar.path;
            return path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
        }
        return '/src/assets/default-avatar.png';
    };

    // Render basic information tab
    const renderBasicInfo = (profile) => (
        <dl className="divide-y divide-gray-100">
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

            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Địa chỉ thường trú</h3>
            </div>
            {renderDetailRow('Tỉnh/Thành phố', profile.permanentProvince, false)}
            {renderDetailRow('Quận/Huyện', profile.permanentDistrict, true)}
            {renderDetailRow('Địa chỉ chi tiết', profile.permanentAddress, false)}

            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Thông tin hệ thống</h3>
            </div>
            {renderDetailRow('Trạng thái',
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getStatusBadge(profile.status).color}-100 text-${getStatusBadge(profile.status).color}-800`}>
                    {getStatusBadge(profile.status).text}
                </span>,
                false)}
            {renderDetailRow('Mã hồ sơ sinh viên', profile.id, true, "font-mono")}
            {renderDetailRow('Mã người dùng', profile.userId, false, "font-mono")}
            {renderDetailRow('Ngày tạo hồ sơ', formatDateTime(profile.createdAt), true)}
            {renderDetailRow('Cập nhật lần cuối', formatDateTime(profile.updatedAt), false)}
        </dl>
    );

    // Render academic information tab
    const renderAcademicInfo = (profile) => (
        <dl className="divide-y divide-gray-100">
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
        </dl>
    );

    // Render dormitory information tab
    const renderDormitoryInfo = (profile) => {
        const room = profile.room;
        const building = room?.building;

        return (
            <dl className="divide-y divide-gray-100">
                <div className="px-4 pt-4 pb-2 sm:px-6">
                    <h3 className="text-base font-semibold text-gray-900">Thông tin ký túc xá</h3>
                </div>
                {renderDetailRow('Tòa nhà', building?.name, false)}
                {renderDetailRow('Phòng số', room?.number, true)}
                {renderDetailRow('Tầng', room?.floor, false)}
                {renderDetailRow('Loại phòng', room?.type, true)}
                {renderDetailRow('Số lượng người ở', `${room?.actualOccupancy || 0}/${room?.capacity || 0}`, false)}
                {renderDetailRow('Giá phòng', formatCurrency(room?.price), true)}

                <div className="px-4 pt-4 pb-2 sm:px-6">
                    <h3 className="text-base font-semibold text-gray-900">Thời gian lưu trú</h3>
                </div>
                {renderDetailRow('Ngày bắt đầu ở', formatDate(profile.startDate), false)}
                {renderDetailRow('Ngày check-in', formatDate(profile.checkInDate), true)}
                {renderDetailRow('Ngày check-out', formatDate(profile.checkOutDate), false)}
                {renderDetailRow('Ngày hết hạn hợp đồng', formatDate(profile.contractEndDate), true)}

                {room?.amenities && room.amenities.length > 0 && (
                    <>
                        <div className="px-4 pt-4 pb-2 sm:px-6">
                            <h3 className="text-base font-semibold text-gray-900">Tiện nghi phòng</h3>
                        </div>
                        <div className="px-4 py-3 sm:px-6">
                            <div className="flex flex-wrap gap-2">
                                {room.amenities.map((amenityItem) => (
                                    <span
                                        key={amenityItem.amenityId}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {amenityItem.amenity.name} {amenityItem.quantity > 1 && `(${amenityItem.quantity})`}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </dl>
        );
    };

    // Render family information tab
    const renderFamilyInfo = (profile) => (
        <dl className="divide-y divide-gray-100">
            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Thông tin gia đình - Cha</h3>
            </div>
            {renderDetailRow('Họ tên', profile.fatherName, false)}
            {renderDetailRow('Năm sinh', profile.fatherDobYear, true)}
            {renderDetailRow('Số điện thoại', profile.fatherPhone, false)}
            {renderDetailRow('Địa chỉ', profile.fatherAddress, true)}

            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Thông tin gia đình - Mẹ</h3>
            </div>
            {renderDetailRow('Họ tên', profile.motherName, false)}
            {renderDetailRow('Năm sinh', profile.motherDobYear, true)}
            {renderDetailRow('Số điện thoại', profile.motherPhone, false)}
            {renderDetailRow('Địa chỉ', profile.motherAddress, true)}

            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h3 className="text-base font-semibold text-gray-900">Liên hệ khẩn cấp</h3>
            </div>
            {renderDetailRow('Mối quan hệ', profile.emergencyContactRelation, false)}
            {renderDetailRow('Số điện thoại', profile.emergencyContactPhone, true)}
            {renderDetailRow('Địa chỉ', profile.emergencyContactAddress, false)}
        </dl>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <h2 className="font-bold mb-2">Lỗi</h2>
                <p>{error || 'Không thể tải thông tin sinh viên.'}</p>
                <div className="mt-4">
                    <Button variant="primary" onClick={() => navigate('/students')}>
                        Quay lại danh sách sinh viên
                    </Button>
                </div>
            </div>
        );
    }

    const profile = student;
    const avatarUrl = getAvatarUrl(profile);

    // QUAN TRỌNG: Đảm bảo sử dụng StudentProfile.id (mã hồ sơ) cho URL edit, không phải User.id 
    const editUrl = `/students/${profile.id}/edit`;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {!hideNavigation && (
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <Button variant="link" onClick={() => navigate('/students')} icon={ArrowLeftIcon} className="text-sm mb-2">
                            Quay lại danh sách sinh viên
                        </Button>
                        <h1 className="text-2xl font-semibold">Hồ sơ sinh viên</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigate(editUrl)}
                            icon={PencilSquareIcon}
                        >
                            Chỉnh sửa
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Header with avatar and basic info */}
                <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center gap-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                        <img
                            src={avatarUrl}
                            alt={`Avatar của ${profile.fullName}`}
                            className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-500"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/src/assets/default-avatar.png' }}
                        />
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{profile.fullName}</h2>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                                <span className="font-mono mr-2">{profile.studentId}</span> |
                                <PhoneIcon className="h-4 w-4 mx-1 inline" />
                                <span>{profile.phoneNumber || '-'}</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {profile.user?.email}
                            </p>
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getStatusBadge(profile.status).color}-100 text-${getStatusBadge(profile.status).color}-800`}>
                                    {getStatusBadge(profile.status).text}
                                </span>
                                {profile.room && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {profile.room.building?.name} - Phòng {profile.room.number}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs for different sections */}
                <Tabs activeTab={activeTab} onChange={setActiveTab}>
                    <Tab id="basic" label="Thông tin cơ bản" icon={UserIcon}>
                        {renderBasicInfo(profile)}
                    </Tab>
                    <Tab id="academic" label="Học tập" icon={AcademicCapIcon}>
                        {renderAcademicInfo(profile)}
                    </Tab>
                    <Tab id="dormitory" label="Ký túc xá" icon={HomeIcon}>
                        {renderDormitoryInfo(profile)}
                    </Tab>
                    <Tab id="family" label="Gia đình" icon={IdentificationIcon}>
                        {renderFamilyInfo(profile)}
                    </Tab>
                    <Tab id="vehicles" label="Phương tiện" icon={TruckIcon}>
                        <div className="mt-4 p-4 bg-white shadow rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Thông tin phương tiện</h3>
                                <Link to={`/vehicles/student/${profile.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                    Xem chi tiết
                                </Link>
                            </div>
                            <p className="text-sm text-gray-600">
                                Xem chi tiết thông tin các phương tiện đã đăng ký của sinh viên.
                            </p>
                        </div>
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
};

export default StudentProfile;