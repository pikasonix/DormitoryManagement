import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance.service';
import { studentService } from '../../services/student.service'; // Lấy tên SV
import { roomService } from '../../services/room.service'; // Lấy tên phòng/tòa nhà
import { Button, Table, Select, Input, Pagination, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDebounce } from '../../hooks/useDebounce';

// Format ngày giờ
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (error) {
    console.error("Lỗi format date:", error);
    return dateString || 'N/A';
  }
}

// Trạng thái yêu cầu (cần khớp Enum backend)
const maintenanceStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'assigned', label: 'Đã phân công' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// Màu badge theo status
const getStatusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'yellow';
    case 'assigned': return 'purple';
    case 'in_progress': return 'blue';
    case 'completed': return 'green';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
};

const MaintenanceIndex = () => {
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]); // Cache tên sinh viên
  const [rooms, setRooms] = useState([]); // Cache thông tin phòng/tòa nhà
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    id: '', // Thay thế studentId bằng id
    roomId: '',
    // search: '', // Tìm theo tiêu đề?
  });
  // const debouncedSearch = useDebounce(filters.search, 500);
  const navigate = useNavigate();

  // Fetch danh sách yêu cầu
  const fetchRequests = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: page,
        limit: meta.limit,
        status: currentFilters.status || undefined,
        id: currentFilters.id || undefined, // Thay thế studentId bằng id
        roomId: currentFilters.roomId || undefined,
        // search: debouncedSearch || undefined,
      };

      // Debug log để kiểm tra params
      console.log("Maintenance request params:", params);

      const data = await maintenanceService.getAllMaintenanceRequests(params);
      console.log("Maintenance response:", data);

      setRequests(data.maintenanceRequests || []);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);
    } catch (err) {
      console.error("Error fetching maintenance requests:", err);
      setError('Không thể tải danh sách yêu cầu bảo trì.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit]);

  // Fetch students và rooms cho bộ lọc và hiển thị (chỉ fetch 1 lần)
  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        // Chỉ lấy id, tên, và userId để giảm tải
        const [studentData, roomData] = await Promise.allSettled([
          studentService.getAllStudents({ limit: 1000, fields: 'id,fullName,userId' }),
          roomService.getAllRooms({ limit: 1000, fields: 'id,number,building.name' }) // Lấy số phòng và tên tòa nhà
        ]);

        if (studentData.status === 'fulfilled') {
          setStudents(studentData.value.students || []);
        }

        if (roomData.status === 'fulfilled') {
          // Kiểm tra cấu trúc dữ liệu và đảm bảo rooms là một mảng
          if (roomData.value && Array.isArray(roomData.value.rooms)) {
            setRooms(roomData.value.rooms);
          } else if (roomData.value && Array.isArray(roomData.value)) {
            setRooms(roomData.value);
          } else {
            console.error("Dữ liệu phòng không phải là mảng:", roomData.value);
            setRooms([]);
          }
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu liên quan:", err);
        setRooms([]); // Khởi tạo mảng rỗng để tránh lỗi map()
      }
    }
    fetchRelatedData();
  }, []);


  // Fetch requests khi trang/filter thay đổi
  useEffect(() => {
    fetchRequests(currentPage, filters);
  }, [fetchRequests, currentPage, filters]);

  // Handler thay đổi filter
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // Handler xóa yêu cầu
  const handleDelete = async (id, issue) => {
    if (window.confirm(`Bạn có chắc muốn xóa yêu cầu "${issue}" không?`)) {
      try {
        await maintenanceService.deleteMaintenanceRequest(id);
        toast.success(`Đã xóa yêu cầu "${issue}" thành công!`);
        fetchRequests(currentPage, filters);
      } catch (err) {
        toast.error(err?.message || `Xóa yêu cầu "${issue}" thất bại.`);
      }
    }
  };

  // Handler chuyển trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'ID',
      accessor: 'id',
      Cell: ({ value }) => <span className="font-mono text-sm">{value}</span>
    },
    {
      Header: 'Nội dung',
      accessor: 'issue',
      Cell: ({ value }) => <span className='font-medium'>{value}</span>
    },
    {
      Header: 'Sinh viên YC',
      accessor: 'reportedBy',
      Cell: ({ value, row }) => {
        // Khi có dữ liệu reportedBy từ backend
        if (value && typeof value === 'object') {
          // Ưu tiên hiển thị tên đầy đủ của sinh viên
          if (value.fullName) {
            return value.fullName;
          }
          // Nếu có thông tin user, hiển thị email 
          if (value.user && value.user.email) {
            return value.user.email;
          }
          return `ID: ${value.id || value.userId || 'N/A'}`;
        }

        // Fallback cho các trường hợp cũ hoặc dữ liệu không đầy đủ
        const reportedById = row.original.reportedById;
        if (reportedById) {
          // reportedById là userId (từ bảng users), không phải id từ bảng student_profiles
          // Tìm student dựa trên userId thay vì id
          const student = students.find(s => s.userId === reportedById);

          if (student) {
            return student.fullName;
          }

          // Nếu không tìm thấy, thử xem có thông tin user trong dữ liệu không
          if (row.original.reportedByUser) {
            return row.original.reportedByUser.email || `User ID: ${reportedById}`;
          }

          return `User ID: ${reportedById}`;
        }

        return 'N/A';
      }
    },
    {
      Header: 'Phòng',
      accessor: 'room',
      Cell: ({ value }) => {
        return value ? `${value.number} (${value.building?.name || 'N/A'})` : 'N/A';
      }
    },
    {
      Header: 'Ngày YC',
      accessor: 'reportDate',
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
        <div className="flex space-x-2 justify-center">
          {/* Chuyển sang trang form để xem chi tiết và cập nhật */}
          <Button
            variant="icon"
            onClick={() => navigate(`/maintenance/${row.original.id}/edit`)} // Link đến form edit
            tooltip="Xem chi tiết / Cập nhật"
          >
            <PencilSquareIcon className="h-5 w-5 text-indigo-600 hover:text-indigo-800" />
          </Button>
          <Button
            variant="icon"
            onClick={() => handleDelete(row.original.id, row.original.issue)}
            tooltip="Xóa"
          >
            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
          </Button>
        </div>
      ),
    },
  ], [navigate, students, rooms, currentPage, filters]); // Thêm dependencies


  // Options cho Selects - Thêm kiểm tra để đảm bảo rooms là mảng
  const studentOptions = [{ value: '', label: 'Tất cả sinh viên' }, ...students.map(s => ({ value: s.id.toString(), label: s.fullName }))];
  const roomOptions = [{ value: '', label: 'Tất cả phòng' }, ...(Array.isArray(rooms) ? rooms.map(r => ({
    value: r.id.toString(),
    label: `${r.number} (${r.building?.name || 'N/A'})`
  })) : [])];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Yêu cầu Bảo trì / Sửa chữa</h1>
        {/* Nút tạo yêu cầu cho Student có thể đặt ở menu hoặc dashboard */}
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
        <Input label="ID" id="id" name="id" value={filters.id} onChange={handleFilterChange} placeholder="Nhập ID yêu cầu" />
        <Input
          label="Phòng"
          id="roomId"
          name="roomId"
          value={filters.roomId}
          onChange={handleFilterChange}
          placeholder="Ví dụ: 203 (B3), B3-203, hoặc B3"
          helpText="Tìm theo số phòng, tòa nhà hoặc cả hai"
        />
        <Select label="Trạng thái" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={maintenanceStatusOptions} />
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
      ) : (
        <>
          <Table columns={columns} data={requests} />
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

export default MaintenanceIndex;