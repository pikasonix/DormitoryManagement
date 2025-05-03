import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildingService } from '../../services/building.service'; // Import service
import { Button, Table, Input } from '../../components/shared'; // Import component chung
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
// import Modal from '../../components/Modal'; // Optional: Import Modal nếu dùng component modal

const BuildingIndex = () => {
    const [allBuildings, setAllBuildings] = useState([]); // Lưu tất cả dữ liệu từ API
    const [buildings, setBuildings] = useState([]); // Dữ liệu hiển thị sau khi lọc
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // State cho tìm kiếm
    // State cho bộ lọc nâng cao
    const [filters, setFilters] = useState({
        minRooms: '',
        maxRooms: '',
        hasAvailableRooms: '',
        status: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useNavigate();

    // Hàm fetch dữ liệu - chỉ gọi API một lần khi component mount
    const fetchBuildings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await buildingService.getAllBuildings({});
            const buildingsData = data.buildings || [];
            setAllBuildings(buildingsData); // Lưu tất cả dữ liệu
            setBuildings(buildingsData); // Hiển thị tất cả dữ liệu ban đầu
        } catch (err) {
            setError('Không thể tải danh sách tòa nhà.');
            // Toast lỗi đã được hiển thị bởi interceptor
        } finally {
            setIsLoading(false);
        }
    }, []); // Không phụ thuộc vào searchTerm nữa

    // Fetch dữ liệu khi component mount
    useEffect(() => {
        fetchBuildings();
    }, [fetchBuildings]);

    // Hàm tìm kiếm local - thực hiện trên dữ liệu đã lưu
    useEffect(() => {
        let filteredBuildings = [...allBuildings];

        // Tìm kiếm theo text
        if (searchTerm.trim()) {
            const lowercasedSearch = searchTerm.toLowerCase();
            filteredBuildings = filteredBuildings.filter(building =>
                building.name?.toLowerCase().includes(lowercasedSearch) ||
                building.address?.toLowerCase().includes(lowercasedSearch) ||
                building.description?.toLowerCase().includes(lowercasedSearch)
            );
        }

        // Lọc theo số phòng (min)
        if (filters.minRooms && !isNaN(parseInt(filters.minRooms))) {
            filteredBuildings = filteredBuildings.filter(building =>
                (building.totalRooms || 0) >= parseInt(filters.minRooms)
            );
        }

        // Lọc theo số phòng (max)
        if (filters.maxRooms && !isNaN(parseInt(filters.maxRooms))) {
            filteredBuildings = filteredBuildings.filter(building =>
                (building.totalRooms || 0) <= parseInt(filters.maxRooms)
            );
        }

        // Lọc theo trạng thái
        if (filters.status) {
            // Assuming we have rooms data with status in the building object
            if (filters.status === 'HAS_ROOMS') {
                filteredBuildings = filteredBuildings.filter(building =>
                    (building.totalRooms || 0) > 0
                );
            } else if (filters.status === 'NO_ROOMS') {
                filteredBuildings = filteredBuildings.filter(building =>
                    (building.totalRooms || 0) === 0
                );
            }
        }

        // Lọc theo phòng trống
        if (filters.hasAvailableRooms === 'true') {
            filteredBuildings = filteredBuildings.filter(building =>
                building.rooms?.some(room => room.status === 'AVAILABLE') || false
            );
        } else if (filters.hasAvailableRooms === 'false') {
            filteredBuildings = filteredBuildings.filter(building =>
                !building.rooms?.some(room => room.status === 'AVAILABLE')
            );
        }

        setBuildings(filteredBuildings);
    }, [searchTerm, allBuildings, filters]);

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Reset all filters
    const resetFilters = () => {
        setFilters({
            minRooms: '',
            maxRooms: '',
            hasAvailableRooms: '',
            status: ''
        });
        setSearchTerm('');
    };

    // Hàm xử lý xóa (có confirm)
    const handleDelete = async (id, name) => {
        // Cách 1: Dùng window.confirm đơn giản
        if (window.confirm(`Bạn có chắc chắn muốn xóa tòa nhà "${name}" không? Hành động này có thể ảnh hưởng đến các phòng và sinh viên liên quan.`)) {
            try {
                await buildingService.deleteBuilding(id);
                toast.success(`Đã xóa tòa nhà "${name}" thành công!`);
                fetchBuildings(); // Tải lại tất cả dữ liệu sau khi xóa
            } catch (err) {
                toast.error(err?.message || `Xóa tòa nhà "${name}" thất bại.`);
            }
        }
    };

    // --- Cấu hình bảng ---
    const columns = React.useMemo(() => [
        { Header: 'Tên Tòa nhà', accessor: 'name' },
        { Header: 'Địa chỉ', accessor: 'address' },
        {
            Header: 'Tổng số phòng',
            accessor: 'totalRooms',
            Cell: ({ value }) => <span className="text-center block">{value ?? 0}</span> // Hiển thị 0 nếu null/undefined
        },
        {
            Header: 'Mô tả',
            accessor: 'description',
            Cell: ({ value }) => <p className="text-sm text-gray-600 truncate max-w-xs">{value || '-'}</p> // Rút gọn mô tả
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-2 justify-center">
                    <Button
                        variant="icon"
                        onClick={() => navigate(`/buildings/${row.original.id}/edit`)}
                        tooltip="Chỉnh sửa"
                    >
                        <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
                    </Button>
                    <Button
                        variant="icon"
                        onClick={() => handleDelete(row.original.id, row.original.name)}
                        tooltip="Xóa"
                    >
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                </div>
            ),
        },
    ], [navigate]); // Thêm navigate vào dependencies nếu dùng trong Cell

    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    if (error) return <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Quản lý Tòa nhà</h1>
                <Button onClick={() => navigate('/buildings/new')} icon={PlusIcon}>
                    Thêm Tòa nhà mới
                </Button>
            </div>

            {/* Thanh tìm kiếm và bộ lọc */}
            <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Input
                            placeholder="Tìm kiếm tòa nhà..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <p className="text-sm text-gray-500 mt-1">
                                Hiển thị {buildings.length} kết quả {buildings.length !== allBuildings.length && `(trong tổng số ${allBuildings.length})`}
                            </p>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="ml-2"
                    >
                        {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                    </Button>
                </div>

                {/* Bộ lọc nâng cao */}
                {showFilters && (
                    <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-medium">Bộ lọc tìm kiếm</h3>
                            <Button
                                variant="text"
                                onClick={resetFilters}
                                className="text-sm text-gray-500 hover:text-indigo-600"
                            >
                                Đặt lại
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Lọc theo số phòng */}
                            <div className="flex space-x-2">
                                <div className="w-1/2">
                                    <label htmlFor="minRooms" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phòng từ
                                    </label>
                                    <input
                                        type="number"
                                        id="minRooms"
                                        name="minRooms"
                                        min="0"
                                        value={filters.minRooms}
                                        onChange={handleFilterChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Min"
                                    />
                                </div>
                                <div className="w-1/2">
                                    <label htmlFor="maxRooms" className="block text-sm font-medium text-gray-700 mb-1">
                                        Đến
                                    </label>
                                    <input
                                        type="number"
                                        id="maxRooms"
                                        name="maxRooms"
                                        min="0"
                                        value={filters.maxRooms}
                                        onChange={handleFilterChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>

                            {/* Lọc theo trạng thái */}
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                    Trạng thái
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                    <option value="">Tất cả</option>
                                    <option value="HAS_ROOMS">Có phòng</option>
                                    <option value="NO_ROOMS">Chưa có phòng</option>
                                </select>
                            </div>

                            {/* Lọc theo phòng trống */}
                            <div>
                                <label htmlFor="hasAvailableRooms" className="block text-sm font-medium text-gray-700 mb-1">
                                    Tình trạng phòng
                                </label>
                                <select
                                    id="hasAvailableRooms"
                                    name="hasAvailableRooms"
                                    value={filters.hasAvailableRooms}
                                    onChange={handleFilterChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                    <option value="">Tất cả</option>
                                    <option value="true">Còn phòng trống</option>
                                    <option value="false">Hết phòng trống</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Table columns={columns} data={buildings} />
        </div>
    );
};

export default BuildingIndex;