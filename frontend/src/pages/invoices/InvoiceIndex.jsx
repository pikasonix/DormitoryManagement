import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service'; // Lấy ds sinh viên để lọc
import { roomService } from '../../services/room.service'; // Thêm roomService để lấy thông tin phòng
import { Button, Select, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon, PlusIcon, CreditCardIcon } from '@heroicons/react/24/outline';
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
    { value: 'UNPAID', label: 'Chờ thanh toán' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
    { value: 'OVERDUE', label: 'Quá hạn' },
    { value: 'CANCELLED', label: 'Đã hủy' },
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
    const [rooms, setRooms] = useState({}); // Cache thông tin phòng theo ID
    const [isLoading, setIsLoading] = useState(true);
    const [isBulkCreating, setIsBulkCreating] = useState(false); // Loading state for bulk creation
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        search: '', // Tìm theo số hợp đồng
        identifier: '', // Tìm theo mã SV/phòng
    });
    const debouncedSearch = useDebounce(filters.search, 500); // Debounce cho tìm kiếm số hợp đồng
    const debouncedIdentifier = useDebounce(filters.identifier, 500); // Debounce cho tìm kiếm mã SV/phòng
    const navigate = useNavigate();

    // Fetch danh sách hóa đơn
    const fetchInvoices = useCallback(async (page = 1, currentFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: page,
                limit: meta.limit,
                status: currentFilters.status || undefined,
                invoiceNumber: debouncedSearch || undefined, // Tìm theo số hợp đồng
                identifier: debouncedIdentifier || undefined, // Tìm theo mã SV/phòng
            };
            const data = await invoiceService.getAllInvoices(params);
            const invoiceList = data.invoices || [];
            setInvoices(invoiceList);
            setMeta(prev => ({ ...prev, ...data.meta }));
            setCurrentPage(data.meta?.page || 1);

            // Lấy danh sách roomId từ các hóa đơn phòng
            const roomIds = [...new Set(invoiceList
                .filter(invoice => invoice.roomId && !invoice.studentProfileId)
                .map(invoice => invoice.roomId)
                .filter(id => id && !rooms[id]))];

            // Fetch thông tin phòng nếu cần
            if (roomIds.length > 0) {
                const roomPromises = roomIds.map(id => roomService.getRoomById(id).catch(() => null));
                const roomResults = await Promise.all(roomPromises);

                // Cập nhật state rooms
                setRooms(prev => {
                    const newRooms = { ...prev };
                    roomResults.forEach(room => {
                        if (room) newRooms[room.id] = room;
                    });
                    return newRooms;
                });
            }
        } catch (err) {
            setError('Không thể tải danh sách hóa đơn.');
        } finally {
            setIsLoading(false);
        }
    }, [meta.limit, rooms, debouncedSearch, debouncedIdentifier]); // Thêm rooms và debouncedSearch vào dependencies

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
    };    // Hàm xử lý xóa (ít khi dùng cho hóa đơn, có thể chỉ hủy?)
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
    };    // Hàm xử lý tạo hóa đơn hàng loạt cho tháng hiện tại
    const handleBulkCreateInvoices = async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (window.confirm(`Bạn có chắc chắn muốn tạo hóa đơn hàng loạt cho ${monthNames[currentMonth - 1]} ${currentYear} không?\n\nLưu ý: Hệ thống sẽ tự động tạo:\n- Hóa đơn tiền phòng cho tất cả sinh viên đang thuê\n- Hóa đơn phí gửi xe cho sinh viên có đăng ký xe\n- Hóa đơn tiền điện/nước dựa trên chỉ số đã ghi`)) {
            setIsBulkCreating(true);
            try {
                const result = await invoiceService.createBulkInvoices(currentMonth, currentYear);

                let message = `Đã tạo thành công ${result.totalCreated} hóa đơn cho ${monthNames[currentMonth - 1]} ${currentYear}:\n`;
                message += `• ${result.roomFeeCount} hóa đơn tiền phòng\n`;
                message += `• ${result.parkingCount} hóa đơn phí gửi xe\n`;
                message += `• ${result.utilityCount} hóa đơn tiền điện/nước`;

                toast.success(message);
                fetchInvoices(currentPage, filters); // Refresh danh sách hóa đơn
            } catch (err) {
                console.error('Lỗi tạo hóa đơn hàng loạt:', err);
                toast.error(err?.message || 'Tạo hóa đơn hàng loạt thất bại.');
            } finally {
                setIsBulkCreating(false);
            }
        }
    };

    // Hàm xử lý tạo hóa đơn tiền phòng
    const handleCreateRoomFeeInvoices = async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (window.confirm(`Bạn có chắc chắn muốn tạo hóa đơn tiền phòng cho ${monthNames[currentMonth - 1]} ${currentYear} không?\n\nHệ thống sẽ tạo hóa đơn tiền phòng cho tất cả sinh viên đang thuê phòng.`)) {
            setIsBulkCreating(true);
            try {
                const result = await invoiceService.createRoomFeeInvoices(currentMonth, currentYear);

                toast.success(`Đã tạo thành công ${result.totalInvoicesCreated} hóa đơn tiền phòng cho ${monthNames[currentMonth - 1]} ${currentYear}`);
                fetchInvoices(currentPage, filters); // Refresh danh sách hóa đơn
            } catch (err) {
                console.error('Lỗi tạo hóa đơn tiền phòng:', err);
                toast.error(err?.message || 'Tạo hóa đơn tiền phòng thất bại.');
            } finally {
                setIsBulkCreating(false);
            }
        }
    };

    // Hàm xử lý tạo hóa đơn phí gửi xe
    const handleCreateParkingFeeInvoices = async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (window.confirm(`Bạn có chắc chắn muốn tạo hóa đơn phí gửi xe cho ${monthNames[currentMonth - 1]} ${currentYear} không?\n\nHệ thống sẽ tạo hóa đơn phí gửi xe cho các sinh viên có đăng ký xe hiệu lực.`)) {
            setIsBulkCreating(true);
            try {
                const result = await invoiceService.createParkingFeeInvoices(currentMonth, currentYear);

                toast.success(`Đã tạo thành công ${result.totalInvoicesCreated} hóa đơn phí gửi xe cho ${monthNames[currentMonth - 1]} ${currentYear}`);
                fetchInvoices(currentPage, filters); // Refresh danh sách hóa đơn
            } catch (err) {
                console.error('Lỗi tạo hóa đơn phí gửi xe:', err);
                toast.error(err?.message || 'Tạo hóa đơn phí gửi xe thất bại.');
            } finally {
                setIsBulkCreating(false);
            }
        }
    };

    // Hàm xử lý tạo hóa đơn tiện ích (điện/nước)
    const handleCreateUtilityInvoices = async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (window.confirm(`Bạn có chắc chắn muốn tạo hóa đơn tiền điện/nước cho ${monthNames[currentMonth - 1]} ${currentYear} không?\n\nHệ thống sẽ tính toán dựa trên công thức: (chỉ số tháng này - chỉ số tháng trước) × giá tiền cho các phòng có chỉ số đã ghi.`)) {
            setIsBulkCreating(true);
            try {
                const result = await invoiceService.createUtilityInvoices(currentMonth, currentYear);

                toast.success(`Đã tạo thành công ${result.totalInvoicesCreated} hóa đơn tiện ích cho ${monthNames[currentMonth - 1]} ${currentYear}`);
                fetchInvoices(currentPage, filters); // Refresh danh sách hóa đơn
            } catch (err) {
                console.error('Lỗi tạo hóa đơn tiện ích:', err);
                toast.error(err?.message || 'Tạo hóa đơn tiện ích thất bại.');
            } finally {
                setIsBulkCreating(false);
            }
        }
    };

    // Xử lý chuyển đến trang tạo thanh toán cho hóa đơn
    const handleCreatePayment = (invoiceId) => {
        navigate(`/payments/new?invoiceId=${invoiceId}`);
    };

    // Xử lý chuyển trang
    const handlePageChange = (page) => {
        // Đảm bảo trang mới hợp lệ
        if (page > 0 && page <= meta.totalPages) {
            setCurrentPage(page);
            // Scroll lên đầu trang khi chuyển trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // --- Cấu hình bảng ---
    const columns = useMemo(() => [
        { Header: 'Số hợp đồng', accessor: 'id', Cell: ({ value }) => <span className='font-mono'>{value || 'N/A'}</span> },
        {
            Header: 'Mã SV/Phòng',
            accessor: 'studentProfileId',
            Cell: ({ value, row }) => {
                const invoice = row.original;

                // Nếu là hóa đơn sinh viên (studentProfileId có giá trị)
                if (invoice.studentProfileId) {
                    // Tìm student từ danh sách students
                    const student = students.find(s => s.id === invoice.studentProfileId);
                    return student?.studentId || `SV-${invoice.studentProfileId}`;
                }
                // Nếu là hóa đơn phòng (roomId có giá trị)
                else if (invoice.roomId) {
                    const room = rooms[invoice.roomId];
                    if (room) {
                        return `${room.number} (${room.building?.name || ''})`;
                    }
                    return `P-${invoice.roomId}`;
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
        }, {
            Header: 'Hành động',
            accessor: 'actions',
            Cell: ({ row }) => {
                const invoice = row.original;
                const canPay = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status?.toUpperCase());

                return (
                    <div className="flex space-x-2 justify-center">                        <Button
                        variant="icon"
                        onClick={() => navigate(`/invoices/${invoice.id}`)} // Link đến trang chi tiết
                        tooltip="Xem chi tiết"
                    >
                        <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </Button>
                        <Button
                            variant="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            tooltip="Chỉnh sửa hóa đơn"
                        >
                            <PencilSquareIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                        </Button>
                        {canPay && (
                            <Button
                                variant="icon"
                                onClick={() => handleCreatePayment(invoice.id)}
                                tooltip="Tạo thanh toán"
                            >
                                <CreditCardIcon className="h-5 w-5 text-green-600 hover:text-green-800" />
                            </Button>
                        )}
                        <Button
                            variant="icon"
                            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                            tooltip="Xóa/Hủy hóa đơn" // Làm rõ hành động
                        >
                            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                        </Button>
                    </div>
                );
            },
        },
    ], [navigate, students, rooms, currentPage, filters, handleCreatePayment]); // Thêm dependencies cần thiết

    // Options cho Select sinh viên
    const studentOptions = [
        { value: '', label: 'Tất cả sinh viên' },
        ...students.map(s => ({ value: s.id.toString(), label: `${s.fullName} (${s.studentId || 'N/A'})` })) // Thêm mã SV nếu có
    ];

    return (<div className="space-y-4">            <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Quản lý Hóa đơn</h1>
        <div className="flex flex-wrap gap-2">
            {/* Nút thêm hóa đơn mới */}
            <Button
                onClick={() => navigate('/invoices/new')}
                icon={PlusIcon}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
                Thêm hoá đơn
            </Button>

            {/* Nút tạo hóa đơn tiền phòng */}
            <Button
                onClick={handleCreateRoomFeeInvoices}
                icon={PlusIcon}
                disabled={isBulkCreating}
                className="bg-green-600 hover:bg-green-700 text-sm"
            >
                {isBulkCreating ? 'Đang tạo...' : `Tiền phòng T${new Date().getMonth() + 1}`}
            </Button>

            {/* Nút tạo hóa đơn phí gửi xe */}
            <Button
                onClick={handleCreateParkingFeeInvoices}
                icon={PlusIcon}
                disabled={isBulkCreating}
                className="bg-orange-600 hover:bg-orange-700 text-sm"
            >
                {isBulkCreating ? 'Đang tạo...' : `Gửi xe T${new Date().getMonth() + 1}`}
            </Button>

            {/* Nút tạo hóa đơn tiện ích */}
            <Button
                onClick={handleCreateUtilityInvoices}
                icon={PlusIcon}
                disabled={isBulkCreating}
                className="bg-purple-600 hover:bg-purple-700 text-sm"
            >
                {isBulkCreating ? 'Đang tạo...' : `Điện nước T${new Date().getMonth() + 1}`}
            </Button>

            {/* Nút tạo tất cả hóa đơn */}
            <Button
                onClick={handleBulkCreateInvoices}
                icon={PlusIcon}
                disabled={isBulkCreating}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
                {isBulkCreating ? 'Đang tạo...' : `Tất cả T${new Date().getMonth() + 1}`}
            </Button>

            {/* Nút tạo hóa đơn mới nếu cần */}
            {/* <Button onClick={() => navigate('/invoices/new')} icon={PlusIcon}>Tạo Hóa đơn</Button> */}
        </div>
    </div>

        {/* Bộ lọc */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
            <Input
                label="Số hợp đồng"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nhập số hợp đồng..."
            />
            <Input
                label="Mã SV/Phòng"
                id="identifier"
                name="identifier"
                value={filters.identifier}
                onChange={handleFilterChange}
                placeholder="Nhập mã SV hoặc phòng (VD: B3-105)"
                helpText="Tìm theo mã sinh viên hoặc phòng"
            />
            <Select
                label="Trạng thái"
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={invoiceStatusOptions}
            />
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
                currentPage={currentPage}
                totalPages={meta.totalPages}
                onPageChange={handlePageChange}
                totalRecords={meta.total}
                recordsPerPage={meta.limit}
                showingText={`Hiển thị hóa đơn ${(currentPage - 1) * meta.limit + 1} - ${Math.min(currentPage * meta.limit, meta.total)}`}
                recordsText="hóa đơn"
                pageText="Trang"
            />
        )}
    </div>
    );
};

export default InvoiceIndex;