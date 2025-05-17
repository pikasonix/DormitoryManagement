import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transferService } from '../../services/transfer.service';
import { Button, Select, Badge, Input } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

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
    const [currentPage, setCurrentPage] = useState(1); const [filters, setFilters] = useState({ status: '', studentId: '' });
    const navigate = useNavigate();
    // Sử dụng AuthContext để lấy thông tin user
    const { user } = useAuth();
    const isStudent = user?.role === 'STUDENT'; // Fix: role is uppercase STUDENT, not lowercase student    // Thiết lập giá trị studentId dựa trên vai trò khi component được mount
    useEffect(() => {
        if (user && isStudent) {
            // Đối với sinh viên, luôn sử dụng ID của chính họ
            setFilters(prev => ({
                ...prev,
                studentId: user.studentId || user.profile?.studentId || ''
            }));
        }
    }, [user, isStudent]);

    // Fetch transfer requests
    const fetchRequests = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: meta.limit,
                status: currentFilters.status || undefined,
                // Nếu là student, chỉ lấy request của user đó
                studentId: isStudent && user?.studentId ? user.studentId : currentFilters.studentId || undefined,
            };

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
    }, [meta.limit, isStudent, user]);

    useEffect(() => {
        fetchRequests(currentPage, filters);
    }, [fetchRequests, currentPage, filters]);    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        // Nếu là sinh viên và đang cố thay đổi studentId, không cho phép
        if (isStudent && name === 'studentId') {
            return;
        }

        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    // Reset filters
    const resetFilters = () => {
        // Chỉ reset studentId filter nếu người dùng không phải là sinh viên
        setFilters({
            status: '',
            studentId: isStudent ? (user?.studentId || '') : ''
        });
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
        const confirmMessage = newStatus === 'APPROVED'
            ? `Bạn có chắc muốn phê duyệt yêu cầu chuyển phòng này? Sinh viên sẽ được phép chuyển phòng sau khi phê duyệt.`
            : `Bạn có chắc muốn từ chối yêu cầu chuyển phòng này? Yêu cầu sẽ không thể hoàn tác sau khi từ chối.`;

        if (window.confirm(confirmMessage)) {
            try {
                const loadingId = toast.loading(`Đang ${actionText} yêu cầu...`);

                if (newStatus === 'APPROVED') {
                    await transferService.approveTransferRequest(id);
                } else if (newStatus === 'REJECTED') {
                    await transferService.rejectTransferRequest(id);
                }

                toast.dismiss(loadingId);
                toast.success(`Đã ${actionText} yêu cầu thành công!`);
                fetchRequests(currentPage, filters); // Refresh list
            } catch (err) {
                toast.error(err?.message || `Thao tác thất bại.`);
            }
        }
    };

    // --- Cấu hình bảng ---
    const columns = useMemo(() => {
        const baseColumns = [
            // Chỉ hiển thị cột MSSV khi là admin
            !isStudent && {
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
                    <div className="flex space-x-2 justify-center items-center">
                        {/* Student Actions - chỉ có thể xóa/hủy yêu cầu của mình */}
                        {isStudent && row.original.status === 'PENDING' && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(row.original.id)}
                                tooltip="Hủy yêu cầu"
                            >
                                Hủy yêu cầu
                            </Button>
                        )}
                        {isStudent && row.original.status === 'REJECTED' && (
                            <Button
                                variant="icon"
                                onClick={() => handleDelete(row.original.id)}
                                tooltip="Xóa"
                            >
                                <TrashIcon className="h-5 w-5 text-gray-600 hover:text-gray-800" />
                            </Button>
                        )}

                        {/* Admin Actions */}
                        {!isStudent && row.original.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(row.original.id, 'APPROVED')}
                                >
                                    Chấp nhận
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(row.original.id, 'REJECTED')}
                                >
                                    Từ chối
                                </Button>
                            </>
                        )}
                        {!isStudent && row.original.status === 'REJECTED' && (
                            <Button
                                variant="icon"
                                onClick={() => handleDelete(row.original.id)}
                                tooltip="Xóa"
                            >
                                <TrashIcon className="h-5 w-5 text-gray-600 hover:text-gray-800" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ];
        // Lọc bỏ các cột null
        return baseColumns.filter(Boolean);
    }, [isStudent]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">
                    {isStudent ? 'Yêu cầu chuyển phòng của bạn' : 'Quản lý Yêu cầu Chuyển phòng'}
                </h1>                {isStudent && (
                    <Button
                        variant="primary"
                        onClick={() => navigate('/transfers/request')}
                    >
                        Tạo yêu cầu mới
                    </Button>
                )}
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
                    />            {/* Chỉ hiển thị filter MSSV khi KHÔNG phải là student */}
                    {!isStudent && (
                        <Input
                            label="Mã số sinh viên"
                            id="studentId"
                            name="studentId"
                            value={filters.studentId}
                            onChange={handleFilterChange}
                            placeholder="Nhập mã số sinh viên"
                        />
                    )}
                </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : requests.length === 0 ? (
                <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                    {isStudent ? 'Bạn chưa có yêu cầu chuyển phòng nào.' : 'Không tìm thấy yêu cầu chuyển phòng nào.'}
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