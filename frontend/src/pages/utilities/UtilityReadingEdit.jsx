import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service';
import { Button, Input, Select } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';

const utilityTypeOptions = [
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' },
    { value: 'OTHER', label: 'Khác' }
];

const UtilityReadingEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        type: '',
        roomId: '',
        indexValue: '',
        readingDate: '',
        billingMonth: '',
        billingYear: ''
    });
    const [rooms, setRooms] = useState([]);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Load rooms
        roomService.getAllRooms().then(res => {
            setRooms(res.rooms || []);
        });
        // Load reading detail
        utilityService.getUtilityReadingById(id)
            .then(data => {
                setFormData({
                    type: data.type || '',
                    roomId: data.roomId || '',
                    indexValue: data.indexValue || '',
                    readingDate: data.readingDate ? data.readingDate.slice(0, 16) : '',
                    billingMonth: data.billingMonth || '',
                    billingYear: data.billingYear || ''
                });
            })
            .catch(() => {
                toast.error('Không thể tải dữ liệu chỉ số');
                navigate('/utilities');
            })
            .finally(() => setIsLoading(false));
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});
        // Basic validation
        if (!formData.type) { setErrors({ type: 'Chọn loại tiện ích' }); setIsSaving(false); return; }
        if (!formData.roomId) { setErrors({ roomId: 'Chọn phòng' }); setIsSaving(false); return; }
        if (!formData.indexValue) { setErrors({ indexValue: 'Nhập chỉ số' }); setIsSaving(false); return; }
        if (!formData.readingDate) { setErrors({ readingDate: 'Chọn ngày lấy' }); setIsSaving(false); return; }
        if (!formData.billingMonth) { setErrors({ billingMonth: 'Nhập tháng' }); setIsSaving(false); return; }
        if (!formData.billingYear) { setErrors({ billingYear: 'Nhập năm' }); setIsSaving(false); return; }
        try {
            await utilityService.updateUtilityReading(id, formData);
            toast.success('Cập nhật chỉ số thành công!');
            navigate('/utilities');
        } catch (err) {
            toast.error('Cập nhật thất bại!');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <h1 className="text-2xl font-semibold mb-4">Chỉnh sửa chỉ số tiện ích</h1>
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                <Select
                    label="Loại tiện ích *"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    options={utilityTypeOptions}
                    required
                    error={errors.type}
                />
                <Select
                    label="Phòng *"
                    id="roomId"
                    name="roomId"
                    value={formData.roomId}
                    onChange={handleChange}
                    options={rooms.map(r => ({ value: r.id, label: r.number }))}
                    required
                    error={errors.roomId}
                />
                <Input
                    label="Chỉ số *"
                    id="indexValue"
                    name="indexValue"
                    type="number"
                    value={formData.indexValue}
                    onChange={handleChange}
                    required
                    error={errors.indexValue}
                />
                <Input
                    label="Ngày lấy *"
                    id="readingDate"
                    name="readingDate"
                    type="datetime-local"
                    value={formData.readingDate}
                    onChange={handleChange}
                    required
                    error={errors.readingDate}
                />
                <div className="flex gap-4">
                    <Input
                        label="Tháng *"
                        id="billingMonth"
                        name="billingMonth"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.billingMonth}
                        onChange={handleChange}
                        required
                        error={errors.billingMonth}
                    />
                    <Input
                        label="Năm *"
                        id="billingYear"
                        name="billingYear"
                        type="number"
                        value={formData.billingYear}
                        onChange={handleChange}
                        required
                        error={errors.billingYear}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/utilities')} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        Lưu thay đổi
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default UtilityReadingEdit;
