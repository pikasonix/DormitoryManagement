import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { Button, Table, Input, Pagination, Badge } from '../../components/shared'; // Thêm Pagination, Badge
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce'; // Giả sử có hook debounce

// Helper format ngày
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
  catch (e) { return dateString; }
}

// Helper lấy màu badge status
const getStatusBadgeColor = (status) => {
  switch (status?.toUpperCase()) { // API trả về 'active' ?
    case 'ACTIVE': return 'green';
    case 'INACTIVE': return 'gray';
    case 'GRADUATED': return 'blue'; // Ví dụ thêm status
    case 'SUSPENDED': return 'yellow'; // Ví dụ
    default: return 'gray';
  }
}

const StudentIndex = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 }); // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search input
  const navigate = useNavigate();

  // Hàm fetch dữ liệu
  const fetchStudents = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: page,
        limit: meta.limit,
        keyword: search || undefined, // Gửi keyword nếu có giá trị
      };
      const data = await studentService.getAllStudents(params);
      setStudents(data.students || []);
      setMeta(prev => ({ ...prev, ...data.meta })); // Cập nhật meta data
      setCurrentPage(data.meta?.page || 1); // Cập nhật trang hiện tại
    } catch (err) {
      setError('Không thể tải danh sách sinh viên.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit]); // Chỉ phụ thuộc vào limit để định nghĩa hàm

  // Fetch khi trang thay đổi hoặc search term (đã debounce) thay đổi
  useEffect(() => {
    fetchStudents(currentPage, debouncedSearchTerm);
  }, [fetchStudents, currentPage, debouncedSearchTerm]);

  // Hàm xử lý xóa
  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ sinh viên "${name}" không? Hành động này có thể không thể hoàn tác.`)) {
      try {
        await studentService.deleteStudent(id);
        toast.success(`Đã xóa hồ sơ sinh viên "${name}" thành công!`);
        // Fetch lại trang hiện tại sau khi xóa
        fetchStudents(currentPage, debouncedSearchTerm);
      } catch (err) {
        toast.error(err?.message || `Xóa hồ sơ sinh viên "${name}" thất bại.`);
      }
    }
  };

  // Xử lý chuyển trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'Ảnh',
      accessor: 'user.avatar.path', // Đường dẫn avatar từ user liên kết
      Cell: ({ value }) => {
        const UPLOADS_BASE_URL = (import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL)?.replace('/api', '');
        const avatarUrl = value ? (value.startsWith('http') ? value : `${UPLOADS_BASE_URL || ''}${value.startsWith('/') ? '' : '/'}${value}`) : '/default-avatar.png';
        return <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover mx-auto" onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png' }} />;
      }
    },
    { Header: 'Mã SV', accessor: 'studentId', Cell: ({ value }) => <span className='font-mono'>{value}</span> },
    { Header: 'Họ và tên', accessor: 'fullName' }, // API trả về fullName
    { Header: 'Email', accessor: 'email' }, // API trả về email
    { Header: 'Số điện thoại', accessor: 'phone' }, // API trả về phone
    { Header: 'Phòng', accessor: 'roomId', Cell: ({ value }) => value ? `Phòng ${value}` : '-' }, // Cần lấy tên phòng thực tế?
    { Header: 'Ngày sinh', accessor: 'dateOfBirth', Cell: ({ value }) => formatDate(value) },
    {
      Header: 'Trạng thái',
      accessor: 'status', // API trả về status
      Cell: ({ value }) => (
        <Badge color={getStatusBadgeColor(value)}>{value?.toUpperCase() || 'N/A'}</Badge>
      )
    },
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => (
        <div className="flex space-x-2 justify-center">
          {/* // TODO: Thêm nút xem chi tiết nếu có trang chi tiết */}
          {/* <Button variant="icon" onClick={() => navigate(`/students/${row.original.id}`)} tooltip="Xem chi tiết">...</Button> */}
          <Button
            variant="icon"
            onClick={() => navigate(`/students/${row.original.id}/edit`)} // ID ở đây là profile ID
            tooltip="Chỉnh sửa"
          >
            <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
          </Button>
          <Button
            variant="icon"
            onClick={() => handleDelete(row.original.id, row.original.fullName)}
            tooltip="Xóa"
          >
            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
          </Button>
        </div>
      ),
    },
  ], [navigate, currentPage, debouncedSearchTerm]); // Thêm dependencies cho handlePageChange nếu cần

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Quản lý Sinh viên</h1>
        {/* Nút Thêm mới cần quyền Admin? */}
        <Button onClick={() => navigate('/students/new')} icon={PlusIcon}>
          Thêm Sinh viên mới
        </Button>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="max-w-sm">
        <Input
          placeholder="Tìm theo tên, mã SV, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
      ) : (
        <>
          <Table columns={columns} data={students} />
          {/* Phân trang */}
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

export default StudentIndex;