import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button, Card, Input, Select, DatePicker } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const StudentProfileEditPage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        phoneNumber: '',
        gender: 'MALE',
        birthDate: '',
        identityCardNumber: '',
        faculty: '',
        courseYear: '',
        className: '',
        personalEmail: '',
        ethnicity: '',
        religion: '',
        priorityObject: '',
        permanentProvince: '',
        permanentDistrict: '',
        permanentAddress: '',
        fatherName: '',
        fatherDobYear: '',
        fatherPhone: '',
        fatherAddress: '',
        motherName: '',
        motherDobYear: '',
        motherPhone: '',
        motherAddress: '',
        emergencyContactRelation: '',
        emergencyContactPhone: '',
        emergencyContactAddress: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getMe();
                if (response?.user?.studentProfile) {
                    const studentProfile = response.user.studentProfile;
                    setProfile(studentProfile);
                    setFormData({
                        fullName: studentProfile.fullName || '',
                        studentId: studentProfile.studentId || '',
                        phoneNumber: studentProfile.phoneNumber || '',
                        gender: studentProfile.gender || 'MALE',
                        birthDate: studentProfile.birthDate ? format(parseISO(studentProfile.birthDate), 'yyyy-MM-dd') : '',
                        identityCardNumber: studentProfile.identityCardNumber || '',
                        faculty: studentProfile.faculty || '',
                        courseYear: studentProfile.courseYear?.toString() || '',
                        className: studentProfile.className || '',
                        personalEmail: studentProfile.personalEmail || '',
                        ethnicity: studentProfile.ethnicity || '',
                        religion: studentProfile.religion || '',
                        priorityObject: studentProfile.priorityObject || '',
                        permanentProvince: studentProfile.permanentProvince || '',
                        permanentDistrict: studentProfile.permanentDistrict || '',
                        permanentAddress: studentProfile.permanentAddress || '',
                        fatherName: studentProfile.fatherName || '',
                        fatherDobYear: studentProfile.fatherDobYear?.toString() || '',
                        fatherPhone: studentProfile.fatherPhone || '',
                        fatherAddress: studentProfile.fatherAddress || '',
                        motherName: studentProfile.motherName || '',
                        motherDobYear: studentProfile.motherDobYear?.toString() || '',
                        motherPhone: studentProfile.motherPhone || '',
                        motherAddress: studentProfile.motherAddress || '',
                        emergencyContactRelation: studentProfile.emergencyContactRelation || '',
                        emergencyContactPhone: studentProfile.emergencyContactPhone || '',
                        emergencyContactAddress: studentProfile.emergencyContactAddress || ''
                    });
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Chuẩn bị dữ liệu trước khi gửi
            const submitData = {
                // Thêm ID từ profile để sử dụng trong endpoint
                id: profile.id,
                ...formData,
                // Chuyển đổi các trường số
                courseYear: formData.courseYear ? parseInt(formData.courseYear) : null,
                fatherDobYear: formData.fatherDobYear ? parseInt(formData.fatherDobYear) : null,
                motherDobYear: formData.motherDobYear ? parseInt(formData.motherDobYear) : null,
                // Xử lý các trường trống
                fullName: formData.fullName || null,
                studentId: formData.studentId || null,
                phoneNumber: formData.phoneNumber || null,
                gender: formData.gender || 'MALE',
                birthDate: formData.birthDate || null,
                identityCardNumber: formData.identityCardNumber || null,
                faculty: formData.faculty || null,
                className: formData.className || null,
                personalEmail: formData.personalEmail || null,
                ethnicity: formData.ethnicity || null,
                religion: formData.religion || null,
                priorityObject: formData.priorityObject || null,
                permanentProvince: formData.permanentProvince || null,
                permanentDistrict: formData.permanentDistrict || null,
                permanentAddress: formData.permanentAddress || null,
                fatherName: formData.fatherName || null,
                fatherPhone: formData.fatherPhone || null,
                fatherAddress: formData.fatherAddress || null,
                motherName: formData.motherName || null,
                motherPhone: formData.motherPhone || null,
                motherAddress: formData.motherAddress || null,
                emergencyContactRelation: formData.emergencyContactRelation || null,
                emergencyContactPhone: formData.emergencyContactPhone || null,
                emergencyContactAddress: formData.emergencyContactAddress || null
            };

            console.log('Submit data with ID:', submitData.id);

            // Gọi API cập nhật thông tin sinh viên
            const response = await authService.updateProfile(submitData);
            if (response?.success || response?.status === 'success') {
                toast.success('Cập nhật thông tin thành công');
                navigate('/profile');
            } else {
                throw new Error(response?.message || 'Cập nhật thông tin thất bại');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error(err?.message || 'Cập nhật thông tin thất bại');
        } finally {
            setIsSubmitting(false);
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
                <div className="mt-4">
                    <Button variant="primary" onClick={() => navigate('/profile')}>
                        Quay lại trang hồ sơ
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button
                    variant="link"
                    onClick={() => navigate('/profile')}
                >
                    <div className="flex items-center gap-1">
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>Quay lại</span>
                    </div>
                </Button>
                <h1 className="text-2xl font-semibold">Chỉnh sửa hồ sơ sinh viên</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Thông tin cơ bản */}
                <Card title="Thông tin cơ bản" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Thông tin cá nhân cơ bản của sinh viên</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Họ và tên"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập họ và tên đầy đủ"
                        />
                        <Input
                            label="Mã sinh viên"
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleInputChange}
                            required
                            disabled
                            placeholder="Mã sinh viên"
                        />
                        <Input
                            label="Số điện thoại"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập số điện thoại"
                        />
                        <Select
                            label="Giới tính"
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            required
                            options={[
                                { value: 'MALE', label: 'Nam' },
                                { value: 'FEMALE', label: 'Nữ' }
                            ]}
                        />
                        <Input
                            type="date"
                            label="Ngày sinh"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Số CCCD/CMND"
                            name="identityCardNumber"
                            value={formData.identityCardNumber}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập số CCCD/CMND"
                        />
                    </div>
                </Card>

                {/* Thông tin học tập */}
                <Card title="Thông tin học tập" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Thông tin về quá trình học tập tại trường</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Khoa/Viện"
                            name="faculty"
                            value={formData.faculty}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập tên khoa/viện"
                        />
                        <Input
                            type="number"
                            label="Khóa"
                            name="courseYear"
                            value={formData.courseYear}
                            onChange={handleInputChange}
                            required
                            placeholder="Nhập khóa học"
                        />
                        <Input
                            label="Lớp"
                            name="className"
                            value={formData.className}
                            onChange={handleInputChange}
                            placeholder="Nhập tên lớp"
                        />
                        <Input
                            type="email"
                            label="Email cá nhân"
                            name="personalEmail"
                            value={formData.personalEmail}
                            onChange={handleInputChange}
                            placeholder="Nhập email cá nhân"
                        />
                        <Input
                            label="Dân tộc"
                            name="ethnicity"
                            value={formData.ethnicity}
                            onChange={handleInputChange}
                            placeholder="Nhập dân tộc"
                        />
                        <Input
                            label="Tôn giáo"
                            name="religion"
                            value={formData.religion}
                            onChange={handleInputChange}
                            placeholder="Nhập tôn giáo"
                        />
                        <Input
                            label="Đối tượng ưu tiên"
                            name="priorityObject"
                            value={formData.priorityObject}
                            onChange={handleInputChange}
                            placeholder="Nhập đối tượng ưu tiên"
                        />
                    </div>
                </Card>

                {/* Địa chỉ thường trú */}
                <Card title="Địa chỉ thường trú" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Địa chỉ nơi sinh viên thường trú</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Tỉnh/Thành phố"
                            name="permanentProvince"
                            value={formData.permanentProvince}
                            onChange={handleInputChange}
                            placeholder="Nhập tỉnh/thành phố"
                        />
                        <Input
                            label="Quận/Huyện"
                            name="permanentDistrict"
                            value={formData.permanentDistrict}
                            onChange={handleInputChange}
                            placeholder="Nhập quận/huyện"
                        />
                        <Input
                            label="Địa chỉ"
                            name="permanentAddress"
                            value={formData.permanentAddress}
                            onChange={handleInputChange}
                            className="md:col-span-2"
                            placeholder="Nhập địa chỉ chi tiết"
                        />
                    </div>
                </Card>

                {/* Thông tin gia đình - Cha */}
                <Card title="Thông tin gia đình - Cha" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Thông tin về người cha của sinh viên</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Họ tên"
                            name="fatherName"
                            value={formData.fatherName}
                            onChange={handleInputChange}
                            placeholder="Nhập họ tên cha"
                        />
                        <Input
                            type="number"
                            label="Năm sinh"
                            name="fatherDobYear"
                            value={formData.fatherDobYear}
                            onChange={handleInputChange}
                            placeholder="Nhập năm sinh"
                        />
                        <Input
                            label="Số điện thoại"
                            name="fatherPhone"
                            value={formData.fatherPhone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại"
                        />
                        <Input
                            label="Địa chỉ"
                            name="fatherAddress"
                            value={formData.fatherAddress}
                            onChange={handleInputChange}
                            className="md:col-span-2"
                            placeholder="Nhập địa chỉ"
                        />
                    </div>
                </Card>

                {/* Thông tin gia đình - Mẹ */}
                <Card title="Thông tin gia đình - Mẹ" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Thông tin về người mẹ của sinh viên</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Họ tên"
                            name="motherName"
                            value={formData.motherName}
                            onChange={handleInputChange}
                            placeholder="Nhập họ tên mẹ"
                        />
                        <Input
                            type="number"
                            label="Năm sinh"
                            name="motherDobYear"
                            value={formData.motherDobYear}
                            onChange={handleInputChange}
                            placeholder="Nhập năm sinh"
                        />
                        <Input
                            label="Số điện thoại"
                            name="motherPhone"
                            value={formData.motherPhone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại"
                        />
                        <Input
                            label="Địa chỉ"
                            name="motherAddress"
                            value={formData.motherAddress}
                            onChange={handleInputChange}
                            className="md:col-span-2"
                            placeholder="Nhập địa chỉ"
                        />
                    </div>
                </Card>

                {/* Thông tin liên hệ khẩn cấp */}
                <Card title="6. Thông tin liên hệ khẩn cấp" className="bg-white shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Thông tin người liên hệ trong trường hợp khẩn cấp</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Quan hệ"
                            name="emergencyContactRelation"
                            value={formData.emergencyContactRelation}
                            onChange={handleInputChange}
                            placeholder="Nhập quan hệ"
                        />
                        <Input
                            label="Số điện thoại"
                            name="emergencyContactPhone"
                            value={formData.emergencyContactPhone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại"
                        />
                        <Input
                            label="Địa chỉ"
                            name="emergencyContactAddress"
                            value={formData.emergencyContactAddress}
                            onChange={handleInputChange}
                            className="md:col-span-2"
                            placeholder="Nhập địa chỉ"
                        />
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/profile')}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default StudentProfileEditPage;