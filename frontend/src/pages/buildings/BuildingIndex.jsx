import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildingService } from '../../services/building.service'; // Import service
import { Button, Table, Input } from '../../components/shared'; // Import component chung
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
// import Modal from '../../components/Modal'; // Optional: Import Modal nếu dùng component modal

const BuildingIndex = () => {
    const [buildings, setBuildings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // State cho tìm kiếm
    // const [showDeleteModal, setShowDeleteModal] = useState(false); // Optional: State cho modal xóa
    // const [buildingToDelete, setBuildingToDelete] = useState(null); // Optional: Lưu ID tòa nhà cần xóa

    const navigate = useNavigate();

    // Hàm fetch dữ liệu
    const fetchBuildings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Thêm param search nếu cần (API phải hỗ trợ)
            const params = {};
            if (searchTerm) params.search = searchTerm; // Giả sử API hỗ trợ ?search=...
            const data = await buildingService.getAllBuildings(params);
            setBuildings(data.dormitories || []); // API trả về { dormitories: [...] }
            // Xử lý pagination nếu API trả về meta
            // setTotalPages(data.meta?.totalPages || 1);
            // setCurrentPage(data.meta?.currentPage || 1);
        } catch (err) {
            setError('Không thể tải danh sách tòa nhà.');
            // Toast lỗi đã được hiển thị bởi interceptor
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]); // Fetch lại khi searchTerm thay đổi

    // Fetch dữ liệu khi component mount hoặc khi fetchBuildings thay đổi (do searchTerm)
    useEffect(() => {
        fetchBuildings();
    }, [fetchBuildings]);

    // Hàm xử lý xóa (có confirm)
    const handleDelete = async (id, name) => {
        // Cách 1: Dùng window.confirm đơn giản
        if (window.confirm(`Bạn có chắc chắn muốn xóa tòa nhà "${name}" không? Hành động này có thể ảnh hưởng đến các phòng và sinh viên liên quan.`)) {
            try {
                await buildingService.deleteBuilding(id);
                toast.success(`Đã xóa tòa nhà "${name}" thành công!`);
                fetchBuildings(); // Tải lại danh sách sau khi xóa
            } catch (err) {
                toast.error(err?.message || `Xóa tòa nhà "${name}" thất bại.`);
            }
        }

        // Cách 2: Dùng Modal component (Nếu có)
        // setBuildingToDelete({ id, name });
        // setShowDeleteModal(true);
    };

    // Optional: Hàm xác nhận xóa từ Modal
    // const confirmDelete = async () => {
    //     if (buildingToDelete) {
    //         try {
    //             await buildingService.deleteBuilding(buildingToDelete.id);
    //             toast.success(`Đã xóa tòa nhà "${buildingToDelete.name}"!`);
    //             fetchBuildings();
    //         } catch (err) {
    //             toast.error(err?.message || `Xóa tòa nhà "${buildingToDelete.name}" thất bại.`);
    //         } finally {
    //             setShowDeleteModal(false);
    //             setBuildingToDelete(null);
    //         }
    //     }
    // };

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

            {/* Optional: Thanh tìm kiếm */}
            <div className="max-w-xs">
                <Input
                    placeholder="Tìm kiếm tòa nhà..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Table columns={columns} data={buildings} />

            {/* Optional: Pagination Controls */}
            {/* <Pagination ... /> */}

            {/* Optional: Delete Confirmation Modal */}
            {/* <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Xác nhận Xóa Tòa nhà"
             >
                 <p>Bạn có chắc chắn muốn xóa tòa nhà "{buildingToDelete?.name}"?</p>
                 <p className="text-sm text-red-600 mt-2">Hành động này không thể hoàn tác và có thể ảnh hưởng dữ liệu liên quan.</p>
             </Modal> */}
        </div>
    );
};

export default BuildingIndex;