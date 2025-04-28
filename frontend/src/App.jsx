import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
// Import Auth Context
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Giả sử đường dẫn đúng
import { Toaster } from 'react-hot-toast';

// Import Layouts
import DashboardLayout from './layouts/DashboardLayout'; // Giả sử đường dẫn đúng

// Import Pages (Cần tạo các component này)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Trang tổng quan
import Profile from './pages/Profile'; // Trang hồ sơ cá nhân

// --- Quản lý Người dùng & Sinh viên ---
import StudentIndex from './pages/students/StudentIndex'; // ĐỔI TÊN
import StudentForm from './pages/students/StudentForm';   // ĐỔI TÊN
// import StaffIndex from './pages/staff/StaffIndex'; // (Nếu cần trang riêng cho Staff)
// import StaffForm from './pages/staff/StaffForm';   // (Nếu cần trang riêng cho Staff)
// import UserList from './pages/users/UserList'; // (Nếu cần trang quản lý User chung)

// --- Quản lý Cơ sở vật chất ---
import BuildingIndex from './pages/buildings/BuildingIndex'; // MỚI
import BuildingForm from './pages/buildings/BuildingForm';   // MỚI
import RoomIndex from './pages/rooms/RoomIndex';
import RoomForm from './pages/rooms/RoomForm'; // MỚI (Nếu cần form tạo/sửa phòng)
import AmenityIndex from './pages/amenities/AmenityIndex'; // ĐỔI TÊN
import AmenityForm from './pages/amenities/AmenityForm';   // ĐỔI TÊN

// --- Quản lý Bảo trì ---
import MaintenanceIndex from './pages/maintenance/MaintenanceIndex'; // Giữ nguyên
import MaintenanceForm from './pages/maintenance/MaintenanceForm'; // MỚI (Form xem chi tiết/cập nhật status/gán việc)
import MaintenanceRequestForm from './pages/maintenance/MaintenanceRequestForm'; // MỚI (Form cho Student tạo yêu cầu)

// --- Quản lý Tài chính ---
import InvoiceIndex from './pages/invoices/InvoiceIndex'; // MỚI
import InvoiceDetail from './pages/invoices/InvoiceDetail'; // MỚI
// import InvoiceForm from './pages/invoices/InvoiceForm'; // (Form tạo hóa đơn thủ công?)
import PaymentIndex from './pages/payments/PaymentIndex'; // Giữ nguyên (Có thể là trang lịch sử GD)
// import PaymentForm from './pages/payments/PaymentForm'; // (Form ghi nhận thanh toán thủ công?)

// --- Quản lý Tiện ích & Xe ---
import UtilityReadingIndex from './pages/utilities/UtilityReadingIndex'; // MỚI
import UtilityReadingForm from './pages/utilities/UtilityReadingForm';   // MỚI
import VehicleIndex from './pages/vehicles/VehicleIndex'; // MỚI
import VehicleForm from './pages/vehicles/VehicleForm';   // MỚI

// --- Quản lý Chuyển phòng ---
import TransferIndex from './pages/transfers/TransferIndex'; // MỚI
import TransferRequestForm from './pages/transfers/TransferRequestForm'; // MỚI (Form cho student yêu cầu)
// import TransferApproval from './pages/transfers/TransferApproval'; // (Trang/Component duyệt yêu cầu?)

// --- Các trang khác (Nếu cần) ---
// import MediaManager from './pages/media/MediaManager'; // Trang quản lý media tập trung?
// import NotFound from './pages/NotFound'; // Trang 404

// --- Private Route Component ---
const PrivateRoute = () => {
  const { user, loading } = useAuth(); // Giả sử context có trạng thái loading
  const location = useLocation();

  if (loading) {
    // Hiển thị spinner hoặc placeholder trong khi chờ xác thực
    return <div>Loading...</div>; // Hoặc component Spinner
  }

  if (!user) {
    // Chuyển hướng đến trang login, lưu lại trang muốn truy cập
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nếu đã đăng nhập, hiển thị layout và nội dung con (Outlet)
  return (
    <DashboardLayout>
      <Outlet /> {/* Outlet render các route con */}
    </DashboardLayout>
  );
};

// (Optional) Admin Route Component for Role-Based Access Control
const AdminRoute = () => {
  const { user } = useAuth();
  // Kiểm tra user tồn tại VÀ có role ADMIN
  return user && user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />; // Hoặc trang Access Denied
};

// (Optional) Staff Route Component
const StaffRoute = () => {
  const { user } = useAuth();
  // Kiểm tra user tồn tại VÀ có role STAFF hoặc ADMIN (Admin cũng có quyền của Staff)
  return user && (user.role === 'STAFF' || user.role === 'ADMIN') ? <Outlet /> : <Navigate to="/dashboard" replace />;
};


function App() {
  return (
    <Router>
      <AuthProvider> {/* Bọc toàn bộ ứng dụng trong AuthProvider */}
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - Yêu cầu đăng nhập */}
          <Route element={<PrivateRoute />}> {/* Wrapper cho các trang cần layout dashboard */}

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />

            {/* --- STUDENT ROUTES --- */}
            {/* Sinh viên xem ds sinh viên khác? Hay chỉ xem của mình? */}
            {/* Chỉ Admin/Staff xem danh sách */}
            <Route path="/students" element={<StaffRoute />}>
              <Route index element={<StudentIndex />} />
              {/* Admin tạo mới */}
              <Route path="new" element={<AdminRoute><StudentForm /></AdminRoute>} />
              {/* Admin/Staff xem/sửa */}
              <Route path=":id/edit" element={<StudentForm />} />
            </Route>


            {/* --- BUILDING ROUTES (Admin/Staff) --- */}
            <Route path="/buildings" element={<StaffRoute />}>
              <Route index element={<BuildingIndex />} />
              <Route path="new" element={<BuildingForm />} />
              <Route path=":id/edit" element={<BuildingForm />} />
            </Route>

            {/* --- ROOM ROUTES (Admin/Staff xem, Student có thể xem phòng trống?) --- */}
            <Route path="/rooms"> {/* Cho phép mọi người đăng nhập xem? */}
              <Route index element={<RoomIndex />} />
              {/* Chỉ Admin/Staff tạo/sửa */}
              <Route element={<StaffRoute />}>
                <Route path="new" element={<RoomForm />} />
                <Route path=":id/edit" element={<RoomForm />} />
              </Route>
            </Route>


            {/* --- AMENITY ROUTES (Admin/Staff) --- */}
            <Route path="/amenities" element={<StaffRoute />}>
              <Route index element={<AmenityIndex />} />
              <Route path="new" element={<AmenityForm />} />
              <Route path=":id/edit" element={<AmenityForm />} />
            </Route>

            {/* --- MAINTENANCE ROUTES --- */}
            <Route path="/maintenance">
              {/* Admin/Staff xem danh sách tổng */}
              <Route index element={<StaffRoute><MaintenanceIndex /></StaffRoute>} />
              {/* Sinh viên tạo yêu cầu mới */}
              <Route path="request" element={<MaintenanceRequestForm />} />
              {/* Admin/Staff xem/cập nhật chi tiết */}
              <Route path=":id/edit" element={<StaffRoute><MaintenanceForm /></StaffRoute>} />
              {/* Sinh viên xem yêu cầu của mình? (Cần route/logic riêng) */}
            </Route>


            {/* --- INVOICE & PAYMENT ROUTES --- */}
            {/* Admin/Staff xem danh sách tổng */}
            <Route path="/invoices" element={<StaffRoute />}>
              <Route index element={<InvoiceIndex />} />
              <Route path=":id" element={<InvoiceDetail />} /> {/* Xem chi tiết hóa đơn */}
              {/* <Route path="new" element={<InvoiceForm />} /> Tạo hóa đơn thủ công? */}
            </Route>
            {/* Admin/Staff xem lịch sử thanh toán tổng */}
            <Route path="/payments" element={<StaffRoute><PaymentIndex /></StaffRoute>} />
            {/* Sinh viên xem hóa đơn/thanh toán của mình? (Cần route/logic riêng, vd: /profile/billing) */}


            {/* --- UTILITY ROUTES (Admin/Staff) --- */}
            <Route path="/utilities" element={<StaffRoute />}>
              <Route index element={<UtilityReadingIndex />} /> {/* Xem danh sách */}
              <Route path="new" element={<UtilityReadingForm />} /> {/* Form nhập chỉ số */}
              <Route path=":id/edit" element={<UtilityReadingForm />} /> {/* Sửa chỉ số đã nhập */}
            </Route>

            {/* --- VEHICLE ROUTES --- */}
            <Route path="/vehicles">
              {/* Admin/Staff xem danh sách tổng */}
              <Route index element={<StaffRoute><VehicleIndex /></StaffRoute>} />
              {/* Sinh viên tự đăng ký */}
              <Route path="register" element={<VehicleForm mode="create" />} /> {/* Form đăng ký */}
              {/* Admin/Staff tạo hộ/sửa */}
              <Route element={<StaffRoute />}>
                <Route path="new" element={<VehicleForm mode="admin_create" />} /> {/* Form admin tạo */}
                <Route path=":id/edit" element={<VehicleForm mode="edit" />} /> {/* Form sửa */}
              </Route>
              {/* Sinh viên xem xe của mình? (Cần route/logic riêng) */}
            </Route>

            {/* --- TRANSFER ROUTES --- */}
            <Route path="/transfers">
              {/* Admin/Staff xem danh sách yêu cầu */}
              <Route index element={<StaffRoute><TransferIndex /></StaffRoute>} />
              {/* Sinh viên tạo yêu cầu */}
              <Route path="request" element={<TransferRequestForm />} />
              {/* Admin/Staff xem/duyệt chi tiết? Có thể tích hợp vào TransferIndex hoặc trang riêng */}
            </Route>


            {/* --- LOẠI BỎ HOẶC ÁNH XẠ LẠI CÁC ROUTE CŨ KHÔNG RÕ RÀNG --- */}
            {/* <Route path="tasks" ... /> */}
            {/* <Route path="problems" ... /> */}
            {/* <Route path="security" ... /> */}
            {/* <Route path="reports" ... /> */}
            {/* <Route path="inventory" ... /> */}
            {/* <Route path="academic" ... /> */}

          </Route> {/* Kết thúc PrivateRoute Wrapper */}


          {/* Redirect trang gốc về dashboard sau khi đăng nhập */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* (Optional) Route 404 Not Found */}
          {/* <Route path="*" element={<NotFound />} /> */}
          <Route path="*" element={<div>404 Page Not Found</div>} />


        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;