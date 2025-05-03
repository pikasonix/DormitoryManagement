import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { Button, Input, Badge } from '../../components/shared';
import PaginationTable from '../../components/shared/PaginationTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../contexts/AuthContext';

// Helper format ngày
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
  catch (e) { return dateString; }
}

// Helper lấy màu badge status
const getStatusBadgeColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'green';
    case 'INACTIVE': return 'gray';
    case 'PENDING_APPROVAL': return 'yellow';
    case 'GRADUATED': return 'blue';
    case 'SUSPENDED': return 'red';
    case 'RENTING': return 'purple';
    default: return 'gray';
  }
}

const StudentIndex = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current user to check if admin

  // Hàm fetch dữ liệu
  const fetchStudents = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    setError(null);
    try {
      // Lấy tất cả sinh viên từ API (không giới hạn limit)
      const params = {
        // Không chỉ định limit để API trả về tất cả sinh viên
        keyword: undefined, // Không dùng keyword từ API nữa, sẽ lọc ở client
      };

      console.log('Fetching all students with params:', params);
      const data = await studentService.getAllStudents(params);
      console.log('Students data received:', data);

      // Handle different response structures
      const allStudentsList = data.students || data.data || data;
      let students = Array.isArray(allStudentsList) ? allStudentsList : [];

      // Lọc theo mã số sinh viên ở phía client nếu có từ khóa tìm kiếm
      if (search && search.trim() !== '') {
        const searchTerm = search.trim().toLowerCase();
        students = students.filter(student => {
          const studentId = (student.studentId || '').toLowerCase();
          return studentId.includes(searchTerm);
        });
        console.log(`Filtered to ${students.length} students with student ID containing "${searchTerm}"`);
      }

      // Extract and normalize metadata for pagination
      const total = students.length;

      // Tính toán số trang dựa trên tổng số sinh viên và limit 10 sinh viên/trang
      const calculatedTotalPages = Math.max(1, Math.ceil(total / 10));

      // Phân trang phía client - chọn 10 sinh viên cho trang hiện tại
      const startIndex = (page - 1) * 10;
      const endIndex = Math.min(startIndex + 10, total);
      const paginatedStudents = students.slice(startIndex, endIndex);

      console.log('Client-side pagination:', {
        total,
        currentPage: page,
        totalPages: calculatedTotalPages,
        showing: `${startIndex + 1}-${endIndex} of ${total}`
      });

      // Cập nhật state với dữ liệu đã phân trang
      setStudents(paginatedStudents);
      setMeta({
        currentPage: page,
        totalPages: calculatedTotalPages,
        limit: 10,
        total: total
      });
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Không thể tải danh sách sinh viên.');
      toast.error('Không thể tải danh sách sinh viên.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    // Đảm bảo trang mới hợp lệ
    if (page > 0 && page <= meta.totalPages) {
      console.log(`Chuyển đến trang ${page}`);
      setCurrentPage(page);

      // Scroll lên đầu trang khi chuyển trang
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'Ảnh',
      accessor: 'avatar',
      Cell: ({ value, row }) => {
        const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_URL || '';
        let avatarUrl = 'src/assets/default-avatar.png';

        try {
          // Try different avatar sources
          const original = row?.original;
          if (original?.user?.avatar?.path) {
            avatarUrl = original.user.avatar.path.startsWith('http')
              ? original.user.avatar.path
              : `${UPLOADS_BASE_URL}${original.user.avatar.path.startsWith('/') ? '' : '/'}${original.user.avatar.path}`;
          } else if (original?.user?.avatarUrl) {
            avatarUrl = original.user.avatarUrl;
          }
        } catch (error) {
          console.log('Avatar rendering error:', error);
        }

        return (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-8 w-8 rounded-full object-cover mx-auto"
            onError={(e) => { e.target.onerror = null; e.target.src = 'src/assets/default-avatar.png' }}
          />
        );
      }
    },
    {
      Header: 'Mã SV',
      accessor: 'studentId',
      Cell: ({ value }) => <span className='font-mono'>{value || '-'}</span>
    },
    {
      Header: 'Họ và tên',
      accessor: 'fullName',
      Cell: ({ value }) => value || '-'
    },
    {
      Header: 'Email',
      accessor: 'email',
      Cell: ({ row }) => row?.original?.user?.email || '-'
    },
    {
      Header: 'Số điện thoại',
      accessor: 'phoneNumber',
      Cell: ({ value }) => value || '-'
    },
    {
      Header: 'Phòng',
      accessor: 'room',
      Cell: ({ row }) => {
        const value = row?.original?.room;
        if (!value) return '-';
        try {
          const buildingName = value.building?.name || '';
          const roomNumber = value.number || value.roomNumber || value.name || value.id;
          return buildingName ? `${buildingName} - Phòng ${roomNumber}` : `Phòng ${roomNumber}`;
        } catch (error) {
          console.log('Room rendering error:', error);
          return '-';
        }
      }
    },
    {
      Header: 'Ngày sinh',
      accessor: 'birthDate',
      Cell: ({ value }) => formatDate(value)
    },
    {
      Header: 'Trạng thái',
      accessor: 'status',
      Cell: ({ value }) => {
        // Map status values to display text
        const statusMap = {
          'ACTIVE': 'Đang học',
          'INACTIVE': 'Không hoạt động',
          'PENDING_APPROVAL': 'Chờ duyệt',
          'GRADUATED': 'Đã tốt nghiệp',
          'SUSPENDED': 'Đình chỉ',
          'RENTING': 'Đang thuê',
        };

        const statusText = statusMap[value] || value || 'N/A';

        return (
          <Badge color={getStatusBadgeColor(value)}>
            {statusText}
          </Badge>
        );
      }
    },
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => {
        // Sử dụng userId thay vì id của student profile để đi đến trang chi tiết
        const userId = row?.original?.userId; // user ID từ bảng users
        if (!userId) return null;

        return (
          <div className="flex space-x-2 justify-center">
            <Button
              variant="icon"
              onClick={() => navigate(`/students/${userId}`)}
              tooltip="Xem chi tiết"
            >
              <EyeIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
            </Button>
            <Button
              variant="icon"
              onClick={() => navigate(`/students/${row?.original?.id}/edit`)}
              tooltip="Chỉnh sửa"
            >
              <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
            </Button>
            {user?.role === 'ADMIN' && (
              <Button
                variant="icon"
                onClick={() => handleDelete(row?.original?.id, row.original.fullName || 'Sinh viên này')}
                tooltip="Xóa"
              >
                <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [navigate, user, handleDelete]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Quản lý Sinh viên</h1>
        {user?.role === 'ADMIN' && (
          <Button
            onClick={() => navigate('/students/new')}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm tài khoản sinh viên
          </Button>
        )}
      </div>

      {/* Thanh tìm kiếm */}
      <div className="max-w-sm">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Tìm kiếm sinh viên</label>
          <Input
            placeholder="Nhập mã số sinh viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-4 rounded text-center">
          {error}
        </div>
      ) : !students.length ? (
        <div className="text-gray-600 bg-gray-100 p-4 rounded text-center">
          Không tìm thấy sinh viên nào.
        </div>
      ) : (
        <PaginationTable
          columns={columns}
          data={students}
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          totalRecords={meta.total}
          recordsPerPage={meta.limit}
          showingText={`Hiển thị sinh viên ${(meta.currentPage - 1) * meta.limit + 1} - ${Math.min(meta.currentPage * meta.limit, meta.total)}`}
          recordsText="sinh viên"
          pageText="Trang"
        />
      )}
    </div>
  );
};

export default StudentIndex;