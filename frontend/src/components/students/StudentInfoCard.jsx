import React from 'react';
import { Link } from 'react-router-dom';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, HomeIcon, BuildingOfficeIcon, AcademicCapIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Badge from '../shared/Badge'; // Import Badge

const API_ASSET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const getStatusBadge = (status) => {
    switch (status) {
        case 'RENTING': return { color: 'green', text: 'Đang ở' };
        case 'PENDING_APPROVAL': return { color: 'yellow', text: 'Chờ duyệt' };
        case 'CHECKED_OUT': return { color: 'gray', text: 'Đã rời đi' };
        case 'EVICTED': return { color: 'red', text: 'Buộc thôi ở' };
        default: return { color: 'gray', text: status };
    }
};

const StudentInfoCard = ({ student }) => {
    if (!student) return null;

    const profile = student; // Dữ liệu truyền vào là StudentProfile
    const user = student.user; // Lấy thông tin user từ profile
    const room = student.room;
    const building = room?.building;
    const avatarUrl = user?.avatar?.path
        ? (user.avatar.path.startsWith('http') ? user.avatar.path : `${API_ASSET_URL}${user.avatar.path}`)
        : '/src/assets/default-avatar.png';

    const statusBadge = getStatusBadge(profile.status);

    return (
        <div className="bg-white shadow overflow-hidden rounded-lg flex flex-col sm:flex-row">
            {/* Avatar */}
            <div className="flex-shrink-0 w-full sm:w-24 h-24 sm:h-auto bg-gray-100 flex items-center justify-center">
                <img
                    className="h-20 w-20 sm:h-full sm:w-full rounded-full sm:rounded-none object-cover"
                    src={avatarUrl}
                    alt={`Avatar của ${profile.fullName}`}
                />
            </div>
            {/* Thông tin */}
            <div className="p-4 border-t border-gray-200 sm:border-t-0 sm:border-l flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
                            <Link to={`/students/${profile.id}/edit`}> {/* Link đến trang sửa */}
                                {profile.fullName}
                            </Link>
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                            <AcademicCapIcon className="h-4 w-4 mr-1 text-gray-400" />
                            MSSV: {profile.studentId} - K{profile.courseYear} {profile.faculty}
                        </p>
                    </div>
                    <Badge color={statusBadge.color}>{statusBadge.text}</Badge>
                </div>

                <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {user?.email || 'N/A'}
                    </p>
                    <p className="flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {profile.phoneNumber || 'N/A'}
                    </p>
                    <p className="flex items-center">
                        <HomeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {room ? `Phòng ${room.number}` : <span className="italic text-gray-400">Chưa xếp phòng</span>}
                        {building && <span className="ml-1 text-gray-400">- {building.name}</span>}
                    </p>
                </div>
                {/* Nút hành động nhỏ */}
                <div className="mt-3 text-right">
                    <Link
                        to={`/students/${profile.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium inline-flex items-center"
                    >
                        Xem chi tiết <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default StudentInfoCard;