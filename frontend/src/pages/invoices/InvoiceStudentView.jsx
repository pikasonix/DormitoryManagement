import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Select, Badge, Card } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';
import VNPayButton from '../../components/payment/VNPayButton';

// Format ngày
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
}

// Format tiền tệ
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Options trạng thái hóa đơn
const invoiceStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'UNPAID', label: 'Chờ thanh toán' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
    { value: 'OVERDUE', label: 'Quá hạn' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

// Options loại hóa đơn
const invoiceTypeOptions = [
    { value: '', label: 'Tất cả loại hóa đơn' },
    { value: 'personal', label: 'Hóa đơn cá nhân' },
    { value: 'room', label: 'Hóa đơn phòng' },
];

// Màu badge theo status
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return 'green';
        case 'partially_paid': return 'blue';
        case 'unpaid': return 'yellow';
        case 'overdue': return 'red';
        case 'cancelled': return 'gray';
        default: return 'gray';
    }
}

const InvoiceStudentView = () => {
    const { user } = useAuth(); // Lấy thông tin người dùng đã đăng nhập
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        invoiceType: '',
    });

    // Fetch danh sách hóa đơn
    const fetchInvoices = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            // Ghi log để debug thông tin người dùng
            console.log('User info:', user);
            console.log('Profile ID:', user?.profileId);

            const params = {
                page: page,
                limit: meta.limit,
                status: currentFilters.status || undefined,
                studentProfileId: user?.profileId, // Lấy hóa đơn của sinh viên hiện tại
            };

            // Lọc theo loại hóa đơn
            if (currentFilters.invoiceType === 'personal') {
                params.invoiceType = 'personal';
            } else if (currentFilters.invoiceType === 'room') {
                params.invoiceType = 'room';
            }

            console.log('API params:', params); const data = await invoiceService.getAllInvoices(params);
            console.log('API response:', data);

            // Debug - Kiểm tra cấu trúc dữ liệu từng hóa đơn chi tiết
            if (data.invoices && data.invoices.length > 0) {
                console.log('First invoice structure:', JSON.stringify(data.invoices[0], null, 2));

                // Kiểm tra các trường chính cần cho việc xác định loại hóa đơn
                data.invoices.forEach((invoice, index) => {
                    if (index < 3) { // Chỉ log 3 hóa đơn đầu tiên tránh quá nhiều dữ liệu
                        console.log(`Invoice #${invoice.id} - studentProfileId:`, invoice.studentProfileId,
                            'roomId:', invoice.roomId,
                            'Type:', invoice.studentProfileId ? 'Cá nhân' : (invoice.roomId ? 'Phòng' : 'Không xác định'));
                    }
                });
            }

            const invoiceList = data.invoices || [];
            setInvoices(invoiceList);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);
        } catch (err) {
            setError('Không thể tải danh sách hóa đơn.');
            console.error('Lỗi khi tải hóa đơn:', err);
            console.error('Error details:', err.response?.data || err.message);
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, user?.profileId]);

    // Fetch invoices khi trang/filter thay đổi
    useEffect(() => {
        if (user?.profileId) {
            console.log('Fetching invoices with profileId:', user.profileId);
            fetchInvoices(currentPage, filters);
        } else {
            console.log('No profileId available, cannot fetch invoices');
            setError('Không thể tải hóa đơn: Thông tin người dùng chưa đầy đủ');
        }
    }, [fetchInvoices, currentPage, filters, user?.profileId]);

    // Xử lý thay đổi bộ lọc
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset về trang 1 khi đổi filter
    };

    // Xử lý chuyển trang
    const handlePageChange = (page) => {
        if (page > 0 && page <= meta.totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Xử lý xóa/hủy hóa đơn
    const handleDelete = (invoiceId, invoiceNumber) => {
        console.log(`Deleting invoice #${invoiceId} (${invoiceNumber})`);
        // Logic xóa/hủy hóa đơn
    };

    // Cột cho bảng hóa đơn cá nhân
    const columns = [
        { Header: 'Số hóa đơn', accessor: 'id', Cell: ({ value }) => <span className="font-mono">{value || 'N/A'}</span> },
        {
            Header: 'Loại hóa đơn',
            accessor: row => {
                // Debug dữ liệu gốc
                console.log(`Invoice #${row.id} data:`, {
                    studentProfileId: row.studentProfileId,
                    roomId: row.roomId,
                    hasStudentProfile: row.studentProfileId !== undefined && row.studentProfileId !== null,
                    hasRoom: row.roomId !== undefined && row.roomId !== null,
                });

                // Xác định loại hóa đơn
                if (row.studentProfileId !== undefined && row.studentProfileId !== null) {
                    return 'Cá nhân';
                }
                if (row.roomId !== undefined && row.roomId !== null) {
                    return 'Phòng';
                }
                return 'Khác';
            },
            id: 'invoiceType', Cell: ({ value, row }) => {
                const invoice = row.original;

                // Xác định lại loại trực tiếp từ dữ liệu invoice
                let type;
                let badgeColor;

                if (invoice.studentProfileId !== undefined && invoice.studentProfileId !== null) {
                    type = 'Cá nhân';
                    badgeColor = 'blue';
                } else if (invoice.roomId !== undefined && invoice.roomId !== null) {
                    type = 'Phòng';
                    badgeColor = 'green';
                    // Thêm thông tin phòng nếu có
                    if (invoice.room && invoice.room.number) {
                        type = `Phòng ${invoice.room.number}`;
                    } else if (invoice.roomId) {
                        type = `Phòng #${invoice.roomId}`;
                    }
                } else {
                    type = 'Không xác định';
                    badgeColor = 'gray';
                }

                console.log(`Invoice #${invoice.id} type:`, type, badgeColor);

                // Đảm bảo hiển thị badge với nội dung đúng
                return <Badge color={badgeColor}>{type}</Badge>;
            }
        },
        { Header: 'Tổng tiền', accessor: 'totalAmount', Cell: ({ value }) => formatCurrency(value) },
        { Header: 'Hạn thanh toán', accessor: 'dueDate', Cell: ({ value }) => formatDate(value) },
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
            Cell: ({ row }) => {
                const invoice = row.original;
                const canPay = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status?.toUpperCase());

                return (
                    <div className="flex space-x-2 justify-center">
                        <Button
                            variant="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            tooltip="Xem chi tiết"
                        >
                            <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                        </Button>
                        {canPay && (
                            <VNPayButton
                                invoiceId={invoice.id}
                                size="sm"
                                tooltip="Thanh toán VNPay"
                            />
                        )}
                        <Button
                            variant="icon"
                            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                            tooltip="Xóa/Hủy hóa đơn"
                        >
                            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                        </Button>
                    </div>
                );
            },
        }
    ];

    // Render bảng dữ liệu
    const renderInvoiceTable = () => {
        if (isLoading) return <LoadingSpinner text="Đang tải dữ liệu..." />;
        if (error) return <div className="alert alert-danger">{error}</div>;
        if (invoices.length === 0) {
            return (
                <Card className="text-center py-8">
                    <p className="text-gray-500">Không có hóa đơn nào.</p>
                </Card>
            );
        }

        return (
            <PaginationTable
                columns={columns}
                data={invoices}
                currentPage={currentPage}
                totalPages={meta.totalPages}
                onPageChange={handlePageChange}
                totalItems={meta.total}
            />
        );
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Hóa đơn của tôi</h1>
                <p className="text-gray-600 mt-1">
                    Quản lý hóa đơn cá nhân và phòng của bạn
                </p>
            </div>
            {/* Bộ lọc */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trạng thái
                        </label>
                        <Select
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                            options={invoiceStatusOptions}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Loại hóa đơn
                        </label>
                        <Select
                            name="invoiceType"
                            value={filters.invoiceType}
                            onChange={handleFilterChange}
                            options={invoiceTypeOptions}
                        />
                    </div>
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {renderInvoiceTable()}
            </div>
        </div>
    );
};

export default InvoiceStudentView;
