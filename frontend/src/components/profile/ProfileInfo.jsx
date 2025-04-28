import React from 'react';
import { BuildingOffice2Icon, UserIcon as StudentIcon, PencilSquareIcon } from '@heroicons/react/24/outline'; // Thêm PencilSquareIcon
import { format, parseISO } from 'date-fns'; // Import date-fns
import { vi } from 'date-fns/locale'; // Import locale tiếng Việt

// --- Helper Function ---
// Hàm format ngày tháng
const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        const date = parseISO(dateString); // Chuyển đổi ISO string thành Date object
        return format(date, 'dd/MM/yyyy', { locale: vi }); // Format dd/MM/yyyy
    } catch (error) {
        console.error("Lỗi format ngày:", dateString, error);
        return dateString; // Trả về chuỗi gốc nếu lỗi
    }
};

// Hàm format ngày giờ
const formatDateTime = (dateString) => {
    if (!dateString) return null;
    try {
        const date = parseISO(dateString);
        return format(date, 'dd/MM/yyyy HH:mm', { locale: vi }); // Format dd/MM/yyyy HH:mm
    } catch (error) {
        console.error("Lỗi format ngày giờ:", dateString, error);
        return dateString;
    }
}

// Hàm format địa chỉ
const formatAddress = (...parts) => {
    return parts.filter(part => part && typeof part === 'string' && part.trim() !== '').join(', ') || null;
}

const ProfileInfo = ({ user, onEdit }) => {
    // Hàm render từng dòng thông tin, thêm tham số className cho value
    const renderDetailRow = (label, value, isGray = false, valueClassName = "text-gray-900") => (
        <div className={`px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${isGray ? 'bg-gray-50' : 'bg-white'}`}>
            <dt className="text-sm font-medium text-gray-600">{label}</dt>
            <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${valueClassName}`}>
                {/* Sử dụng dấu gạch ngang nếu giá trị là null hoặc chuỗi rỗng */}
                {(value !== null && value !== undefined && value !== '') ? value : <span className="text-gray-400">-</span>}
            </dd>
        </div>
    );

    // Kiểm tra user và profile
    if (!user) return <p className="p-6 text-center text-gray-500">Không có thông tin người dùng.</p>;
    // Không cần kiểm tra profile ở đây nữa vì sẽ kiểm tra từng trường

    const profile = user.profile || {}; // Dùng object rỗng nếu profile null/undefined
    const isStudent = user.role === 'STUDENT';
    const isStaff = user.role === 'STAFF';

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* Header */}
            <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center gap-4"> {/* Cho phép wrap trên mobile */}
                <div>
                    <h3 className="text-lg leading-6 font-semibold text-gray-900">
                        Thông tin Hồ sơ {isStudent ? 'Sinh viên' : (isStaff ? 'Nhân viên' : '')}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Chi tiết cá nhân và các thông tin liên quan.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                    <PencilSquareIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                    Chỉnh sửa
                </button>
            </div>

            {/* Body */}
            <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-100"> {/* Màu divider nhạt hơn */}
                    {/* --- Thông tin chung --- */}
                    {renderDetailRow('Họ và tên', profile.fullName || user.name, false)}
                    {renderDetailRow('Email', user.email, true, "text-gray-700 font-mono")}
                    {renderDetailRow('Số điện thoại', profile.phoneNumber, false)}
                    {renderDetailRow('Giới tính', profile.gender === 'MALE' ? 'Nam' : (profile.gender === 'FEMALE' ? 'Nữ' : profile.gender), true)}
                    {renderDetailRow('Ngày sinh', formatDate(profile.birthDate), false)}
                    {renderDetailRow('Số CCCD/CMND', profile.identityCardNumber, true)}

                    {/* --- Thông tin riêng STUDENT --- */}
                    {isStudent && (
                        <>
                            {renderDetailRow('Mã sinh viên', profile.studentId, false, "font-semibold")}
                            {renderDetailRow('Khoa/Viện', profile.faculty, true)}
                            {renderDetailRow('Khóa', profile.courseYear, false)}
                            {renderDetailRow('Lớp', profile.className, true)}
                            {renderDetailRow('Email cá nhân', profile.personalEmail, false)}
                            {renderDetailRow('Dân tộc', profile.ethnicity, true)}
                            {renderDetailRow('Tôn giáo', profile.religion, false)}
                            {renderDetailRow('Đối tượng ưu tiên', profile.priorityObject, true)}
                            {renderDetailRow('Địa chỉ thường trú', formatAddress(profile.permanentAddress, profile.permanentDistrict, profile.permanentProvince), false)}
                            {/* Thông tin gia đình */}
                            <div className="px-4 pt-4 pb-1 sm:px-6 bg-gray-50"> {/* Nhóm thông tin cha */}
                                <dt className="text-sm font-medium text-gray-600">Thông tin Cha</dt>
                            </div>
                            {renderDetailRow('Họ tên', profile.fatherName, true)}
                            {renderDetailRow('Năm sinh', profile.fatherDobYear, false)}
                            {renderDetailRow('Số điện thoại', profile.fatherPhone, true)}
                            {renderDetailRow('Địa chỉ', profile.fatherAddress, false)}
                            <div className="px-4 pt-4 pb-1 sm:px-6 bg-gray-50"> {/* Nhóm thông tin mẹ */}
                                <dt className="text-sm font-medium text-gray-600">Thông tin Mẹ</dt>
                            </div>
                            {renderDetailRow('Họ tên', profile.motherName, true)}
                            {renderDetailRow('Năm sinh', profile.motherDobYear, false)}
                            {renderDetailRow('Số điện thoại', profile.motherPhone, true)}
                            {renderDetailRow('Địa chỉ', profile.motherAddress, false)}
                            <div className="px-4 pt-4 pb-1 sm:px-6 bg-gray-50"> {/* Nhóm liên hệ khẩn cấp */}
                                <dt className="text-sm font-medium text-gray-600">Liên hệ khẩn cấp</dt>
                            </div>
                            {renderDetailRow('Người liên hệ', profile.emergencyContactRelation, true)}
                            {renderDetailRow('Số điện thoại', profile.emergencyContactPhone, false)}
                            {renderDetailRow('Địa chỉ', profile.emergencyContactAddress, true)}
                        </>
                    )}

                    {/* --- Thông tin riêng STAFF --- */}
                    {isStaff && (
                        <>
                            {renderDetailRow('Chức vụ', profile.position, false, "font-semibold")}
                            {renderDetailRow('Địa chỉ liên hệ', profile.address, true)}
                            {/* Kiểm tra kỹ trước khi truy cập nested property */}
                            {profile.managedBuilding && renderDetailRow('Tòa nhà quản lý', profile.managedBuilding.name, false)}
                        </>
                    )}

                    {/* --- Thông tin Hệ thống --- */}
                    <div className="px-4 pt-4 pb-1 sm:px-6 bg-gray-50">
                        <dt className="text-sm font-medium text-gray-600">Thông tin Hệ thống</dt>
                    </div>
                    {renderDetailRow('Ngày tạo tài khoản', formatDateTime(user.createdAt), true)}
                    {renderDetailRow('Hồ sơ cập nhật lần cuối', formatDateTime(profile.updatedAt), false)}

                </dl>
            </div>
        </div>
    );
};

export default ProfileInfo;