import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { utilityService, buildingService, roomService } from '../../services';
import { Table, Badge, Button, Card, LoadingSpinner, Select, Tooltip } from '../../components';
import { PlusIcon, PencilIcon, TrashIcon, FilterIcon } from '../../components/icons';

const UtilitiesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [utilities, setUtilities] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [feeRates, setFeeRates] = useState({});
    const [filters, setFilters] = useState({
        buildingId: '',
        roomId: '',
        type: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Định dạng các lựa chọn cho dropdown
    const buildingOptions = [
        { value: '', label: 'Tất cả tòa nhà' },
        ...buildings.map(building => ({ value: building.id.toString(), label: building.name }))
    ];

    const roomOptions = [
        { value: '', label: 'Tất cả phòng' },
        ...rooms.map(room => ({ value: room.id.toString(), label: `${room.number}` }))
    ];

    const typeOptions = [
        { value: '', label: 'Tất cả loại' },
        { value: 'ELECTRICITY', label: 'Điện' },
        { value: 'WATER', label: 'Nước' }
    ];

    const monthOptions = [
        { value: '', label: 'Tất cả tháng' },
        ...Array.from({ length: 12 }, (_, i) => ({
            value: (i + 1).toString(),
            label: `Tháng ${i + 1}`
        }))
    ];

    const yearOptions = [
        { value: '', label: 'Tất cả năm' },
        ...Array.from({ length: 5 }, (_, i) => ({
            value: (new Date().getFullYear() - 2 + i).toString(),
            label: (new Date().getFullYear() - 2 + i).toString()
        }))
    ];

    // Định nghĩa cột cho bảng
    const columns = [
        {
            header: 'Phòng',
            accessor: 'room.number',
            cell: ({ row }) => row.room?.number || 'N/A',
        },
        {
            header: 'Tòa nhà',
            accessor: 'room.building.name',
            cell: ({ row }) => row.room?.building?.name || 'N/A',
        },
        {
            header: 'Loại tiện ích',
            accessor: 'type',
            cell: ({ row }) => (
                <Badge
                    variant={row.type === 'ELECTRICITY' ? 'warning' : 'info'}
                >
                    {row.type === 'ELECTRICITY' ? 'Điện' : 'Nước'}
                </Badge>
            )
        },
        {
            header: 'Chỉ số',
            accessor: 'value',
            cell: ({ row }) => (
                <span>
                    {row.value} {row.type === 'ELECTRICITY' ? 'kWh' : 'm³'}
                </span>
            )
        },
        {
            header: 'Đơn giá',
            accessor: 'feeRate',
            cell: ({ row }) => {
                const rate = feeRates[row.type];
                return (
                    <span>
                        {rate ? new Intl.NumberFormat('vi-VN').format(rate) : 'N/A'} VND
                    </span>
                );
            }
        },
        {
            header: 'Thành tiền',
            accessor: 'total',
            cell: ({ row }) => {
                const rate = feeRates[row.type];
                const total = rate && row.value ? rate * row.value : null;
                return (
                    <span className="font-medium">
                        {total ? new Intl.NumberFormat('vi-VN').format(total) : 'N/A'} VND
                    </span>
                );
            }
        },
        {
            header: 'Ngày ghi số',
            accessor: 'readingDate',
            cell: ({ row }) => (
                <Tooltip content={row.readingDate ? format(parseISO(row.readingDate), 'dd/MM/yyyy HH:mm') : 'N/A'}>
                    <span>{row.readingDate ? format(parseISO(row.readingDate), 'dd/MM/yyyy') : 'N/A'}</span>
                </Tooltip>
            )
        },
        {
            header: 'Tháng/Năm',
            accessor: 'month',
            cell: ({ row }) => (
                <span>{row.month}/{row.year}</span>
            )
        },
        {
            header: 'Trạng thái',
            accessor: 'status',
            cell: ({ row }) => {
                let variant = 'default';
                let label = 'Không xác định';

                switch (row.status) {
                    case 'PENDING':
                        variant = 'warning';
                        label = 'Chờ xử lý';
                        break;
                    case 'PROCESSED':
                        variant = 'success';
                        label = 'Đã xử lý';
                        break;
                    case 'ERROR':
                        variant = 'error';
                        label = 'Lỗi';
                        break;
                }

                return <Badge variant={variant}>{label}</Badge>;
            }
        },
        {
            header: 'Hành động',
            accessor: 'actions',
            cell: ({ row }) => (
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={() => navigate(`/utilities/edit/${row.id}`)}
                        icon={PencilIcon}
                        variant="outline"
                        size="sm"
                        title="Chỉnh sửa"
                    />
                    <Button
                        onClick={() => handleDelete(row.id)}
                        icon={TrashIcon}
                        variant="outline"
                        size="sm"
                        title="Xóa"
                        className="!text-red-500 hover:!bg-red-50"
                    />
                </div>
            )
        }
    ];

    // Load dữ liệu ban đầu
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);
                // Fetch fee rates for utilities (electricity and water)
                const [buildingsData, utilitiesData, feeRatesData] = await Promise.all([
                    buildingService.getAllBuildings({ limit: 100 }),
                    utilityService.getAllUtilityReadings(filters),
                    utilityService.getUtilityFeeRates()
                ]);

                setBuildings(buildingsData || []);
                setUtilities(utilitiesData || []);

                // Process fee rates and store in state
                if (feeRatesData && Array.isArray(feeRatesData)) {
                    const ratesObj = {};
                    feeRatesData.forEach(rate => {
                        if (rate.feeType === 'ELECTRICITY' || rate.feeType === 'WATER') {
                            ratesObj[rate.feeType] = rate.amount;
                        }
                    });
                    setFeeRates(ratesObj);
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
                showToast('Không thể tải dữ liệu. Vui lòng thử lại sau.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [showToast]);

    // Tải lại dữ liệu khi bộ lọc thay đổi
    useEffect(() => {
        const fetchFilteredData = async () => {
            try {
                setIsLoading(true);
                const utilitiesData = await utilityService.getAllUtilityReadings(filters);
                setUtilities(utilitiesData || []);
            } catch (error) {
                console.error('Failed to filter data:', error);
                showToast('Không thể lọc dữ liệu. Vui lòng thử lại.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFilteredData();
    }, [filters, showToast]);

    // Load phòng khi chọn tòa nhà
    useEffect(() => {
        const fetchRooms = async () => {
            if (filters.buildingId) {
                try {
                    const roomsData = await roomService.getAllRooms({
                        buildingId: filters.buildingId,
                        limit: 1000
                    });
                    setRooms(roomsData || []);
                } catch (error) {
                    console.error('Failed to fetch rooms:', error);
                    showToast('Không thể tải danh sách phòng. Vui lòng thử lại.', 'error');
                }
            } else {
                setRooms([]);
            }
            // Reset phòng đã chọn khi đổi tòa nhà
            setFilters(prev => ({ ...prev, roomId: '' }));
        };

        fetchRooms();
    }, [filters.buildingId, showToast]);

    // Xử lý thay đổi bộ lọc
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Xử lý xóa bản ghi
    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
            try {
                await utilityService.deleteUtilityReading(id);
                showToast('Xóa bản ghi thành công', 'success');

                // Cập nhật danh sách sau khi xóa
                setUtilities(prevUtilities =>
                    prevUtilities.filter(utility => utility.id !== id)
                );
            } catch (error) {
                console.error('Failed to delete utility reading:', error);
                showToast('Không thể xóa bản ghi. Vui lòng thử lại.', 'error');
            }
        }
    };

    // Xử lý làm mới bộ lọc
    const handleResetFilters = () => {
        setFilters({
            buildingId: '',
            roomId: '',
            type: '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Quản lý tiện ích</h1>
                <div className="flex space-x-2">
                    <Button
                        icon={FilterIcon}
                        variant={filtersVisible ? "default" : "outline"}
                        onClick={() => setFiltersVisible(!filtersVisible)}
                    >
                        Bộ lọc
                    </Button>
                    <Button
                        icon={PlusIcon}
                        onClick={() => navigate('/utilities/add')}
                    >
                        Thêm chỉ số
                    </Button>
                </div>
            </div>

            {/* Bộ lọc */}
            {filtersVisible && (
                <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Select
                            name="buildingId"
                            label="Tòa nhà"
                            value={filters.buildingId}
                            onChange={handleFilterChange}
                            options={buildingOptions}
                        />
                        <Select
                            name="roomId"
                            label="Phòng"
                            value={filters.roomId}
                            onChange={handleFilterChange}
                            options={roomOptions}
                            disabled={!filters.buildingId}
                        />
                        <Select
                            name="type"
                            label="Loại tiện ích"
                            value={filters.type}
                            onChange={handleFilterChange}
                            options={typeOptions}
                        />
                        <Select
                            name="month"
                            label="Tháng"
                            value={filters.month.toString()}
                            onChange={handleFilterChange}
                            options={monthOptions}
                        />
                        <Select
                            name="year"
                            label="Năm"
                            value={filters.year.toString()}
                            onChange={handleFilterChange}
                            options={yearOptions}
                        />
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button variant="outline" onClick={handleResetFilters}>
                            Đặt lại bộ lọc
                        </Button>
                    </div>
                </Card>
            )}

            {/* Bảng tiện ích */}
            <Card>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={utilities}
                        pagination
                        emptyState={{
                            title: 'Không có dữ liệu',
                            description: 'Chưa có chỉ số tiện ích nào. Thêm chỉ số mới để bắt đầu.',
                            action: (
                                <Button onClick={() => navigate('/utilities/add')}>
                                    Thêm chỉ số
                                </Button>
                            )
                        }}
                    />
                )}
            </Card>
        </div>
    );
};

export default UtilitiesPage;