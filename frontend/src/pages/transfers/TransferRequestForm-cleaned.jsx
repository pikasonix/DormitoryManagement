// filepath: d:\CODE\DormitoryManagement\frontend\src\pages\transfers\TransferRequestForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

    const [buildings, setBuildings] = useState([]);
    const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);

    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomValidationStatus, setRoomValidationStatus] = useState(null);
    const [isCheckingRoom, setIsCheckingRoom] = useState(false);

    const [formData, setFormData] = useState({
        buildingId: '',
        roomNumber: '',
        reason: '',
        transferDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mặc định 7 ngày kể từ hôm nay
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Giới tính của sinh viên hiện tại
    const studentGender = user?.studentProfile?.gender || user?.profile?.gender;

    // Tòa nhà hiện tại của sinh viên
    const currentBuildingId = user?.profile?.room?.building?.id ||
        user?.studentProfile?.room?.building?.id;

    // Phòng hiện tại của sinh viên
    const currentRoomId = user?.profile?.roomId || user?.studentProfile?.roomId;
    const currentRoom = user?.profile?.room || user?.studentProfile?.room;

    // Fetch danh sách tòa nhà
    useEffect(() => {
        const fetchBuildings = async () => {
            setIsLoadingBuildings(true);
            try {
                const data = await buildingService.getAllBuildings();
                setBuildings(data.buildings || []);

                // Tự động chọn tòa nhà hiện tại nếu có
                if (currentBuildingId) {
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
                const viewURL = existingRequestId ? `/transfers/${existingRequestId}` : '/profile/transfers';

                // Tạo thông báo thân thiện với link trực tiếp
                const friendlyMessage = existingRequestId
                    ? `Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý (mã: ${existingRequestId}). Vui lòng đợi quản lý xử lý yêu cầu hiện tại hoặc hủy yêu cầu đó trước khi tạo yêu cầu mới.`
                    : 'Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý. Vui lòng đợi quản lý xử lý yêu cầu hiện tại hoặc hủy yêu cầu đó trước khi tạo yêu cầu mới.';

                // Hiển thị lỗi
                setErrors({ general: friendlyMessage });
                toast.error(friendlyMessage, { duration: 5000 }); // Tăng thời gian hiển thị toast lên 5s

                // Sử dụng dialog xác nhận với nhiều tùy chọn
                import('sweetalert2').then((Swal) => {
                    Swal.default.fire({
                        title: 'Đã có yêu cầu chuyển phòng',
                        icon: 'info',
                        html: `
                                <p>Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý${existingRequestId ? ` <b>(mã: ${existingRequestId})</b>` : ''}.</p>
                                <p class="mt-2">Bạn có thể:</p>
                            `,
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: 'Xem yêu cầu hiện tại',
                        denyButtonText: 'Hủy yêu cầu hiện tại',
                        cancelButtonText: 'Đóng',
                        confirmButtonColor: '#3085d6',
                        denyButtonColor: '#d33',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Chuyển đến trang xem chi tiết hoặc danh sách
                            navigate(viewURL);
                        } else if (result.isDenied && existingRequestId) {
                            // Hiển thị xác nhận hủy yêu cầu
                            Swal.default.fire({
                                title: 'Xác nhận hủy yêu cầu',
                                text: `Bạn có chắc chắn muốn hủy yêu cầu chuyển phòng (mã: ${existingRequestId})?`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                cancelButtonColor: '#3085d6',
                                confirmButtonText: 'Hủy yêu cầu',
                                cancelButtonText: 'Giữ nguyên'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    // Gọi API hủy yêu cầu chuyển phòng
                                    transferService.deleteTransferRequest(existingRequestId)
                                        .then(() => {
                                            toast.success('Đã hủy yêu cầu chuyển phòng thành công!');
                                            // Thông báo người dùng có thể tạo yêu cầu mới
                                            Swal.default.fire({
                                                title: 'Đã hủy thành công',
                                                text: 'Bạn đã hủy yêu cầu chuyển phòng thành công. Bạn có thể tạo yêu cầu mới ngay bây giờ.',
                                                icon: 'success',
                                                confirmButtonText: 'Tạo yêu cầu mới',
                                                showCancelButton: true,
                                                cancelButtonText: 'Để sau'
                                            }).then((result) => {
                                                if (result.isConfirmed) {
                                                    // Refresh trang để tạo yêu cầu mới
                                                    window.location.reload();
                                                }
                                            });
                                        })
                                        .catch((err) => {
                                            console.error('Lỗi khi hủy yêu cầu:', err);
                                            toast.error('Không thể hủy yêu cầu chuyển phòng. ' + (err.message || ''));
                                        });
                                }
                            });
                        }
                    });
                }).catch(err => {
                    console.error('Lỗi khi tải thư viện SweetAlert:', err);
                    // Fallback khi không thể tải SweetAlert
                    const confirmRedirect = window.confirm('Bạn có muốn xem danh sách yêu cầu chuyển phòng của mình không?');
                    if (confirmRedirect) {
                        navigate('/profile/transfers');
                    }
                });
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
                </div>

                {/* Lỗi chung */}
                {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

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
