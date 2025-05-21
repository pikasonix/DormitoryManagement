import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { vehicleService } from '../../services/vehicle.service';
import { studentService } from '../../services/student.service'; // Lấy tên chủ xe (nếu ownerId là studentId)
import { useAuth } from '../../contexts/AuthContext'; // Lấy thông tin user hiện tại
import { Button, Input, Badge, Select, Tabs } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';
import StudentVehicleInfo from '../../components/vehicles/StudentVehicleInfo';

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
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'pending'
    const [vehicles, setVehicles] = useState([]);
    const [pendingVehicles, setPendingVehicles] = useState([]);
    const [pendingMeta, setPendingMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
    const [owners, setOwners] = useState({}); // Cache thông tin chủ xe { ownerId: name }
    const [isLoading, setIsLoading] = useState(true);
    const [isPendingLoading, setIsPendingLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingError, setPendingError] = useState(null);
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
    const [recentlyApproved, setRecentlyApproved] = useState([]); // Track approved vehicles to show animation

    // Notification effect when pending count changes
    const [notifyPending, setNotifyPending] = useState(false);

    const { user } = useAuth(); // Lấy thông tin user hiện tại

    // Xác định vai trò người dùng
    const isAdmin = user?.role === 'ADMIN';
    const isStaff = user?.role === 'STAFF';
    const isStudent = user?.role === 'STUDENT';
    const isAdminOrStaff = isAdmin || isStaff;

    // Watch for pending count changes
    useEffect(() => {
        if (pendingMeta.total > 0 && !notifyPending) {
            setNotifyPending(true);
        } else if (pendingMeta.total === 0) {
            setNotifyPending(false);
        }
    }, [pendingMeta.total]);

    // Hàm sinh mã thẻ gửi xe - copy từ VehicleForm.jsx
    function generateParkingCardNo(studentId, vehicleType, vehicleId) {
        // 7 số cuối mã số sinh viên
        const studentIdStr = String(studentId);
        const last7 = studentIdStr.slice(-7).padStart(7, '0');
        // Ký tự loại xe
        let typeChar = 'O';
        switch (vehicleType) {
            case 'BICYCLE': typeChar = 'B'; break;
            case 'MOTORBIKE': typeChar = 'M'; break;
            case 'CAR': typeChar = 'C'; break;
            case 'ELECTRIC_BICYCLE': typeChar = 'E'; break;
            case 'OTHER': typeChar = 'O'; break;
            default: typeChar = 'O';
        }
        // 4 ký tự cuối id (vehicleId)
        const idStr = String(vehicleId).padStart(4, '0');
        const last4 = idStr.slice(-4);
        // Checksum: tổng các số mod 10
        const sum = (last7 + last4).split('').reduce((acc, c) => acc + (parseInt(c) || 0), 0);
        const checksum = String(sum % 10);
        // Ghép lại
        return (last7 + typeChar + last4 + checksum).padStart(13, '0');
    }

    // Chức năng chấp nhận đăng ký xe, set isActive = true và gen parkingCardNo
    const handleApprove = async (vehicle) => {
        if (window.confirm(`Bạn có chắc muốn duyệt đơn đăng ký xe có biển số "${vehicle.licensePlate || 'N/A'}" không?`)) {
            try {
                // Add vehicle to recently approved list for animation
                setRecentlyApproved(prev => [...prev, vehicle.id]);

                // Delay the actual approval to show animation
                setTimeout(async () => {
                    try {
                        // Sinh mã thẻ gửi xe
                        const studentId = vehicle.studentProfile?.studentId || '';
                        const parkingCardNo = generateParkingCardNo(studentId, vehicle.vehicleType, vehicle.id);

                        // Cập nhật thông tin xe
                        await vehicleService.updateVehicle(vehicle.id, {
                            isActive: true,
                            parkingCardNo: parkingCardNo
                        });

                        toast.success(`Đã duyệt đăng ký xe "${vehicle.licensePlate || 'N/A'}"!`);

                        // Refresh cả hai danh sách
                        fetchPendingVehicles(pendingCurrentPage);
                        if (activeTab === 'active') {
                            fetchVehicles(currentPage, filters, debouncedSearch);
                        }

                        // Remove from recently approved list
                        setRecentlyApproved(prev => prev.filter(id => id !== vehicle.id));
                    } catch (err) {
                        // Remove from recently approved list on error
                        setRecentlyApproved(prev => prev.filter(id => id !== vehicle.id));
                        toast.error(err?.message || `Duyệt đăng ký xe thất bại.`);
                    }
                }, 800);
            } catch (err) {
                setRecentlyApproved(prev => prev.filter(id => id !== vehicle.id));
                toast.error(err?.message || `Duyệt đăng ký xe thất bại.`);
            }
        }
    };

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

    // Fetch danh sách xe đang chờ duyệt (isActive = false và không có parkingCardNo)
    const fetchPendingVehicles = useCallback(async (page = 1) => {
        setIsPendingLoading(true);
        setPendingError(null);
        try {
            const params = {
                page: page,
                limit: pendingMeta.limit,
                isActive: false,
                hasParkingCardNo: false // Thêm tham số này để lọc xe chưa có mã thẻ gửi xe
            };

            const data = await vehicleService.getAllVehicles(params);
            const vehicleList = data.vehicles || [];
            setPendingVehicles(vehicleList);
            setPendingMeta(prev => ({ ...prev, ...data.meta }));
            setPendingCurrentPage(data.meta?.page || 1);

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
            console.error('Error fetching pending vehicles:', err);
            setPendingError('Không thể tải danh sách xe chờ duyệt.');
        } finally {
            setIsPendingLoading(false);
        }
    }, [pendingMeta.limit, owners]);

    useEffect(() => {
        if (activeTab === 'active') {
            fetchVehicles(currentPage, filters, debouncedSearch);
        } else if (activeTab === 'pending') {
            fetchPendingVehicles(pendingCurrentPage);
        }
    }, [fetchVehicles, fetchPendingVehicles, currentPage, pendingCurrentPage, filters, debouncedSearch, activeTab]);

    // Load pending count on initial load
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const params = {
                    page: 1,
                    limit: 1,
                    isActive: false,
                    hasParkingCardNo: false
                };
                const data = await vehicleService.getAllVehicles(params);
                setPendingMeta(prev => ({ ...prev, total: data.meta.total }));
            } catch (err) {
                console.error('Error fetching pending count:', err);
            }
        };

        fetchPendingCount();
    }, []);

    // Handle Tab Change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Handlers for regular vehicles
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

    const handlePendingPageChange = (page) => {
        // Đảm bảo trang mới hợp lệ
        if (page > 0 && page <= pendingMeta.totalPages) {
            setPendingCurrentPage(page);
            // Scroll lên đầu trang khi chuyển trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDelete = async (id, licensePlate) => {
        if (window.confirm(`Bạn có chắc muốn xóa thông tin xe có biển số "${licensePlate || 'N/A'}" không?`)) {
            try {
                await vehicleService.deleteVehicle(id);
                toast.success(`Đã xóa thông tin xe "${licensePlate || 'N/A'}"!`);

                // Refresh danh sách tương ứng với tab hiện tại
                if (activeTab === 'active') {
                    fetchVehicles(currentPage, filters, debouncedSearch);
                } else {
                    fetchPendingVehicles(pendingCurrentPage);
                }
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
                    {activeTab !== 'pending' && (
                        <Button variant="icon" onClick={() => navigate(`/vehicles/${row.original.id}/edit`)} tooltip="Chỉnh sửa">
                            <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
                        </Button>
                    )}
                    <Button variant="icon" onClick={() => handleDelete(row.original.id, row.original.licensePlate)} tooltip="Xóa">
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                    {activeTab === 'pending' && (
                        <Button variant="icon" onClick={() => handleApprove(row.original)} tooltip="Duyệt">
                            <PlusIcon className="h-5 w-5 text-green-600 hover:text-green-800" />
                        </Button>
                    )}
                </div>
            ),
        },
    ], [navigate, activeTab]);

    // Cấu hình bảng danh sách đăng ký chờ duyệt
    const pendingColumns = useMemo(() => [
        {
            Header: 'Sinh Viên',
            accessor: 'studentProfile',
            Cell: ({ value }) => (
                <div>
                    <div className="font-semibold">{value?.studentId || 'N/A'}</div>
                    <div className="text-sm text-gray-600">{value?.phoneNumber || 'N/A'}</div>
                    <div className="text-sm text-gray-600">{value?.fullName || 'N/A'}</div>
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
            Header: 'Hãng/Model',
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
            Cell: ({ row }) => {
                const isBeingApproved = recentlyApproved.includes(row.original.id);
                return (
                    <div className={`flex space-x-2 justify-center transition-opacity duration-700 ${isBeingApproved ? 'opacity-50' : 'opacity-100'}`}>
                        <Button
                            variant="primary"
                            onClick={() => handleApprove(row.original)}
                            tooltip="Chấp nhận"
                            className={`${isBeingApproved ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                            disabled={isBeingApproved}
                        >
                            {isBeingApproved ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <CheckIcon className="h-5 w-5 text-white" />
                            )}
                        </Button>
                        <Button
                            variant="icon"
                            onClick={() => handleDelete(row.original.id, row.original.licensePlate)}
                            tooltip="Xóa"
                            disabled={isBeingApproved}
                        >
                            <TrashIcon className={`h-5 w-5 ${isBeingApproved ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`} />
                        </Button>
                    </div>
                );
            },
        },
    ], [recentlyApproved]);    // Function để render giao diện cho sinh viên
    const renderStudentView = () => {
        const studentProfileId = user?.studentProfile?.id;

        if (!studentProfileId) {
            return (
                <div className="text-red-600 bg-red-100 p-4 rounded text-center">
                    Không tìm thấy thông tin sinh viên. Vui lòng cập nhật hồ sơ.
                </div>
            );
        }

        return <StudentVehicleInfo studentProfileId={studentProfileId} showActions={true} />;
    };

    // Function để render giao diện quản lý xe cho admin/staff
    const renderAdminView = () => {
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <h1 className="text-2xl font-semibold">Quản lý Xe đăng ký</h1>
                    {/* Nút đăng ký xe cho sinh viên (dành cho Admin/Staff) */}
                    <Button onClick={() => navigate('/vehicles/new')} icon={PlusIcon}>Đăng ký xe cho sinh viên</Button>
                </div>

                {/* Tab switcher */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex" aria-label="Tabs">
                        <button
                            onClick={() => handleTabChange('active')}
                            className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'active'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Xe đã duyệt
                        </button>
                        <button
                            onClick={() => handleTabChange('pending')}
                            className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'pending'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Chờ duyệt {pendingMeta.total > 0 && (
                                <span className={`ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs ${notifyPending ? 'animate-pulse' : ''}`}>
                                    {pendingMeta.total}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {activeTab === 'active' ? (
                    <>
                        {/* Bộ lọc - chỉ hiển thị cho tab xe đã duyệt */}
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
                        </div>

                        {/* Bảng dữ liệu xe đã duyệt */}
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
                    </>
                ) : (
                    <>
                        {/* Bảng dữ liệu các đăng ký chờ duyệt */}
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-4">
                            <p className="text-yellow-800">
                                <span className="font-medium">Đơn đăng ký chờ duyệt:</span> Danh sách này hiển thị các xe được sinh viên đăng ký và đang chờ duyệt. Nhấn "Chấp nhận" để duyệt đơn và tạo mã thẻ gửi xe.
                            </p>
                        </div>

                        {isPendingLoading ? (
                            <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
                        ) : pendingError ? (
                            <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {pendingError}</div>
                        ) : pendingVehicles.length === 0 ? (
                            <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                                Không có đơn đăng ký xe nào chờ duyệt.
                            </div>
                        ) : (
                            <PaginationTable
                                columns={pendingColumns}
                                data={pendingVehicles}
                                currentPage={pendingCurrentPage}
                                totalPages={pendingMeta.totalPages}
                                onPageChange={handlePendingPageChange}
                                totalRecords={pendingMeta.total}
                                recordsPerPage={pendingMeta.limit}
                                showingText={`Hiển thị ${(pendingCurrentPage - 1) * pendingMeta.limit + 1} - ${Math.min(pendingCurrentPage * pendingMeta.limit, pendingMeta.total)} trên ${pendingMeta.total} đơn đăng ký chờ duyệt`}
                                recordsText="đơn"
                                pageText="Trang"
                            />
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div>
            {isStudent ? renderStudentView() : renderAdminView()}
        </div>
    );
};

export default VehicleIndex;