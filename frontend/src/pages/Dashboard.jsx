import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/axios';
import { Card } from '../components/shared';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  UsersIcon,
  BuildingOffice2Icon,
  RectangleGroupIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  BellAlertIcon, // Icon cho thông báo hoặc yêu cầu mới
  InformationCircleIcon, // Icon cho thông tin sinh viên
} from '@heroicons/react/24/outline';

// Đăng ký các thành phần cần thiết cho ChartJS (chỉ cần cho Pie/Doughnut)
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth(); // Lấy user và trạng thái loading từ context
  const [stats, setStats] = useState(null); // State cho dữ liệu thống kê (Admin/Staff)
  const [studentInfo, setStudentInfo] = useState(null); // State cho thông tin sinh viên (Student)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || isAuthLoading) return; // Chờ user và auth load xong

      setIsLoading(true);
      setError(null);

      try {
        if (user.role === 'ADMIN' || user.role === 'STAFF') {
          // --- Fetch data cho Admin/Staff ---
          const [
            dashboardRes,
            roomRes,
            maintenanceRes,
            invoiceRes
          ] = await Promise.allSettled([
            // Use dashboard stats API to get all the stats we need
            apiClient.get('/dashboard/stats'),
            // Still get room info for the chart data
            apiClient.get('/rooms'),
            // These are kept for backwards compatibility but we'll
            // use the dashboard stats for the UI metrics
            apiClient.get('/maintenance?status=PENDING&limit=1'),
            apiClient.get('/invoices?status=UNPAID&limit=1'),
          ]);

          // Get stats from dashboard API
          const dashboardData = dashboardRes.status === 'fulfilled' ? dashboardRes.value.data?.data : null;

          // Extract stats from dashboard API response
          const totalStudents = dashboardData?.totalStudents ?? 0;
          const availableRooms = dashboardData?.availableRooms ?? 0;
          const pendingMaintenance = dashboardData?.pendingMaintenance ?? 0;
          const pendingInvoices = dashboardData?.unpaidInvoices ?? 0;

          // Xử lý kết quả room
          let roomStats = { total: 0, available: availableRooms, occupied: 0, maintenance: 0 };
          if (roomRes.status === 'fulfilled' && roomRes.value.data?.data) {
            const rooms = roomRes.value.data.data;
            roomStats.total = rooms.length;
            rooms.forEach(room => {
              // Giả sử status là 'AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE', 'FULL'
              if (room.status === 'OCCUPIED' || room.status === 'FULL') roomStats.occupied++;
              else if (room.status === 'UNDER_MAINTENANCE') roomStats.maintenance++;
            });
          }

          setStats({
            totalStudents,
            roomStats,
            pendingMaintenance,
            pendingInvoices,
          });

        } else if (user.role === 'STUDENT') {
          // --- Fetch data cho Student ---
          // Thông tin user cơ bản đã có trong `user` từ context
          // Cần lấy thêm: phòng đang ở, hóa đơn chưa trả
          const studentProfileId = user.profile?.id; // Lấy ID profile sinh viên từ user context
          if (!studentProfileId) {
            throw new Error("Không tìm thấy thông tin hồ sơ sinh viên.");
          }

          const [roomRes, invoiceRes] = await Promise.allSettled([
            // Lấy thông tin phòng dựa vào roomId trong profile student (nếu có)
            user.profile?.roomId ? apiClient.get(`/rooms/${user.profile.roomId}`) : Promise.resolve({ status: 'fulfilled', value: { data: { data: null } } }), // Nếu ko có roomId thì trả về null
            // Lấy hóa đơn chưa thanh toán của sinh viên này
            apiClient.get(`/invoices?studentId=${studentProfileId}&status=UNPAID`),
          ]);

          const currentRoom = roomRes.status === 'fulfilled' ? roomRes.value.data?.data : null;
          const pendingInvoices = invoiceRes.status === 'fulfilled' ? invoiceRes.value.data?.data ?? [] : [];

          setStudentInfo({
            currentRoom,
            pendingInvoicesCount: pendingInvoices.length,
            // Có thể thêm các thông tin khác như thông báo, lịch hoạt động sắp tới...
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Dashboard:', err);
        setError('Không thể tải dữ liệu cho bảng điều khiển.');
        // Lỗi 401/403 đã được interceptor xử lý
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Chạy lại khi user thay đổi (ví dụ: logout rồi login lại với role khác)
  }, [user, isAuthLoading]);

  // --- Dữ liệu và Tùy chọn cho Biểu đồ (Admin/Staff) ---
  const roomChartData = useMemo(() => {
    if (!stats?.roomStats) return null;
    const { available, occupied, maintenance } = stats.roomStats;
    return {
      labels: ['Phòng trống', 'Đang ở/Đầy', 'Đang bảo trì'],
      datasets: [{
        data: [available, occupied, maintenance],
        backgroundColor: [
          'rgba(52, 211, 153, 0.7)', // emerald-400
          'rgba(59, 130, 246, 0.7)', // blue-500
          'rgba(245, 158, 11, 0.7)', // amber-500
        ],
        borderColor: [
          'rgba(5, 150, 105, 1)', // emerald-600
          'rgba(37, 99, 235, 1)',  // blue-600
          'rgba(217, 119, 6, 1)',  // amber-600
        ],
        borderWidth: 1,
      }],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Cho phép biểu đồ co giãn tốt hơn
    plugins: {
      legend: {
        position: 'bottom', // Chuyển chú giải xuống dưới
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              // Tính % nếu muốn
              const total = context.dataset.data.reduce((acc, value) => acc + value, 0);
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
              label += `${value} (${percentage})`;
            }
            return label;
          },
        },
      },
    },
  };

  // --- Render UI ---
  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Lỗi!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // --- Render cho Admin/Staff ---
  if (user && (user.role === 'ADMIN' || user.role === 'STAFF') && stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Bảng điều khiển</h1>

        {/* Các thẻ thống kê nhanh */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Tổng Sinh viên</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 rounded-b-lg">
              <div className="text-sm">
                <Link to="/students" className="font-medium text-indigo-600 hover:text-indigo-500">Xem chi tiết</Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <RectangleGroupIcon className="h-6 w-6 text-green-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Phòng Trống</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.roomStats.available}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 rounded-b-lg">
              <div className="text-sm">
                <Link to="/rooms" className="font-medium text-indigo-600 hover:text-indigo-500">Xem chi tiết</Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">YC Bảo trì Chờ xử lý</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.pendingMaintenance}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 rounded-b-lg">
              <div className="text-sm">
                <Link to="/maintenance" className="font-medium text-indigo-600 hover:text-indigo-500">Xem chi tiết</Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Hóa đơn Chưa thanh toán</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.pendingInvoices}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 rounded-b-lg">
              <div className="text-sm">
                <Link to="/invoices" className="font-medium text-indigo-600 hover:text-indigo-500">Xem chi tiết</Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Biểu đồ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Biểu đồ trạng thái phòng */}
          <Card className="lg:col-span-2">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trạng thái phòng</h3>
              {roomChartData ? (
                <div className="h-64 md:h-80"> {/* Tăng chiều cao biểu đồ */}
                  <Pie data={roomChartData} options={chartOptions} />
                </div>
              ) : (
                <p className="text-gray-500">Không có dữ liệu phòng.</p>
              )}
            </div>
          </Card>

          {/* Có thể thêm Card cho các hoạt động gần đây hoặc thông báo khác */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hoạt động gần đây</h3>
              {/* TODO: Fetch và hiển thị hoạt động gần đây */}
              <ul className="space-y-2 text-sm text-gray-600">
                <li>- Yêu cầu bảo trì mới từ phòng A101.</li>
                <li>- Sinh viên Nguyễn Văn B vừa đăng ký xe.</li>
                <li>- Hóa đơn tháng 5 đã được tạo.</li>
              </ul>
              <Link to="#" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">Xem tất cả</Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- Render cho Student ---
  if (user && user.role === 'STUDENT' && studentInfo) {
    const { currentRoom, pendingInvoicesCount } = studentInfo;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chào mừng, {user.profile?.fullName || user.name || user.email}!</h1>

        {/* Thông tin phòng ở */}
        <Card>
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <RectangleGroupIcon className="h-5 w-5 mr-2 text-indigo-500" />
              Phòng ở hiện tại
            </h3>
            {currentRoom ? (
              <div>
                <p><span className="font-medium">Tòa nhà:</span> {currentRoom.building?.name || 'N/A'}</p>
                <p><span className="font-medium">Số phòng:</span> {currentRoom.number}</p>
                <p><span className="font-medium">Loại phòng:</span> {currentRoom.type}</p>
                {/* Thêm các thông tin khác nếu cần */}
                <Link to={`/rooms`} className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">Xem chi tiết phòng</Link>
              </div>
            ) : (
              <p className="text-gray-600">Bạn chưa được xếp phòng.</p>
              // Có thể thêm Link đến trang đăng ký phòng
            )}
          </div>
        </Card>

        {/* Thông báo & Hành động nhanh */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Hóa đơn chờ thanh toán */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-red-500" />
                Hóa đơn & Thanh toán
              </h3>
              {pendingInvoicesCount > 0 ? (
                <p className="text-red-600">Bạn có {pendingInvoicesCount} hóa đơn chưa thanh toán.</p>
              ) : (
                <p className="text-green-600">Không có hóa đơn nào cần thanh toán.</p>
              )}
              <Link to="/profile" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">Xem hóa đơn của bạn</Link> {/* Link đến tab billing trong profile? */}
            </div>
          </Card>

          {/* Yêu cầu bảo trì */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 mr-2 text-yellow-500" />
                Bảo trì & Sửa chữa
              </h3>
              <p className="text-gray-600 mb-3">Gặp sự cố trong phòng? Gửi yêu cầu ngay.</p>
              <Link
                to="/maintenance/request"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Gửi yêu cầu mới
              </Link>
            </div>
          </Card>
        </div>
        {/* Có thể thêm phần Thông báo chung hoặc Lịch hoạt động sắp tới */}
      </div>
    );
  }

  // Trường hợp không khớp role nào hoặc không có dữ liệu (ít xảy ra nếu logic đúng)
  return <div>Không có dữ liệu hiển thị cho bảng điều khiển.</div>;
};

export default Dashboard;