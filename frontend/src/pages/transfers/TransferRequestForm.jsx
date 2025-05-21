// filepath: d:\CODE\DormitoryManagement\frontend\src\pages\transfers\TransferRequestForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transferService } from '../../services/transfer.service';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Helper convert currency
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return parseInt(amount).toLocaleString('vi-VN') + ' VNĐ';
};

const TransferRequestForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const targetRoom = location.state?.targetRoom;

    const [buildings, setBuildings] = useState([]);
    const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);

    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomValidationStatus, setRoomValidationStatus] = useState(null);
    const [isCheckingRoom, setIsCheckingRoom] = useState(false); const [formData, setFormData] = useState({
        buildingId: targetRoom?.buildingId?.toString() || '',
        roomNumber: targetRoom?.number || '',
        reason: '',
        transferDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mặc định 7 ngày kể từ hôm nay
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [hasActiveRequest, setHasActiveRequest] = useState(false);
    const [isCheckingActiveRequest, setIsCheckingActiveRequest] = useState(true);

    // Giới tính của sinh viên hiện tại
    const studentGender = user?.studentProfile?.gender || user?.profile?.gender;

    // Tòa nhà hiện tại của sinh viên
    const currentBuildingId = user?.profile?.room?.building?.id ||
        user?.studentProfile?.room?.building?.id;

    // Phòng hiện tại của sinh viên
    const currentRoomId = user?.profile?.roomId || user?.studentProfile?.roomId;
    const currentRoom = user?.profile?.room || user?.studentProfile?.room;

    // Fetch danh sách tòa nhà    // Pre-select target room if provided
    useEffect(() => {
        if (targetRoom) {
            setSelectedRoom(targetRoom);
            setRoomValidationStatus({
                isValid: true,
                message: `Phòng ${targetRoom.number} đã được chọn từ danh sách phòng`
            });
        }
    }, [targetRoom]);

    useEffect(() => {
        const fetchBuildings = async () => {
            setIsLoadingBuildings(true);
            try {
                const data = await buildingService.getAllBuildings();
                setBuildings(data.buildings || []);

                // If we have a target room, select its building
                if (targetRoom?.buildingId) {
                    setFormData(prev => ({
                        ...prev,
                        buildingId: targetRoom.buildingId.toString(),
                        roomNumber: targetRoom.number
                    }));
                }
                // Otherwise select current building if available
                else if (currentBuildingId) {
                    setFormData(prev => ({
                        ...prev,
                        buildingId: currentBuildingId.toString()
                    }));
                }
            } catch (err) {
                console.error("Lỗi tải danh sách tòa nhà:", err);
                toast.error("Không thể tải danh sách tòa nhà.");
            } finally {
                setIsLoadingBuildings(false);
            }
        };

        // Chỉ fetch nếu user là student
        if (user?.role === 'STUDENT') {
            fetchBuildings();
        } else {
            setIsLoadingBuildings(false);
        }
    }, [user, currentBuildingId]);

    // Kiểm tra xem sinh viên đã có yêu cầu chuyển phòng PENDING/APPROVED chưa
    useEffect(() => {
        const checkActiveRequest = async () => {
            setIsCheckingActiveRequest(true);
            try {
                // Ưu tiên lấy studentId từ user context
                const studentId = user?.studentId || user?.profile?.studentId || user?.studentProfile?.studentId;
                if (!studentId) {
                    setHasActiveRequest(false);
                    setIsCheckingActiveRequest(false);
                    return;
                }
                // Lấy tất cả request của sinh viên, lọc trạng thái PENDING/APPROVED
                const { transfers } = await transferService.getAllTransferRequests({ studentId, status: '' });
                const active = transfers.some(
                    (tr) => tr.status === 'PENDING' || tr.status === 'APPROVED'
                );
                setHasActiveRequest(active);
            } catch (err) {
                setHasActiveRequest(false); // Nếu lỗi, cho phép tạo (hoặc có thể chặn tuỳ ý)
            } finally {
                setIsCheckingActiveRequest(false);
            }
        };
        if (user?.role === 'STUDENT') {
            checkActiveRequest();
        } else {
            setIsCheckingActiveRequest(false);
        }
    }, [user]);

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

            // Kiểm tra nếu đây là phòng hiện tại của sinh viên
            if (exactRoom.id === currentRoomId) {
                setRoomValidationStatus({
                    isValid: false,
                    message: "Bạn đã đang ở phòng này, không thể chuyển đến phòng hiện tại"
                });
                return;
            }

            // Kiểm tra trạng thái phòng
            if (exactRoom.status === 'UNDER_MAINTENANCE') {
                setRoomValidationStatus({
                    isValid: false,
                    message: "Phòng này đang được bảo trì, không thể chuyển đến"
                });
                return;
            }

            // Kiểm tra sức chứa
            if (exactRoom.actualOccupancy >= exactRoom.capacity) {
                setRoomValidationStatus({
                    isValid: false,
                    message: "Phòng này đã đầy, không còn chỗ trống"
                });
                return;
            }

            // Kiểm tra giới tính phòng dựa trên RoomType
            if (exactRoom.type) {
                // Phòng quản lý - sinh viên không được phép ở
                if (exactRoom.type === 'MANAGEMENT') {
                    setRoomValidationStatus({
                        isValid: false,
                        message: `Phòng này dành cho quản lý/nhân viên, sinh viên không thể chuyển vào`
                    });
                    return;
                }

                // Kiểm tra tương thích giới tính (chỉ khi biết được giới tính sinh viên)
                if (studentGender) {
                    if ((exactRoom.type === 'MALE' && studentGender !== 'MALE') ||
                        (exactRoom.type === 'FEMALE' && studentGender !== 'FEMALE')) {
                        setRoomValidationStatus({
                            isValid: false,
                            message: `Phòng này dành cho sinh viên ${exactRoom.type === 'MALE' ? 'Nam' : 'Nữ'}, không phù hợp với giới tính của bạn`
                        });
                        return;
                    }
                }
            }

            // Phòng hợp lệ
            setSelectedRoom(exactRoom);

            // Hiển thị thông tin phòng chi tiết hơn
            let roomTypeInfo;
            if (exactRoom.type === 'MALE') {
                roomTypeInfo = 'dành cho sinh viên Nam';
            } else if (exactRoom.type === 'FEMALE') {
                roomTypeInfo = 'dành cho sinh viên Nữ';
            } else if (exactRoom.type === 'MANAGEMENT') {
                roomTypeInfo = 'dành cho quản lý/nhân viên';
            } else {
                roomTypeInfo = 'Không xác định loại phòng';
            }

            setRoomValidationStatus({
                isValid: true,
                message: `Phòng ${exactRoom.number} (${roomTypeInfo}, ${exactRoom.capacity} chỗ, còn ${exactRoom.capacity - exactRoom.actualOccupancy} chỗ trống) hợp lệ để chuyển đến`
            });

        } catch (err) {
            console.error("Lỗi kiểm tra phòng:", err);
            toast.error("Không thể kiểm tra thông tin phòng.");
            setRoomValidationStatus({
                isValid: false,
                message: "Đã xảy ra lỗi khi kiểm tra phòng"
            });
        } finally {
            setIsCheckingRoom(false);
        }
    };

    // Handler Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // --- Validation ---
        if (!formData.buildingId) {
            setErrors(prev => ({ ...prev, buildingId: "Vui lòng chọn tòa nhà" }));
            setIsSubmitting(false);
            return;
        }

        if (!formData.roomNumber.trim()) {
            setErrors(prev => ({ ...prev, roomNumber: "Vui lòng nhập số phòng" }));
            setIsSubmitting(false);
            return;
        }

        if (!selectedRoom || !roomValidationStatus?.isValid) {
            setErrors(prev => ({ ...prev, roomCheck: "Vui lòng kiểm tra phòng trước khi gửi yêu cầu" }));
            setIsSubmitting(false);
            return;
        }

        if (!formData.reason.trim()) {
            setErrors(prev => ({ ...prev, reason: "Vui lòng nhập lý do chuyển phòng" }));
            setIsSubmitting(false);
            return;
        }

        if (!formData.transferDate) {
            setErrors(prev => ({ ...prev, transferDate: "Vui lòng chọn ngày dự kiến chuyển phòng" }));
            setIsSubmitting(false);
            return;
        }
        // --- End Validation ---

        try {
            // Payload gửi lên - chú ý backend mong đợi toRoomId thay vì targetRoomId
            const payload = {
                toRoomId: selectedRoom.id, // Thay đổi từ targetRoomId thành toRoomId theo yêu cầu của backend
                reason: formData.reason,
                transferDate: formData.transferDate
            };

            await transferService.createTransferRequest(payload);
            toast.success('Đã gửi yêu cầu chuyển phòng thành công!');
            navigate('/profile'); // Hoặc trang "Yêu cầu của tôi"
        } catch (err) {
            console.error("Lỗi gửi yêu cầu chuyển phòng:", err);
            const errorMsg = err?.message || 'Gửi yêu cầu thất bại.';

            // Xử lý trường hợp đã có yêu cầu chuyển phòng đang chờ
            if (errorMsg.includes('đã có một yêu cầu chuyển phòng đang chờ xử lý')) {
                // Trích xuất ID yêu cầu đang tồn tại từ thông báo lỗi
                const existingRequestId = errorMsg.match(/\(ID: (\d+)\)/)?.[1];
                const viewURL = existingRequestId ? `/transfers/${existingRequestId}` : '/profile/transfers';                // Tạo thông báo thân thiện với link trực tiếp
                const friendlyMessage = existingRequestId
                    ? `Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý (mã: ${existingRequestId}).`
                    : 'Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý.';

                // Hiển thị lỗi
                setErrors({
                    general: friendlyMessage + ' Bạn có thể xem chi tiết trong trang "Yêu cầu của tôi" hoặc hủy yêu cầu đó để tạo yêu cầu mới.',
                    actions: true,
                    existingRequestId: existingRequestId
                });

                toast.error(friendlyMessage, { duration: 5000 }); // Tăng thời gian hiển thị toast lên 5s
                return;
            }

            // Xử lý các lỗi khác
            if (err?.errors && Array.isArray(err.errors)) {
                const serverErrors = {};
                err.errors.forEach(fieldError => { if (fieldError.field) serverErrors[fieldError.field] = fieldError.message; });
                setErrors(serverErrors);
                toast.error("Vui lòng kiểm tra lại thông tin.", { id: 'validation-error' });
            } else {
                setErrors({ general: errorMsg }); // Lỗi chung
                toast.error(errorMsg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Options cho Select tòa nhà ---
    const buildingOptions = [
        { value: '', label: '-- Chọn tòa nhà --' },
        ...buildings.map(building => ({
            value: building.id.toString(),
            label: building.name
        }))
    ];

    // Nếu không phải student hoặc chưa có thông tin phòng hiện tại -> không cho tạo yêu cầu?
    if (user?.role !== 'STUDENT') {
        return <p className="text-center text-red-600 p-6">Chức năng này chỉ dành cho sinh viên.</p>;
    }

    // Check nếu sinh viên có phòng hay không
    const hasRoom = user?.profile?.roomId ||
        user?.profile?.room?.id ||
        user?.studentProfile?.roomId ||
        user?.studentProfile?.room?.id;

    if (!hasRoom) {
        return <p className="text-center text-gray-600 p-6">Bạn cần đang ở trong một phòng để thực hiện yêu cầu chuyển phòng.</p>;
    }

    // Nếu đang kiểm tra hoặc chưa xác định xong quyền tạo request
    if (isCheckingActiveRequest) {
        return <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>;
    }

    // Nếu đã có request đang chờ hoặc đã duyệt
    if (hasActiveRequest) {
        return (
            <div className="text-center text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-6 max-w-xl mx-auto mt-8">
                <h2 className="text-lg font-semibold mb-2">Bạn đã có yêu cầu chuyển phòng đang chờ xử lý hoặc đã được duyệt.</h2>
                <p>Vui lòng chờ quản lý xử lý yêu cầu hiện tại hoặc hủy yêu cầu đó trước khi tạo yêu cầu mới.</p>
                <Button className="mt-4" onClick={() => navigate('/transfers')}>Xem các yêu cầu chuyển phòng của bạn</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Button variant="link" onClick={() => navigate(-1)} className="text-sm mb-4">
                    <ArrowLeftIcon className="h-4 w-4 mr-1" /> Quay lại
                </Button>
                <h1 className="text-2xl font-semibold">Yêu cầu Chuyển phòng</h1>
                <p className="mt-1 text-sm text-gray-600">Điền thông tin dưới đây để gửi yêu cầu chuyển sang phòng khác.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {/* Thông tin phòng hiện tại */}
                <div className='p-4 bg-gray-50 rounded-md border'>
                    <p className='text-sm font-medium text-gray-700'>Phòng hiện tại của bạn:</p>
                    <p className='text-lg font-semibold text-gray-900'>
                        {currentRoom
                            ? `Phòng ${currentRoom.number} (${currentRoom.building?.name || 'N/A'})`
                            : 'Đang tải thông tin...'}
                    </p>
                </div>                {/* Lỗi chung */}
                {errors.general && (
                    <div className="rounded-md bg-red-50 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {/* SVG icon for error */}
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{errors.general}</p>
                                {errors.actions && (
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate(errors.existingRequestId ? `/transfers/${errors.existingRequestId}` : '/profile/transfers')}
                                            className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                                        >
                                            Xem yêu cầu hiện tại
                                        </button>
                                        {errors.existingRequestId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu chuyển phòng (mã: ${errors.existingRequestId})?`)) {
                                                        transferService.deleteTransferRequest(errors.existingRequestId)
                                                            .then(() => {
                                                                toast.success('Đã hủy yêu cầu chuyển phòng thành công!');
                                                                if (window.confirm('Bạn đã hủy yêu cầu chuyển phòng thành công. Tạo yêu cầu mới ngay bây giờ?')) {
                                                                    window.location.reload();
                                                                }
                                                            })
                                                            .catch((err) => {
                                                                console.error('Lỗi khi hủy yêu cầu:', err);
                                                                toast.error('Không thể hủy yêu cầu chuyển phòng. ' + (err.message || ''));
                                                            });
                                                    }
                                                }}
                                                className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                                            >
                                                Hủy yêu cầu hiện tại
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chọn tòa nhà */}
                <Select
                    label="Tòa nhà muốn chuyển đến *"
                    id="buildingId"
                    name="buildingId"
                    required
                    value={formData.buildingId}
                    onChange={handleChange}
                    options={buildingOptions}
                    disabled={isSubmitting || isLoadingBuildings || isCheckingRoom}
                    error={errors.buildingId}
                    loading={isLoadingBuildings}
                />

                {/* Nhập số phòng */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <Input
                            label="Số phòng muốn chuyển đến *"
                            id="roomNumber"
                            name="roomNumber"
                            required
                            value={formData.roomNumber}
                            onChange={handleChange}
                            disabled={isSubmitting || isCheckingRoom}
                            error={errors.roomNumber}
                            placeholder="VD: 101, A101, ..."
                        />
                    </div>
                    <div className="md:col-span-1 flex items-end">                        <Button
                        type="button"
                        variant="secondary"
                        onClick={checkRoom}
                        loading={isCheckingRoom}
                        disabled={isSubmitting || isCheckingRoom || !formData.buildingId || !formData.roomNumber.trim()}
                        className="w-full"
                    >
                        {isCheckingRoom ? 'Đang kiểm tra...' : 'Kiểm tra phòng'}
                    </Button>
                    </div>
                </div>

                {/* Thông báo kiểm tra phòng */}
                {roomValidationStatus && (
                    <div className={`p-3 rounded-md ${roomValidationStatus.isValid
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                        {roomValidationStatus.message}
                    </div>
                )}

                {errors.roomCheck && (
                    <div className="text-sm text-red-600 mt-1">{errors.roomCheck}</div>
                )}

                {/* Ngày chuyển phòng */}
                <Input
                    label="Ngày dự kiến chuyển phòng *"
                    type="date"
                    id="transferDate"
                    name="transferDate"
                    required
                    value={formData.transferDate}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    error={errors.transferDate}
                    min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày trong quá khứ
                />

                {/* Lý do chuyển phòng */}
                <Textarea
                    label="Lý do chuyển phòng *"
                    id="reason"
                    name="reason"
                    rows={4}
                    required
                    value={formData.reason}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    error={errors.reason}
                    placeholder="Nêu rõ lý do bạn muốn chuyển phòng..."
                />

                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        loading={isSubmitting}
                        disabled={isSubmitting || !roomValidationStatus?.isValid || !selectedRoom}
                    >
                        Gửi yêu cầu
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default TransferRequestForm;
