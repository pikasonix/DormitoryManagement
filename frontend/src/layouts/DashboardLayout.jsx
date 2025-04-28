import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // Thêm useNavigate
import { useState, useMemo } from 'react'; // Bỏ useEffect
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { Toaster, toast } from 'react-hot-toast'; // Import toast nếu cần dùng trong layout

// Import Icons (Cập nhật danh sách icons cần thiết)
import {
  HomeIcon,              // Dashboard
  UsersIcon,             // Students (thay UserGroupIcon)
  BuildingOffice2Icon,   // Buildings (thay BuildingOfficeIcon)
  RectangleGroupIcon,    // Rooms (thay HomeIcon?)
  WrenchScrewdriverIcon, // Maintenance (thay SparklesIcon?)
  CurrencyDollarIcon,    // Payments
  DocumentTextIcon,      // Invoices (thay ClipboardDocumentListIcon?)
  CalculatorIcon,        // Utilities (thay ClipboardDocumentListIcon?)
  ArrowsRightLeftIcon,   // Transfers (thay ClipboardDocumentListIcon?)
  TruckIcon,             // Vehicles (thay ArchiveBoxIcon?)
  Cog6ToothIcon,         // Amenities (thay BuildingOfficeIcon?)
  UserCircleIcon,        // Profile
  ArrowLeftOnRectangleIcon, // Logout
  Bars3Icon,             // Mobile Menu Open
  XMarkIcon,             // Mobile Menu Close
  // Các icon cũ không còn dùng:
  // ExclamationCircleIcon, ClipboardDocumentListIcon, ShieldCheckIcon, SparklesIcon,
  // ChartBarIcon, ArchiveBoxIcon, AcademicCapIcon, UserIcon, UserGroupIcon
} from '@heroicons/react/24/outline';
// import LoadingSpinner from '../components/LoadingSpinner'; // PrivateRoute đã xử lý loading
import Notification from '../components/Notification'; // Component này có thể không cần nếu dùng react-hot-toast ở App.jsx

// Component Sidebar tách biệt để dễ quản lý
const SidebarContent = ({ navigation, pathname }) => {
  return (
    <div className="flex flex-col flex-grow pt-5">
      <div className="flex items-center justify-center flex-shrink-0 px-4 mb-5">
        {/* Thay bằng component Image nếu có */}
        <img
          src="/LOGO.svg" // Đảm bảo logo có trong public
          alt="Dormitory Management System Logo"
          className="h-12 w-auto"
          loading="lazy"
        />
      </div>
      <div className="mt-5 flex-grow flex flex-col">
        <nav className="flex-1 px-2 pb-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                // Kiểm tra active bằng startsWith cho các route lồng nhau
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-indigo-100 text-indigo-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-5 w-5 ${pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'text-indigo-500'
                    : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};


const DashboardLayout = () => {
  // Lấy user và hàm logout từ AuthContext
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // Dùng navigate thay vì reload trang khi logout
  const location = useLocation(); // Lấy pathname hiện tại

  // State cho việc mở/đóng menu mobile và profile dropdown
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Không cần state loading, isAuthenticated, user riêng ở đây nữa

  // --- Định nghĩa cấu trúc menu ---
  // Sử dụng useMemo để tránh tạo lại mảng này mỗi lần render trừ khi user.role thay đổi
  const navigation = useMemo(() => {
    const allNavItems = [
      { name: 'Bảng điều khiển', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] }, // Mọi người
      { name: 'Hồ sơ cá nhân', href: '/profile', icon: UserCircleIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] }, // Mọi người

      // --- Sinh viên ---
      { name: 'DS Sinh viên', href: '/students', icon: UsersIcon, roles: ['ADMIN', 'STAFF'] }, // Chỉ Admin/Staff xem DS
      // { name: 'Hồ sơ của tôi', href: `/students/${user?.profile?.id}/edit`, icon: UserCircleIcon, roles: ['STUDENT'] }, // Ví dụ link sửa profile cho student

      // --- Quản lý KTX ---
      { name: 'Tòa nhà', href: '/buildings', icon: BuildingOffice2Icon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Phòng ở', href: '/rooms', icon: RectangleGroupIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] }, // Student có thể xem phòng?
      { name: 'Tiện nghi', href: '/amenities', icon: Cog6ToothIcon, roles: ['ADMIN', 'STAFF'] },

      // --- Nghiệp vụ ---
      { name: 'Bảo trì/Sửa chữa', href: '/maintenance', icon: WrenchScrewdriverIcon, roles: ['ADMIN', 'STAFF'] }, // Link đến trang index của Admin/Staff
      { name: 'Yêu cầu sửa chữa', href: '/maintenance/request', icon: WrenchScrewdriverIcon, roles: ['STUDENT'] }, // Link đến form của Student
      { name: 'Hóa đơn', href: '/invoices', icon: DocumentTextIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Thanh toán', href: '/payments', icon: CurrencyDollarIcon, roles: ['ADMIN', 'STAFF'] }, // Lịch sử thanh toán tổng
      // { name: 'Thanh toán của tôi', href: '/profile/billing', icon: CurrencyDollarIcon, roles: ['STUDENT'] }, // Ví dụ link thanh toán của student
      { name: 'Ghi điện nước', href: '/utilities', icon: CalculatorIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Đăng ký xe', href: '/vehicles', icon: TruckIcon, roles: ['ADMIN', 'STAFF'] }, // Link đến trang index của Admin/Staff
      { name: 'Đăng ký xe (SV)', href: '/vehicles/register', icon: TruckIcon, roles: ['STUDENT'] }, // Link đến form của Student
      { name: 'Chuyển phòng', href: '/transfers', icon: ArrowsRightLeftIcon, roles: ['ADMIN', 'STAFF'] }, // Link đến trang index của Admin/Staff
      { name: 'Yêu cầu chuyển phòng', href: '/transfers/request', icon: ArrowsRightLeftIcon, roles: ['STUDENT'] }, // Link đến form của Student

      // --- LOẠI BỎ CÁC MỤC CŨ ---
      // { name: 'Báo cáo vấn đề', href: '/dashboard/problems', icon: ExclamationCircleIcon },
      // { name: 'Lịch trình & Nhiệm vụ', href: '/dashboard/tasks', icon: ClipboardDocumentListIcon },
      // { name: 'An ninh', href: '/dashboard/security', icon: ShieldCheckIcon },
      // { name: 'Báo cáo', href: '/dashboard/reports', icon: ChartBarIcon },
      // { name: 'Hàng tồn kho', href: '/dashboard/inventory', icon: ArchiveBoxIcon },
      // { name: 'Học thuật', href: '/dashboard/academic', icon: AcademicCapIcon },
    ];

    // Lọc menu dựa trên vai trò của người dùng
    if (!user || !user.role) return []; // Trả về mảng rỗng nếu chưa có user hoặc role
    return allNavItems.filter(item => item.roles.includes(user.role));

  }, [user]); // Chỉ tính toán lại khi user thay đổi


  // --- Hàm xử lý Logout ---
  const handleLogout = () => {
    setIsProfileOpen(false); // Đóng dropdown trước khi logout
    logout(); // Gọi hàm logout từ context
    // Không cần navigate ở đây vì context đã xử lý
    // toast.success('Đăng xuất thành công'); // Context hoặc interceptor có thể đã hiển thị toast
  };

  // Component này render khi PrivateRoute đã xác nhận user tồn tại
  // Không cần kiểm tra user hay loading ở đây nữa

  return (
    <div className="min-h-screen bg-gray-50"> {/* Đổi màu nền nếu muốn */}
      {/* Background pattern (Giữ nguyên hoặc bỏ) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-5" // Giảm opacity
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239ca3af' fill-opacity='0.1'%3E%3Cpath d='M50 50 H V 80 H 80 Z M 0 0 H 30 V 30 H 0 Z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row"> {/* Sử dụng Flexbox */}
        {/* Toaster đã được đặt ở App.jsx, không cần ở đây */}
        {/* <Notification ... /> */}

        {/* --- Sidebar Desktop --- */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
            <SidebarContent navigation={navigation} pathname={location.pathname} />
          </div>
        </div>

        {/* --- Sidebar Mobile --- */}
        {/* Off-canvas menu for mobile, show/hide based on sidebarOpen state. */}
        <div className={`relative z-40 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300" aria-hidden="true" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1 transform transition ease-in-out duration-300 sm:max-w-sm">
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5 text-gray-50" onClick={() => setIsSidebarOpen(false)}>
                  <span className="sr-only">Đóng thanh bên</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              {/* Sidebar component */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <SidebarContent navigation={navigation} pathname={location.pathname} />
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex flex-1 flex-col lg:pl-64">
          {/* Navbar */}
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            {/* Nút mở menu mobile */}
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <span className="sr-only">Mở thanh bên</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end"> {/* Đẩy sang phải */}
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    className="-m-1.5 flex items-center p-1.5"
                    id="user-menu-button"
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span className="sr-only">Mở menu người dùng</span>
                    {/* Lấy Avatar thật */}
                    {user?.avatar?.path ? (
                      <img className="h-8 w-8 rounded-full bg-gray-50 object-cover" src={user.avatar.path.startsWith('http') ? user.avatar.path : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${user.avatar.path}`} alt="User Avatar" /> // Thay đổi URL base nếu cần
                    ) : (
                      <UserCircleIcon className="h-8 w-8 rounded-full text-gray-400 bg-gray-100" /> // Icon mặc định
                    )}
                    <span className="hidden lg:flex lg:items-center">
                      {/* Lấy tên thật từ profile */}
                      <span className="ml-3 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                        {user?.profile?.fullName || user?.email || 'Người dùng'} {/* Ưu tiên fullName */}
                      </span>
                      {/* <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" /> */}
                    </span>
                  </button>

                  {/* Dropdown Panel */}
                  <div
                    className={`absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none transition ease-out duration-100 ${isProfileOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} // Thêm hiệu ứng và pointer-events
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex="-1"
                  >
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.profile?.fullName || 'Chưa cập nhật'}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset mt-1 ${user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 ring-purple-700/10' :
                          user?.role === 'STAFF' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                            'bg-green-50 text-green-700 ring-green-600/10' // Student
                        }`}>
                        {user?.role}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm leading-6 text-gray-700 hover:bg-gray-50"
                      role="menuitem"
                      tabIndex="-1"
                      onClick={() => setIsProfileOpen(false)} // Đóng dropdown khi click
                    >
                      Hồ sơ của bạn
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm leading-6 text-gray-700 hover:bg-gray-50"
                      role="menuitem"
                      tabIndex="-1"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Page Content */}
          <main className="flex-1 py-6">
            <div className="px-4 sm:px-6 lg:px-8">
              {/* Outlet sẽ render component con tương ứng với route hiện tại */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// Bỏ OptimizedImage nếu không cần thiết hoặc đã có component Image riêng
// const OptimizedImage = ({ src, alt, ...props }) => { ... };

export default DashboardLayout;