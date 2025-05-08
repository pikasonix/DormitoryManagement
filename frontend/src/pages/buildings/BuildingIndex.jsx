import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildingService } from '../../services/building.service'; // Import service
import { Button, Table, Input } from '../../components/shared'; // Import component chung
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
// import Modal từ '../../components/Modal'; // Optional: Import Modal nếu dùng component modal

const BuildingIndex = () => {
    const [allBuildings, setAllBuildings] = useState([]); // Lưu tất cả dữ liệu từ API
    const [buildings, setBuildings] = useState([]); // Dữ liệu hiển thị sau khi lọc
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // State cho tìm kiếm

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
        if (searchTerm.trim() === '') {
            setBuildings(allBuildings); // Hiển thị tất cả nếu không có từ khóa tìm kiếm
            return;
        }

        // Tìm kiếm theo text
        const lowercasedSearch = searchTerm.toLowerCase();
        const filteredBuildings = allBuildings.filter(building =>
            building.name?.toLowerCase().includes(lowercasedSearch) ||
            building.address?.toLowerCase().includes(lowercasedSearch) ||
            building.description?.toLowerCase().includes(lowercasedSearch)
        );

        setBuildings(filteredBuildings);
    }, [searchTerm, allBuildings]);

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

            {/* Thanh tìm kiếm */}
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
                </div>
            </div>

            <Table columns={columns} data={buildings} />
        </div>
    );
};

export default BuildingIndex;