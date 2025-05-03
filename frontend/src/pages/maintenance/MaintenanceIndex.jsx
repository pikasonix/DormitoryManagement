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
const formatDateTime = (dateString) => { /* ... như các file trước ... */ }

// Trạng thái yêu cầu (cần khớp Enum backend)
const maintenanceStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// Màu badge theo status
const getStatusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'yellow';
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
    studentId: '',
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
        studentId: currentFilters.studentId || undefined,
        roomId: currentFilters.roomId || undefined,
        // search: debouncedSearch || undefined,
      };
      const data = await maintenanceService.getAllMaintenanceRequests(params);
      setRequests(data.maintenanceRequests || []);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu bảo trì.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit]);

  // Fetch students và rooms cho bộ lọc và hiển thị (chỉ fetch 1 lần)
  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        // Chỉ lấy id, tên để giảm tải
        const [studentData, roomData] = await Promise.allSettled([
          studentService.getAllStudents({ limit: 1000, fields: 'id,fullName' }),
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
  const handleDelete = async (id, title) => {
    if (window.confirm(`Bạn có chắc muốn xóa yêu cầu "${title}" không?`)) {
      try {
        await maintenanceService.deleteMaintenanceRequest(id);
        toast.success(`Đã xóa yêu cầu "${title}" thành công!`);
        fetchRequests(currentPage, filters);
      } catch (err) {
        toast.error(err?.message || `Xóa yêu cầu "${title}" thất bại.`);
      }
    }
  };

  // Handler chuyển trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    { Header: 'Tiêu đề', accessor: 'title', Cell: ({ value }) => <span className='font-medium'>{value}</span> },
    {
      Header: 'Sinh viên YC', accessor: 'studentId', Cell: ({ value }) => {
        const student = students.find(s => s.id === value);
        return student ? student.fullName : `ID: ${value}`;
      }
    },
    {
      Header: 'Phòng', accessor: 'roomId', Cell: ({ value }) => {
        const room = rooms.find(r => r.id === value);
        return room ? `${room.number} (${room.building?.name || 'N/A'})` : `ID: ${value}`;
      }
    },
    { Header: 'Ngày YC', accessor: 'createdAt', Cell: ({ value }) => formatDateTime(value) },
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
            onClick={() => handleDelete(row.original.id, row.original.title)}
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
        <Select label="Sinh viên" id="studentId" name="studentId" value={filters.studentId} onChange={handleFilterChange} options={studentOptions} />
        <Select label="Phòng" id="roomId" name="roomId" value={filters.roomId} onChange={handleFilterChange} options={roomOptions} />
        <Select label="Trạng thái" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={maintenanceStatusOptions} />
        {/* <Input label="Tìm tiêu đề" id="search" name="search" value={filters.search} onChange={handleFilterChange} /> */}
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