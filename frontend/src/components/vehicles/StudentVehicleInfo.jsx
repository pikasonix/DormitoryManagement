import React, { useState, useEffect } from 'react';
import { vehicleService } from '../../services/vehicle.service';
import { useAuth } from '../../contexts/AuthContext';
import VehicleCard from './VehicleCard';
import { Button, Card } from '../shared';
import LoadingSpinner from '../shared/LoadingSpinner';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const StudentVehicleInfo = ({ studentProfileId, showActions = true }) => {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

    useEffect(() => {
        const fetchVehicles = async () => {
            setIsLoading(true);
            try {
                // Nếu truyền studentProfileId, lấy xe của sinh viên đó
                // Nếu không, lấy xe của sinh viên đang đăng nhập (từ token)
                const params = studentProfileId ? { studentProfileId } : {};

                const response = await vehicleService.getAllVehicles(params);
                setVehicles(response.vehicles || []);
                setError(null);
            } catch (err) {
                console.error('Lỗi khi lấy thông tin xe:', err);
                setError(err.message || 'Không thể lấy thông tin xe.');
                toast.error('Không thể tải thông tin xe.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVehicles();
    }, [studentProfileId]);

    const handleEditVehicle = (vehicleId) => {
        navigate(`/vehicles/${vehicleId}/edit`);
    };

    const handleDeleteVehicle = async (vehicleId, licensePlate) => {
        if (window.confirm(`Bạn có chắc muốn xóa thông tin xe có biển số "${licensePlate}" không?`)) {
            try {
                await vehicleService.deleteVehicle(vehicleId);
                toast.success('Xóa thông tin xe thành công.');
                // Cập nhật lại state để hiển thị mà không cần tải lại trang
                setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
            } catch (err) {
                toast.error(err?.message || 'Xóa thông tin xe thất bại.');
            }
        }
    };

    // Hàm hủy đăng ký xe (chỉ áp dụng cho xe chưa được duyệt - không active và không có parkingCardNo)
    const handleCancelRegistration = async (vehicleId, licensePlate) => {
        if (window.confirm(`Bạn có chắc muốn hủy đăng ký xe có biển số "${licensePlate}" không?`)) {
            try {
                await vehicleService.deleteVehicle(vehicleId);
                toast.success('Hủy đăng ký xe thành công.');
                // Cập nhật lại state để hiển thị mà không cần tải lại trang
                setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
            } catch (err) {
                toast.error(err?.message || 'Hủy đăng ký xe thất bại.');
            }
        }
    };

    const handleAddVehicle = () => {
        navigate('/vehicles/register');
    };

    // Nếu đang tải dữ liệu
    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex justify-center items-center h-32">
                    <LoadingSpinner />
                </div>
            </Card>
        );
    }

    // Nếu có lỗi
    if (error) {
        return (
            <Card className="p-6">
                <div className="text-red-600 text-center">
                    <p>Có lỗi xảy ra: {error}</p>
                    <Button
                        variant="secondary"
                        className="mt-3"
                        onClick={() => window.location.reload()}
                    >
                        Thử lại
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div>
            {/* Header với tiêu đề và nút thêm mới */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    Thông tin phương tiện
                </h2>

                {showActions && (
                    <Button
                        variant="primary"
                        onClick={handleAddVehicle}
                        icon={PlusIcon}
                        size="sm"
                    >
                        Đăng ký xe
                    </Button>
                )}
            </div>            {/* Danh sách xe */}
            {vehicles.length > 0 ? (
                <>
                    {/* Divide into active, pending and inactive groups */}
                    {vehicles.some(vehicle => vehicle.isActive) && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Xe đã được phê duyệt</h3>
                            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {vehicles
                                    .filter(vehicle => vehicle.isActive)
                                    .map(vehicle => (
                                        <VehicleCard
                                            key={vehicle.id}
                                            vehicle={vehicle}
                                            onEdit={showActions && isAdminOrStaff ? () => handleEditVehicle(vehicle.id) : null}
                                            onDelete={showActions && isAdminOrStaff ? () => handleDeleteVehicle(vehicle.id, vehicle.licensePlate) : null}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}

                    {vehicles.some(vehicle => !vehicle.isActive && !vehicle.parkingCardNo) && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Đăng ký chờ phê duyệt</h3>
                            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {vehicles
                                    .filter(vehicle => !vehicle.isActive && !vehicle.parkingCardNo)
                                    .map(vehicle => (<VehicleCard key={vehicle.id}
                                        vehicle={vehicle}
                                        onEdit={null}
                                        onDelete={
                                            showActions ? () => isAdminOrStaff
                                                ? handleDeleteVehicle(vehicle.id, vehicle.licensePlate)
                                                : handleCancelRegistration(vehicle.id, vehicle.licensePlate)
                                                : null
                                        }
                                    />
                                    ))}
                            </div>
                        </div>
                    )}

                    {vehicles.some(vehicle => !vehicle.isActive && vehicle.parkingCardNo) && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Xe không hoạt động</h3>
                            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {vehicles
                                    .filter(vehicle => !vehicle.isActive && vehicle.parkingCardNo)
                                    .map(vehicle => (
                                        <VehicleCard
                                            key={vehicle.id}
                                            vehicle={vehicle}
                                            onEdit={showActions && isAdminOrStaff ? () => handleEditVehicle(vehicle.id) : null}
                                            onDelete={showActions && isAdminOrStaff ? () => handleDeleteVehicle(vehicle.id, vehicle.licensePlate) : null}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <Card className="p-6 text-center text-gray-500">
                    <p>Chưa có thông tin phương tiện nào.</p>
                    {showActions && (
                        <Button
                            variant="secondary"
                            className="mt-3"
                            onClick={handleAddVehicle}
                            icon={PlusIcon}
                            size="sm"
                        >
                            Đăng ký xe
                        </Button>
                    )}
                </Card>
            )}
        </div>
    );
};

export default StudentVehicleInfo;
