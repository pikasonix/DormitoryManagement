import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import StudentVehicleInfo from '../../components/vehicles/StudentVehicleInfo';

const StudentVehicleView = () => {
    const { id } = useParams(); // ID của student profile (nếu xem của người khác)
    const { user } = useAuth();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Xác định nếu người dùng là admin/staff hoặc đang xem thông tin của chính họ
    const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
    const isSelf = user?.studentProfile?.id === Number(id);
    const canViewDetails = isAdminOrStaff || isSelf;

    // StudentProfileId sẽ là ID từ params (nếu admin xem của người khác) hoặc ID của người dùng hiện tại
    const studentProfileId = id || user?.studentProfile?.id;

    useEffect(() => {
        const fetchStudentData = async () => {
            if (!studentProfileId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await studentService.getStudentByProfileId(studentProfileId);
                setStudent(data);
                setError(null);
            } catch (err) {
                console.error('Lỗi khi lấy thông tin sinh viên:', err);
                setError(err.message || 'Không thể lấy thông tin sinh viên.');
                toast.error('Không thể tải thông tin sinh viên.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentData();
    }, [studentProfileId]); const handleRegisterVehicle = () => {
        navigate('/vehicles/register');
    };

    // Nếu người dùng không có quyền xem
    if (!isLoading && !canViewDetails) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Card className="p-6 text-center">
                    <p className="text-red-600">Bạn không có quyền xem thông tin này.</p>
                    <Button
                        variant="primary"
                        className="mt-4"
                        onClick={() => navigate(-1)}
                    >
                        Quay lại
                    </Button>
                </Card>
            </div>
        );
    }

    // Nếu đang tải dữ liệu
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Card className="p-6">
                    <div className="flex justify-center items-center h-32">
                        <LoadingSpinner />
                    </div>
                </Card>
            </div>
        );
    }

    // Nếu có lỗi
    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Card className="p-6 text-center">
                    <p className="text-red-600">Có lỗi xảy ra: {error}</p>
                    <Button
                        variant="primary"
                        className="mt-4"
                        onClick={() => navigate(-1)}
                    >
                        Quay lại
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center">
                    <Button
                        variant="link"
                        onClick={() => navigate(-1)}
                        icon={ArrowLeftIcon}
                        className="mr-4"
                    >
                        Quay lại
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAdminOrStaff && !isSelf
                            ? `Phương tiện của ${student?.fullName || 'Sinh viên'}`
                            : 'Phương tiện của tôi'}
                    </h1>
                </div>

                {/* Thêm nút đăng ký xe mới */}
                <Button
                    variant="primary"
                    onClick={handleRegisterVehicle}
                    icon={PlusIcon}
                >
                    Đăng ký xe mới
                </Button>
            </div>

            {/* Thông tin sinh viên */}
            <Card className="p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Mã sinh viên</h3>
                        <p className="mt-1 text-lg font-semibold">{student?.studentId || 'N/A'}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Họ và tên</h3>
                        <p className="mt-1 text-lg font-semibold">{student?.fullName || 'N/A'}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Phòng</h3>
                        <p className="mt-1 text-lg font-semibold">
                            {student?.room
                                ? `${student.room.building?.name || ''} - Phòng ${student.room.number}`
                                : 'Chưa được xếp phòng'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Danh sách phương tiện */}
            <StudentVehicleInfo
                studentProfileId={studentProfileId}
                showActions={canViewDetails}
            />
        </div>
    );
};

export default StudentVehicleView;
