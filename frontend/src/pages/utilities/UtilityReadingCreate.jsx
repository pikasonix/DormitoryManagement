import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service';
import { Input, Select, Button, TextArea, DatePicker } from '../../components/shared';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Options for utility types
const utilityTypeOptions = [
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' },
];

const UtilityReadingCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);

    const [formData, setFormData] = useState({
        roomId: '',
        buildingId: '',
        type: 'ELECTRICITY',
        indexValue: '',
        readingDate: new Date().toISOString().split('T')[0],
        billingMonth: new Date().getMonth() + 1,
        billingYear: new Date().getFullYear(),
        notes: '',
    });

    // Generate months for current year and previous year
    const generateMonthOptions = () => {
        const currentYear = new Date().getFullYear();
        const options = [];

        // Add months for current year
        for (let i = 1; i <= 12; i++) {
            options.push({
                value: `${i}-${currentYear}`,
                label: `Tháng ${i}/${currentYear}`
            });
        }

        // Add months for previous year
        for (let i = 1; i <= 12; i++) {
            options.push({
                value: `${i}-${currentYear - 1}`,
                label: `Tháng ${i}/${currentYear - 1}`
            });
        }

        return options;
    };

    const monthOptions = generateMonthOptions();

    // Load buildings
    const loadBuildings = useCallback(async () => {
        try {
            const response = await buildingService.getBuildings();
            setBuildings([
                { id: '', name: 'Chọn tòa nhà' },
                ...response.data
            ]);
        } catch (error) {
            console.error('Failed to load buildings:', error);
            toast.error('Không thể tải danh sách tòa nhà');
        }
    }, []);

    // Load rooms
    const loadRooms = useCallback(async () => {
        try {
            const response = await roomService.getRooms();
            setRooms(response.data);

            // If a building is selected, filter rooms by that building
            if (formData.buildingId) {
                setFilteredRooms(response.data.filter(room => room.buildingId === formData.buildingId));
            } else {
                setFilteredRooms(response.data);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
            toast.error('Không thể tải danh sách phòng');
        }
    }, [formData.buildingId]);

    useEffect(() => {
        loadBuildings();
        loadRooms();
    }, [loadBuildings, loadRooms]);

    // Filter rooms when building selection changes
    useEffect(() => {
        if (formData.buildingId) {
            setFilteredRooms(rooms.filter(room => room.buildingId === formData.buildingId));
            // Reset room selection if current selection is not in the filtered list
            if (formData.roomId && !rooms.find(room => room.id === formData.roomId && room.buildingId === formData.buildingId)) {
                setFormData(prev => ({ ...prev, roomId: '' }));
            }
        } else {
            setFilteredRooms(rooms);
        }
    }, [formData.buildingId, rooms]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleMonthYearChange = (value) => {
        if (value) {
            const [month, year] = value.split('-');
            setFormData(prev => ({
                ...prev,
                billingMonth: parseInt(month),
                billingYear: parseInt(year)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.roomId) {
            toast.error('Vui lòng chọn phòng');
            return;
        }

        if (!formData.type) {
            toast.error('Vui lòng chọn loại tiện ích');
            return;
        }

        if (!formData.indexValue || isNaN(formData.indexValue) || parseFloat(formData.indexValue) < 0) {
            toast.error('Vui lòng nhập chỉ số hợp lệ');
            return;
        }

        setLoading(true);

        try {
            // Format data for API
            const readingData = {
                roomId: formData.roomId,
                type: formData.type,
                indexValue: parseFloat(formData.indexValue),
                readingDate: formData.readingDate,
                billingMonth: formData.billingMonth,
                billingYear: formData.billingYear,
                notes: formData.notes
            };

            await utilityService.createMeterReading(readingData);
            toast.success('Thêm chỉ số tiện ích thành công');
            navigate('/utilities/readings');
        } catch (error) {
            console.error('Failed to create utility reading:', error);

            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Không thể thêm chỉ số tiện ích');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/utilities/readings')}
                    className="mr-4 p-2 rounded-full hover:bg-gray-200"
                >
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Thêm chỉ số tiện ích mới</h1>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Building selection */}
                        <div>
                            <label className="block mb-2 font-medium">Tòa nhà</label>
                            <Select
                                placeholder="Chọn tòa nhà"
                                value={formData.buildingId}
                                onChange={(value) => handleChange('buildingId', value)}
                                options={buildings.map(building => ({
                                    value: building.id,
                                    label: building.name
                                }))}
                            />
                        </div>

                        {/* Room selection */}
                        <div>
                            <label className="block mb-2 font-medium">Phòng <span className="text-red-500">*</span></label>
                            <Select
                                placeholder="Chọn phòng"
                                value={formData.roomId}
                                onChange={(value) => handleChange('roomId', value)}
                                options={filteredRooms.map(room => ({
                                    value: room.id,
                                    label: `${room.number} - ${buildings.find(b => b.id === room.buildingId)?.name || ''}`
                                }))}
                                required
                            />
                        </div>

                        {/* Utility type */}
                        <div>
                            <label className="block mb-2 font-medium">Loại tiện ích <span className="text-red-500">*</span></label>
                            <Select
                                placeholder="Chọn loại tiện ích"
                                value={formData.type}
                                onChange={(value) => handleChange('type', value)}
                                options={utilityTypeOptions}
                                required
                            />
                        </div>

                        {/* Reading value */}
                        <div>
                            <label className="block mb-2 font-medium">Chỉ số <span className="text-red-500">*</span></label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Nhập chỉ số"
                                value={formData.indexValue}
                                onChange={(e) => handleChange('indexValue', e.target.value)}
                                required
                            />
                            <span className="text-xs text-gray-500">
                                {formData.type === 'ELECTRICITY' ? 'kWh' : formData.type === 'WATER' ? 'm³' : ''}
                            </span>
                        </div>

                        {/* Reading date */}
                        <div>
                            <label className="block mb-2 font-medium">Ngày ghi <span className="text-red-500">*</span></label>
                            <Input
                                type="date"
                                value={formData.readingDate}
                                onChange={(e) => handleChange('readingDate', e.target.value)}
                                required
                            />
                        </div>

                        {/* Billing month/year */}
                        <div>
                            <label className="block mb-2 font-medium">Kỳ hóa đơn <span className="text-red-500">*</span></label>
                            <Select
                                placeholder="Chọn kỳ hóa đơn"
                                value={`${formData.billingMonth}-${formData.billingYear}`}
                                onChange={handleMonthYearChange}
                                options={monthOptions}
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block mb-2 font-medium">Ghi chú</label>
                            <TextArea
                                placeholder="Nhập ghi chú"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            className="mr-2"
                            onClick={() => navigate('/utilities/readings')}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                        >
                            Lưu
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UtilityReadingCreate;