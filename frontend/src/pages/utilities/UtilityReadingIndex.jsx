import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { utilityService } from '../../services/utility.service';
import { studentService } from '../../services/student.service'; // Lấy tên SV
import { roomService } from '../../services/room.service'; // Lấy phòng/tòa nhà
import { buildingService } from '../../services/building.service'; // Lấy tòa nhà
import { Button, Table, Select, Input, Pagination, Badge, DatePicker } from '../../components/shared'; // Thêm DatePicker nếu lọc theo tháng
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, BoltIcon, CloudIcon } from '@heroicons/react/24/outline'; // Thêm icon tiện ích
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';

// Format tiền tệ
const formatCurrency = (amount) => { /* ... */ }
// Format tháng YYYY-MM (cho billingPeriod)
const formatBillingPeriod = (period) => {
    if (!period || typeof period !== 'string') return '-';
    try {
        const [year, month] = period.split('-');
        if (year && month) {
            return `Thg ${parseInt(month)}/${year}`;
        }
    } catch (e) { /* ignore */ }
    return period; // Trả về gốc nếu không parse được
}

// Options loại tiện ích
const utilityTypeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'electric', label: 'Điện' },
    { value: 'water', label: 'Nước' },
];
// Options trạng thái (cần khớp backend)
const utilityStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ thanh toán' }, // Giả sử có status này
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'billed', label: 'Đã tạo hóa đơn' }, // Ví dụ
];
// Màu badge
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return 'green';
        case 'pending': return 'yellow';
        case 'billed': return 'blue';
        default: return 'gray';
    }
}

const UtilityReadingIndex = () => {
    const [readings, setReadings] = useState([]);
    const [students, setStudents] = useState({}); // Cache SV
    const [rooms, setRooms] = useState({}); // Cache phòng
    const [buildings, setBuildings] = useState([]); // DS tòa nhà để lọc
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        dormitoryId: '',
        roomId: '',
        studentId: '',
        billingPeriod: '', // YYYY-MM
    });
    const navigate = useNavigate();

    // Fetch data
    const fetchReadings = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = { page, limit: meta.limit };
            Object.keys(currentFilters).forEach(key => {
                if (currentFilters[key]) params[key] = currentFilters[key];
            });
            const data = await utilityService.getAllUtilityReadings(params);
            const readingList = data.utilities || [];
            setReadings(readingList);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);

            // Fetch thông tin liên quan (tối ưu hơn nếu backend trả về sẵn)
            const studentIds = [...new Set(readingList.map(r => r.studentId).filter(id => id && !students[id]))];
            const roomIds = [...new Set(readingList.map(r => r.roomId).filter(id => id && !rooms[id]))];

            if (studentIds.length > 0) { /* ... fetch students ... */ }
            if (roomIds.length > 0) { /* ... fetch rooms ... */ }

        } catch (err) {
            setError('Không thể tải danh sách ghi điện nước.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, students, rooms]);

    // Fetch buildings cho filter
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const buildingData = await buildingService.getAllBuildings({ limit: 1000 });
                setBuildings(buildingData.dormitories || []);
                // Fetch thêm students/rooms nếu cần cho filter Select
            } catch (err) { console.error("Lỗi tải dữ liệu filter:", err); }
        }
        fetchFilterData();
    }, []);


    useEffect(() => {
        fetchReadings(currentPage, filters);
    }, [fetchReadings, currentPage, filters]);


    // Handlers
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    };
    const handleBillingPeriodChange = (date) => {
        // Format date thành YYYY-MM
        const period = date ? format(date, 'yyyy-MM') : '';
        setFilters(prev => ({ ...prev, billingPeriod: period }));
        setCurrentPage(1);
    };

    const handleDelete = async (id, period, type) => {
        if (window.confirm(`Bạn có chắc muốn xóa bản ghi ${type === 'electric' ? 'điện' : 'nước'} kỳ ${formatBillingPeriod(period)} không?`)) {
            try {
                await utilityService.deleteUtilityReading(id);
                toast.success(`Đã xóa bản ghi thành công!`);
                fetchReadings(currentPage, filters);
            } catch (err) {
                toast.error(err?.message || `Xóa bản ghi thất bại.`);
            }
        }
    };
    const handlePageChange = (page) => setCurrentPage(page);

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        { Header: 'Kỳ', accessor: 'billingPeriod', Cell: ({ value }) => formatBillingPeriod(value) },
        { Header: 'Loại', accessor: 'type', Cell: ({ value }) => value === 'electric' ? <BoltIcon className="h-5 w-5 text-yellow-500 inline-block mr-1" /> : <CloudIcon className="h-5 w-5 text-blue-500 inline-block mr-1" /> },
        { Header: 'Phòng', accessor: 'roomId', Cell: ({ value }) => rooms[value] ? `${rooms[value].number} (${rooms[value].building?.name})` : `ID: ${value}` },
        { Header: 'Sinh viên', accessor: 'studentId', Cell: ({ value }) => students[value]?.fullName || `ID: ${value}` },
        { Header: 'Tiêu thụ', accessor: 'consumption', Cell: ({ value, row }) => `${value ?? '-'} ${row.original.type === 'electric' ? 'kWh' : 'm³'}` },
        { Header: 'Thành tiền', accessor: 'amount', Cell: ({ value }) => formatCurrency(value) },
        { Header: 'Trạng thái', accessor: 'status', Cell: ({ value }) => <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge> },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-2 justify-center">
                    <Button variant="icon" onClick={() => navigate(`/utilities/${row.original.id}/edit`)} tooltip="Chỉnh sửa">
                        <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
                    </Button>
                    <Button variant="icon" onClick={() => handleDelete(row.original.id, row.original.billingPeriod, row.original.type)} tooltip="Xóa">
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                </div>
            ),
        },
    ], [navigate, students, rooms, currentPage, filters]);

    // Options cho Selects
    const buildingOptions = [{ value: '', label: 'Tất cả tòa nhà' }, ...buildings.map(b => ({ value: b.id.toString(), label: b.name }))];
    // Cần fetch thêm rooms/students cho filter nếu muốn lọc theo phòng/SV cụ thể

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý Ghi điện nước</h1>
                <Button onClick={() => navigate('/utilities/new')} icon={PlusIcon}>
                    Nhập chỉ số mới
                </Button>
            </div>

            {/* Bộ lọc */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Select label="Tòa nhà" name="dormitoryId" value={filters.dormitoryId} onChange={handleFilterChange} options={buildingOptions} />
                {/* Select Phòng (cần load động theo tòa nhà) */}
                <Select label="Loại" name="type" value={filters.type} onChange={handleFilterChange} options={utilityTypeOptions} />
                <Select label="Trạng thái TT" name="status" value={filters.status} onChange={handleFilterChange} options={utilityStatusOptions} />
                {/* Date Picker chọn tháng */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ ghi</label>
                    {/* Sử dụng thư viện DatePicker hỗ trợ chọn tháng/năm */}
                    <Input type="month" name="billingPeriod" value={filters.billingPeriod} onChange={handleFilterChange} />
                    {/* Hoặc dùng thư viện DatePicker như react-datepicker */}
                    {/* <DatePicker selected={filters.billingPeriod ? parseISO(filters.billingPeriod + '-01') : null} onChange={handleBillingPeriodChange} dateFormat="MM/yyyy" showMonthYearPicker placeholderText="Chọn kỳ ghi..." /> */}
                </div>
                {/* Có thể thêm filter theo Sinh viên */}
            </div>

            {/* Bảng dữ liệu */}
            {isLoading ? (
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
