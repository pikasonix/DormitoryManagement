import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transferService } from '../../services/transfer.service';
import { Button, Select, Badge, Input } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format ngày giờ
const formatDateTime = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
};

// Trạng thái yêu cầu
const transferStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Đã từ chối' },
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ status: '', studentId: '' });
    const navigate = useNavigate();

    // Fetch transfer requests
    const fetchRequests = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            // Log the filters to help with debugging
            console.log('Fetching with filters:', currentFilters);

            const params = {
                page,
                limit: meta.limit,
                status: currentFilters.status || undefined, // Don't convert, use as is
                studentId: currentFilters.studentId || undefined,
            };

            // Log the actual params being sent to the API
            console.log('API request params:', params);

            const data = await transferService.getAllTransferRequests(params);
            setRequests(data.transfers || []);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);
        } catch (err) {
            console.error('Transfer request fetch error:', err);
            setError('Không thể tải danh sách yêu cầu chuyển phòng.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit]);

    useEffect(() => {
        fetchRequests(currentPage, filters);
    }, [fetchRequests, currentPage, filters]);

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({ status: '', studentId: '' });
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
        const actionText = newStatus === 'APPROVED' ? 'phê duyệt' : 'từ chối';
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

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        {
            Header: 'Mã số sinh viên',
            accessor: 'studentProfile',
            Cell: ({ value }) => value?.studentId || '-'
        },
        {
            Header: 'Phòng hiện tại',
            accessor: 'fromRoom',
            Cell: ({ value }) => value ? `${value.number} (${value.building?.name || ''})` : '-'
        },
        {
            Header: 'Phòng muốn chuyển',
            accessor: 'toRoom',
            Cell: ({ value }) => value ? `${value.number} (${value.building?.name || ''})` : '-'
        },
        {
            Header: 'Lý do',
            accessor: 'reason',
            Cell: ({ value }) => <p className='text-sm text-gray-600 line-clamp-2'>{value || '-'}</p>
        },
        {
            Header: 'Ngày yêu cầu',
            accessor: 'createdAt',
            Cell: ({ value }) => formatDateTime(value)
        },
        {
            Header: 'Trạng thái',
            accessor: 'status',
            Cell: ({ value }) => (
                <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge>
            )
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-1 justify-center items-center">
                    {row.original.status === 'PENDING' && (
                        <>
                            <Button
                                variant="primary"
                                className="text-sm px-3 py-1"
                                onClick={() => handleUpdateStatus(row.original.id, 'APPROVED')}
                            >
                                Chấp nhận
                            </Button>
                            <Button
                                variant="danger"
                                className="text-sm px-3 py-1"
                                onClick={() => handleUpdateStatus(row.original.id, 'REJECTED')}
                            >
                                Từ chối
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ], []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý Yêu cầu Chuyển phòng</h1>
            </div>

            {/* Filter Section */}
            <div className="p-4 bg-gray-50 rounded-md shadow-sm space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Select
                        label="Trạng thái"
                        id="status"
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        options={transferStatusOptions}
                    />
                    <Input
                        label="Mã số sinh viên"
                        id="studentId"
                        name="studentId"
                        value={filters.studentId}
                        onChange={handleFilterChange}
                        placeholder="Nhập mã số sinh viên"
                    />
                </div>
                {/* Removed the Apply and Reset buttons */}
            </div>

            {/* Data Table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : requests.length === 0 ? (
                <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                    Không tìm thấy yêu cầu chuyển phòng nào.
                </div>
            ) : (
                <PaginationTable
                    columns={columns}
                    data={requests}
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={setCurrentPage}
                    totalRecords={meta.total}
                    recordsPerPage={meta.limit}
                />
            )}
        </div>
    );
};

export default TransferIndex;