import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react'; // Thêm useEffect
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { getMediaUrl } from '../utils/mediaUtils';
// Import Icons (Đảm bảo đã import đủ các icon cần dùng)
import {
  HomeIcon,              // Dashboard
  UsersIcon,             // Students
  BuildingOffice2Icon,   // Buildings
  RectangleGroupIcon,    // Rooms
  WrenchScrewdriverIcon, // Maintenance (Staff/Admin view + Student request)
  CurrencyDollarIcon,    // Payments (Staff/Admin view + Student billing?)
  DocumentTextIcon,      // Invoices
  CalculatorIcon,        // Utilities
  ArrowsRightLeftIcon,   // Transfers (Staff/Admin view + Student request)
  TruckIcon,             // Vehicles (Staff/Admin view + Student register)
  Cog6ToothIcon,         // Amenities
  UserCircleIcon,        // Profile
  ArrowLeftOnRectangleIcon, // Logout
  Bars3Icon,             // Mobile Menu Open
  XMarkIcon,             // Mobile Menu Close
  // ChevronDownIcon,    // Có thể thêm cho dropdown nếu muốn
} from '@heroicons/react/24/outline';
// LoadingSpinner không cần thiết ở đây vì PrivateRoute xử lý
// Notification không cần nếu dùng Toaster global

// Thêm default avatar path
const DEFAULT_AVATAR = 'src/assets/default-avatar.png';

// --- Component Sidebar tách biệt ---
const SidebarContent = ({ navigation, pathname }) => {
  return (
    // Phần logo và cấu trúc nav giữ nguyên như của bạn, đã khá tốt
    <div className="flex flex-col flex-grow pt-5 overflow-y-auto"> {/* Thêm overflow-y-auto */}
      <div className="flex items-center justify-center flex-shrink-0 px-4 mb-5">
        <img
          src="/LOGO.svg"
          alt="Ký Túc Xá - Hệ Thống Quản Lý"
          className="h-12 w-auto"
          loading="lazy"
        />
      </div>
      <nav className="mt-5 flex-1 px-2 pb-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${pathname === item.href || pathname.startsWith(item.href + '/')
              ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-sm' // Thêm shadow nhẹ khi active
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150 ease-in-out ${pathname === item.href || pathname.startsWith(item.href + '/')
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
  );
};

// --- Layout chính ---
const DashboardLayout = () => {
  const { user, logout } = useAuth(); // Lấy user và logout từ context
  // Không cần navigate ở đây vì logout context đã xử lý
  const location = useLocation(); // Lấy pathname

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- Định nghĩa cấu trúc menu (Đã tối ưu với useMemo và role filtering) ---
  const navigation = useMemo(() => {
    const allNavItems = [
      { name: 'Trang chủ', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] },
      { name: 'Hồ sơ cá nhân', href: '/profile', icon: UserCircleIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] },
      { name: 'Quản lý sinh viên', href: '/students', icon: UsersIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý tòa nhà', href: '/buildings', icon: BuildingOffice2Icon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý phòng ở', href: '/rooms', icon: RectangleGroupIcon, roles: ['ADMIN', 'STAFF', 'STUDENT'] },
      { name: 'Tiện nghi KTX', href: '/amenities', icon: Cog6ToothIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý bảo trì', href: '/maintenance', icon: WrenchScrewdriverIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Yêu cầu sửa chữa', href: '/maintenance/request', icon: WrenchScrewdriverIcon, roles: ['STUDENT'] }, { name: 'Quản lý hóa đơn', href: '/invoices', icon: DocumentTextIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý thanh toán', href: '/payments', icon: CurrencyDollarIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý đơn giá', href: '/fees', icon: CurrencyDollarIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Điện nước', href: '/utilities', icon: CalculatorIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Quản lý phương tiện', href: '/vehicles', icon: TruckIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Đăng ký phương tiện', href: '/vehicles/register', icon: TruckIcon, roles: ['STUDENT'] }, { name: 'Quản lý chuyển phòng', href: '/transfers', icon: ArrowsRightLeftIcon, roles: ['ADMIN', 'STAFF'] },
      { name: 'Đăng ký chuyển phòng', href: '/transfers', icon: ArrowsRightLeftIcon, roles: ['STUDENT'] },
    ];

    if (!user || !user.role) return [];
    return allNavItems.filter(item => item.roles.includes(user.role));
  }, [user]); // Phụ thuộc vào user

  // --- Hàm xử lý Logout (Giữ nguyên, đã tốt) ---
  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  // --- Cập nhật lại hàm getAvatarUrl để xử lý đúng yêu cầu ---
  const getAvatarUrl = () => {
    // Nếu user có avatarUrl là một đường link hoàn chỉnh (bắt đầu với http/https), sử dụng trực tiếp
    if (user?.avatarUrl && typeof user.avatarUrl === 'string' && user.avatarUrl.trim() !== '') {
      // Kiểm tra xem URL có bắt đầu bằng http:// hoặc https:// không
      if (user.avatarUrl.startsWith('http://') || user.avatarUrl.startsWith('https://')) {
        console.log('Sử dụng URL đầy đủ:', user.avatarUrl);
        return user.avatarUrl;
      } else {
        // Nếu là đường dẫn tương đối, thêm URL cơ sở
        console.log('Sử dụng URL tương đối:', user.avatarUrl);
        const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || '';
        return `${baseUrl}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`;
      }
    }
    // Nếu không có avatarUrl nhưng có avatar.path thì sử dụng
    else if (user?.avatar?.path) {
      return getMediaUrl(user.avatar.path);
    }
    // Nếu không có cả hai thì trả về null (sẽ dùng default)
    return null;
  };

  // Log thông tin avatar để debug
  useEffect(() => {
    const avatarUrl = getAvatarUrl();
    console.log('Thông tin avatar:', {
      userAvatar: user?.avatarUrl,
      processedUrl: avatarUrl,
      defaultPath: DEFAULT_AVATAR
    });
  }, [user]);

  // --- Render Layout ---
  return (
    <div className="min-h-screen bg-gray-100"> {/* Đổi nền sang gray-100 cho dịu mắt hơn */}
      {/* Background pattern có thể giữ hoặc bỏ tùy ý */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-5"
        style={{ /* style của bạn */ }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen"> {/* Thêm min-h-screen */}

        {/* --- Sidebar Desktop (fixed) --- */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-64 lg:flex-col"> {/* Tăng z-index */}
          <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white shadow-md"> {/* Thêm shadow */}
            <SidebarContent navigation={navigation} pathname={location.pathname} />
          </div>
        </div>

        {/* --- Sidebar Mobile (Off-canvas) --- */}
        <div className={`relative z-40 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
          {/* Overlay */}
          <div className="fixed inset-0 bg-gray-600/75 transition-opacity ease-linear duration-300" aria-hidden="true" onClick={() => setIsSidebarOpen(false)}></div>
          {/* Sidebar Panel */}
          <div className="fixed inset-0 flex">
            <div className={`relative mr-16 flex w-full max-w-xs flex-1 transform transition ease-in-out duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}> {/* Thêm transition */}
              {/* Nút đóng */}
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5 text-white hover:text-gray-300" onClick={() => setIsSidebarOpen(false)}>
                  <span className="sr-only">Đóng thanh bên</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              {/* Nội dung Sidebar */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 ring-1 ring-white/10"> {/* Thêm ring */}
                <SidebarContent navigation={navigation} pathname={location.pathname} />
              </div>
            </div>
          </div>
        </div>


        {/* --- Main Content Area --- */}
        <div className="flex flex-1 flex-col lg:pl-64"> {/* Đảm bảo padding left đúng bằng chiều rộng sidebar */}
          {/* Navbar */}
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            {/* Nút mở menu mobile */}
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <span className="sr-only">Mở thanh bên</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Profile Dropdown (đẩy sang phải) */}
            <div className="flex flex-1 justify-end gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="relative">
                  <button
                    type="button"
                    className="-m-1.5 flex items-center p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    id="user-menu-button"
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span className="sr-only">Mở menu người dùng</span>
                    {/* Hiển thị avatar - sửa lại xử lý URL đầy đủ */}
                    {(() => {
                      const avatarUrl = getAvatarUrl();
                      console.log('Rendering avatar with URL:', avatarUrl);



                      if (avatarUrl) {
                        // Có URL avatar hợp lệ
                        return (
                          <img
                            className="h-8 w-8 rounded-full bg-gray-200 object-cover border border-gray-200"
                            src={avatarUrl}
                            alt="User Avatar"
                            onError={(e) => {
                              console.error('Avatar load error:', e);
                              console.log('Failed URL:', e.target.src);
                              e.target.onerror = null;
                              e.target.src = DEFAULT_AVATAR;
                            }}
                          />

                        );
                      } else {
                        // Không có avatar, hiển thị mặc định
                        return (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserCircleIcon className="h-7 w-7 text-gray-500" aria-hidden="true" />
                          </div>
                        );
                      }
                    })()}
                    <span className="hidden lg:flex lg:items-center">
                      <span className="ml-3 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                        {/* Ưu tiên fullName từ profile nếu có */}
                        {user?.profile?.fullName || user?.name || user?.email || 'Người dùng'}
                      </span>
                    </span>
                  </button>

                  {/* Dropdown Panel (Giữ nguyên logic hiển thị, đã tốt) */}
                  <div
                    className={`absolute right-0 z-20 mt-2.5 w-56 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none transition ease-out duration-100 ${isProfileOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} // Tăng z-index
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex="-1"
                  >                    {/* Nội dung dropdown với logic hiển thị tên người dùng đã được sửa */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.role === 'ADMIN'
                          ? 'Admin'
                          : (user?.profile?.fullName || user?.staffProfile?.fullName || user?.studentProfile?.fullName || user?.name || user?.email?.split('@')[0] || 'Người dùng')}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 ring-purple-600/20' :
                        user?.role === 'STAFF' ? 'bg-blue-100 text-blue-800 ring-blue-600/20' :
                          'bg-green-100 text-green-800 ring-green-600/20' // STUDENT
                        }`}>
                        {user?.role || 'Unknown Role'}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      role="menuitem"
                      tabIndex="-1"
                      onClick={() => setIsProfileOpen(false)} // Đóng dropdown
                    >
                      Hồ sơ của bạn
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" // Màu đỏ cho logout
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
          <main className="flex-1 py-6 lg:py-8"> {/* Tăng padding */}
            <div className="px-4 sm:px-6 lg:px-8">

              {/* ---- Nội dung chính của trang sẽ được render ở đây ---- */}
              <Outlet />
              {/* ------------------------------------------------------- */}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;