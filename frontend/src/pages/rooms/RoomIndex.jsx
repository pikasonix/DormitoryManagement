import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service'; // Cần lấy danh sách tòa nhà để lọc
import { Button, Table, Select, Input, Badge } from '../../components/shared'; // Thêm Select, Badge
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth để kiểm tra quyền

// Định nghĩa các tùy chọn cho bộ lọc status và type (phải khớp với Enum trong backend)
const roomStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Còn trống' },
  { value: 'OCCUPIED', label: 'Đang ở' },
  { value: 'FULL', label: 'Đã đầy' },
  { value: 'UNDER_MAINTENANCE', label: 'Đang bảo trì' },
];

const roomTypeOptions = [
  { value: '', label: 'Tất cả loại phòng' },
  { value: 'NORMAL', label: 'Thường' },
  { value: 'VIP', label: 'Vip' },
  // Thêm các loại khác nếu có
];

// Hàm helper để lấy màu badge theo status
const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'green';
    case 'OCCUPIED': return 'blue';
    case 'FULL': return 'indigo';
    case 'UNDER_MAINTENANCE': return 'yellow';
    default: return 'gray';
  }
};

const RoomIndex = () => {
  const { user } = useAuth(); // Lấy user để kiểm tra quyền
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]); // Danh sách tòa nhà để lọc
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ // State cho bộ lọc
    buildingId: '',
    status: '',
    type: '',
    // hasVacancy: '', // Bộ lọc này có vẻ phức tạp, tạm ẩn
    search: '', // Thêm tìm kiếm theo số phòng?
  });

  const navigate = useNavigate();

  // Hàm fetch dữ liệu phòng
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Tạo params từ filters, loại bỏ các giá trị rỗng
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params[key] = filters[key];
        }
      });
      const roomsData = await roomService.getAllRooms(params);
      setRooms(roomsData);
    } catch (err) {
      setError('Không thể tải danh sách phòng.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]); // Fetch lại khi filters thay đổi

  // Hàm fetch danh sách tòa nhà cho bộ lọc
  const fetchBuildings = useCallback(async () => {
    try {
      const data = await buildingService.getAllBuildings({ limit: 1000 }); // Lấy nhiều tòa nhà
      setBuildings(data.dormitories || []);
    } catch (err) {
      console.error("Lỗi tải danh sách tòa nhà cho bộ lọc:", err);
      // Không cần set lỗi chính, chỉ log
    }
  }, []);

  // Fetch dữ liệu khi component mount hoặc filters thay đổi
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Fetch buildings chỉ một lần khi mount
  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);


  // Hàm xử lý thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Hàm xử lý xóa phòng
  const handleDelete = async (id, roomNumber, buildingName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ${roomNumber} (Tòa nhà ${buildingName}) không?`)) {
      try {
        await roomService.deleteRoom(id);
        toast.success(`Đã xóa phòng ${roomNumber} thành công!`);
        fetchRooms(); // Tải lại danh sách
      } catch (err) {
        toast.error(err?.message || `Xóa phòng ${roomNumber} thất bại.`);
      }
    }
  };

  // Kiểm tra quyền sửa/xóa (ví dụ: chỉ Admin/Staff)
  const canEditDelete = user && (user.role === 'ADMIN' || user.role === 'STAFF');

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'Số phòng',
      accessor: 'number',
      Cell: ({ value }) => <span className="font-semibold">{value}</span>
    },
    { Header: 'Tòa nhà', accessor: 'building.name' }, // Truy cập nested data
    { Header: 'Tầng', accessor: 'floor' },
    { Header: 'Loại phòng', accessor: 'type' }, // Cần format lại nếu muốn hiển thị tiếng Việt
    {
      Header: 'Sức chứa',
      accessor: 'capacity',
      Cell: ({ row }) => `${row.original.actualOccupancy ?? 0} / ${row.original.capacity}`
    },
    { Header: 'Giá (VND)', accessor: 'price', Cell: ({ value }) => value ? parseFloat(value).toLocaleString('vi-VN') : '-' }, // Format tiền tệ
    {
      Header: 'Trạng thái',
      accessor: 'status',
      Cell: ({ value }) => (
        <Badge color={getStatusBadgeColor(value)}>
          {value} {/* Cần map sang tiếng Việt */}
        </Badge>
      )
    },
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => (
        <div className="flex space-x-1 justify-center">
          {/* Nút xem chi tiết (nếu có trang chi tiết) */}
          {/* <Button variant="icon" onClick={() => navigate(`/rooms/${row.original.id}`)} tooltip="Xem chi tiết">
                        <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </Button> */}
          {canEditDelete && ( // Chỉ hiển thị nút sửa/xóa nếu có quyền
            <>
              <Button
                variant="icon"
                onClick={() => navigate(`/rooms/${row.original.id}/edit`)}
                tooltip="Chỉnh sửa"
              >
                <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
              </Button>
              <Button
                variant="icon"
                onClick={() => handleDelete(row.original.id, row.original.number, row.original.building?.name)}
                tooltip="Xóa"
              >
                <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [navigate, canEditDelete]); // Thêm canEditDelete vào dependencies

  // Tạo options cho Select tòa nhà
  const buildingOptions = [
    { value: '', label: 'Tất cả tòa nhà' },
    ...buildings.map(b => ({ value: b.id.toString(), label: b.name }))
  ];


  // --- Render ---
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Quản lý Phòng ở</h1>
        {canEditDelete && ( // Chỉ hiển thị nút Thêm nếu có quyền
          <Button onClick={() => navigate('/rooms/new')} icon={PlusIcon}>
            Thêm phòng mới
          </Button>
        )}
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md shadow-sm">
        <Input
          label="Tìm số phòng"
          id="search"
          name="search"
          placeholder="Nhập số phòng..."
          value={filters.search}
          onChange={handleFilterChange}
        />
        <Select
          label="Tòa nhà"
          id="buildingId"
          name="buildingId"
          value={filters.buildingId}
          onChange={handleFilterChange}
          options={buildingOptions}
        />
        <Select
          label="Trạng thái"
          id="status"
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          options={roomStatusOptions}
        />
        <Select
          label="Loại phòng"
          id="type"
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          options={roomTypeOptions}
        />
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
      ) : (
        <Table columns={columns} data={rooms} />
      )}

      {/* Lưu ý: Không có Pagination vì API không hỗ trợ */}
    </div>
  );
};

export default RoomIndex;