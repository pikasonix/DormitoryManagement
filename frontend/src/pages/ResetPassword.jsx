import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../services/api.tsx'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)

  // Xác thực token khi component được tải
  useEffect(() => {
    if (!token) {
      setStatus({
        type: 'error',
        message: 'Token đặt lại mật khẩu không hợp lệ'
      })
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Xác thực token
    if (!token) {
      setStatus({
        type: 'error',
        message: 'Token đặt lại mật khẩu không hợp lệ'
      })
      setLoading(false)
      return
    }

    // Xác thực mật khẩu
    if (newPassword !== confirmPassword) {
      setStatus({
        type: 'error',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
      })
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setStatus({
        type: 'error',
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      })
      setLoading(false)
      return
    }

    try {
      const response = await resetPassword({
        token: token,
        newPassword: newPassword
      })

      console.log('Phản hồi đặt lại mật khẩu:', response)
      setStatus({
        type: 'success',
        message: response.data.message || 'Mật khẩu đã được thay đổi thành công'
      })

      // Chuyển hướng đến trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate('/login')
      }, 2000)

    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error)
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn'
      })
    } finally {
      setLoading(false)
    }
  }

  // Nếu không có token, hiển thị thông báo lỗi
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Token đặt lại mật khẩu không hợp lệ
                  </h3>
                  <div className="mt-4">
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-red-800 hover:text-red-700"
                    >
                      Quay lại trang quên mật khẩu
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đặt lại mật khẩu
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nhập mật khẩu mới của bạn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status.type === 'success' ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {status.message}
                  </h3>
                  <div className="mt-4">
                    <p className="text-sm text-green-700">
                      Bạn sẽ được chuyển hướng đến trang đăng nhập...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status.type === 'error' && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {status.message}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu mới
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu mới
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Quay lại trang đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword 