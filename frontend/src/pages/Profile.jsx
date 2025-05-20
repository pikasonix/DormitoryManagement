import React, { useState, useMemo } from 'react';
import { UserCircleIcon, KeyIcon /*, BriefcaseIcon*/ } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import ProfileInfo from '../components/profile/ProfileInfo';       // Đảm bảo import đúng đường dẫn
import ProfileEditForm from '../components/profile/ProfileEditForm'; // Đảm bảo import đúng đường dẫn
import SecuritySettings from '../components/profile/SecuritySettings'; // Đảm bảo import đúng đường dẫn
import LoadingSpinner from '../components/shared/LoadingSpinner'; // Import Spinner
import { toast } from 'react-hot-toast';
import StudentProfilePage from './profile/StudentProfilePage';

const Profile = () => {
  const { user, isLoading: isAuthLoading, checkAuthStatus } = useAuth(); // Lấy thêm isLoading và hàm refresh
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  // --- Xác định các tab ---
  const tabs = useMemo(() => [
    { id: 'profile', name: 'Hồ sơ', icon: UserCircleIcon },
    { id: 'security', name: 'Bảo mật', icon: KeyIcon },
    // { id: 'billing', name: 'Hóa đơn & Thanh toán', icon: CreditCardIcon }, // Ví dụ thêm tab Billing cho Student
    // { id: 'my_requests', name: 'Yêu cầu của tôi', icon: ClipboardDocumentListIcon }, // Ví dụ Tab yêu cầu của Student
  ], []);
  // --- Xử lý Loading ---
  if (isAuthLoading || !user) {
    // Hiển thị spinner nếu context đang load hoặc chưa có user (dù PrivateRoute đã check)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // --- Student-specific view ---
  if (user.role === 'STUDENT') {
    return <StudentProfilePage />;
  }

  // --- Hàm xử lý sau khi lưu form ---
  const handleSaveSuccess = async () => {
    setIsEditing(false); // Tắt chế độ chỉnh sửa
    toast.success('Hồ sơ đã được cập nhật thành công!');
    // Tùy chọn: Gọi lại checkAuthStatus để lấy dữ liệu user mới nhất từ server
    // Điều này hữu ích nếu backend không trả về user đầy đủ sau khi update
    await checkAuthStatus();
  };

  // --- Xử lý đường dẫn avatar chuẩn ---
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return '/src/assets/default-avatar.png';

    // Nếu là URL đầy đủ thì trả về nguyên vẹn
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }

    // Xây dựng URL của backend
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const baseUrl = API_BASE.replace(/\/api\/?$/, ''); // Bỏ /api ở cuối nếu có

    // Đảm bảo avatarPath bắt đầu bằng '/'
    const relativePath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

    // Ghép nối baseUrl và relativePath
    const fullUrl = `${baseUrl}${relativePath}`;

    console.log('Profile Avatar URL:', fullUrl);

    return fullUrl;
  };

  const avatarUrl = user.avatar?.path
    ? getAvatarUrl(user.avatar.path)
    : '/src/assets/default-avatar.png';

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Phần Header và Avatar (Kiểm tra user.profile trước khi truy cập) */}
      <div className="md:flex md:items-center md:justify-between pb-6 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Cài đặt Tài khoản
          </h1>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 items-center space-x-4"> {/* Tăng space-x */}
          <img
            className="h-16 w-16 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-500 sm:h-20 sm:w-20" // Thay đổi ring style
            src={avatarUrl}
            alt="User Avatar"
            onError={(e) => { e.target.onerror = null; e.target.src = 'src/assets/default-avatar.png' }} // Fallback nếu ảnh lỗi
          />
          <div>
            {/* **Kiểm tra user.profile trước khi dùng fullName** */}
            <p className="text-xl font-semibold text-gray-900">
              {user.profile?.fullName || user.name || user.email}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 ring-purple-600/20' :
              user.role === 'STAFF' ? 'bg-blue-100 text-blue-800 ring-blue-600/20' :
                'bg-green-100 text-green-800 ring-green-600/20' // STUDENT
              }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Phần Tabs (Giữ nguyên cấu trúc tabs, đã tốt) */}
      <div className="bg-white shadow sm:rounded-lg">
        {/* Tabs cho Mobile */}
        <div className="sm:hidden px-4 pt-4">
          <label htmlFor="profile-tabs" className="sr-only">Chọn tab</label>
          <select
            id="profile-tabs" name="profile-tabs" // Đổi id/name để tránh trùng lặp nếu có tabs khác
            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            value={activeTab}
            onChange={(e) => { setActiveTab(e.target.value); setIsEditing(false); }} // Reset editing khi chuyển tab
          >
            {tabs.map((tab) => (<option key={tab.id} value={tab.id}>{tab.name}</option>))}
          </select>
        </div>
        {/* Tabs cho Desktop */}
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsEditing(false); }} // Reset editing
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-150 ease-in-out ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <tab.icon className={`-ml-0.5 mr-1.5 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Nội dung của Tab */}
      <div className="mt-6">
        {activeTab === 'profile' && (
          isEditing
            // Truyền user vào form và các hàm callback
            ? <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSaveSuccess={handleSaveSuccess} />
            // Truyền user vào info và hàm bật chế độ sửa
            : <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />
        )}
        {activeTab === 'security' && (
          // Component này sẽ tự xử lý logic và gọi API đổi mật khẩu
          <SecuritySettings />
        )}
        {/* Thêm nội dung cho các tab khác nếu cần */}
        {/* {activeTab === 'billing' && <BillingHistory />} */}
        {/* {activeTab === 'my_requests' && <MyRequests />} */}
      </div>
    </div>
  );
};

export default Profile;