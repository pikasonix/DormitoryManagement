import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance.service';
import { studentService } from '../../services/student.service'; //  }, [navigate, students, currentPage, filters]); // Thêm dependenciesLấy tên SV
import { roomService } from '../../services/room.service'; // Lấy tên phòng/tòa nhà
import { Button, Table, Select, Input, Pagination, Badge, Card, Alert } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext'; // Lấy thông tin user
import { toast } from 'react-hot-toast';
import { EyeIcon, PencilSquareIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
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
  const { user } = useAuth(); // Lấy thông tin user
  // Normalize user role to uppercase for comparisons
  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';
  const isStudent = role === 'STUDENT';
  const isAdminOrStaff = isAdmin || isStaff;

  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]); // Cache tên sinh viên
  const [rooms, setRooms] = useState([]); // Cache thông tin phòng/tòa nhà
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    id: '',
    roomId: '',
  });
  const navigate = useNavigate();

  // Fetch danh sách yêu cầu
  const fetchRequests = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      // Nếu là sinh viên, luôn gửi roomId từ profile
      const studentRoomId = isStudent ? user?.studentProfile?.roomId : undefined;

      // Nếu là sinh viên nhưng chưa được xếp phòng, trả về mảng rỗng ngay lập tức
      if (isStudent && !studentRoomId) {
        console.log("Student has no assigned room, skipping API call");
        setRequests([]);
        setMeta(prev => ({ ...prev, total: 0, totalPages: 0 }));
        setIsLoading(false);
        return;
      }

      const params = {
        page: page,
        limit: meta.limit,
        status: currentFilters.status || undefined,
        id: currentFilters.id || undefined,
        roomId: isStudent ? studentRoomId : (currentFilters.roomId || undefined),
      };

      // Debug log để kiểm tra params
      console.log("Maintenance request params:", params);

      const data = await maintenanceService.getAllMaintenanceRequests(params);
      console.log("Maintenance response:", data);

      // DEBUG: Log the status of each maintenance request
      if (data.maintenanceRequests && data.maintenanceRequests.length > 0) {
        console.log("DEBUG - Request statuses:",
          data.maintenanceRequests.map(req => ({
            id: req.id,
            status: req.status,
            isPending: req.status === 'PENDING'
          }))
        );
      }

      setRequests(data.maintenanceRequests || []);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);
    } catch (err) {
      console.error("Error fetching maintenance requests:", err);
      setError('Không thể tải danh sách yêu cầu bảo trì.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit, isStudent, user?.studentProfile?.roomId, navigate]);

  // Fetch students và rooms cho bộ lọc và hiển thị (chỉ fetch 1 lần)
  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        // Chỉ Admin/Staff cần dữ liệu sinh viên
        if (isAdminOrStaff) {
          const studentData = await studentService.getAllStudents({ limit: 1000, fields: 'id,fullName,userId' });
          setStudents(studentData.students || []);
        }

        // Tất cả vai trò đều cần dữ liệu phòng
        const roomData = await roomService.getAllRooms({ limit: 1000, fields: 'id,number,building.name' });

        // Kiểm tra cấu trúc dữ liệu và đảm bảo rooms là một mảng
        if (roomData && Array.isArray(roomData.rooms)) {
          setRooms(roomData.rooms);
        } else if (roomData && Array.isArray(roomData)) {
          setRooms(roomData);
        } else {
          console.error("Dữ liệu phòng không phải là mảng:", roomData);
          setRooms([]);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu liên quan:", err);
        setStudents([]);
        setRooms([]); // Khởi tạo mảng rỗng để tránh lỗi map()
      }
    }
    fetchRelatedData();
  }, [isAdminOrStaff]);


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

  // Modify columns based on role
  const studentColumns = useMemo(() => {
    if (isStudent) {
      // For students, remove the "Sinh viên YC" column and limit access to actions
      return columns
        .filter(col => col.accessor !== 'reportedBy')
        .map(col => {
          if (col.accessor === 'actions') {
            // Allow students to view details and delete their own requests when in PENDING status
            return {
              ...col,
              Cell: ({ row }) => {
                // Debug log for the row status
                console.log(`Row ${row.original.id} status: "${row.original.status}" (type: ${typeof row.original.status})`);
                console.log(`Is PENDING? ${row.original.status === 'PENDING'}`);

                return (
                  <div className="flex space-x-2 justify-center">
                    <Button
                      variant="icon"
                      onClick={() => navigate(`/maintenance/${row.original.id}/edit`)}
                      tooltip="Xem chi tiết"
                    >
                      <EyeIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                    </Button>

                    {/* Only show delete button for pending status - with more debug info */}
                    {row.original.status?.toUpperCase() === 'PENDING' && (
                      <Button
                        variant="icon"
                        onClick={() => handleDelete(row.original.id, row.original.issue)}
                        tooltip="Xóa"
                      >
                        <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                      </Button>
                    )}

                    {/* Additional test buttons to see if we can render them at all */}
                    <span className="hidden">{JSON.stringify(row.original.status)}</span>
                  </div>
                )
              }
            };
          }
          return col;
        });
    }
    return columns;
  }, [columns, isStudent, navigate, handleDelete]);

  // Kiểm tra xem sinh viên đã được xếp phòng hay chưa
  const studentHasRoom = isStudent && user?.studentProfile?.roomId;
  const roomNumber = user?.studentProfile?.room?.number;
  const buildingName = user?.studentProfile?.room?.building?.name;

  // Render UI tùy vào vai trò
  const renderStudentView = () => {
    if (!studentHasRoom) {
      return (
        <Card className="p-6 text-center">
          <div className="mb-4">
            <Alert type="error" message="Bạn chưa được xếp phòng. Vui lòng liên hệ quản lý KTX." />
          </div>
          <p className="text-gray-600 mb-4">
            Chỉ sinh viên đã được xếp phòng mới có thể gửi yêu cầu bảo trì/sửa chữa.
          </p>
          <Button variant="primary" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <p className="font-medium text-blue-800">
            Danh sách yêu cầu bảo trì/sửa chữa cho phòng: {roomNumber || 'N/A'}
            ({buildingName || 'N/A'})
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => navigate('/maintenance/request')} variant="primary">
            Tạo yêu cầu mới
          </Button>
        </div>

        {/* Bộ lọc đơn giản cho sinh viên */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
          <Select label="Trạng thái" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={maintenanceStatusOptions} />
        </div>

        {/* Bảng dữ liệu */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
        ) : error ? (
          <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
        ) : (
          <>
            {requests.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">Chưa có yêu cầu bảo trì/sửa chữa nào cho phòng của bạn.</p>
                <p className="text-gray-500 mt-2">Nhấn "Tạo yêu cầu mới" để báo cáo sự cố.</p>
              </div>
            ) : (
              <>
                <Table columns={studentColumns} data={requests} />
                {meta.totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // Determine whether to show the "Create New Request" button in the header
  // Students should only see the button in their content section, not in the header
  const showCreateButtonInHeader = isAdminOrStaff;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Yêu cầu Bảo trì / Sửa chữa</h1>
        {showCreateButtonInHeader && (
          <Button onClick={() => navigate('/maintenance/request')} variant="primary">
            Tạo yêu cầu mới
          </Button>
        )}
      </div>

      {/* Hiển thị giao diện theo vai trò */}
      {isStudent ? (
        renderStudentView()
      ) : (
        <>
          {/* Bộ lọc cho Admin/Staff */}
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
        </>
      )}
    </div>
  );
};

export default MaintenanceIndex;