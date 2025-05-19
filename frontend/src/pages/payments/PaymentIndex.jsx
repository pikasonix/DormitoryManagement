import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/payment.service';
import { Button, Select, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { TrashIcon, CreditCardIcon, BanknotesIcon, ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format ngày giờ
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (e) {
    return dateString;
  }
}

// Format tiền tệ
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Options phương thức thanh toán (đã sửa để khớp với dữ liệu từ database)
const paymentMethodOptions = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'Chuyển khoản', label: 'Chuyển khoản' },
  { value: 'Tiền mặt', label: 'Tiền mặt' },
];

// Icon phương thức
const getMethodIcon = (method) => {
  switch (method) {
    case 'Chuyển khoản': return <CreditCardIcon className="h-5 w-5 text-blue-500 inline-block mr-1" />;
    case 'Tiền mặt': return <BanknotesIcon className="h-5 w-5 text-green-600 inline-block mr-1" />;
    default: return <CreditCardIcon className="h-5 w-5 text-gray-500 inline-block mr-1" />;
  }
}

const PaymentIndex = () => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    id: '',
    method: '',
    studentId: '',
    transactionCode: '',
  });
  const navigate = useNavigate();

  // Fetch danh sách thanh toán
  const fetchPayments = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: meta.limit };

      // Xử lý các filter
      if (currentFilters.id) {
        params.id = currentFilters.id;
      }
      if (currentFilters.method) {
        params.method = currentFilters.method;
      }
      if (currentFilters.studentId) {
        params.studentId = currentFilters.studentId;
      }
      if (currentFilters.transactionCode) {
        params.transactionCode = currentFilters.transactionCode;
      }

      const data = await paymentService.getAllPayments(params);
      const paymentList = data.payments || [];
      setPayments(paymentList);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);

    } catch (err) {
      console.error("Lỗi khi tải lịch sử thanh toán:", err);
      setError('Không thể tải lịch sử thanh toán.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit]);

  useEffect(() => {
    fetchPayments(currentPage, filters);
  }, [fetchPayments, currentPage, filters]);

  // Handlers
  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => setCurrentPage(page);

  const handleDelete = async (id) => {
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
    {
      Header: 'ID',
      accessor: 'id',
      Cell: ({ value }) => <span className='font-mono text-xs text-center'>#{value}</span>,
      className: 'text-center'
    },
    {
      Header: 'Ngày GD',
      accessor: 'paymentDate',
      Cell: ({ value }) => formatDateTime(value),
      className: 'text-center'
    },
    {
      Header: 'Mã SV',
      accessor: 'studentProfile',
      Cell: ({ value }) => value ? <span className="text-xs font-mono text-center">{value.studentId}</span> : '-',
      className: 'text-center'
    },
    {
      Header: 'Số tiền',
      accessor: 'amount',
      Cell: ({ value }) => formatCurrency(value),
      className: 'text-center'
    },
    {
      Header: 'Hóa đơn',
      accessor: 'invoiceId',
      Cell: ({ value }) => value ? <Link to={`/invoices/${value}`} className='text-indigo-600 hover:underline font-mono text-center'>#{value}</Link> : '-',
      className: 'text-center'
    },
    {
      Header: 'Phương thức',
      accessor: 'paymentMethod',
      Cell: ({ value }) => value ?
        <span className='flex items-center justify-center'>{getMethodIcon(value)}{value}</span>
        : '-',
      className: 'text-center'
    },
    {
      Header: 'Mã GD',
      accessor: 'transactionCode',
      Cell: ({ value }) => value ? <span className="text-xs font-mono text-center">{value}</span> : '-',
      className: 'text-center'
    },
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => (
        <div className="flex space-x-2 justify-center">
          <Button
            variant="icon"
            onClick={() => navigate(`/payments/${row.original.id}/edit`)}
            tooltip="Chỉnh sửa"
          >
            <PencilSquareIcon className="h-5 w-5 text-indigo-600 hover:text-indigo-800" />
          </Button>
          <Button
            variant="icon"
            onClick={() => handleDelete(row.original.id)}
            tooltip="Xóa giao dịch"
          >
            <TrashIcon className="h-5 w-5 text-red-500 hover:text-red-700" />
          </Button>
        </div>
      ),
      className: 'text-center'
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Lịch sử Thanh toán</h1>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
        <Input
          label="ID Thanh toán"
          id="id"
          name="id"
          placeholder="Nhập ID thanh toán..."
          value={filters.id}
          onChange={handleFilterChange}
        />
        <Input
          label="Mã sinh viên"
          id="studentId"
          name="studentId"
          placeholder="Nhập mã SV..."
          value={filters.studentId}
          onChange={handleFilterChange}
        />
        <Select
          label="Phương thức"
          id="method"
          name="method"
          value={filters.method}
          onChange={handleFilterChange}
          options={paymentMethodOptions}
        />
        <Input
          label="Mã GD"
          id="transactionCode"
          name="transactionCode"
          placeholder="Nhập mã giao dịch..."
          value={filters.transactionCode}
          onChange={handleFilterChange}
        />
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
          currentPage={meta.page || meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          totalRecords={meta.total}
          recordsPerPage={meta.limit}
          showingText={`Hiển thị giao dịch ${((meta.page || meta.currentPage) - 1) * meta.limit + 1} - ${Math.min((meta.page || meta.currentPage) * meta.limit, meta.total)}`}
          recordsText="giao dịch"
          pageText="Trang"
        />
      )}
    </div>
  );
};

export default PaymentIndex;