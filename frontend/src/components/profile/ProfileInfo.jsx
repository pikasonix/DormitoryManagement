import React from 'react';
import { BuildingOffice2Icon, UserIcon as StudentIcon } from '@heroicons/react/24/outline'; // Ví dụ icon

const ProfileInfo = ({ user, onEdit }) => {
    // Hàm render từng dòng thông tin
    const renderDetailRow = (label, value, isGray = false) => (
        <div className={`px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${isGray ? 'bg-gray-50' : 'bg-white'}`}>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || <span className="text-gray-400 italic">Chưa cập nhật</span>}</dd>
        </div>
    );

    if (!user || !user.profile) return <p className="p-6">Không có thông tin hồ sơ.</p>;

    const profile = user.profile;
    const isStudent = user.role === 'STUDENT';

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thông tin Hồ sơ {isStudent ? 'Sinh viên' : 'Nhân viên'}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Chi tiết cá nhân và thông tin liên quan.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Chỉnh sửa
                </button>
            </div>
            <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-200"> {/* Thêm divide */}
                    {renderDetailRow('Họ và tên', profile.fullName, false)}
                    {renderDetailRow('Email', user.email, true)}
                    {renderDetailRow('Số điện thoại', profile.phoneNumber, false)}
                    {renderDetailRow('Giới tính', profile.gender === 'MALE' ? 'Nam' : (profile.gender === 'FEMALE' ? 'Nữ' : null), true)}
                    {renderDetailRow('Ngày sinh', profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('vi-VN') : null, false)}
                    {renderDetailRow('Số CCCD/CMND', profile.identityCardNumber, true)}

                    {/* Trường riêng cho Student */}
                    {isStudent && (
                        <>
                            {renderDetailRow('Mã sinh viên', profile.studentId, false)}
                            {renderDetailRow('Khoa/Viện', profile.faculty, true)}
                            {renderDetailRow('Khóa', profile.courseYear, false)}
                            {renderDetailRow('Lớp', profile.className, true)}
                            {renderDetailRow('Email cá nhân', profile.personalEmail, false)}
                            {renderDetailRow('Dân tộc', profile.ethnicity, true)}
                            {renderDetailRow('Tôn giáo', profile.religion, false)}
                            {renderDetailRow('Đối tượng ưu tiên', profile.priorityObject, true)}
                            {renderDetailRow('Địa chỉ thường trú', `${profile.permanentAddress || ''}, ${profile.permanentDistrict || ''}, ${profile.permanentProvince || ''}`, false)}
                            {/* Thông tin gia đình */}
                            {renderDetailRow('Cha: Tên', profile.fatherName, true)}
                            {renderDetailRow('Cha: Năm sinh', profile.fatherDobYear, false)}
                            {renderDetailRow('Cha: SĐT', profile.fatherPhone, true)}
                            {renderDetailRow('Cha: Địa chỉ', profile.fatherAddress, false)}
                            {renderDetailRow('Mẹ: Tên', profile.motherName, true)}
                            {renderDetailRow('Mẹ: Năm sinh', profile.motherDobYear, false)}
                            {renderDetailRow('Mẹ: SĐT', profile.motherPhone, true)}
                            {renderDetailRow('Mẹ: Địa chỉ', profile.motherAddress, false)}
                            {/* Thông tin liên lạc khẩn cấp */}
                            {renderDetailRow('Người báo tin khẩn cấp', profile.emergencyContactRelation, true)}
                            {renderDetailRow('SĐT báo tin', profile.emergencyContactPhone, false)}
                            {renderDetailRow('Địa chỉ báo tin', profile.emergencyContactAddress, true)}

                        </>
                    )}

                    {/* Trường riêng cho Staff */}
                    {!isStudent && profile && (
                        <>
                            {renderDetailRow('Chức vụ', profile.position, false)}
                            {renderDetailRow('Địa chỉ', profile.address, true)}
                            {/* Có thể thêm tòa nhà quản lý nếu cần */}
                            {/* {profile.managedBuilding && renderDetailRow('Tòa nhà quản lý', profile.managedBuilding.name, false)} */}
                        </>
                    )}
                    {renderDetailRow('Ngày tham gia', user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : null, !isStudent)}
                    {renderDetailRow('Cập nhật lần cuối', profile.updatedAt ? new Date(profile.updatedAt).toLocaleString('vi-VN') : null, isStudent)}

                </dl>
            </div>
        </div>
    );
};

export default ProfileInfo;