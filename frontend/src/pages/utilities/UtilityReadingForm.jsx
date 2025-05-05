import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service';
import { studentService } from '../../services/student.service';
import { buildingService } from '../../services/building.service';
import { Input, Button, Select } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

// Options loại tiện ích
const utilityTypeOptions = [
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' },
];

// Options trạng thái
const utilityStatusOptions = [
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'completed', label: 'Hoàn thành' },
];

const UtilityReadingForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        dormitoryId: '',
        roomId: '',
        studentId: '',
        type: 'ELECTRICITY',
        value: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        readingTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: 'pending',
    });
    const [buildings, setBuildings] = useState([]);
    const [roomsInBuilding, setRoomsInBuilding] = useState([]);
    const [studentsInRoom, setStudentsInRoom] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const bldgData = await buildingService.getAllBuildings({ limit: 1000 });
                setBuildings(bldgData.dormitories || []);

                if (isEditMode) {
                    const readingData = await utilityService.getUtilityReadingById(id);
                    if (readingData.dormitoryId) {
                        const roomData = await roomService.getAllRooms({ buildingId: readingData.dormitoryId, limit: 1000 });
                        setRoomsInBuilding(roomData || []);
                    }
                    setFormData({
                        dormitoryId: readingData.dormitoryId?.toString() || '',
                        roomId: readingData.roomId?.toString() || '',
                        studentId: readingData.studentId?.toString() || '',
                        type: readingData.type || 'ELECTRICITY',
                        value: readingData.value ?? 0,
                        month: readingData.month ?? (new Date().getMonth() + 1),
                        year: readingData.year ?? new Date().getFullYear(),
                        readingTime: readingData.readingTime ? format(parseISO(readingData.readingTime), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                        status: readingData.status || 'pending',
                    });
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Lỗi tải dữ liệu form điện nước:", err);
                toast.error("Không thể tải dữ liệu cần thiết.");
                if (isEditMode) navigate('/utilities');
            } finally {
                if (!isEditMode) setIsLoading(false);
            }
        };
        loadInitialData();
    }, [id, isEditMode, navigate]);

    useEffect(() => {
        const fetchRoomsForBuilding = async () => {
            if (formData.dormitoryId) {
                try {
                    const roomData = await roomService.getAllRooms({ buildingId: formData.dormitoryId, limit: 1000 });
                    setRoomsInBuilding(roomData || []);
                    if (!isEditMode || !roomsInBuilding.some(r => r.id.toString() === formData.roomId)) {
                        setFormData(prev => ({ ...prev, roomId: '' }));
                    }
                } catch (err) {
                    console.error("Lỗi tải phòng theo tòa nhà:", err);
                    setRoomsInBuilding([]);
                }
            } else {
                setRoomsInBuilding([]);
                setFormData(prev => ({ ...prev, roomId: '' }));
            }
        };
        fetchRoomsForBuilding();
    }, [formData.dormitoryId, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleBuildingChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, dormitoryId: value, roomId: '', studentId: '' }));
        setRoomsInBuilding([]);
        setStudentsInRoom([]);
    };

    const handleRoomChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, roomId: value, studentId: '' }));
        setStudentsInRoom([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        if (!formData.type) { setErrors({ type: "Vui lòng chọn loại tiện ích." }); setIsSaving(false); return; }
        if (!formData.dormitoryId) { setErrors({ dormitoryId: "Vui lòng chọn tòa nhà." }); setIsSaving(false); return; }
        if (!formData.roomId) { setErrors({ roomId: "Vui lòng chọn phòng." }); setIsSaving(false); return; }
        if (formData.value < 0) { setErrors({ value: "Chỉ số không hợp lệ." }); setIsSaving(false); return; }

        try {
            const payload = {
                type: formData.type,
                value: parseFloat(formData.value) || 0,
                month: parseInt(formData.month),
                year: parseInt(formData.year),
                readingTime: formData.readingTime,
                status: formData.status,
                roomId: formData.roomId ? parseInt(formData.roomId) : null,
                dormitoryId: formData.dormitoryId ? parseInt(formData.dormitoryId) : null,
                studentId: formData.studentId ? parseInt(formData.studentId) : null,
            };

            if (isEditMode) {
                await utilityService.updateUtilityReading(id, payload);
                toast.success('Cập nhật chỉ số thành công!');
            } else {
                await utilityService.createUtilityReading(payload);
                toast.success('Thêm chỉ số thành công!');
            }
            navigate('/utilities');
        } catch (err) {
            console.error("Lỗi lưu chỉ số:", err);
            const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const buildingOptions = [{ value: '', label: '-- Chọn tòa nhà --' }, ...buildings.map(b => ({ value: b.id.toString(), label: b.name }))];
    const roomOptions = [{ value: '', label: '-- Chọn phòng --' }, ...roomsInBuilding.map(r => ({ value: r.id.toString(), label: r.number }))];
    const studentOptions = [{ value: '', label: '-- Chọn sinh viên --' }, ...studentsInRoom.map(s => ({ value: s.id.toString(), label: s.name }))];

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center space-x-2">
                <Button onClick={() => navigate('/utilities')} icon={ArrowLeftIcon} variant="outline" className="!p-2">
                    <span className="sr-only">Quay lại</span>
                </Button>
                <h1 className="text-2xl font-semibold">{isEditMode ? 'Cập nhật chỉ số' : 'Thêm chỉ số mới'}</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            id="dormitoryId"
                            name="dormitoryId"
                            label="Tòa nhà"
                            value={formData.dormitoryId}
                            onChange={handleBuildingChange}
                            options={buildingOptions}
                            placeholder="Chọn tòa nhà..."
                            error={errors.dormitoryId}
                            required
                        />

                        <Select
                            id="roomId"
                            name="roomId"
                            label="Phòng"
                            value={formData.roomId}
                            onChange={handleRoomChange}
                            options={roomOptions}
                            placeholder="Chọn phòng..."
                            error={errors.roomId}
                            disabled={!formData.dormitoryId || roomOptions.length <= 1}
                            required
                        />

                        <Select
                            id="studentId"
                            name="studentId"
                            label="Sinh viên"
                            value={formData.studentId}
                            onChange={handleInputChange}
                            options={studentOptions}
                            placeholder="Chọn sinh viên..."
                            error={errors.studentId}
                            disabled={!formData.roomId || studentOptions.length <= 1}
                        />

                        <Select
                            id="type"
                            name="type"
                            label="Loại tiện ích"
                            value={formData.type}
                            onChange={handleInputChange}
                            options={utilityTypeOptions}
                            error={errors.type}
                            required
                        />

                        <Input
                            id="value"
                            name="value"
                            type="number"
                            label={`Chỉ số ${formData.type === 'ELECTRICITY' ? '(kWh)' : '(m³)'}`}
                            value={formData.value}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                            placeholder="Nhập chỉ số..."
                            error={errors.value}
                            required
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                id="month"
                                name="month"
                                type="number"
                                label="Tháng"
                                value={formData.month}
                                onChange={handleInputChange}
                                min="1"
                                max="12"
                                placeholder="Tháng..."
                                error={errors.month}
                                required
                            />
                            <Input
                                id="year"
                                name="year"
                                type="number"
                                label="Năm"
                                value={formData.year}
                                onChange={handleInputChange}
                                min="2020"
                                max="2050"
                                placeholder="Năm..."
                                error={errors.year}
                                required
                            />
                        </div>

                        <Input
                            id="readingTime"
                            name="readingTime"
                            type="datetime-local"
                            label="Thời điểm đọc"
                            value={formData.readingTime}
                            onChange={handleInputChange}
                            error={errors.readingTime}
                            required
                        />

                        <Select
                            id="status"
                            name="status"
                            label="Trạng thái"
                            value={formData.status}
                            onChange={handleInputChange}
                            options={utilityStatusOptions}
                            error={errors.status}
                            required
                        />
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => navigate('/utilities')} disabled={isSaving}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                            {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UtilityReadingForm;