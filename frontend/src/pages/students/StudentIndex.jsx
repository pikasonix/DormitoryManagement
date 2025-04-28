import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { buildingService } from '../../services/building.service'; // Để lọc theo tòa nhà
import { roomService } from '../../services/room.service'; // Để lọc theo phòng
import StudentInfoCard from '../../components/students/StudentInfoCard'; // Card hiển thị
import Pagination from '../../components/shared/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import SearchInput from '../../components/shared/SearchInput';
import Select from '../../components/shared/Select';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { StudentStatus } from '@prisma/client'; // Import enum nếu cần (hoặc định nghĩa const)

// Options cho bộ lọc Status
const studentStatuses = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'RENTING', label: 'Đang ở' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'CHECKED_OUT', label: 'Đã rời đi' },
  { value: 'EVICTED', label: 'Buộc thôi ở' },
];

const StudentIndex = () => {
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]); // Phòng thuộc tòa nhà đã chọn
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, limit: 10 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    buildingId: '',
    roomId: '',
    status: '',
    faculty: '', // Thêm filter theo Khoa
    courseYear: '', // Thêm filter theo Khóa
  });

  // Fetch buildings cho bộ lọc
  useEffect(() => {
    buildingService.getAllBuildings({ limit: 500 })
      .then(res => setBuildings([{ value: '', label: 'Tất cả tòa nhà' }, ...res.data.map(b => ({ value: b.id, label: b.name }))]))
      .catch(err => console.error("Lỗi lấy tòa nhà:", err));
  }, []);

  // Fetch rooms khi building thay đổi
  useEffect(() => {
    if (filters.buildingId) {
      roomService.getAllRooms({ buildingId: filters.buildingId, limit: 500 }) // Lấy hết phòng trong tòa nhà
        .then(res => setRooms([{ value: '', label: 'Tất cả phòng' }, ...res.data.map(r => ({ value: r.id, label: r.number }))]))
        .catch(err => { console.error("Lỗi lấy phòng:", err); setRooms([]); });
    } else {
      setRooms([]); // Xóa danh sách phòng nếu không chọn tòa nhà
    }
    // Reset filter phòng khi tòa nhà thay đổi
    setFilters(prev => ({ ...prev, roomId: '' }));
  }, [filters.buildingId]);

  // Fetch danh sách sinh viên
  const fetchStudents = useCallback(async (page = 1, limit = 10, search = '', currentFilters = {}) => {
    setLoading(true);
    setError(null);
    const activeFilters = Object.entries(currentFilters)
      .filter(([, value]) => value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    try {
      const params = { page, limit, search, ...activeFilters, sortBy: 'fullName', sortOrder: 'asc' };
      const response = await studentService.getAllStudents(params);
      setStudents(response.data || []);
      setPagination({
        currentPage: page,
        totalPages: Math.ceil(response.total / limit),
        totalItems: response.total,
        limit: limit,
      });
    } catch (err) {
      setError('Không thể tải danh sách sinh viên.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger fetch khi state thay đổi
  useEffect(() => {
    const debounceFetch = setTimeout(() => {
      fetchStudents(pagination.currentPage, pagination.limit, searchTerm, filters);
    }, 500);
    return () => clearTimeout(debounceFetch);
  }, [pagination.currentPage, pagination.limit, searchTerm, filters, fetchStudents]);

  // Xử lý thay đổi filter
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Xử lý thay đổi tìm kiếm
  const handleSearchChange = (searchValue) => {
    setSearchTerm(searchValue);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };


  // Xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Xử lý xóa sinh viên (cần xác nhận)
  const handleDeleteStudent = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sinh viên "${name}"? Tất cả dữ liệu liên quan (hóa đơn, thanh toán,...) cũng sẽ bị xóa!`)) {
      try {
        await studentService.deleteStudent(id);
        // Tải lại trang hiện tại
        fetchStudents(pagination.currentPage, pagination.limit, searchTerm, filters);
        // toast.success đã có trong service
      } catch (err) {
        console.error("Lỗi khi xóa sinh viên từ Index:", err);
      }
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Sinh viên</h1>
        <Link
          to="/students/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Thêm Sinh viên
        </Link>
      </div>

      {/* Filters và Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white p-4 rounded-lg shadow">
        <div className="lg:col-span-2">
          <SearchInput
            placeholder="Tìm theo tên, MSSV, email, CCCD..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div>
          <Select label="Tòa nhà" name="buildingId" value={filters.buildingId} onChange={handleFilterChange} options={buildings} />
        </div>
        <div>
          <Select label="Phòng" name="roomId" value={filters.roomId} onChange={handleFilterChange} options={rooms} disabled={!filters.buildingId || rooms.length <= 1} />
        </div>
        <div>
          <Select label="Trạng thái" name="status" value={filters.status} onChange={handleFilterChange} options={studentStatuses} />
        </div>
        <div>
          <input type="text" name="faculty" value={filters.faculty} onChange={handleFilterChange} placeholder="Lọc theo khoa..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {/* Hoặc dùng Select nếu có danh sách Khoa cố định */}
        </div>
        {/* Thêm filter cho courseYear nếu cần */}
      </div>


      {/* Loading / Error */}
      {loading && <div className="text-center py-10"><LoadingSpinner /></div>}
      {!loading && error && <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded">{error}</div>}

      {/* Danh sách sinh viên */}
      {!loading && !error && students.length > 0 && (
        <div className="space-y-4">
          {students.map((student) => (
            <StudentInfoCard key={student.id} student={student} />
            // Hoặc dùng Table component nếu muốn hiển thị dạng bảng
          ))}
        </div>
      )}

      {/* Không có dữ liệu */}
      {!loading && !error && students.length === 0 && (
        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Không tìm thấy sinh viên</h3>
          <p className="mt-1 text-sm text-gray-500">Không có sinh viên nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      )}

      {/* Phân trang */}
      {!loading && !error && students.length > 0 && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

    </div>
  );
};

export default StudentIndex;