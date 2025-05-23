import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service';
import { Input, Select, Button, Textarea, DatePicker, Tabs, Tab, Card, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PlusCircleIcon, BoltIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import WaterDropIcon from '../../components/icons/WaterDropIcon';

// Options for utility types
const utilityTypeOptions = [
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' },
    { value: 'OTHER_FEE', label: 'Khác' }
];

const UtilityReadingCreate = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('electricity');
    const [loading, setLoading] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [buildings, setBuildings] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [roomsMissingElectricity, setRoomsMissingElectricity] = useState([]);
    const [roomsMissingWater, setRoomsMissingWater] = useState([]);

    // Current date info for pre-filling
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();
    const formattedDate = currentDate.toISOString().split('T')[0];

    const [electricityForm, setElectricityForm] = useState({
        roomId: '',
        buildingId: '',
        type: 'ELECTRICITY',
        indexValue: '',
        readingDate: formattedDate,
        billingMonth: currentMonth,
        billingYear: currentYear,
        notes: '',
        tempRoomNumber: '',
    });

    const [waterForm, setWaterForm] = useState({
        roomId: '',
        buildingId: '',
        type: 'WATER',
        indexValue: '',
        readingDate: formattedDate,
        billingMonth: currentMonth,
        billingYear: currentYear,
        notes: '',
        tempRoomNumber: '',
    }); const [otherForm, setOtherForm] = useState({
        roomId: '',
        buildingId: '',
        type: 'OTHER_FEE',
        indexValue: '',
        readingDate: formattedDate,
        billingMonth: currentMonth,
        billingYear: currentYear,
        notes: '',
        reason: '',
        tempRoomNumber: '',
    });

    // Load buildings
    const loadBuildings = useCallback(async () => {
        try {
            const response = await buildingService.getAllBuildings();
            setBuildings([
                { id: '', name: 'Chọn tòa nhà' },
                ...(Array.isArray(response.buildings) ? response.buildings : [])
            ]);
        } catch (error) {
            console.error('Failed to load buildings:', error);
            toast.error('Không thể tải danh sách tòa nhà');
        }
    }, []);

    // Function to load all rooms and identify which are missing utility readings
    const loadRoomsWithReadingStatus = useCallback(async () => {
        setLoadingRooms(true);
        try {
            // Load all active rooms - use a high limit to get all rooms
            const response = await roomService.getAllRooms({ limit: 1000, includeInactive: false });
            const rooms = response.rooms || [];
            console.log(`Loaded ${rooms.length} rooms from API`);
            setAllRooms(rooms);

            // Get rooms missing electricity readings for current month
            const electricityParams = {
                type: 'ELECTRICITY',
                month: currentMonth,
                year: currentYear
            };
            const electricityRes = await utilityService.getAllUtilityReadings(electricityParams);
            const roomsWithElectricityReadings = new Set(
                (electricityRes.utilities || []).map(reading => reading.roomId)
            );

            // Get rooms missing water readings for current month
            const waterParams = {
                type: 'WATER',
                month: currentMonth,
                year: currentYear
            };
            const waterRes = await utilityService.getAllUtilityReadings(waterParams);
            const roomsWithWaterReadings = new Set(
                (waterRes.utilities || []).map(reading => reading.roomId)
            );

            // Filter rooms to find those missing readings
            setRoomsMissingElectricity(
                rooms.filter(room => !roomsWithElectricityReadings.has(room.id))
            );
            setRoomsMissingWater(
                rooms.filter(room => !roomsWithWaterReadings.has(room.id))
            );

        } catch (error) {
            console.error('Failed to load rooms with reading status:', error);
            toast.error('Không thể tải danh sách phòng và trạng thái ghi chỉ số');
        } finally {
            setLoadingRooms(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => {
        loadBuildings();
        loadRoomsWithReadingStatus();
    }, [loadBuildings, loadRoomsWithReadingStatus]);

    // Handle form changes for each utility type
    const handleElectricityChange = (field, value) => {
        setElectricityForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleWaterChange = (field, value) => {
        setWaterForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOtherChange = (field, value) => {
        setOtherForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Select a room for electricity reading
    const handleSelectElectricityRoom = (room) => {
        setElectricityForm(prev => ({
            ...prev,
            roomId: room.id,
            buildingId: room.buildingId
        }));
    };

    // Select a room for water reading
    const handleSelectWaterRoom = (room) => {
        setWaterForm(prev => ({
            ...prev,
            roomId: room.id,
            buildingId: room.buildingId
        }));
    };

    // Submit form for electricity reading
    const handleElectricitySubmit = async (e) => {
        e.preventDefault();
        await submitReading(electricityForm, 'electricity');
    };

    // Submit form for water reading
    const handleWaterSubmit = async (e) => {
        e.preventDefault();
        await submitReading(waterForm, 'water');
    };

    // Submit form for other utility type
    const handleOtherSubmit = async (e) => {
        e.preventDefault();
        const formWithReasonInNotes = {
            ...otherForm,
            notes: `Lý do: ${otherForm.reason}${otherForm.notes ? `\nGhi chú: ${otherForm.notes}` : ''}`
        };
        await submitReading(formWithReasonInNotes, 'other');
    };

    // Generic function to submit readings
    const submitReading = async (formData, type) => {
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

            await utilityService.createUtilityReading(readingData);
            toast.success('Thêm chỉ số tiện ích thành công');

            // Update lists of rooms missing readings
            await loadRoomsWithReadingStatus();

            // Reset form for the type that was just submitted
            if (type === 'electricity') {
                setElectricityForm({
                    ...electricityForm,
                    roomId: '',
                    buildingId: '',
                    indexValue: '',
                    notes: '',
                    tempRoomNumber: '',
                });
            } else if (type === 'water') {
                setWaterForm({
                    ...waterForm,
                    roomId: '',
                    buildingId: '',
                    indexValue: '',
                    notes: '',
                    tempRoomNumber: '',
                });
            } else {
                setOtherForm({
                    ...otherForm,
                    roomId: '',
                    buildingId: '',
                    indexValue: '',
                    notes: '',
                    reason: '',
                    tempRoomNumber: '',
                });
            }
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

    // Room options for selects
    const getRoomOptions = (buildingId) => {
        let roomsToShow = allRooms;
        if (buildingId) {
            roomsToShow = allRooms.filter(room => room.buildingId === buildingId);
        }
        return [
            { value: '', label: 'Chọn phòng' },
            ...roomsToShow.map(room => ({
                value: room.id,
                label: `${room.number} ${room.building ? `(${room.building.name})` : ''}`
            }))
        ];
    };

    // Unit label based on utility type
    const getUnitLabel = (type) => {
        switch (type) {
            case 'ELECTRICITY':
                return 'kWh';
            case 'WATER':
                return 'm³';
            default:
                return '';
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/utilities')}
                    className="mr-4 p-2 rounded-full hover:bg-gray-200"
                >
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Thêm chỉ số tiện ích</h1>
            </div>

            <Tabs activeTab={activeTab} onChange={setActiveTab}>
                <Tab
                    id="electricity"
                    label={<div className="flex items-center"><BoltIcon className="h-5 w-5 mr-1 text-yellow-500" />Điện</div>}
                >
                    <Card className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Left column: List of rooms missing electricity readings */}
                            <div className="border-r pr-4">
                                <h3 className="font-medium text-lg mb-3">Phòng chưa ghi chỉ số điện tháng {currentMonth}/{currentYear}</h3>
                                {loadingRooms ? (
                                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                                ) : roomsMissingElectricity.length > 0 ? (
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {roomsMissingElectricity.map(room => (
                                            <div
                                                key={room.id}
                                                className={`p-2 border rounded mb-2 cursor-pointer flex justify-between items-center ${electricityForm.roomId === room.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                                                onClick={() => handleSelectElectricityRoom(room)}
                                            >
                                                <div>
                                                    <div className="font-medium">{room.number}</div>
                                                    <div className="text-sm text-gray-600">{room.building?.name}</div>
                                                </div>
                                                <PlusCircleIcon className="h-5 w-5 text-blue-500" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <ExclamationCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                        <p>Tất cả phòng đã ghi chỉ số điện cho tháng này!</p>
                                    </div>
                                )}
                            </div>

                            {/* Right column: Form */}
                            <div className="lg:col-span-2">
                                <form onSubmit={handleElectricitySubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* Building selection */}
                                        <div>
                                            <label className="block mb-2 font-medium">Tòa nhà</label>
                                            <Select
                                                placeholder="Chọn tòa nhà"
                                                value={electricityForm.buildingId}
                                                onChange={(value) => handleElectricityChange('buildingId', value)}
                                                options={buildings.map(building => ({
                                                    value: building.id,
                                                    label: building.name
                                                }))}
                                            />
                                        </div>

                                        {/* Room selection - Fixed input */}
                                        <div>
                                            <label className="block mb-2 font-medium">Phòng <span className="text-red-500">*</span></label>
                                            <Input
                                                type="text"
                                                placeholder="Nhập số phòng"
                                                value={electricityForm.tempRoomNumber || (electricityForm.roomId && allRooms.find(r => r.id === electricityForm.roomId)?.number) || ''}
                                                onChange={(e) => {
                                                    const roomNumber = e.target.value;
                                                    // Lưu trữ giá trị đang nhập trước
                                                    setElectricityForm(prev => ({ ...prev, tempRoomNumber: roomNumber }));

                                                    console.log('Đang tìm phòng:', roomNumber);
                                                    console.log('Tòa nhà đã chọn:', electricityForm.buildingId);

                                                    // Chuyển đổi tất cả thành chuỗi (string) khi so sánh
                                                    const room = electricityForm.buildingId
                                                        ? allRooms.find(r => String(r.number).trim() === String(roomNumber).trim() &&
                                                            String(r.buildingId) === String(electricityForm.buildingId))
                                                        : allRooms.find(r => String(r.number).trim() === String(roomNumber).trim());

                                                    if (room) {
                                                        handleElectricityChange('roomId', room.id);
                                                        if (!electricityForm.buildingId) {
                                                            handleElectricityChange('buildingId', room.buildingId);
                                                        }
                                                    } else {
                                                        // Nếu không tìm thấy phòng hợp lệ, xóa roomId
                                                        handleElectricityChange('roomId', '');
                                                    }
                                                }}
                                                required
                                            />
                                            {electricityForm.roomId && (
                                                <Badge color="green" className="mt-1">
                                                    Phòng hợp lệ
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Reading value */}
                                        <div>
                                            <label className="block mb-2 font-medium">Chỉ số điện <span className="text-red-500">*</span></label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Nhập chỉ số"
                                                value={electricityForm.indexValue}
                                                onChange={(e) => handleElectricityChange('indexValue', e.target.value)}
                                                required
                                            />
                                            <span className="text-xs text-gray-500 mt-1">kWh</span>
                                        </div>

                                        {/* Reading date */}
                                        <div>
                                            <label className="block mb-2 font-medium">Ngày ghi <span className="text-red-500">*</span></label>
                                            <Input
                                                type="date"
                                                value={electricityForm.readingDate}
                                                onChange={(e) => handleElectricityChange('readingDate', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-6">
                                        <label className="block mb-2 font-medium">Ghi chú</label>
                                        <Textarea
                                            placeholder="Nhập ghi chú"
                                            value={electricityForm.notes}
                                            onChange={(e) => handleElectricityChange('notes', e.target.value)}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="mr-2"
                                            onClick={() => navigate('/utilities')}
                                        >
                                            Quay lại
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            loading={loading}
                                            disabled={!electricityForm.roomId || !electricityForm.indexValue}
                                        >
                                            Lưu chỉ số điện
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Card>
                </Tab>

                <Tab
                    id="water"
                    label={<div className="flex items-center"><WaterDropIcon className="h-5 w-5 mr-1 text-blue-500" />Nước</div>}
                >
                    <Card className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Left column: List of rooms missing water readings */}
                            <div className="border-r pr-4">
                                <h3 className="font-medium text-lg mb-3">Phòng chưa ghi chỉ số nước tháng {currentMonth}/{currentYear}</h3>
                                {loadingRooms ? (
                                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                                ) : roomsMissingWater.length > 0 ? (
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {roomsMissingWater.map(room => (
                                            <div
                                                key={room.id}
                                                className={`p-2 border rounded mb-2 cursor-pointer flex justify-between items-center ${waterForm.roomId === room.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                                                onClick={() => handleSelectWaterRoom(room)}
                                            >
                                                <div>
                                                    <div className="font-medium">{room.number}</div>
                                                    <div className="text-sm text-gray-600">{room.building?.name}</div>
                                                </div>
                                                <PlusCircleIcon className="h-5 w-5 text-blue-500" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <ExclamationCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                        <p>Tất cả phòng đã ghi chỉ số nước cho tháng này!</p>
                                    </div>
                                )}
                            </div>

                            {/* Right column: Form */}
                            <div className="lg:col-span-2">
                                <form onSubmit={handleWaterSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* Building selection */}
                                        <div>
                                            <label className="block mb-2 font-medium">Tòa nhà</label>
                                            <Select
                                                placeholder="Chọn tòa nhà"
                                                value={waterForm.buildingId}
                                                onChange={(value) => handleWaterChange('buildingId', value)}
                                                options={buildings.map(building => ({
                                                    value: building.id,
                                                    label: building.name
                                                }))}
                                            />
                                        </div>

                                        {/* Room selection - Changed from Select to Input */}
                                        <div>
                                            <label className="block mb-2 font-medium">Phòng <span className="text-red-500">*</span></label>
                                            <Input
                                                type="text"
                                                placeholder="Nhập số phòng"
                                                value={waterForm.tempRoomNumber || (waterForm.roomId && allRooms.find(r => r.id === waterForm.roomId)?.number) || ''}
                                                onChange={(e) => {
                                                    const roomNumber = e.target.value;
                                                    // Lưu trữ giá trị đang nhập trước
                                                    setWaterForm(prev => ({ ...prev, tempRoomNumber: roomNumber }));

                                                    console.log('Đang tìm phòng:', roomNumber);
                                                    console.log('Tòa nhà đã chọn:', waterForm.buildingId);

                                                    // Chuyển đổi tất cả thành chuỗi (string) khi so sánh
                                                    const room = waterForm.buildingId
                                                        ? allRooms.find(r => String(r.number).trim() === String(roomNumber).trim() &&
                                                            String(r.buildingId) === String(waterForm.buildingId))
                                                        : allRooms.find(r => String(r.number).trim() === String(roomNumber).trim());

                                                    if (room) {
                                                        handleWaterChange('roomId', room.id);
                                                        if (!waterForm.buildingId) {
                                                            handleWaterChange('buildingId', room.buildingId);
                                                        }
                                                    } else {
                                                        // Nếu không tìm thấy phòng hợp lệ, xóa roomId
                                                        handleWaterChange('roomId', '');
                                                    }
                                                }}
                                                required
                                            />
                                            {waterForm.roomId && (
                                                <Badge color="green" className="mt-1">
                                                    Phòng hợp lệ
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Reading value */}
                                        <div>
                                            <label className="block mb-2 font-medium">Chỉ số nước <span className="text-red-500">*</span></label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Nhập chỉ số"
                                                value={waterForm.indexValue}
                                                onChange={(e) => handleWaterChange('indexValue', e.target.value)}
                                                required
                                            />
                                            <span className="text-xs text-gray-500 mt-1">m³</span>
                                        </div>

                                        {/* Reading date */}
                                        <div>
                                            <label className="block mb-2 font-medium">Ngày ghi <span className="text-red-500">*</span></label>
                                            <Input
                                                type="date"
                                                value={waterForm.readingDate}
                                                onChange={(e) => handleWaterChange('readingDate', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-6">
                                        <label className="block mb-2 font-medium">Ghi chú</label>
                                        <Textarea
                                            placeholder="Nhập ghi chú"
                                            value={waterForm.notes}
                                            onChange={(e) => handleWaterChange('notes', e.target.value)}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="mr-2"
                                            onClick={() => navigate('/utilities')}
                                        >
                                            Quay lại
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            loading={loading}
                                            disabled={!waterForm.roomId || !waterForm.indexValue}
                                        >
                                            Lưu chỉ số nước
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Card>
                </Tab>

                <Tab
                    id="other"
                    label="Khác"
                >
                    <Card className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Building selection */}
                            <div>
                                <label className="block mb-2 font-medium">Tòa nhà</label>
                                <Select
                                    placeholder="Chọn tòa nhà"
                                    value={otherForm.buildingId}
                                    onChange={(value) => handleOtherChange('buildingId', value)}
                                    options={buildings.map(building => ({
                                        value: building.id,
                                        label: building.name
                                    }))}
                                />
                            </div>

                            {/* Room selection - Fixed input */}
                            <div>
                                <label className="block mb-2 font-medium">Phòng <span className="text-red-500">*</span></label>
                                <Input
                                    type="text"
                                    placeholder="Nhập số phòng"
                                    value={otherForm.tempRoomNumber || (otherForm.roomId && allRooms.find(r => r.id === otherForm.roomId)?.number) || ''}
                                    onChange={(e) => {
                                        const roomNumber = e.target.value;
                                        // Lưu trữ giá trị đang nhập trước
                                        setOtherForm(prev => ({ ...prev, tempRoomNumber: roomNumber }));

                                        console.log('Đang tìm phòng:', roomNumber);
                                        console.log('Tòa nhà đã chọn:', otherForm.buildingId);

                                        // Chuyển đổi tất cả thành chuỗi (string) khi so sánh
                                        const room = otherForm.buildingId
                                            ? allRooms.find(r => String(r.number).trim() === String(roomNumber).trim() &&
                                                String(r.buildingId) === String(otherForm.buildingId))
                                            : allRooms.find(r => String(r.number).trim() === String(roomNumber).trim());

                                        if (room) {
                                            handleOtherChange('roomId', room.id);
                                            if (!otherForm.buildingId) {
                                                handleOtherChange('buildingId', room.buildingId);
                                            }
                                        } else {
                                            // Nếu không tìm thấy phòng hợp lệ, xóa roomId
                                            handleOtherChange('roomId', '');
                                        }
                                    }}
                                    required
                                />
                                {otherForm.roomId && (
                                    <Badge color="green" className="mt-1">
                                        Phòng hợp lệ
                                    </Badge>
                                )}
                            </div>

                            {/* Utility type */}
                            <div>
                                <label className="block mb-2 font-medium">Loại tiện ích <span className="text-red-500">*</span></label>
                                <Select
                                    placeholder="Chọn loại tiện ích"
                                    value={otherForm.type}
                                    onChange={(value) => handleOtherChange('type', value)}
                                    options={utilityTypeOptions}
                                    required
                                />
                            </div>

                            {/* Reason field for "Other" type */}
                            <div>
                                <label className="block mb-2 font-medium">Lý do <span className="text-red-500">*</span></label>
                                <Input
                                    type="text"
                                    placeholder="Nhập lý do tạo chỉ số"
                                    value={otherForm.reason}
                                    onChange={(e) => handleOtherChange('reason', e.target.value)}
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
                                    value={otherForm.indexValue}
                                    onChange={(e) => handleOtherChange('indexValue', e.target.value)}
                                    required
                                />
                                <span className="text-xs text-gray-500">
                                    {getUnitLabel(otherForm.type)}
                                </span>
                            </div>

                            {/* Reading date */}
                            <div>
                                <label className="block mb-2 font-medium">Ngày ghi <span className="text-red-500">*</span></label>
                                <Input
                                    type="date"
                                    value={otherForm.readingDate}
                                    onChange={(e) => handleOtherChange('readingDate', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <label className="block mb-2 font-medium">Ghi chú thêm</label>
                                <Textarea
                                    placeholder="Nhập ghi chú"
                                    value={otherForm.notes}
                                    onChange={(e) => handleOtherChange('notes', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                className="mr-2"
                                onClick={() => navigate('/utilities')}
                            >
                                Quay lại
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                loading={loading}
                                disabled={!otherForm.roomId || !otherForm.indexValue || !otherForm.reason}
                                onClick={handleOtherSubmit}
                            >
                                Lưu
                            </Button>
                        </div>
                    </Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default UtilityReadingCreate;