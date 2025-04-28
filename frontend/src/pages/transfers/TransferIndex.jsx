import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transferService } from '../../services/transfer.service';
import { studentService } from '../../services/student.service'; // Để lấy tên SV
import { roomService } from '../../services/room.service'; // Để lấy tên phòng
import { Button, Table, Select, Pagination, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format ngày giờ
const formatDateTime = (dateString) => { /* ... */ }

// Trạng thái yêu cầu
const transferStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Đã từ chối' },
    // Thêm các trạng thái khác nếu có (vd: completed sau khi SV chuyển thực tế)
];

// Màu badge
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending': return 'yellow';
        case 'approved': return 'green';
        case 'rejected': return 'red';
        default: return 'gray';
    }
};

const TransferIndex = () => {
    const [requests, setRequests] = useState([]);
    const [students, setStudents] = useState({}); // Dùng object để cache theo ID
    const [rooms, setRooms] = useState({}); // Dùng object để cache theo ID
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ status: '' });
    const navigate = useNavigate();

    // --- Fetch Data ---
    const fetchRequests = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: page,
                limit: meta.limit,
                status: currentFilters.status || undefined,
            };
            const data = await transferService.getAllTransferRequests(params);
            const transferList = data.transfers || [];
            setRequests(transferList);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);

            // Lấy thông tin SV và Phòng liên quan (chỉ cho các ID chưa có trong cache)
            const studentIdsToFetch = [...new Set(transferList.map(req => req.studentId).filter(id => id && !students[id]))];
            const roomIdsToFetch = [...new Set(transferList.flatMap(req => [req.currentRoomId, req.targetRoomId]).filter(id => id && !rooms[id]))];

            if (studentIdsToFetch.length > 0) {
                // Fetch student data (cần API hỗ trợ lấy nhiều ID hoặc gọi nhiều lần)
                // Giả sử gọi nhiều lần (cần tối ưu nếu quá nhiều)
                const studentPromises = studentIdsToFetch.map(id => studentService.getStudentById(id).catch(() => null)); // Bắt lỗi từng cái
                const studentResults = await Promise.all(studentPromises);
                setStudents(prev => {
                    const newStudents = { ...prev };
                    studentResults.forEach(s => { if (s) newStudents[s.id] = s; });
                    return newStudents;
                });
            }

            if (roomIdsToFetch.length > 0) {
                // Fetch room data
                const roomPromises = roomIdsToFetch.map(id => roomService.getRoomById(id).catch(() => null));
                const roomResults = await Promise.all(roomPromises);
                setRooms(prev => {
                    const newRooms = { ...prev };
                    roomResults.forEach(r => { if (r) newRooms[r.id] = r; });
                    return newRooms;
                });
            }

        } catch (err) {
            setError('Không thể tải danh sách yêu cầu chuyển phòng.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, students, rooms]); // Thêm students, rooms dependencies để fetch lại nếu cần

    useEffect(() => {
        fetchRequests(currentPage, filters);
    }, [fetchRequests, currentPage, filters]);

    // Handler filter
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    };

    // Handler xóa
    const handleDelete = async (id) => {
        if (window.confirm(`Bạn có chắc muốn xóa/hủy yêu cầu chuyển phòng này không?`)) {
            try {
                await transferService.deleteTransferRequest(id);
                toast.success(`Đã xóa yêu cầu chuyển phòng thành công!`);
                fetchRequests(currentPage, filters);
            } catch (err) {
                toast.error(err?.message || `Xóa yêu cầu thất bại.`);
            }
        }
    };

    // Handler cập nhật trạng thái nhanh (Approve/Reject)
    const handleUpdateStatus = async (id, newStatus) => {
        const actionText = newStatus === 'approved' ? 'phê duyệt' : 'từ chối';
        if (window.confirm(`Bạn có chắc muốn ${actionText} yêu cầu chuyển phòng này?`)) {
            try {
                await transferService.updateTransferRequest(id, { status: newStatus });
                toast.success(`Đã ${actionText} yêu cầu!`);
                fetchRequests(currentPage, filters); // Refresh list
            } catch (err) {
                toast.error(err?.message || `Thao tác thất bại.`);
            }
        }
    };

    // Handler chuyển trang
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        { Header: 'Sinh viên', accessor: 'studentId', Cell: ({ value }) => students[value]?.fullName || `ID: ${value}` },
        { Header: 'Phòng hiện tại', accessor: 'currentRoomId', Cell: ({ value }) => rooms[value] ? `${rooms[value].number} (${rooms[value].building?.name})` : `ID: ${value}` },
        { Header: 'Phòng muốn chuyển', accessor: 'targetRoomId', Cell: ({ value }) => rooms[value] ? `${rooms[value].number} (${rooms[value].building?.name})` : `ID: ${value}` },
        { Header: 'Lý do', accessor: 'reason', Cell: ({ value }) => <p className='text-sm text-gray-600 line-clamp-2'>{value || '-'}</p> },
        { Header: 'Ngày yêu cầu', accessor: 'createdAt', Cell: ({ value }) => formatDateTime(value) },
        {
            Header: 'Trạng thái', accessor: 'status', Cell: ({ value }) => (
                <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge>
            )
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-1 justify-center items-center">
                    {/* <Button variant="icon" onClick={() => navigate(`/transfers/${row.original.id}`)} tooltip="Xem chi tiết"> <EyeIcon className="h-5 w-5" /> </Button> */}
                    {row.original.status === 'pending' && ( // Chỉ hiện nút duyệt/từ chối khi đang chờ
                        <>
                            <Button variant="icon" onClick={() => handleUpdateStatus(row.original.id, 'approved')} tooltip="Phê duyệt">
                                <CheckCircleIcon className="h-5 w-5 text-green-600 hover:text-green-800" />
                            </Button>
                            <Button variant="icon" onClick={() => handleUpdateStatus(row.original.id, 'rejected')} tooltip="Từ chối">
                                <XCircleIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                            </Button>
                        </>
                    )}
                    <Button variant="icon" onClick={() => handleDelete(row.original.id)} tooltip="Xóa/Hủy">
                        <TrashIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </Button>
                </div>
            ),
        },
    ], [navigate, students, rooms, currentPage, filters]);

    // Options cho filter (có thể thêm filter theo SV nếu cần)
    // const studentOptions = [...]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý Yêu cầu Chuyển phòng</h1>
                {/* Sinh viên sẽ tạo yêu cầu ở trang khác */}
            </div>

            {/* Bộ lọc */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Select label="Trạng thái" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={transferStatusOptions} />
                {/* Thêm filter theo Sinh viên nếu cần */}
            </div>

            {/* Bảng dữ liệu */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : (
                <>
                    <Table columns={columns} data={requests} />
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

export default TransferIndex;