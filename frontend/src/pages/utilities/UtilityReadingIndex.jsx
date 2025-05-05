import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service';
import { Button, Select, Input, Table, Pagination, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, BoltIcon } from '@heroicons/react/24/outline';
import WaterDropIcon from '../../components/icons/WaterDropIcon';
import { formatDate, formatMonthYear } from '../../utils/dateUtils';
import { useDebounce } from '../../hooks/useDebounce';

// Các hàm tiện ích bổ sung
const getUtilityTypeIcon = (type) => {
    switch (type) {
        case 'ELECTRICITY':
            return <BoltIcon className="h-5 w-5 mr-2 text-yellow-500" />;
        case 'WATER':
            return <WaterDropIcon className="h-5 w-5 mr-2 text-blue-500" />;
        default:
            return null;
    }
};

// Define the utility type options
const utilityTypeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' }
];

const getUtilityTypeText = (type) => {
    switch (type) {
        case 'ELECTRICITY':
            return 'Tiền điện';
        case 'WATER':
            return 'Tiền nước';
        default:
            return 'Khác';
    }
};

const getUtilityUnit = (type) => {
    switch (type) {
        case 'ELECTRICITY':
            return 'kWh';
        case 'WATER':
            return 'm³';
        default:
            return '';
    }
};

// Format date time
const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
        console.error("Lỗi format date:", error);
        return dateString || 'N/A';
    }
}

const UtilityReadingIndex = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [readings, setReadings] = useState([]);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        buildingId: '',
        roomId: '',
        type: '',
        fromDate: '',
        toDate: '',
    });

    const debouncedSearch = useDebounce(filters.search, 500);

    // Load buildings
    const loadBuildings = useCallback(async () => {
        try {
            const response = await buildingService.getAllBuildings();
            setBuildings([
                { id: '', name: 'Tất cả tòa nhà' },
                ...(Array.isArray(response.data) ? response.data : [])
            ]);
        } catch (error) {
            console.error('Failed to load buildings:', error);
            toast.error('Không thể tải danh sách tòa nhà');
        }
    }, []);

    // Load rooms
    const loadRooms = useCallback(async () => {
        try {
            const response = await roomService.getAllRooms();
            // Get the rooms array from response.rooms or fallback to empty array
            const roomsData = response.rooms || [];
            setRooms([
                { id: '', number: 'Tất cả phòng' },
                ...roomsData
            ]);

            // Filter rooms by building if selected
            if (filters.buildingId) {
                setFilteredRooms([
                    { id: '', number: 'Tất cả phòng' },
                    ...roomsData.filter(room => room.buildingId === filters.buildingId)
                ]);
            } else {
                setFilteredRooms([
                    { id: '', number: 'Tất cả phòng' },
                    ...roomsData
                ]);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
            toast.error('Không thể tải danh sách phòng');
        }
    }, [filters.buildingId]);

    // Load readings
    const loadReadings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Prepare query params
            const params = {
                page: currentPage,
                limit: 10,
                search: debouncedSearch,
                buildingId: filters.buildingId,
                roomId: filters.roomId,
                type: filters.type,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
            };

            const response = await utilityService.getAllUtilityReadings(params);

            // Fix: Access the correct data structure from the response
            setReadings(response.utilities || []);
            setMeta({
                currentPage: response.meta?.page || 1,
                totalPages: response.meta?.totalPages || 1,
                limit: response.meta?.limit || 10,
                total: response.meta?.total || 0
            });

            // Debug: Log the response to see what data structure is returned
            console.log('Utility readings response:', response);

            if (response.utilities && response.utilities.length === 0) {
                // If no data is returned, show a message to the user
                toast.info('Không tìm thấy dữ liệu tiện ích phù hợp với bộ lọc');
            }
        } catch (error) {
            console.error('Failed to load readings:', error);
            toast.error('Không thể tải danh sách chỉ số tiện ích');
            setError('Không thể tải danh sách chỉ số tiện ích');
            // Reset readings to empty array on error
            setReadings([]);
            setMeta({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedSearch, filters]);

    useEffect(() => {
        loadBuildings();
        loadRooms();
    }, [loadBuildings, loadRooms]);

    useEffect(() => {
        loadReadings();
    }, [loadReadings]);

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        // Reset room selection when building changes
        if (field === 'buildingId') {
            setFilters({
                ...filters,
                [field]: value,
                roomId: ''
            });
        } else {
            setFilters({
                ...filters,
                [field]: value
            });
        }

        // Reset to first page when filters change
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    };

    // Clean up from the existing component
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        handleFilterChange(name, value);
    }

    // Handle date range selection
    const handleDateChange = (field, date) => {
        if (date) {
            const formattedDate = new Date(date).toISOString().split('T')[0];
            handleFilterChange(field, formattedDate);
        } else {
            handleFilterChange(field, '');
        }
    };

    // Filter rooms when building selection changes
    useEffect(() => {
        if (filters.buildingId) {
            setFilteredRooms([
                { id: '', number: 'Tất cả phòng' },
                ...rooms.filter(room => room.id && room.buildingId === filters.buildingId)
            ]);
        } else {
            setFilteredRooms([
                { id: '', number: 'Tất cả phòng' },
                ...rooms.filter(room => room.id)
            ]);
        }
    }, [filters.buildingId, rooms]);

    // Delete reading
    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa chỉ số này không?')) {
            try {
                await utilityService.deleteMeterReading(id);
                toast.success('Xóa chỉ số thành công');
                loadReadings();
            } catch (error) {
                console.error('Failed to delete reading:', error);
                toast.error('Không thể xóa chỉ số');
            }
        }
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Table columns
    const columns = useMemo(() => [
        {
            Header: 'Kỳ',
            accessor: 'billingMonth',
            Cell: ({ row }) => (
                <span>
                    {`${row.original.billingMonth}/${row.original.billingYear}`}
                </span>
            )
        },
        {
            Header: 'Loại',
            accessor: 'type',
            Cell: ({ value }) => (
                <div className="flex items-center">
                    {getUtilityTypeIcon(value)}
                    <span>{getUtilityTypeText(value)}</span>
                </div>
            )
        },
        {
            Header: 'Phòng',
            accessor: 'room.number',
            Cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.room?.number ? `${row.original.room.number} (${row.original.room.building?.name || 'N/A'})` : '-'}
                </span>
            )
        },
        {
            Header: 'Chỉ số',
            accessor: 'indexValue',
            Cell: ({ value, row }) => (
                <span className="font-medium">
                    {parseFloat(value).toLocaleString('vi-VN')} {getUtilityUnit(row.original.type)}
                </span>
            )
        },
        {
            Header: 'Ngày lấy',
            accessor: 'readingDate',
            Cell: ({ value }) => formatDateTime(value)
        },
        {
            Header: 'Thao tác',
            id: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-2 justify-center">
                    <Button
                        variant="icon"
                        onClick={() => navigate(`/utilities/readings/edit/${row.original.id}`)}
                        tooltip="Cập nhật"
                    >
                        <PencilSquareIcon className="h-5 w-5 text-indigo-600 hover:text-indigo-800" />
                    </Button>
                    <Button
                        variant="icon"
                        onClick={() => handleDelete(row.original.id)}
                        tooltip="Xóa"
                    >
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                </div>
            )
        }
    ], [navigate]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý chỉ số tiện ích</h1>
                <Button variant="primary" onClick={() => navigate('/utilities/readings/create')}>
                    <PlusIcon className="h-5 w-5 mr-1" />
                    Thêm chỉ số mới
                </Button>
            </div>

            {/* Bộ lọc */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Input
                    label="Tìm kiếm"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={handleInputChange}
                    placeholder="Tìm kiếm theo phòng, ghi chú..."
                />
                <Select
                    label="Tòa nhà"
                    id="buildingId"
                    name="buildingId"
                    value={filters.buildingId}
                    onChange={(value) => handleFilterChange('buildingId', value)}
                    options={buildings.map(building => ({
                        value: building.id,
                        label: building.name
                    }))}
                />
                <Select
                    label="Phòng"
                    id="roomId"
                    name="roomId"
                    value={filters.roomId}
                    onChange={(value) => handleFilterChange('roomId', value)}
                    options={filteredRooms.map(room => ({
                        value: room.id,
                        label: room.number ? (room.id ? `${room.number}` : room.number) : 'Tất cả phòng'
                    }))}
                />
                <Select
                    label="Loại tiện ích"
                    id="type"
                    name="type"
                    value={filters.type}
                    onChange={(value) => handleFilterChange('type', value)}
                    options={utilityTypeOptions}
                />
                <div>
                    <label className="block mb-2 text-sm font-medium">Từ ngày</label>
                    <Input
                        type="date"
                        id="fromDate"
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={handleInputChange}
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium">Đến ngày</label>
                    <Input
                        type="date"
                        id="toDate"
                        name="toDate"
                        value={filters.toDate}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            {/* Bảng dữ liệu */}
            {loading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : (
                <>
                    <Table columns={columns} data={readings} />
                    {meta.totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={meta.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default UtilityReadingIndex;
