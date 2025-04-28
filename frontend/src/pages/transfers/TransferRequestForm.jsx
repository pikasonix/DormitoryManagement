import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferService } from '../../services/transfer.service';
import { roomService } from '../../services/room.service'; // Lấy ds phòng trống
import { useAuth } from '../../contexts/AuthContext'; // Lấy thông tin SV
import { Input, Button, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const TransferRequestForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [availableRooms, setAvailableRooms] = useState([]); // Phòng trống có thể chuyển đến
    const [formData, setFormData] = useState({
        // studentId: user?.profile?.id || '', // Backend tự lấy?
        // currentRoomId: user?.profile?.roomId || '', // Backend tự lấy?
        targetRoomId: '', // Sinh viên phải chọn phòng muốn đến
        reason: '',
    });
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch phòng trống có thể chuyển đến
    useEffect(() => {
        const fetchAvailableRooms = async () => {
            setIsLoadingRooms(true);
            try {
                // Lấy phòng có trạng thái AVAILABLE và có chỗ trống (nếu API hỗ trợ `hasVacancy=true`)
                // Hoặc chỉ lấy AVAILABLE
                const roomsData = await roomService.getAllRooms({ status: 'AVAILABLE', limit: 1000 });
                // Lọc bỏ phòng hiện tại của sinh viên khỏi danh sách
                const currentRoomId = user?.profile?.roomId;
                const filteredRooms = (roomsData || []).filter(room => room.id !== currentRoomId);
                setAvailableRooms(filteredRooms);
            } catch (err) {
                console.error("Lỗi tải danh sách phòng trống:", err);
                toast.error("Không thể tải danh sách phòng trống.");
            } finally {
                setIsLoadingRooms(false);
            }
        };
        // Chỉ fetch nếu user là student và có profile
        if (user?.role === 'STUDENT' && user?.profile) {
            fetchAvailableRooms();
        } else {
            setIsLoadingRooms(false); // Không phải student thì ko cần load
        }
    }, [user]); // Fetch lại nếu user thay đổi

    // Handler thay đổi input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    // Handler Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // --- Validation ---
        if (!formData.targetRoomId) { setErrors({ targetRoomId: "Vui lòng chọn phòng muốn chuyển đến." }); setIsSubmitting(false); return; }
        if (!formData.reason.trim()) { setErrors({ reason: "Vui lòng nhập lý do chuyển phòng." }); setIsSubmitting(false); return; }
        // --- End Validation ---

        try {
            // **Payload gửi lên - làm rõ backend cần gì**
            const payload = {
                targetRoomId: parseInt(formData.targetRoomId),
                reason: formData.reason,
                // studentId và currentRoomId có thể backend tự lấy
                // studentId: user?.profile?.id,
                // currentRoomId: user?.profile?.roomId,
            };

            await transferService.createTransferRequest(payload);
            toast.success('Đã gửi yêu cầu chuyển phòng thành công!');
            navigate('/profile'); // Hoặc trang "Yêu cầu của tôi"

        } catch (err) {
            console.error("Lỗi gửi yêu cầu chuyển phòng:", err);
            const errorMsg = err?.message || 'Gửi yêu cầu thất bại.';
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

    // --- Options cho Select phòng ---
    const roomOptions = [
        { value: '', label: '-- Chọn phòng muốn chuyển đến --' },
        ...availableRooms.map(room => ({
            value: room.id.toString(),
            label: `Phòng ${room.number} (${room.building?.name}) - ${room.capacity} chỗ - ${formatCurrency(room.price)}`
        }))
    ];

    // --- Render ---
    // Nếu không phải student hoặc chưa có thông tin phòng hiện tại -> không cho tạo yêu cầu?
    if (user?.role !== 'STUDENT') {
        return <p className="text-center text-red-600 p-6">Chức năng này chỉ dành cho sinh viên.</p>;
    }
    if (!user?.profile?.roomId) {
        return <p className="text-center text-gray-600 p-6">Bạn cần đang ở trong một phòng để thực hiện yêu cầu chuyển phòng.</p>;
    }


    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Button variant="link" onClick={() => navigate(-1)} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại
                </Button>
                <h1 className="text-2xl font-semibold">Yêu cầu Chuyển phòng</h1>
                <p className="mt-1 text-sm text-gray-600">Điền thông tin dưới đây để gửi yêu cầu chuyển sang phòng khác.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {/* Thông tin phòng hiện tại */}
                <div className='p-4 bg-gray-50 rounded-md border'>
                    <p className='text-sm font-medium text-gray-700'>Phòng hiện tại của bạn:</p>
                    <p className='text-lg font-semibold text-gray-900'>
                        Phòng XXX (Tòa YYY) {/* TODO: Lấy tên phòng/tòa hiện tại */}
                    </p>
                </div>

                {/* Lỗi chung */}
                {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

                <Select
                    label="Phòng muốn chuyển đến *"
                    id="targetRoomId"
                    name="targetRoomId"
                    required
                    value={formData.targetRoomId}
                    onChange={handleChange}
                    options={roomOptions}
                    disabled={isSubmitting || isLoadingRooms}
                    error={errors.targetRoomId}
                    loading={isLoadingRooms} // Hiển thị loading nếu đang fetch phòng
                />

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
                    <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting || isLoadingRooms}>
                        Gửi yêu cầu
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default TransferRequestForm;