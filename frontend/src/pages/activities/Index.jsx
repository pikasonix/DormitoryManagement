import { useState } from 'react'
import { UserGroupIcon } from '@heroicons/react/24/outline'

const Activities = () => {
  const [activities] = useState([
    {
      id: 1,
      user: 'John Doe',
      action: 'Hoàn thành nhiệm vụ trực nhật',
      timestamp: '2 giờ trước',
      type: 'task',
      details: 'Dọn dẹp phòng tầng 1'
    },
    {
      id: 2,
      user: 'Jane Smith',
      action: 'Báo cáo vấn đề học tập',
      timestamp: '4 giờ trước',
      type: 'problem',
      details: 'Gặp khó khăn trong môn toán'
    },
    {
      id: 3,
      user: 'Mike Johnson',
      action: 'Check-in phòng mới',
      timestamp: '1 ngày trước',
      type: 'room',
      details: 'Phòng L1-05'
    },
    {
      id: 4,
      user: 'Sarah Wilson',
      action: 'Nộp bài tập',
      timestamp: '1 ngày trước',
      type: 'academic',
      details: 'Bài tập tiếng Anh'
    }
  ])

  return (
    <div className="space-y-4">
      {/* Tiêu đề */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Lịch sử Hoạt động</h1>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          defaultValue=""
        >
          <option value="">Tất cả Loại</option>
          <option value="task">Nhiệm vụ</option>
          <option value="problem">Vấn đề</option>
          <option value="room">Phòng</option>
          <option value="academic">Học tập</option>
        </select>

        <input
          type="date"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />

        <input
          type="text"
          placeholder="Tìm kiếm hoạt động..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      {/* Danh sách Hoạt động */}
      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {activities.map((activity) => (
          <div key={activity.id} className="p-6">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.timestamp}
                  </p>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-900">
                    {activity.action}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {activity.details}
                  </p>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.type === 'task' ? 'bg-green-100 text-green-800' :
                    activity.type === 'problem' ? 'bg-red-100 text-red-800' :
                      activity.type === 'room' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                    }`}>
                    {activity.type === 'task' ? 'Nhiệm vụ' :
                      activity.type === 'problem' ? 'Vấn đề' :
                        activity.type === 'room' ? 'Phòng' :
                          'Học tập'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Activities 