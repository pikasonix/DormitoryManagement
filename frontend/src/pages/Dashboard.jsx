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
  UserCircleIcon, // Icon cho hồ sơ cá nhân
  TruckIcon, // Icon cho phương tiện
  ArrowsRightLeftIcon, // Icon cho chuyển phòng
  ExclamationTriangleIcon, // Icon cho cảnh báo
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

          // Không throw error nếu không có studentProfileId, thay vào đó chỉ cần log và tiếp tục
          if (!studentProfileId) {
            console.warn("Không tìm thấy thông tin hồ sơ sinh viên, có thể hồ sơ chưa được tạo hoặc đang chờ phê duyệt");
            // Set studentInfo rỗng để tránh lỗi và vẫn hiển thị giao diện
            setStudentInfo({
              currentRoom: null,
              pendingInvoicesCount: 0,
            });
            return; // Thoát sớm, không làm các API call tiếp theo
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

        // Nếu là sinh viên, không hiển thị lỗi - chỉ log ra console
        if (user.role === 'STUDENT') {
          console.warn('Bỏ qua lỗi cho tài khoản sinh viên và hiển thị dashboard mặc định');
          setError(null); // Đảm bảo không có lỗi nào được hiển thị
        } else {
          setError('Không thể tải dữ liệu cho bảng điều khiển.');
        }
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

          {/* Bổ sung tính năng thông báo */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thông báo</h3>
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
  if (user && user.role === 'STUDENT') {
    // Xác định trạng thái sinh viên từ các nguồn có thể
    const studentStatus = user.studentProfile?.status

    // Lấy tên hiển thị của sinh viên
    const userName = user.studentProfile?.fullName

    // Hiển thị đặc biệt cho sinh viên với trạng thái PENDING_APPROVAL
    if (studentStatus === 'PENDING_APPROVAL') {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900">Chào mừng, {userName}!</h1>

          {/* Giới thiệu - Logo và tiêu đề */}
          <Card>
            <div className="pt-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img src="/LOGO.svg" alt="KTX Bách Khoa" className="h-8 w-auto" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">HỆ THỐNG QUẢN LÝ KÝ TÚC XÁ BÁCH KHOA</h2>
                  <p className="text-sm text-gray-500">Phiên bản 1.0 - {new Date().getFullYear()}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Thông báo hoàn thành hồ sơ */}
          <Card>
            <div className="p-6 border-l-4 border-yellow-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-7 w-7 text-yellow-500" aria-hidden="true" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-yellow-800">Hồ sơ của bạn đang chờ phê duyệt</h3>
                  <div className="mt-2 text-yellow-700">
                    <p className="mb-3">
                      Bạn cần hoàn thiện hồ sơ cá nhân và cung cấp đầy đủ thông tin để được phê duyệt đăng ký Ký túc xá
                    </p>
                    <p className="mb-3">
                      Vui lòng cập nhật các thông tin sau:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Thông tin cá nhân</li>
                      <li>Thông tin học tập</li>
                      <li>Địa chỉ thường trú</li>
                      <li>Thông tin gia đình</li>
                      <li>Thông tin liên hệ khẩn cấp</li>
                    </ul>
                  </div>
                  <div className="mt-6">
                    <Link
                      to="/profile/edit"
                      state={{ pendingApproval: true }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      Cập nhật hồ sơ
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Các câu hỏi thường gặp */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Các câu hỏi thường gặp</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Khi nào hồ sơ của tôi sẽ được phê duyệt?</h3>
                  <p className="mt-1 text-gray-600">Hồ sơ sẽ được phê duyệt vào 16:00 - 17:00 hàng ngày.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Tôi có thể sử dụng những dịch vụ nào khi chưa được phê duyệt?</h3>
                  <p className="mt-1 text-gray-600">Bạn chỉ có thể xem và chỉnh sửa hồ sơ cá nhân. Các dịch vụ khác sẽ được mở sau khi hồ sơ được phê duyệt.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Làm sao để liên hệ với quản lý KTX?</h3>
                  <p className="mt-1 text-gray-600">Bạn có thể liên hệ qua email: admin@example.com</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Hiển thị dashboard bình thường cho sinh viên đã được phê duyệt
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chào mừng, {userName}!</h1>

        {/* Giới thiệu */}
        <Card>
          <div className="pt-1">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/LOGO.svg" alt="KTX Bách Khoa" className="h-8 w-auto" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">HỆ THỐNG QUẢN LÝ KÝ TÚC XÁ BÁCH KHOA</h2>
                <p className="text-sm text-gray-500">Phiên bản 1.0 - {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Các chức năng chính */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Hồ sơ cá nhân */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
                Hồ sơ cá nhân
              </h3>
              <p className="text-gray-600 mb-3">Cập nhật thông tin cá nhân và xem hồ sơ của bạn</p>
              <Link to="/profile" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Xem hồ sơ
              </Link>
            </div>
          </Card>

          {/* Hóa đơn & Thanh toán */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-red-500" />
                Hóa đơn & Thanh toán
              </h3>
              {studentInfo?.pendingInvoicesCount > 0 ? (
                <p className="text-red-600 mb-3">Bạn có {studentInfo.pendingInvoicesCount} hóa đơn chưa thanh toán.</p>
              ) : (
                <p className="text-gray-600 mb-3">Quản lý và thanh toán các hóa đơn của bạn</p>
              )}
              <Link to="/invoices" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Xem hóa đơn
              </Link>
            </div>
          </Card>

          {/* Yêu cầu bảo trì */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 mr-2 text-yellow-500" />
                Bảo trì & Sửa chữa
              </h3>
              <p className="text-gray-600 mb-3">Gặp sự cố trong phòng? Gửi yêu cầu ngay</p>
              <Link to="/maintenance" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Yêu cầu sửa chữa
              </Link>
            </div>
          </Card>

          {/* Đăng ký phương tiện */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <TruckIcon className="h-5 w-5 mr-2 text-purple-500" />
                Quản lý phương tiện
              </h3>
              <p className="text-gray-600 mb-3">Đăng ký và quản lý xe của bạn trong ký túc xá</p>
              <Link to="/vehicles" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Quản lý phương tiện
              </Link>
            </div>
          </Card>

          {/* Thông tin phòng */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <BuildingOffice2Icon className="h-5 w-5 mr-2 text-teal-500" />
                Thông tin phòng ở
              </h3>
              <p className="text-gray-600 mb-3">Xem thông tin chi tiết về phòng ở, các tiện ích và danh sách sinh viên phòng</p>
              <Link to="/buildings" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Xem phòng ở
              </Link>
            </div>
          </Card>

          {/* Đăng ký chuyển phòng */}
          <Card>
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <ArrowsRightLeftIcon className="h-5 w-5 mr-2 text-green-500" />
                Chuyển phòng
              </h3>
              <p className="text-gray-600 mb-3">Yêu cầu chuyển sang phòng ở mới hoặc thay đổi chỗ ở</p>
              <Link to="/transfers" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Đăng ký chuyển phòng
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Trường hợp không khớp role nào hoặc không có dữ liệu (ít xảy ra nếu logic đúng)
  return <div>Không có dữ liệu hiển thị cho bảng điều khiển.</div>;
};

export default Dashboard;