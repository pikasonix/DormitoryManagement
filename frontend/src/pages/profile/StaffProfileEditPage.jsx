import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button, Card, Input, Select, DatePicker } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const StaffProfileEditPage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        gender: 'MALE',
        birthDate: '',
        identityCardNumber: '',
        position: '',
        address: ''
    });

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
                    console.log('Staff profile found:', staffProfile);
                    setProfile(staffProfile);
                    setFormData({
                        fullName: staffProfile.fullName || '',
                        phoneNumber: staffProfile.phoneNumber || '',
                        gender: staffProfile.gender || 'MALE',
                        birthDate: staffProfile.birthDate ? format(parseISO(staffProfile.birthDate), 'yyyy-MM-dd') : '',
                        identityCardNumber: staffProfile.identityCardNumber || '',
                        position: staffProfile.position || '',
                        address: staffProfile.address || ''
                    });
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const submitData = {
                id: profile.id,
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                gender: formData.gender,
                birthDate: formData.birthDate || null,
                identityCardNumber: formData.identityCardNumber || null,
                position: formData.position || null,
                address: formData.address || null
            };

            console.log('Submit data with ID:', submitData.id);

            // Gọi API cập nhật thông tin nhân viên
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
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <Button
                    variant="link"
                    icon={ArrowLeftIcon}
                    className="text-sm"
                    onClick={() => navigate('/profile')}
                >
                    Quay lại hồ sơ
                </Button>
                <h1 className="text-2xl font-semibold">Chỉnh sửa hồ sơ nhân viên</h1>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white px-4 py-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <Input
                                    label="Họ và tên"
                                    id="fullName"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Input
                                    label="Số điện thoại"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Select
                                    label="Giới tính"
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'MALE', label: 'Nam' },
                                        { value: 'FEMALE', label: 'Nữ' },
                                        { value: 'OTHER', label: 'Khác' }
                                    ]}
                                    required
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Input
                                    label="Ngày sinh"
                                    type="date"
                                    id="birthDate"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Input
                                    label="Số CCCD/CMND"
                                    id="identityCardNumber"
                                    name="identityCardNumber"
                                    value={formData.identityCardNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Input
                                    label="Chức vụ"
                                    id="position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="sm:col-span-6">
                                <Input
                                    label="Địa chỉ"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/profile')}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Lưu
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default StaffProfileEditPage;