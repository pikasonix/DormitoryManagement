import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { facilityService } from '../../services/facility.service'
import { Card } from '../../components/shared'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const FacilityIndex = () => {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    location: ''
  })

  useEffect(() => {
    fetchFacilities()
  }, [])

  const fetchFacilities = async () => {
    try {
      setLoading(true)
      const response = await facilityService.getAll()
      setFacilities(response.data)
      setError(null)
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu cơ sở:', error)
      setError('Không thể tải dữ liệu cơ sở')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cơ sở này không?')) {
      try {
        await facilityService.delete(id)
        fetchFacilities()
      } catch (error) {
        console.error('Lỗi khi xóa cơ sở:', error)
        setError('Không thể xóa cơ sở')
      }
    }
  }

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch =
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilters = (
      (!filters.status || facility.status === filters.status) &&
      (!filters.type || facility.type === filters.type) &&
      (!filters.location || facility.location === filters.location)
    )

    return matchesSearch && matchesFilters
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800'
      case 'IN_USE':
        return 'bg-yellow-100 text-yellow-800'
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800'
      case 'OUT_OF_ORDER':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dữ liệu cơ sở</h1>
        <Link
          to="/dashboard/facilities/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm cơ sở
        </Link>
      </div>

      {/* Tìm kiếm và Lọc */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm tên hoặc mô tả..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 md:col-span-3">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Trạng thái</option>
              <option value="AVAILABLE">Có sẵn</option>
              <option value="IN_USE">Đang sử dụng</option>
              <option value="MAINTENANCE">Đang bảo trì</option>
              <option value="OUT_OF_ORDER">Hỏng</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Loại cơ sở</option>
              <option value="ROOM">Phòng</option>
              <option value="EQUIPMENT">Thiết bị</option>
              <option value="FURNITURE">Nội thất</option>
              <option value="ELECTRONIC">Điện tử</option>
            </select>

            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Vị trí</option>
              <option value="FLOOR_1">Tầng 1</option>
              <option value="FLOOR_2">Tầng 2</option>
              <option value="FLOOR_3">Tầng 3</option>
              <option value="OUTDOOR">Ngoài trời</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Lưới cơ sở */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => (
          <Card key={facility.id} className="overflow-hidden">
            {/* Hình ảnh */}
            <div className="aspect-w-16 aspect-h-9">
              {facility.image_url ? (
                <img
                  src={facility.image_url}
                  alt={facility.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = '/placeholder-facility.jpg'; // Hình ảnh thay thế nếu không tải được
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <svg
                    className="h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{facility.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{facility.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(facility.status)}`}>
                  {facility.status === 'AVAILABLE' ? 'Có sẵn' :
                    facility.status === 'IN_USE' ? 'Đang sử dụng' :
                      facility.status === 'MAINTENANCE' ? 'Đang bảo trì' :
                        facility.status === 'OUT_OF_ORDER' ? 'Hỏng' : facility.status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Loại:</span>
                  {facility.type === 'ROOM' ? 'Phòng' :
                    facility.type === 'EQUIPMENT' ? 'Thiết bị' :
                      facility.type === 'FURNITURE' ? 'Nội thất' :
                        facility.type === 'ELECTRONIC' ? 'Điện tử' : facility.type}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Vị trí:</span>
                  {facility.location === 'FLOOR_1' ? 'Tầng 1' :
                    facility.location === 'FLOOR_2' ? 'Tầng 2' :
                      facility.location === 'FLOOR_3' ? 'Tầng 3' :
                        facility.location === 'OUTDOOR' ? 'Ngoài trời' : facility.location}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Tình trạng:</span>
                  {facility.condition === 'GOOD' ? (
                    <div className="flex items-center text-green-500">
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      <span>Tốt</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-500">
                      <XCircleIcon className="h-5 w-5 mr-1" />
                      <span>Cần sửa chữa</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Link
                  to={`/dashboard/facilities/${facility.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  Chỉnh sửa
                </Link>
                <button
                  onClick={() => handleDelete(facility.id)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FacilityIndex