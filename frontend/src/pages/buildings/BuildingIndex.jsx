import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { buildingService } from '../../services/building.service'; // Import service
import BuildingCard from '../../components/buildings/BuildingCard'; // Import component card
import Pagination from '../../components/shared/Pagination'; // Import component phân trang (nếu có)
import SearchInput from '../../components/shared/SearchInput'; // Import component tìm kiếm (nếu có)
import LoadingSpinner from '../../components/LoadingSpinner'; // Import spinner
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const BuildingsIndex = () => {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 9, // Số lượng item mỗi trang (vd: 3x3 grid)
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Hàm fetch dữ liệu tòa nhà
    const fetchBuildings = useCallback(async (page = 1, limit = 9, search = '') => {
        setLoading(true);
        setError(null);
        try {
            const params = { page, limit, search, sortBy: 'name', sortOrder: 'asc' }; // Thêm sắp xếp nếu muốn
            const response = await buildingService.getAllBuildings(params);
            setBuildings(response.data || []); // API trả về data trong key data
            setPagination({
                currentPage: page,
                totalPages: Math.ceil(response.total / limit),
                totalItems: response.total,
                limit: limit,
            });
        } catch (err) {
            setError('Không thể tải danh sách tòa nhà.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch dữ liệu lần đầu và khi phân trang/tìm kiếm thay đổi
    useEffect(() => {
        // Dùng debounce để tránh gọi API liên tục khi gõ tìm kiếm
        const debounceFetch = setTimeout(() => {
            fetchBuildings(pagination.currentPage, pagination.limit, searchTerm);
        }, 500); // Delay 500ms

        return () => clearTimeout(debounceFetch); // Cleanup timeout khi component unmount hoặc dependency thay đổi
    }, [pagination.currentPage, pagination.limit, searchTerm, fetchBuildings]);

    // Hàm xử lý thay đổi trang
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
            // useEffect sẽ tự động gọi fetchBuildings
        }
    };

    // Hàm xử lý thay đổi tìm kiếm
    const handleSearchChange = (searchValue) => {
        setSearchTerm(searchValue);
        setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset về trang 1 khi tìm kiếm
        // useEffect sẽ tự động gọi fetchBuildings
    };

    // Hàm xử lý xóa tòa nhà
    const handleDeleteBuilding = async (id, name) => {
        // Hiển thị xác nhận trước khi xóa
        if (window.confirm(`Bạn có chắc chắn muốn xóa tòa nhà "${name}" không? Hành động này không thể hoàn tác và có thể thất bại nếu tòa nhà còn phòng.`)) {
            try {
                await buildingService.deleteBuilding(id);
                // Tải lại danh sách sau khi xóa thành công
                fetchBuildings(pagination.currentPage, pagination.limit, searchTerm);
                // toast.success đã có trong service
            } catch (err) {
                // Lỗi đã được service log và toast, có thể không cần làm gì thêm ở đây
                console.error("Lỗi khi xóa tòa nhà từ Index:", err);
                // toast.error(...) // Không cần nếu service đã toast
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header của trang */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Tòa nhà</h1>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Component Tìm kiếm */}
                    <SearchInput
                        placeholder="Tìm theo tên, địa chỉ..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow md:flex-grow-0 md:w-64" // Tùy chỉnh độ rộng
                    />
                    {/* Nút Thêm mới */}
                    <Link
                        to="/buildings/new" // Đường dẫn đến form tạo mới
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
                    >
                        <PlusIcon className="h-5 w-5 mr-1" />
                        Thêm Tòa nhà
                    </Link>
                </div>
            </div>

            {/* Hiển thị trạng thái Loading hoặc Lỗi */}
            {loading && <div className="text-center py-10"><LoadingSpinner /></div>}
            {!loading && error && <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded">{error}</div>}

            {/* Hiển thị danh sách tòa nhà */}
            {!loading && !error && buildings.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buildings.map((building) => (
                        <BuildingCard
                            key={building.id}
                            building={building}
                            onDelete={handleDeleteBuilding}
                        // onEdit={() => navigate(`/buildings/${building.id}/edit`)} // Có thể dùng navigate hoặc Link trực tiếp
                        />
                    ))}
                </div>
            )}

            {/* Thông báo khi không có dữ liệu */}
            {!loading && !error && buildings.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Không tìm thấy tòa nhà nào</h3>
                    <p className="mt-1 text-sm text-gray-500">Hãy thử điều chỉnh bộ lọc hoặc thêm tòa nhà mới.</p>
                    <div className="mt-6">
                        <Link
                            to="/buildings/new"
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                            Thêm Tòa nhà
                        </Link>
                    </div>
                </div>
            )}

            {/* Phân trang */}
            {!loading && !error && buildings.length > 0 && pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
};

export default BuildingsIndex;