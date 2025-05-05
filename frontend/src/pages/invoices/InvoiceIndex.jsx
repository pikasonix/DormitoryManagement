import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service'; // Lấy ds sinh viên để lọc
import { Button, Select, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';

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
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'overdue', label: 'Quá hạn' }, // Thêm nếu backend hỗ trợ
    { value: 'cancelled', label: 'Đã hủy' }, // Thêm nếu backend hỗ trợ
];

// Màu badge theo status
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return 'green';
        case 'pending': return 'yellow';
        case 'overdue': return 'red';
        case 'cancelled': return 'gray';
        default: return 'gray';
    }
}

const InvoiceIndex = () => {
    const [invoices, setInvoices] = useState([]);
    const [students, setStudents] = useState([]); // DS sinh viên cho filter
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        studentId: '',
        status: '',
        // Thêm search theo số hóa đơn?
        // search: '',
    });
    // const debouncedSearch = useDebounce(filters.search, 500); // Nếu có search
    const navigate = useNavigate();

    // Fetch danh sách hóa đơn
    const fetchInvoices = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: page,
                limit: meta.limit,
                studentId: currentFilters.studentId || undefined,
                status: currentFilters.status || undefined,
                // search: debouncedSearch || undefined,
            };
            const data = await invoiceService.getAllInvoices(params);
            setInvoices(data.invoices || []);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);
        } catch (err) {
            setError('Không thể tải danh sách hóa đơn.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit]); // Không cần filters ở dependency vì fetchInvoices nhận filters làm tham số

    // Fetch danh sách sinh viên cho bộ lọc
    const fetchStudents = useCallback(async () => {
        try {
            // Lấy nhiều sinh viên, chỉ cần id và tên
            const data = await studentService.getAllStudents({ limit: 1000, fields: 'id,fullName' });
            setStudents(data.students || []);
        } catch (err) {
            console.error("Lỗi tải danh sách sinh viên:", err);
        }
    }, []);

    // Fetch invoices khi trang/filter thay đổi
    useEffect(() => {
        fetchInvoices(currentPage, filters);
    }, [fetchInvoices, currentPage, filters]); // Thêm filters vào đây

    // Fetch students chỉ 1 lần
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);


    // Xử lý thay đổi bộ lọc
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset về trang 1 khi đổi filter
    };

    // Hàm xử lý xóa (ít khi dùng cho hóa đơn, có thể chỉ hủy?)
    const handleDelete = async (id, invoiceNumber) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa hóa đơn "${invoiceNumber}" không?`)) {
            try {
                await invoiceService.deleteInvoice(id);
                toast.success(`Đã xóa hóa đơn "${invoiceNumber}" thành công!`);
                fetchInvoices(currentPage, filters);
            } catch (err) {
                toast.error(err?.message || `Xóa hóa đơn "${invoiceNumber}" thất bại.`);
            }
        }
    };

    // Xử lý chuyển trang
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        { Header: 'Số HĐ', accessor: 'invoiceNumber', Cell: ({ value }) => <span className='font-mono'>{value}</span> },
        {
            Header: 'Sinh viên',
            accessor: 'studentProfile',
            Cell: ({ value, row }) => {
                // Nếu có thông tin studentProfile
                if (value && typeof value === 'object') {
                    return value.fullName || `ID: ${value.id}`;
                }

                // Fallback trường hợp chỉ có studentProfileId
                const studentProfileId = row.original.studentProfileId;
                if (studentProfileId) {
                    const student = students.find(s => s.id === studentProfileId);
                    return student ? student.fullName : `ID: ${studentProfileId}`;
                }

                return 'N/A';
            }
        },
        { Header: 'Tổng tiền', accessor: 'totalAmount', Cell: ({ value }) => formatCurrency(value) },
        { Header: 'Ngày hết hạn', accessor: 'dueDate', Cell: ({ value }) => formatDate(value) },
        {
            Header: 'Trạng thái', accessor: 'status', Cell: ({ value }) => (
                <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge>
            )
        },
        {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => (
                <div className="flex space-x-2 justify-center">
                    <Button
                        variant="icon"
                        onClick={() => navigate(`/invoices/${row.original.id}`)} // Link đến trang chi tiết
                        tooltip="Xem chi tiết"
                    >
                        <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </Button>
                    <Button
                        variant="icon"
                        onClick={() => handleDelete(row.original.id, row.original.invoiceNumber)}
                        tooltip="Xóa/Hủy hóa đơn" // Làm rõ hành động
                    >
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                    </Button>
                </div>
            ),
        },
    ], [navigate, students, currentPage, filters]); // Thêm dependencies

    // Options cho Select sinh viên
    const studentOptions = [
        { value: '', label: 'Tất cả sinh viên' },
        ...students.map(s => ({ value: s.id.toString(), label: `${s.fullName} (${s.studentId || 'N/A'})` })) // Thêm mã SV nếu có
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold">Quản lý Hóa đơn</h1>
                {/* Nút tạo hóa đơn mới nếu cần */}
                {/* <Button onClick={() => navigate('/invoices/new')} icon={PlusIcon}>Tạo Hóa đơn</Button> */}
            </div>

            {/* Bộ lọc */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
                <Select
                    label="Sinh viên"
                    id="studentId"
                    name="studentId"
                    value={filters.studentId}
                    onChange={handleFilterChange}
                    options={studentOptions}
                // Có thể thêm chức năng search vào Select nếu danh sách quá dài
                />
                <Select
                    label="Trạng thái"
                    id="status"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    options={invoiceStatusOptions}
                />
                {/* Thêm Input search nếu cần */}
            </div>

            {/* Bảng dữ liệu */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : error ? (
                <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
            ) : invoices.length === 0 ? (
                <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
                    Không tìm thấy hóa đơn nào.
                </div>
            ) : (
                <PaginationTable
                    columns={columns}
                    data={invoices}
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={meta.total}
                    recordsPerPage={meta.limit}
                    showingText={`Hiển thị hóa đơn ${(meta.currentPage - 1) * meta.limit + 1} - ${Math.min(meta.currentPage * meta.limit, meta.total)}`}
                    recordsText="hóa đơn"
                    pageText="Trang"
                />
            )}
        </div>
    );
};

export default InvoiceIndex;