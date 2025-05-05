import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/payment.service';
import { studentService } from '../../services/student.service'; // Lấy tên SV
import { invoiceService } from '../../services/invoice.service'; // Lấy số HĐ?
import { Button, Select, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon, CreditCardIcon, BanknotesIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
// import { useDebounce } from '../../hooks/useDebounce';

// Format ngày giờ
const formatDateTime = (dateString) => { /* ... */ }
// Format tiền tệ
const formatCurrency = (amount) => { /* ... */ }

// Options trạng thái thanh toán
const paymentStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'success', label: 'Thành công' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'cancelled', label: 'Đã hủy' }, // Ví dụ
];
// Options phương thức thanh toán
const paymentMethodOptions = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'credit_card', label: 'Thẻ tín dụng' },
  { value: 'bank_transfer', label: 'Chuyển khoản NH' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'momo', label: 'MoMo' }, // Ví dụ
  { value: 'zalopay', label: 'ZaloPay' }, // Ví dụ
  { value: 'other', label: 'Khác' },
];
// Màu badge
const getStatusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'success': return 'green';
    case 'pending': return 'yellow';
    case 'failed': return 'red';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
};
// Icon phương thức
const getMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'credit_card': return <CreditCardIcon className="h-5 w-5 text-blue-500 inline-block mr-1" />;
    case 'bank_transfer': return <BanknotesIcon className="h-5 w-5 text-green-500 inline-block mr-1" />;
    case 'cash': return <BanknotesIcon className="h-5 w-5 text-gray-500 inline-block mr-1" />;
    // Thêm icon cho MoMo, ZaloPay...
    default: return <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400 inline-block mr-1" />;
  }
}

const PaymentIndex = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState({}); // Cache SV
  // const [invoices, setInvoices] = useState({}); // Cache hóa đơn nếu cần hiển thị số HĐ
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    studentId: '',
    invoiceId: '',
    // search: '', // Tìm theo mã giao dịch?
  });
  // const debouncedSearch = useDebounce(filters.search, 500);
  const navigate = useNavigate();

  // Fetch danh sách thanh toán
  const fetchPayments = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: meta.limit };
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) params[key] = currentFilters[key];
      });
      const data = await paymentService.getAllPayments(params);
      const paymentList = data.payments || [];
      setPayments(paymentList);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);

      // Fetch thông tin SV liên quan (nếu cần)
      const studentIds = [...new Set(paymentList.map(p => p.studentId).filter(id => id && !students[id]))];
      if (studentIds.length > 0) { /* ... fetch students ... */ }

    } catch (err) {
      setError('Không thể tải lịch sử thanh toán.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit, students]); // Thêm students dependency

  useEffect(() => {
    fetchPayments(currentPage, filters);
  }, [fetchPayments, currentPage, filters]);

  // Fetch students cho filter (chỉ 1 lần)
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await studentService.getAllStudents({ limit: 1000, fields: 'id,fullName' });
        // Chuyển thành object để dễ tra cứu
        const studentMap = {};
        (data.students || []).forEach(s => { studentMap[s.id] = s; });
        setStudents(studentMap);
      } catch (err) { console.error("Lỗi tải SV cho filter payment:", err); }
    };
    loadStudents();
  }, []);

  // Handlers
  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };
  const handlePageChange = (page) => setCurrentPage(page);
  const handleDelete = async (id) => { // Thận trọng khi dùng
    if (window.confirm(`Bạn có chắc muốn xóa giao dịch thanh toán này không? Hành động này thường không được khuyến khích.`)) {
      try {
        await paymentService.deletePayment(id);
        toast.success(`Đã xóa giao dịch!`);
        fetchPayments(currentPage, filters);
      } catch (err) {
        toast.error(err?.message || `Xóa giao dịch thất bại.`);
      }
    }
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    { Header: 'Mã GD', accessor: 'id', Cell: ({ value }) => <span className='font-mono text-xs'>#{value}</span> }, // Hoặc mã GD từ cổng TT
    { Header: 'Ngày GD', accessor: 'transactionDate', Cell: ({ value }) => formatDateTime(value) },
    { Header: 'Sinh viên', accessor: 'studentId', Cell: ({ value }) => students[value]?.fullName || `ID: ${value}` },
    { Header: 'Số tiền', accessor: 'amount', Cell: ({ value }) => formatCurrency(value) },
    { Header: 'Hóa đơn ID', accessor: 'invoiceId', Cell: ({ value }) => value ? <Link to={`/invoices/${value}`} className='text-indigo-600 hover:underline font-mono'>#{value}</Link> : '-' },
    { Header: 'Phương thức', accessor: 'method', Cell: ({ value }) => <span className='flex items-center'>{getMethodIcon(value)}{paymentMethodOptions.find(opt => opt.value === value)?.label || value}</span> },
    { Header: 'Trạng thái', accessor: 'status', Cell: ({ value }) => <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge> },
    // { Header: 'Chi tiết', accessor: 'details', Cell: ({value}) => <p className='text-xs text-gray-500 line-clamp-1'>{value || '-'}</p> },
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => (
        <div className="flex space-x-2 justify-center">
          {/* Nút xem chi tiết nếu có trang chi tiết Payment */}
          {/* <Button variant="icon" onClick={() => navigate(`/payments/${row.original.id}`)} tooltip="Xem chi tiết"><EyeIcon className="h-5 w-5"/></Button> */}
          {/* Nút sửa trạng thái nếu cần */}
          {/* <Button variant="icon" onClick={() => navigate(`/payments/${row.original.id}/edit`)} tooltip="Cập nhật"><PencilSquareIcon className="h-5 w-5"/></Button> */}
          {/* Nút xóa (thận trọng) */}
          <Button variant="icon" onClick={() => handleDelete(row.original.id)} tooltip="Xóa giao dịch"><TrashIcon className="h-5 w-5 text-red-500 hover:text-red-700" /></Button>
        </div>
      ),
    },
  ], [navigate, students, currentPage, filters]);

  // Options cho filter SV
  const studentOptions = [{ value: '', label: 'Tất cả sinh viên' }, ...Object.values(students).map(s => ({ value: s.id.toString(), label: s.fullName }))];


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Lịch sử Thanh toán</h1>
        {/* Nút ghi nhận thanh toán thủ công nếu cần */}
        {/* <Button onClick={() => navigate('/payments/new')} icon={PlusIcon}>Ghi nhận Thanh toán</Button> */}
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
        <Select label="Sinh viên" id="studentId" name="studentId" value={filters.studentId} onChange={handleFilterChange} options={studentOptions} searchable /> {/* Thêm searchable nếu component hỗ trợ */}
        <Select label="Trạng thái" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={paymentStatusOptions} />
        <Select label="Phương thức" id="method" name="method" value={filters.method} onChange={handleFilterChange} options={paymentMethodOptions} />
        <Input label="Mã Hóa đơn" id="invoiceId" name="invoiceId" placeholder="Nhập ID hóa đơn..." value={filters.invoiceId} onChange={handleFilterChange} />
        {/* <Input label="Tìm kiếm GD" id="search" name="search" value={filters.search} onChange={handleFilterChange} /> */}
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
      ) : payments.length === 0 ? (
        <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
          Không tìm thấy giao dịch thanh toán nào.
        </div>
      ) : (
        <PaginationTable
          columns={columns}
          data={payments}
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          totalRecords={meta.total}
          recordsPerPage={meta.limit}
          showingText={`Hiển thị giao dịch ${(meta.currentPage - 1) * meta.limit + 1} - ${Math.min(meta.currentPage * meta.limit, meta.total)}`}
          recordsText="giao dịch"
          pageText="Trang"
        />
      )}
    </div>
  );
};

export default PaymentIndex;