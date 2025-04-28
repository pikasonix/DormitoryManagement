import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Alert, Button, Card, Input, Select } from '../../components/shared'

const FacilityForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    capacity: '',
    status: 'available',
    image: '',
    description: '',
    location: '',
    maintenanceSchedule: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      console.log('Submitting facility data:', formData)

      const response = await api.post('/api/facilities', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Facility created:', response.data)

      navigate('/dashboard/facilities', {
        state: { message: 'Cơ sở vật chất đã được thêm thành công' }
      })
    } catch (error) {
      console.error('Error creating facility:', error)
      setError(
        error.response?.data?.message ||
        'Thêm cơ sở vật chất thất bại. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Thêm Cơ Sở Vật Chất</h2>

      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Tên Cơ Sở Vật Chất"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Select
              label="Loại"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Chọn Loại</option>
              <option value="Study Room">Phòng Học</option>
              <option value="Computer Lab">Phòng Máy Tính</option>
              <option value="Multi-purpose Hall">Hội Trường</option>
              <option value="Library">Thư Viện</option>
              <option value="Meeting Room">Phòng Họp</option>
            </Select>

            <Input
              label="Sức Chứa"
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              required
              min="1"
            />

            <Input
              label="Vị Trí"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ví dụ: Tầng 1"
            />

            <Input
              label="URL Hình Ảnh"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />

            <Select
              label="Trạng Thái"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="available">Có Sẵn</option>
              <option value="maintenance">Bảo Trì</option>
              <option value="booked">Đã Đặt</option>
            </Select>
          </div>

          <div className="mt-4">
            <Input
              label="Lịch Bảo Trì"
              name="maintenanceSchedule"
              value={formData.maintenanceSchedule}
              onChange={handleChange}
              placeholder="Ví dụ: Mỗi Tuần"
            />
          </div>

          <div className="mt-4">
            <Input
              label="Mô Tả"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              placeholder="Mô tả cơ sở vật chất..."
            />
          </div>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/facilities')}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            Lưu
          </Button>
        </div>
      </form>
    </div>
  )
}

export default FacilityForm 