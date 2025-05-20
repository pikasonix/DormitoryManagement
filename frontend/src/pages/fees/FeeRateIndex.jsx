import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { feeService } from '../../services/fee.service';
import { Button, Select, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
}

// Format currency
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Fee type options
const feeTypeOptions = [
    { value: '', label: 'Tất cả loại phí' },
    { value: 'ROOM_FEE', label: 'Tiền phòng' },
    { value: 'ELECTRICITY', label: 'Tiền điện' },
    { value: 'WATER', label: 'Tiền nước' },
    { value: 'PARKING', label: 'Phí gửi xe' },
    { value: 'OTHER_FEE', label: 'Phí khác' }
];

// Status options
const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'true', label: 'Đang áp dụng' },
    { value: 'false', label: 'Không áp dụng' }
];

const FeeRateIndex = () => {
    const [feeRates, setFeeRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        feeType: '',
        isActive: '',
        search: ''
    });
    const debouncedSearch = useDebounce(filters.search, 500);
    const navigate = useNavigate();

    // Fetch fee rates
    const fetchFeeRates = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: meta.limit,
                feeType: currentFilters.feeType || undefined,
                isActive: currentFilters.isActive === '' ? undefined : currentFilters.isActive === 'true',
                search: debouncedSearch || undefined
            };
            const data = await feeService.getAllFeeRates(params);
            setFeeRates(data.feeRates || []);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);
        } catch (err) {
            setError('Không thể tải danh sách đơn giá.');
            toast.error('Có lỗi xảy ra khi tải danh sách đơn giá.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, debouncedSearch]);

    // Fetch fee rates when page/filters change
    useEffect(() => {
        fetchFeeRates(currentPage, filters);
    }, [fetchFeeRates, currentPage, filters.feeType, filters.isActive, debouncedSearch]);

    // Handle filter change
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    // Handle delete
    const handleDelete = async (id, name) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa đơn giá "${name}" không?`)) {
            try {
                await feeService.deleteFeeRate(id);
                toast.success(`Đã xóa đơn giá "${name}" thành công!`);
                fetchFeeRates(currentPage, filters);
            } catch (err) {
                toast.error(err?.message || `Xóa đơn giá "${name}" thất bại.`);
            }
        }
    };

    // Handle page change
    const handlePageChange = (page) => {
        if (page > 0 && page <= meta.totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Table columns
    const columns = [
        {
            Header: 'Tên đơn giá',
            accessor: 'name',
            Cell: ({ value }) => <span className='font-medium'>{value}</span>
        },
        {
            Header: 'Loại phí',
            accessor: 'feeType',
            Cell: ({ value }) => {
                const feeType = feeTypeOptions.find(option => option.value === value);
                return feeType ? feeType.label : value;
            }
        },
        {
            Header: 'Đơn giá',
            accessor: 'unitPrice',
            Cell: ({ value, row }) => {
                const unit = row.original.unit ? ` / ${row.original.unit}` : '';
                return `${formatCurrency(value)}${unit}`;
            }
        },
        {
            Header: 'Áp dụng từ',
            accessor: 'effectiveFrom',
            Cell: ({ value }) => formatDate(value)
        },
        {
            Header: 'Trạng thái',
            accessor: 'isActive',
            Cell: ({ value }) => (
                <Badge color={value ? 'green' : 'gray'}>
                    {value ? 'Đang áp dụng' : 'Không áp dụng'}
                </Badge>
            )
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => {
                const fee = row.original;
                return (
                    <div className="flex space-x-2 justify-center">
                        <Button
                            variant="icon"
                            onClick={() => navigate(`/fees/${fee.id}`)}
                            tooltip="Xem chi tiết"
                        >
                            <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                        </Button>
                        <Button
                            variant="icon"
                            onClick={() => navigate(`/fees/${fee.id}/edit`)}
                            tooltip="Chỉnh sửa"
                        >
                            <PencilSquareIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                        </Button>
                        <Button
                            variant="icon"
                            onClick={() => handleDelete(fee.id, fee.name)}
                            tooltip="Xóa"
                        >
                            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý Đơn Giá</h1>
                <Button onClick={() => navigate('/fees/new')} icon={PlusIcon}>Thêm Đơn Giá Mới</Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Select
                    label="Loại phí"
                    id="feeType"
                    name="feeType"
                    value={filters.feeType}
                    onChange={handleFilterChange}
                    options={feeTypeOptions}
                />
                <Select
                    label="Trạng thái"
                    id="isActive"
                    name="isActive"
                    value={filters.isActive}
                    onChange={handleFilterChange}
                    options={statusOptions}
                />
                <Input
                    label="Tìm kiếm"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Tìm kiếm theo tên..."
                />
            </div>

            {/* Data table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">{error}</div>
            ) : feeRates.length === 0 ? (
                <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                    Không tìm thấy đơn giá nào.
                </div>
            ) : (
                <PaginationTable
                    columns={columns}
                    data={feeRates}
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={meta.total}
                    recordsPerPage={meta.limit}
                    showingText={`Hiển thị đơn giá ${(currentPage - 1) * meta.limit + 1} - ${Math.min(currentPage * meta.limit, meta.total)}`}
                    recordsText="đơn giá"
                    pageText="Trang"
                />
            )}
        </div>
    );
};

export default FeeRateIndex;
