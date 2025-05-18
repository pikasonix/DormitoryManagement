import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { vehicleService } from '../../services/vehicle.service';
import { studentService } from '../../services/student.service'; // Lấy tên chủ xe (nếu ownerId là studentId)
// import { userService } from '../../services/user.service'; // Hoặc lấy user nếu ownerId là userId
import { Button, Input, Badge, Select } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';

// Options loại xe
const vehicleTypeOptions = [
    { value: '', label: 'Tất cả loại xe' },
    { value: 'MOTORBIKE', label: 'Xe máy' },
    { value: 'BICYCLE', label: 'Xe đạp' },
    { value: 'ELECTRIC_BICYCLE', label: 'Xe đạp/máy điện' },
    { value: 'CAR', label: 'Ô tô' },
    { value: 'OTHER', label: 'Khác' },
];

// Options trạng thái
const vehicleStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Không hoạt động' },
    // Thêm status khác nếu có
];

// Màu badge
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'active': return 'green';
        case 'inactive': return 'gray';
        default: return 'gray';
    }
}

const VehicleIndex = () => {
    const [vehicles, setVehicles] = useState([]);
    const [owners, setOwners] = useState({}); // Cache thông tin chủ xe { ownerId: name }
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        search: '', // Tìm theo biển số
        parkingCardNo: '',
    });
    const debouncedSearch = useDebounce(filters.search, 500);
    const navigate = useNavigate();

    // Fetch danh sách xe
    const fetchVehicles = useCallback(async (page = 1, currentFilters, search = '') => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Current filters:', currentFilters);

            const params = {
                page: page,
                limit: meta.limit,
                vehicleType: currentFilters.type || undefined,
                isActive: currentFilters.status === 'active' ? true :
                    currentFilters.status === 'inactive' ? false : undefined,
                licensePlate: search || undefined, // Chuyển search thành licensePlate param
                parkingCardNo: currentFilters.parkingCardNo || undefined,
            };

            console.log('API params:', params);

            const data = await vehicleService.getAllVehicles(params);
            const vehicleList = data.vehicles || [];
            setVehicles(vehicleList);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);

            // Fetch thông tin chủ xe nếu chưa có trong cache
            const ownerIdsToFetch = [...new Set(vehicleList.map(v => v.ownerId).filter(id => id && !owners[id]))];
            if (ownerIdsToFetch.length > 0) {
                // Xác định ownerId là userId hay studentId để gọi service đúng
                // Giả sử ownerId là studentId (StudentProfile ID)
                const ownerPromises = ownerIdsToFetch.map(id => studentService.getStudentById(id).catch(() => null));
                const ownerResults = await Promise.all(ownerPromises);
                setOwners(prev => {
                    const newOwners = { ...prev };
                    ownerResults.forEach(owner => { if (owner) newOwners[owner.id] = owner.fullName || `ID: ${owner.id}`; });
                    return newOwners;
                });
            }

        } catch (err) {
            console.error('Error fetching vehicles:', err);
            setError('Không thể tải danh sách xe.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, owners]);

    useEffect(() => {
        fetchVehicles(currentPage, filters, debouncedSearch);
    }, [fetchVehicles, currentPage, filters, debouncedSearch]);

    // Handlers
    const handleFilterChange = (e) => {
        const name = e.target ? e.target.name : e.name;
        const value = e.target ? e.target.value : e;

        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        // Đảm bảo trang mới hợp lệ
        if (page > 0 && page <= meta.totalPages) {
            setCurrentPage(page);
            // Scroll lên đầu trang khi chuyển trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDelete = async (id, licensePlate) => {
        if (window.confirm(`Bạn có chắc muốn xóa thông tin xe có biển số "${licensePlate || 'N/A'}" không?`)) {
            try {
                await vehicleService.deleteVehicle(id);
                toast.success(`Đã xóa thông tin xe "${licensePlate || 'N/A'}"!`);
                fetchVehicles(currentPage, filters, debouncedSearch);
            } catch (err) {
                toast.error(err?.message || `Xóa thông tin xe thất bại.`);
            }
        }
    };

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        {
            Header: 'No.',
            accessor: 'parkingCardNo',
            Cell: ({ value }) => <span className='font-mono font-semibold'>{value || 'N/A'}</span>
        },
        {
            Header: 'Sinh Viên',
            accessor: 'studentProfile',
            Cell: ({ value }) => (
                <div>
                    <div className="font-semibold">{value?.studentId || 'N/A'}</div>
                    <div className="text-sm text-gray-600">{value?.phoneNumber || 'N/A'}</div>
                </div>
            )
        },
        {
            Header: 'Loại xe',
            accessor: 'vehicleType',
            Cell: ({ value }) => {
                const typeLabel = vehicleTypeOptions.find(opt => opt.value === value)?.label || value;
                return <span className="capitalize">{typeLabel}</span>;
            }
        },
        {
            Header: 'Biển số',
            accessor: 'licensePlate',
            Cell: ({ value }) => <span className='font-mono font-semibold'>{value}</span>
        },
        {
            Header: 'Hãng(Model)',
            accessor: 'brand',
            Cell: ({ value, row }) => {
                const brand = value || '';
                const model = row.original.model || '';
                return <span>{brand}{brand && model ? ' - ' : ''}{model}</span>;
            }
        },
        {
            Header: 'Màu',
            accessor: 'color'
        },
        {
            Header: 'Trạng thái',
            accessor: 'isActive',
            Cell: ({ value }) =>
                <Badge color={value ? 'green' : 'gray'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
        },
        {
            Header: 'Ngày đăng ký',
            accessor: 'registrationDate',
            Cell: ({ value, row }) => {
                const date = row.original.startDate || value;
                return date ? format(parseISO(date), 'dd/MM/yyyy') : 'N/A';
            }
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-2 justify-center">
                    <Button variant="icon" onClick={() => navigate(`/vehicles/${row.original.id}/edit`)} tooltip="Chỉnh sửa">
                        <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
                    </Button>
                    <Button variant="icon" onClick={() => handleDelete(row.original.id, row.original.licensePlate)} tooltip="Xóa">
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                </div>
            ),
        },
    ], [navigate]);

    return (
        <div className="space-y-4">            <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-2xl font-semibold">Quản lý Xe đăng ký</h1>
            {/* Nút đăng ký xe cho sinh viên (dành cho Admin/Staff) */}
            <Button onClick={() => navigate('/vehicles/new')} icon={PlusIcon}>Đăng ký xe cho sinh viên</Button>
        </div>

            {/* Bộ lọc */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Input label="NO." id="parkingCardNo" name="parkingCardNo" placeholder="Nhập mã thẻ gửi xe" value={filters.parkingCardNo} onChange={handleFilterChange} />
                <Input label="Biển số" id="search" name="search" placeholder="30-B2-97369" value={filters.search} onChange={handleFilterChange} />
                <Select
                    label="Loại xe"
                    id="type"
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    options={vehicleTypeOptions}
                />
                <Select
                    label="Trạng thái"
                    id="status"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    options={vehicleStatusOptions}
                />
                {/* Thêm filter theo chủ xe nếu cần */}
            </div>

            {/* Bảng dữ liệu */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : vehicles.length === 0 ? (
                <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                    Không tìm thấy xe nào đăng ký.
                </div>
            ) : (
                <PaginationTable
                    columns={columns}
                    data={vehicles}
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={meta.total}
                    recordsPerPage={meta.limit}
                    showingText={`Hiển thị xe ${(currentPage - 1) * meta.limit + 1} - ${Math.min(currentPage * meta.limit, meta.total)}`}
                    recordsText="xe"
                    pageText="Trang"
                />
            )}
        </div>
    );
};

export default VehicleIndex;