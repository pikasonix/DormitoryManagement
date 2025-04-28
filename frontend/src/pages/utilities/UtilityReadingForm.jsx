import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service'; // Lấy danh sách phòng
import { studentService } from '../../services/student.service'; // (Tùy chọn) Lấy SV theo phòng
import { buildingService } from '../../services/building.service';// Lấy tòa nhà
import { Input, Button, Select, DatePicker } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format, parseISO, startOfMonth } from 'date-fns';

// Options loại tiện ích
const utilityTypeOptions = [ /* ... */];
// Options trạng thái
const utilityStatusOptions = [ /* ... */];

const UtilityReadingForm = () => {
    const { id } = useParams(); // ID của bản ghi utility (nếu edit)
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        dormitoryId: '', // Chọn tòa nhà trước?
        roomId: '',      // Chọn phòng
        studentId: '',   // Có thể tự lấy theo phòng?
        type: 'electric', // Mặc định
        consumption: 0,
        amount: '',      // Để trống, có thể tính sau hoặc backend tính
        billingPeriod: format(startOfMonth(new Date()), 'yyyy-MM'), // Tháng hiện tại YYYY-MM
        status: 'pending', // Mặc định
    });
    const [buildings, setBuildings] = useState([]);
    const [roomsInBuilding, setRoomsInBuilding] = useState([]); // Phòng trong tòa nhà đã chọn
    const [isLoading, setIsLoading] = useState(true); // Load data liên quan ban đầu
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // --- Fetch dữ liệu cần thiết ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch tòa nhà
                const bldgData = await buildingService.getAllBuildings({ limit: 1000 });
                setBuildings(bldgData.dormitories || []);

                // Nếu là edit mode, fetch bản ghi hiện tại
                if (isEditMode) {
                    const readingData = await utilityService.getUtilityReadingById(id);
                    // Fetch phòng thuộc tòa nhà của bản ghi cũ để hiển thị select phòng
                    if (readingData.dormitoryId) {
                        const roomData = await roomService.getAllRooms({ buildingId: readingData.dormitoryId, limit: 1000 });
                        setRoomsInBuilding(roomData || []);
                    }
                    setFormData({
                        dormitoryId: readingData.dormitoryId?.toString() || '',
                        roomId: readingData.roomId?.toString() || '',
                        studentId: readingData.studentId?.toString() || '', // Backend trả về ID?
                        type: readingData.type || 'electric',
                        consumption: readingData.consumption ?? 0,
                        amount: readingData.amount ?? '',
                        billingPeriod: readingData.billingPeriod || format(startOfMonth(new Date()), 'yyyy-MM'),
                        status: readingData.status || 'pending',
                    });
                } else {
                    // Nếu tạo mới, không cần fetch bản ghi cũ
                    setIsLoading(false);
                }

            } catch (err) {
                console.error("Lỗi tải dữ liệu form điện nước:", err);
                toast.error("Không thể tải dữ liệu cần thiết.");
                if (isEditMode) navigate('/utilities');
            } finally {
                // Chỉ set false nếu không phải edit mode (vì edit mode cần fetch thêm)
                if (!isEditMode) setIsLoading(false);
            }
        };
        loadInitialData();
    }, [id, isEditMode, navigate]);

    // Fetch phòng khi tòa nhà thay đổi (chỉ khi tạo mới hoặc edit mà chưa chọn tòa)
    useEffect(() => {
        const fetchRoomsForBuilding = async () => {
            if (formData.dormitoryId) {
                try {
                    // Fetch phòng thuộc tòa nhà đã chọn
                    const roomData = await roomService.getAllRooms({ buildingId: formData.dormitoryId, limit: 1000 });
                    setRoomsInBuilding(roomData || []);
                    // Reset phòng đã chọn nếu tòa nhà thay đổi
                    if (!isEditMode || !roomsInBuilding.some(r => r.id.toString() === formData.roomId)) {
                        setFormData(prev => ({ ...prev, roomId: '' }));
                    }
                } catch (err) {
                    console.error("Lỗi tải phòng theo tòa nhà:", err);
                    setRoomsInBuilding([]);
                }
            } else {
                setRoomsInBuilding([]); // Reset danh sách phòng nếu không chọn tòa nhà
                setFormData(prev => ({ ...prev, roomId: '' })); // Reset phòng đã chọn
            }
        };
        fetchRoomsForBuilding();
    }, [formData.dormitoryId, isEditMode]); // Chạy khi dormitoryId thay đổi


    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

        // (Tùy chọn) Tự động lấy studentId khi chọn phòng
        // if (name === 'roomId' && value) {
        //    const selectedRoom = roomsInBuilding.find(r => r.id.toString() === value);
        //    // Giả sử phòng có thông tin residents[0].id
        //    const residentId = selectedRoom?.residents?.[0]?.id;
        //    setFormData(prev => ({ ...prev, studentId: residentId ? residentId.toString() : '' }));
        // }
    };
    const handleBillingPeriodChange = (e) => {
        setFormData(prev => ({ ...prev, billingPeriod: e.target.value }));
        if (errors.billingPeriod) setErrors(prev => ({ ...prev, billingPeriod: null }));
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        // --- Validation ---
        if (!formData.type) { /* ... */ }
        if (!formData.billingPeriod) { setErrors({ billingPeriod: "Vui lòng chọn kỳ ghi." }); setIsSaving(false); return; }
        if (!formData.roomId && !formData.dormitoryId) { // Cần ít nhất phòng hoặc tòa nhà?
            setErrors({ roomId: "Vui lòng chọn phòng hoặc tòa nhà." }); setIsSaving(false); return;
        }
        if (formData.consumption < 0) { /* ... */ }
        // --- End Validation ---

        try {
            const payload = {
                type: formData.type,
                consumption: parseFloat(formData.consumption) || 0,
                billingPeriod: formData.billingPeriod,
                status: formData.status,
                // Gửi ID dưới dạng số nếu backend yêu cầu
                roomId: formData.roomId ? parseInt(formData.roomId) : null,
                dormitoryId: formData.dormitoryId ? parseInt(formData.dormitoryId) : null,
                studentId: formData.studentId ? parseInt(formData.studentId) : null, // Có thể backend tự lấy?
                amount: formData.amount ? parseFloat(formData.amount) : null, // Gửi amount nếu có nhập
            };

            if (isEditMode) {
                await utilityService.updateUtilityReading(id, payload);
                toast.success('Cập nhật bản ghi điện nước thành công!');
            } else {
                await utilityService.createUtilityReading(payload);
                toast.success('Đã ghi nhận chỉ số điện nước!');
            }
            navigate('/utilities');
        } catch (err) {
            console.error("Lỗi lưu bản ghi điện nước:", err);
            const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Ghi nhận thất bại.');
            if (err?.errors && Array.isArray(err.errors)) { /* ... xử lý lỗi validation ... */ }
            else { toast.error(errorMsg); }
        } finally {
            setIsSaving(false);
        }
    };

    // Options cho Selects
    const buildingOptions = [{ value: '', label: '-- Chọn tòa nhà --' }, ...buildings.map(b => ({ value: b.id.toString(), label: b.name }))];
    const roomOptions = [{ value: '', label: '-- Chọn phòng --' }, ...roomsInBuilding.map(r => ({ value: r.id.toString(), label: r.number }))];

    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Button variant="link" onClick={() => navigate('/utilities')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại danh sách
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? 'Chỉnh sửa Ghi điện nước' : 'Nhập chỉ số Điện/Nước mới'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {/* Chọn Tòa nhà -> Phòng */}
                <Select label="Tòa nhà *" id="dormitoryId" name="dormitoryId" value={formData.dormitoryId} onChange={handleChange} options={buildingOptions} disabled={isSaving || isLoading} error={errors.dormitoryId} />
                {/* Chỉ hiển thị chọn phòng khi đã chọn tòa nhà */}
                {formData.dormitoryId && (
                    <Select label="Phòng *" id="roomId" name="roomId" value={formData.roomId} onChange={handleChange} options={roomOptions} disabled={isSaving || !formData.dormitoryId || roomsInBuilding.length === 0} error={errors.roomId} required />
                )}
                {/* Có thể hiển thị tên SV tự động khi chọn phòng */}
                {/* {formData.roomId && studentName && <p>Sinh viên: {studentName}</p>} */}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Select label="Loại tiện ích *" id="type" name="type" required value={formData.type} onChange={handleChange} options={utilityTypeOptions} disabled={isSaving} error={errors.type} />
                    {/* Input chọn tháng YYYY-MM */}
                    <Input label="Kỳ ghi (Tháng/Năm) *" id="billingPeriod" name="billingPeriod" type="month" required value={formData.billingPeriod} onChange={handleBillingPeriodChange} disabled={isSaving} error={errors.billingPeriod} />
                    <Input label="Mức tiêu thụ *" id="consumption" name="consumption" type="number" min="0" step="any" required value={formData.consumption} onChange={handleChange} disabled={isSaving} error={errors.consumption} hint={formData.type === 'electric' ? 'Đơn vị: kWh' : 'Đơn vị: m³'} />
                    <Input label="Thành tiền (Tùy chọn)" id="amount" name="amount" type="number" min="0" step="1000" value={formData.amount} onChange={handleChange} disabled={isSaving} error={errors.amount} hint="Để trống nếu muốn hệ thống tự tính." />
                    <Select label="Trạng thái thanh toán" id="status" name="status" value={formData.status} onChange={handleChange} options={utilityStatusOptions} disabled={isSaving} error={errors.status} />
                </div>

                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/utilities')} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : 'Lưu bản ghi'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default UtilityReadingForm;