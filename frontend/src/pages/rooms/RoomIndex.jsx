import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service'; // Cần lấy danh sách tòa nhà để lọc
import RoomCard from '../../components/rooms/RoomCard';
import Pagination from '../../components/shared/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Select from '../../components/shared/Select'; // Import Select component

// Các option cho filter
const roomStatuses = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Còn chỗ' },
  { value: 'FULL', label: 'Đã đầy' },
  { value: 'UNDER_MAINTENANCE', label: 'Đang bảo trì' },
];
const roomTypes = [
  { value: '', label: 'Tất cả loại phòng' },
  { value: 'ROOM_12', label: 'Phòng 12' },
  { value: 'ROOM_10', label: 'Phòng 10' },
  { value: 'ROOM_8', label: 'Phòng 8' },
  { value: 'ROOM_6', label: 'Phòng 6' },
  { value: 'MANAGEMENT', label: 'Phòng QL' },
];


const RoomIndex = () => {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]); // State cho danh sách tòa nhà
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 12, // Tăng limit để hiển thị nhiều card hơn
  });
  const [filters, setFilters] = useState({
    buildingId: '',
    status: '',
    type: '',
    hasVacancy: '', // Thêm filter còn chỗ trống
  });

  // Fetch danh sách tòa nhà để lọc
  useEffect(() => {
    buildingService.getAllBuildings({ limit: 100 }) // Lấy nhiều tòa nhà
      .then(response => {
        setBuildings([{ value: '', label: 'Tất cả tòa nhà' }, ...response.data.map(b => ({ value: b.id, label: b.name }))]);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách tòa nhà:", err);
        toast.error("Không thể tải danh sách tòa nhà để lọc.");
      });
  }, []);


  // Hàm fetch dữ liệu phòng
  const fetchRooms = useCallback(async (page = 1, limit = 12, currentFilters = {}) => {
    setLoading(true);
    setError(null);
    // Chỉ gửi filter có giá trị
    const activeFilters = Object.entries(currentFilters)
      .filter(([, value]) => value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    try {
      const params = { page, limit, ...activeFilters, sortBy: 'number', sortOrder: 'asc' };
      const response = await roomService.getAllRooms(params);
      setRooms(response.data || []);
      setPagination({
        currentPage: page,
        totalPages: Math.ceil(response.total / limit),
        totalItems: response.total,
        limit: limit,
      });
    } catch (err) {
      setError('Không thể tải danh sách phòng.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dữ liệu lần đầu và khi filter/pagination thay đổi
  useEffect(() => {
    fetchRooms(pagination.currentPage, pagination.limit, filters);
  }, [pagination.currentPage, pagination.limit, filters, fetchRooms]);

  // Hàm xử lý thay đổi filter
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset về trang 1 khi lọc
  };

  // Hàm xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Hàm xử lý xóa phòng
  const handleDeleteRoom = async (id, number, buildingName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ${number} (${buildingName}) không? Sinh viên trong phòng sẽ bị gán ra khỏi phòng.`)) {
      try {
        await roomService.deleteRoom(id);
        // Tải lại trang hiện tại sau khi xóa
        fetchRooms(pagination.currentPage, pagination.limit, filters);
        // toast.success đã có trong service
      } catch (err) {
        // Lỗi đã được service log và toast
        console.error("Lỗi khi xóa phòng từ Index:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header và Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Phòng ở</h1>
        <Link
          to="/rooms/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap order-first md:order-last"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Thêm Phòng
        </Link>
      </div>

      {/* Khu vực Filter */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
        <div className="flex-1 min-w-[150px]">
          <Select
            label="Tòa nhà"
            name="buildingId"
            value={filters.buildingId}
            onChange={handleFilterChange}
            options={buildings}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            label="Loại phòng"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            options={roomTypes}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            label="Trạng thái"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={roomStatuses}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select
            label="Tình trạng chỗ"
            name="hasVacancy" // Filter theo chỗ trống
            value={filters.hasVacancy}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'true', label: 'Còn chỗ trống' },
              { value: 'false', label: 'Hết chỗ/Bảo trì' }
            ]}
          />
        </div>
        {/* <button
                     onClick={() => fetchRooms(1, pagination.limit, filters)} // Nút lọc thủ công nếu không muốn tự động lọc
                     className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                 >
                      <FunnelIcon className="h-5 w-5 mr-1 text-gray-400"/>
                      Lọc
                 </button> */}
      </div>


      {/* Hiển thị Loading/Error */}
      {loading && <div className="text-center py-10"><LoadingSpinner /></div>}
      {!loading && error && <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded">{error}</div>}

      {/* Hiển thị danh sách phòng */}
      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onDelete={handleDeleteRoom}
            />
          ))}
        </div>
      )}

      {/* Thông báo khi không có dữ liệu */}
      {!loading && !error && rooms.length === 0 && (
        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <Square2StackIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Không tìm thấy phòng nào</h3>
          <p className="mt-1 text-sm text-gray-500">Hãy thử điều chỉnh bộ lọc hoặc thêm phòng mới.</p>
          {/* Nút thêm mới ở đây nữa */}
        </div>
      )}

      {/* Phân trang */}
      {!loading && !error && rooms.length > 0 && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default RoomIndex;