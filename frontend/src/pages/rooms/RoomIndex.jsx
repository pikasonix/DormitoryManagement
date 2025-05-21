import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service'; // Cần lấy danh sách tòa nhà để lọc
import { Button, Select, Input, Badge, Card } from '../../components/shared'; // Thêm Card
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import PaginationTable from '../../components/shared/PaginationTable'; // Import PaginationTable
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon, ArrowRightIcon, HomeIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth để kiểm tra quyền
import { authService } from '../../services/auth.service'; // Import authService for getMe function

// Định nghĩa các tùy chọn cho bộ lọc status và type (phải khớp với Enum trong backend)
const roomStatusOptions = [
  { value: '', label: 'Tất cả trạng thái', color: 'gray' },
  { value: 'AVAILABLE', label: 'Còn chỗ', color: 'green' },
  { value: 'FULL', label: 'Đủ người', color: 'indigo' },
  { value: 'UNDER_MAINTENANCE', label: 'Đang sửa chữa', color: 'yellow' },
];

const roomTypeOptions = [
  { value: '', label: 'Tất cả loại phòng' },
  { value: 'MALE', label: 'Phòng Nam' },
  { value: 'FEMALE', label: 'Phòng Nữ' },
  { value: 'MANAGEMENT', label: 'Phòng quản lý' },
];

// Helper convert currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return parseInt(amount).toLocaleString('vi-VN') + ' VNĐ';
};

// Hàm helper để lấy màu badge theo status
const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'green';
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
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ // State cho bộ lọc
    buildingId: '',
    status: '',
    type: '',
    // hasVacancy: '', // Bộ lọc này có vẻ phức tạp, tạm ẩn
    search: '', // Thêm tìm kiếm theo số phòng?
  });
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentRoommates, setStudentRoommates] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const navigate = useNavigate();

  // Hàm fetch dữ liệu phòng
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Tạo params từ filters, loại bỏ các giá trị rỗng
      const params = { page: currentPage, limit: meta.limit };
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params[key] = filters[key];
        }
      });
      const roomsData = await roomService.getAllRooms(params);

      // Make sure we have an array of rooms
      const roomsArray = Array.isArray(roomsData.rooms) ? roomsData.rooms : [];

      // Debug if building information is present
      if (roomsArray.length > 0) {
        console.log('First room building data:', roomsArray[0]?.building);
      }

      setRooms(roomsArray);
      setMeta({
        currentPage: roomsData.meta?.currentPage || 1,
        totalPages: roomsData.meta?.totalPages || 1,
        limit: roomsData.meta?.limit || 10,
        total: roomsData.meta?.total || roomsArray.length,
      });
    } catch (err) {
      setError('Không thể tải danh sách phòng.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, meta.limit]);

  // Hàm fetch danh sách tòa nhà cho bộ lọc
  const fetchBuildings = useCallback(async () => {
    try {
      const data = await buildingService.getAllBuildings({ limit: 1000 }); // Lấy nhiều tòa nhà
      // Correctly access buildings data from the API response
      const buildingsData = data.buildings || [];
      console.log('Fetched buildings:', buildingsData); // Debug log
      setBuildings(buildingsData);
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

  // Fetch student profile if role is STUDENT
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (user?.role === 'STUDENT') {
        setLoadingProfile(true);
        try {
          const response = await authService.getMe();
          if (response?.user?.studentProfile) {
            const profileWithUser = {
              ...response.user.studentProfile,
              user: {
                ...(response.user.studentProfile.user || {}),
                email: response.user.email || response.user.studentProfile.user?.email
              }
            };
            setStudentProfile(profileWithUser);
            console.log('Student profile loaded:', profileWithUser);

            // If student has a room, fetch roommates
            if (profileWithUser.roomId) {
              try {
                const roomData = await roomService.getRoomById(profileWithUser.roomId);
                console.log('Room data with residents:', roomData);

                // Set the room data so we have all current information
                profileWithUser.room = roomData;

                if (roomData?.residents && Array.isArray(roomData.residents)) {
                  // Filter out the current student from the roommates list
                  setStudentRoommates(roomData.residents.filter(
                    resident => resident.id !== profileWithUser.id
                  ));
                }
              } catch (err) {
                console.error('Error fetching room details:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching student profile:', err);
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    fetchStudentProfile();
  }, [user]);

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
  const isStudent = user && user.role === 'STUDENT';

  // Handler for room registration
  const handleRoomRegistration = (room) => {
    navigate(`/transfers/request`, { state: { targetRoom: room } });
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'Số phòng',
      accessor: 'number',
      Cell: ({ value }) => <span className="font-semibold">{value}</span>
    },
    { Header: 'Tòa nhà', accessor: 'building.name' }, // Truy cập nested data
    { Header: 'Tầng', accessor: 'floor' },
    {
      Header: 'Loại phòng',
      accessor: 'type',
      Cell: ({ value }) => {
        // Format room type display
        switch (value) {
          case 'MALE': return 'Phòng Nam';
          case 'FEMALE': return 'Phòng Nữ';
          case 'MANAGEMENT': return 'Phòng quản lý';
          default: return value;
        }
      }
    },
    {
      Header: 'Sức chứa',
      accessor: 'capacity',
      Cell: ({ row }) => {
        // Add null check to handle undefined actualOccupancy
        return `${row.original.actualOccupancy || 0} / ${row.original.capacity}`;
      }
    },
    { Header: 'Giá phòng (VND)', accessor: 'roomFee', Cell: ({ value }) => value ? parseFloat(value).toLocaleString('vi-VN') : '-' }, // Using roomFee instead of price
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

          {/* Nút đăng ký phòng dành cho sinh viên - chỉ hiển thị khi còn chỗ trống */}
          {isStudent && !studentProfile?.roomId && row.original.status === 'AVAILABLE' && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleRoomRegistration(row.original)}
              tooltip="Đăng ký phòng này"
              className="ml-2 text-xs"
            >
              Đăng ký
            </Button>
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

  // --- Render Student Current Room Component ---
  const renderStudentCurrentRoom = () => {
    if (loadingProfile) {
      return <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>;
    }

    if (!studentProfile?.room) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Bạn chưa đăng ký phòng ký túc xá</h3>
          <p className="text-sm text-yellow-700 mb-4">Vui lòng tìm và đăng ký một phòng từ danh sách phòng trống bên dưới.</p>
        </div>
      );
    }

    const room = studentProfile.room;
    const building = room.building;

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-indigo-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-indigo-900">Phòng của bạn</h3>
            <p className="mt-1 max-w-2xl text-sm text-indigo-700">
              Thông tin phòng và các sinh viên trong phòng
            </p>
          </div>
          <div>
            <HomeIcon className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
              <dt className="text-sm font-medium text-gray-600">Tòa nhà:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {building?.name || 'Không có thông tin'}
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Phòng số:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold">
                {room.number}
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
              <dt className="text-sm font-medium text-gray-600">Tầng:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {room.floor}
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Loại phòng:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {room.type === 'MALE' ? 'Phòng Nam' : room.type === 'FEMALE' ? 'Phòng Nữ' : room.type}
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
              <dt className="text-sm font-medium text-gray-600">Sức chứa:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {room.actualOccupancy || 0}/{room.capacity || 0} người
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Giá phòng:</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-medium">
                {formatCurrency(room.roomFee)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Tiện nghi phòng */}
        <div className="px-4 py-5 sm:px-6 bg-indigo-50">
          <h4 className="text-base font-medium text-indigo-900 flex items-center">
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Tiện nghi phòng
          </h4>
        </div>

        <div className="border-t border-gray-200">
          {room.amenities && room.amenities.length > 0 ? (
            <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.amenities.map(({ amenity, quantity, notes }) => (
                <div key={amenity.id} className="flex items-start space-x-3 p-3 rounded-md border border-gray-100 bg-gray-50">
                  <div className="flex-shrink-0 rounded-full bg-blue-100 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{amenity.name}</p>
                    <p className="text-sm text-gray-500">
                      {quantity > 1 ? `${quantity} cái` : ''}
                      {quantity > 1 && notes ? ' - ' : ''}
                      {notes ? notes : ''}
                    </p>
                    {amenity.description && (
                      <p className="text-xs text-gray-500 mt-1 italic">{amenity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-4 text-sm text-gray-500">Không có thông tin về tiện nghi phòng.</p>
          )}
        </div>

        <div className="px-4 py-5 sm:px-6 bg-indigo-50">
          <h4 className="text-base font-medium text-indigo-900 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Sinh viên cùng phòng
          </h4>
        </div>

        <div className="overflow-hidden">
          {studentRoommates.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {studentRoommates.map(student => (
                <li key={student.id} className="px-6 py-4 flex items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{student.fullName}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {student.studentId || 'Không có mã SV'}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <p className="text-sm text-gray-500">
                      {student.phoneNumber || 'Không có SĐT'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-4 text-sm text-gray-500">Không có sinh viên khác trong phòng.</p>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <Button
            onClick={() => navigate('/transfers/request')}
            className="inline-flex justify-center"
          >
            Yêu cầu chuyển phòng
          </Button>
        </div>
      </div>
    );
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">
          {isStudent ? 'Thông tin phòng ký túc xá' : 'Quản lý Phòng ở'}
        </h1>
        {canEditDelete && (
          <Button onClick={() => navigate('/rooms/new')} icon={PlusIcon}>
            Thêm phòng mới
          </Button>
        )}
      </div>

      {/* Student's current room information */}
      {isStudent && renderStudentCurrentRoom()}

      {/* Show room list for staff/admin or students without rooms */}
      {(canEditDelete || (isStudent && !studentProfile?.roomId)) && (
        <>
          <div className="mt-6 mb-3">
            <h2 className="text-xl font-medium text-gray-900">
              {isStudent ? 'Danh sách phòng trống có thể đăng ký' : 'Danh sách phòng'}
            </h2>
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
              className="w-full"
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <div className="relative">
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    bg-white appearance-none"
                >
                  {roomStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
                {filters.status && (
                  <span className="absolute left-3 top-2 flex h-2 w-2">
                    <span className={`animate-none opacity-100 rounded-full h-2 w-2 bg-${roomStatusOptions.find(opt => opt.value === filters.status)?.color || 'gray'}-500`}></span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-sm font-medium text-gray-700">
                Loại phòng
              </label>
              <div className="relative">
                <select
                  id="type"
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    bg-white appearance-none"
                >
                  {roomTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
          ) : (
            <PaginationTable
              columns={columns}
              data={isStudent && !studentProfile?.roomId ? rooms.filter(room => room.status === 'AVAILABLE') : rooms}
              currentPage={meta.currentPage}
              totalPages={meta.totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              totalRecords={meta.total}
              recordsPerPage={meta.limit}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RoomIndex;