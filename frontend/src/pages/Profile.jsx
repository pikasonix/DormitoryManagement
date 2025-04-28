import React, { useState, useMemo } from 'react';
import { UserCircleIcon, KeyIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import ProfileInfo from '../components/profile/ProfileInfo';       // Import component con
import ProfileEditForm from '../components/profile/ProfileEditForm'; // Import component con
import SecuritySettings from '../components/profile/SecuritySettings'; // Import component con
import { toast } from 'react-hot-toast'; // Cần toast ở đây nếu có xử lý ngoài form

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  // Xác định các tab
  const tabs = useMemo(() => [
    { id: 'profile', name: 'Hồ sơ', icon: UserCircleIcon },
    { id: 'security', name: 'Bảo mật', icon: KeyIcon },
    // { id: 'activity', name: 'Hoạt động', icon: BriefcaseIcon }, // Tạm ẩn
  ], []);

  if (!user) {
    return <div className="text-center p-10">Đang tải thông tin người dùng...</div>;
  }

  // Hàm xử lý sau khi lưu thành công form chỉnh sửa
  const handleSaveSuccess = () => {
    setIsEditing(false); // Tắt chế độ chỉnh sửa
    // Có thể thêm toast thành công ở đây nếu muốn
    // toast.success('Cập nhật hồ sơ thành công!');
  };

  // Xác định avatar URL
  const avatarUrl = user.avatar?.path
    ? (user.avatar.path.startsWith('http') ? user.avatar.path : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${user.avatar.path}`)
    : '/src/assets/default-avatar.png';


  return (
    <div className="space-y-6">
      {/* Phần Header và Avatar */}
      <div className="md:flex md:items-center md:justify-between pb-6 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Cài đặt Tài khoản
          </h1>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 items-center space-x-3">
          <img
            className="h-16 w-16 rounded-full object-cover ring-4 ring-white sm:h-20 sm:w-20"
            src={avatarUrl}
            alt="User Avatar"
          />
          <div>
            <p className="text-xl font-semibold text-gray-900">{user.profile?.fullName || user.email}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset mt-1 ${user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 ring-purple-700/10' :
                user?.role === 'STAFF' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                  'bg-green-50 text-green-700 ring-green-600/10'
              }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>


      {/* Phần Tabs */}
      <div className="bg-white shadow sm:rounded-lg">
        {/* Tabs cho Mobile */}
        <div className="sm:hidden px-4 pt-4">
          <label htmlFor="tabs" className="sr-only">Chọn tab</label>
          <select
            id="tabs" name="tabs"
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
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? '' : 'text-gray-400 group-hover:text-gray-500'}`} />
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
          // Sử dụng component con đã tách
          isEditing
            ? <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSaveSuccess={handleSaveSuccess} />
            : <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />
        )}
        {activeTab === 'security' && <SecuritySettings />}
        {/* {activeTab === 'activity' && <ActivityLog />} */}
      </div>
    </div>
  );
};

export default Profile;