import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance.service';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service';
import { Input, Button, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const AdminMaintenanceRequestForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        buildingId: '',
        roomNumber: '',
        description: '',
    });

    const [buildings, setBuildings] = useState([]);
    const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomValidationStatus, setRoomValidationStatus] = useState(null);
    const [isCheckingRoom, setIsCheckingRoom] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Kiểm tra quyền truy cập - chỉ admin/staff được phép
    useEffect(() => {
        if (user && user.role !== 'ADMIN' && user.role !== 'STAFF') {
            toast.error('Bạn không có quyền truy cập trang này.');
            navigate('/maintenance');
        }
    }, [user, navigate]);

    // Fetch danh sách tòa nhà
    useEffect(() => {
        const fetchBuildings = async () => {
            setIsLoadingBuildings(true);
            try {
                const data = await buildingService.getAllBuildings();
                setBuildings(data.buildings || []);
            } catch (err) {
                console.error("Lỗi tải danh sách tòa nhà:", err);
                toast.error("Không thể tải danh sách tòa nhà.");
            } finally {
                setIsLoadingBuildings(false);
            }
        };
        fetchBuildings();
    }, []);

    // Handler thay đổi input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset room validation khi thay đổi tòa nhà hoặc số phòng
        if (name === 'buildingId' || name === 'roomNumber') {
            setSelectedRoom(null);
            setRoomValidationStatus(null);
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    // Kiểm tra phòng dựa trên số phòng và tòa nhà
    const checkRoom = async () => {
        // Reset
        setSelectedRoom(null);
        setRoomValidationStatus(null);
        setErrors(prev => ({ ...prev, roomNumber: null, buildingId: null }));

        // Validation
        if (!formData.buildingId) {
            setErrors(prev => ({ ...prev, buildingId: "Vui lòng chọn tòa nhà" }));
            return;
        }

        if (!formData.roomNumber.trim()) {
            setErrors(prev => ({ ...prev, roomNumber: "Vui lòng nhập số phòng" }));
            return;
        }

        setIsCheckingRoom(true);
        try {
            // Tìm phòng dựa trên số phòng và tòa nhà
            const roomsData = await roomService.getAllRooms({
                buildingId: formData.buildingId,
                search: formData.roomNumber.trim(),
                limit: 10
            });

            const rooms = roomsData.rooms || [];

            // Tìm phòng có số phòng khớp chính xác
            const exactRoom = rooms.find(room =>
                room.number.toLowerCase() === formData.roomNumber.trim().toLowerCase() &&
                room.buildingId.toString() === formData.buildingId
            );

            if (!exactRoom) {
                setRoomValidationStatus({
                    isValid: false,
                    message: "Không tìm thấy phòng với số phòng này trong tòa nhà đã chọn"
                });
                return;
            }

            // Phòng hợp lệ
            setSelectedRoom(exactRoom);
            setRoomValidationStatus({
                isValid: true,
                message: `Phòng ${exactRoom.number} (${exactRoom.type}, ${exactRoom.capacity} chỗ) hợp lệ để tạo yêu cầu bảo trì`
            });

        } catch (err) {
            console.error("Lỗi kiểm tra phòng:", err);
            setRoomValidationStatus({
                isValid: false,
                message: "Có lỗi xảy ra khi kiểm tra phòng"
            });
        } finally {
            setIsCheckingRoom(false);
        }
    };

    // Trigger room check khi nhập đủ thông tin
    useEffect(() => {
        if (formData.buildingId && formData.roomNumber.trim()) {
            const timer = setTimeout(checkRoom, 500); // Debounce 500ms
            return () => clearTimeout(timer);
        }
    }, [formData.buildingId, formData.roomNumber]);

    // Handler Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Validation
        if (!formData.buildingId) {
            setErrors({ buildingId: "Vui lòng chọn tòa nhà" });
            setIsSubmitting(false);
            return;
        }

        if (!formData.roomNumber.trim()) {
            setErrors({ roomNumber: "Vui lòng nhập số phòng" });
            setIsSubmitting(false);
            return;
        }

        if (!formData.description.trim()) {
            setErrors({ description: "Vui lòng mô tả sự cố" });
            setIsSubmitting(false);
            return;
        }

        if (!selectedRoom) {
            setErrors({ roomNumber: "Vui lòng kiểm tra lại thông tin phòng" });
            setIsSubmitting(false);
            return;
        }

        if (!roomValidationStatus?.isValid) {
            toast.error("Phòng không hợp lệ. Vui lòng kiểm tra lại.");
            setIsSubmitting(false);
            return;
        }

        try {
            // Chuẩn bị payload cho API tạo request
            const payload = {
                roomId: selectedRoom.id,
                issue: formData.description,
                notes: `Báo cáo bởi ${user.role === 'ADMIN' ? 'Admin' : 'Staff'}: ${user.fullName || user.email}`,
                status: 'PENDING', // Tạo với trạng thái chờ xử lý
            };

            console.log("Payload gửi đi:", payload);

            // Gọi API tạo request
            await maintenanceService.createMaintenanceRequest(payload);
            toast.success('Đã tạo yêu cầu bảo trì thành công!');
            navigate('/maintenance');

        } catch (err) {
            console.error("Lỗi tạo yêu cầu bảo trì:", err);
            const errorMsg = err?.message || 'Tạo yêu cầu thất bại.';

            if (err?.errors && Array.isArray(err.errors)) {
                const serverErrors = {};
                err.errors.forEach(fieldError => {
                    if (fieldError.field) serverErrors[fieldError.field] = fieldError.message;
                });
                setErrors(serverErrors);
                toast.error("Vui lòng kiểm tra lại thông tin.", { id: 'validation-error' });
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingBuildings) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    const buildingOptions = [
        { value: '', label: '-- Chọn tòa nhà --' },
        ...buildings.map(building => ({
            value: building.id.toString(),
            label: building.name
        }))
    ];

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Button
                    variant="link"
                    onClick={() => navigate('/maintenance')}
                >
                    <div className="flex items-center gap-1">
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>Quay lại</span>
                    </div>
                </Button>
                <h1 className="text-2xl font-semibold">Tạo yêu cầu Bảo trì / Sửa chữa</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Tạo yêu cầu bảo trì cho bất kỳ phòng nào trong hệ thống.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {/* Chọn tòa nhà */}
                <Select
                    label="Tòa nhà"
                    id="buildingId"
                    name="buildingId"
                    value={formData.buildingId}
                    onChange={handleChange}
                    options={buildingOptions}
                    required
                    disabled={isSubmitting}
                    error={errors.buildingId}
                />

                {/* Nhập số phòng */}
                <div>
                    <Input
                        label="Số phòng"
                        id="roomNumber"
                        name="roomNumber"
                        value={formData.roomNumber}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        error={errors.roomNumber}
                        placeholder="Ví dụ: 101, A203, B3-405..."
                    />

                    {/* Hiển thị trạng thái kiểm tra phòng */}
                    {isCheckingRoom && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800 flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang kiểm tra phòng...
                            </p>
                        </div>
                    )}

                    {/* Hiển thị kết quả kiểm tra phòng */}
                    {roomValidationStatus && (
                        <div className={`mt-2 p-3 rounded-md border ${roomValidationStatus.isValid
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}>
                            <p className={`text-sm ${roomValidationStatus.isValid
                                    ? 'text-green-800'
                                    : 'text-red-800'
                                }`}>
                                {roomValidationStatus.message}
                            </p>
                        </div>
                    )}
                </div>

                {/* Mô tả sự cố */}
                <Textarea
                    label="Mô tả chi tiết sự cố"
                    id="description"
                    name="description"
                    rows={5}
                    value={formData.description}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    error={errors.description}
                    placeholder="Mô tả rõ ràng vấn đề phát hiện, vị trí cụ thể (nếu có), mức độ nghiêm trọng..."
                />

                {/* Hiển thị thông tin phòng đã chọn */}
                {selectedRoom && roomValidationStatus?.isValid && (
                    <div className="p-4 bg-gray-50 rounded-md border">
                        <h4 className="font-medium text-gray-800 mb-2">Thông tin phòng:</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Số phòng:</span> {selectedRoom.number}</p>
                            <p><span className="font-medium">Tòa nhà:</span> {selectedRoom.building?.name || buildings.find(b => b.id.toString() === formData.buildingId)?.name}</p>
                            <p><span className="font-medium">Loại phòng:</span> {selectedRoom.type}</p>
                            <p><span className="font-medium">Sức chứa:</span> {selectedRoom.capacity} người</p>
                            <p><span className="font-medium">Trạng thái:</span> {selectedRoom.status}</p>
                        </div>
                    </div>
                )}

                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/maintenance')} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || !roomValidationStatus?.isValid}
                    >
                        Tạo yêu cầu
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminMaintenanceRequestForm;
