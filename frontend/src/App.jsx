import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'; // Chỉ cần import 1 lần

// Import Route Guards từ file riêng
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import StaffRoute from './components/StaffRoute';

// Import Layouts
import DashboardLayout from './layouts/DashboardLayout'; // Chỉ cần import 1 lần

// Import Pages
import Login from './pages/Login';                     // Chỉ cần import 1 lần
import Dashboard from './pages/Dashboard';                 // Chỉ cần import 1 lần
import ProfileRouter from './components/ProfileRouter'; // Import ProfileRouter
import StudentIndex from './pages/students/StudentIndex';
import StudentForm from './pages/students/StudentForm';
import StudentProfile from './pages/students/StudentProfile'; // Import trang chi tiết sinh viên
import BuildingIndex from './pages/buildings/BuildingIndex';
import BuildingForm from './pages/buildings/BuildingForm';
import RoomIndex from './pages/rooms/RoomIndex';
import RoomForm from './pages/rooms/RoomForm';
import AmenityIndex from './pages/amenities/AmenityIndex';
import AmenityForm from './pages/amenities/AmenityForm';
import MaintenanceIndex from './pages/maintenance/MaintenanceIndex';
import MaintenanceForm from './pages/maintenance/MaintenanceForm';
import MaintenanceRequestForm from './pages/maintenance/MaintenanceRequestForm';
import InvoiceIndex from './pages/invoices/InvoiceIndex';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import PaymentIndex from './pages/payments/PaymentIndex';
import PaymentForm from './pages/payments/PaymentForm';
import PaymentNew from './pages/payments/PaymentNew';
import FeeRateIndex from './pages/fees/FeeRateIndex';
import FeeRateDetail from './pages/fees/FeeRateDetail';
import FeeRateForm from './pages/fees/FeeRateForm';
import UtilityReadingIndex from './pages/utilities/UtilityReadingIndex';
import UtilityReadingForm from './pages/utilities/UtilityReadingForm';
import UtilityReadingCreate from './pages/utilities/UtilityReadingCreate';
import UtilityReadingEdit from './pages/utilities/UtilityReadingEdit';
import VehicleIndex from './pages/vehicles/VehicleIndex';
import VehicleForm from './pages/vehicles/VehicleForm';
import TransferIndex from './pages/transfers/TransferIndex';
import TransferRequestForm from './pages/transfers/TransferRequestForm';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import StudentProfilePage from './pages/profile/StudentProfilePage';
import StudentProfileEditPage from './pages/profile/StudentProfileEditPage';
import StaffProfilePage from './pages/profile/StaffProfilePage';
import StaffProfileEditPage from './pages/profile/StaffProfileEditPage';
import AdminProfilePage from './pages/profile/AdminProfilePage';


function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* <Route path="/reset-password/:token" element={<ResetPassword />} /> */}

      {/* Protected Routes - Yêu cầu đăng nhập */}
      <Route element={<PrivateRoute />}> {/* Wrapper Layout và kiểm tra đăng nhập */}

        {/* Route mặc định sau khi đăng nhập */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Profile Routes - điều hướng dựa theo vai trò */}
        <Route path="/profile" element={
          <ProfileRouter
            studentComponent={<StudentProfilePage />}
            staffComponent={<StaffProfilePage />}
            adminComponent={<AdminProfilePage />}
          />
        } />
        <Route path="/profile/edit" element={
          <ProfileRouter
            studentComponent={<StudentProfileEditPage />}
            staffComponent={<StaffProfileEditPage />}
          />
        } />

        {/* --- STUDENT ROUTES --- */}
        <Route path="/students">
          <Route index element={<StaffRoute><StudentIndex /></StaffRoute>} />
          <Route path="new" element={<AdminRoute><StudentForm /></AdminRoute>} />
          <Route path=":id" element={<StaffRoute><StudentProfile /></StaffRoute>} /> {/* Thêm route xem chi tiết sinh viên */}
          <Route path=":id/edit" element={<StaffRoute><StudentForm /></StaffRoute>} />
        </Route>

        {/* --- BUILDING ROUTES (Xem lại quyền tạo/sửa) --- */}
        <Route path="/buildings" element={<StaffRoute />}>
          <Route index element={<BuildingIndex />} />
          {/* Chỉ Admin được tạo/sửa? */}
          <Route path="new" element={<AdminRoute><BuildingForm /></AdminRoute>} />
          <Route path=":id/edit" element={<AdminRoute><BuildingForm /></AdminRoute>} />
          {/* Hoặc nếu Staff cũng được:
             <Route path="new" element={<BuildingForm />} />
             <Route path=":id/edit" element={<BuildingForm />} />
            */}
        </Route>

        {/* --- ROOM ROUTES --- */}
        <Route path="/rooms">
          <Route index element={<RoomIndex />} /> {/* Mọi người đăng nhập xem */}
          <Route element={<StaffRoute />}> {/* Chỉ Staff/Admin tạo/sửa */}
            <Route path="new" element={<RoomForm />} />
            <Route path=":id/edit" element={<RoomForm />} />
          </Route>
        </Route>

        {/* --- AMENITY ROUTES (Xem lại quyền tạo/sửa) --- */}
        <Route path="/amenities" element={<StaffRoute />}>
          <Route index element={<AmenityIndex />} />
          {/* Chỉ Admin được tạo/sửa? */}
          <Route path="new" element={<AdminRoute><AmenityForm /></AdminRoute>} />
          <Route path=":id/edit" element={<AdminRoute><AmenityForm /></AdminRoute>} />
          {/* Hoặc nếu Staff cũng được:
             <Route path="new" element={<AmenityForm />} />
             <Route path=":id/edit" element={<AmenityForm />} />
             */}
        </Route>

        {/* --- MAINTENANCE ROUTES --- */}
        <Route path="/maintenance">
          <Route index element={<StaffRoute><MaintenanceIndex /></StaffRoute>} />
          <Route path="request" element={<MaintenanceRequestForm />} />
          <Route path=":id/edit" element={<StaffRoute><MaintenanceForm /></StaffRoute>} />
        </Route>

        {/* --- INVOICE & PAYMENT ROUTES --- */}
        <Route path="/invoices" element={<StaffRoute />}>
          <Route index element={<InvoiceIndex />} />
          <Route path=":id" element={<InvoiceDetail />} />
          {/* <Route path="new" element={<InvoiceForm />} /> */}
        </Route>        <Route path="/payments" element={<StaffRoute />}>
          <Route index element={<PaymentIndex />} />
          <Route path="new" element={<PaymentNew />} />
          <Route path=":id/edit" element={<PaymentForm />} />
        </Route>

        {/* --- UTILITY ROUTES --- */}
        <Route path="/utilities" element={<StaffRoute />}>
          <Route index element={<UtilityReadingIndex />} />
          <Route path="new" element={<UtilityReadingForm />} />
          <Route path=":id/edit" element={<UtilityReadingForm />} />
          <Route path="create" element={<UtilityReadingCreate />} />
          <Route path="edit/:id" element={<UtilityReadingEdit />} />
        </Route>        {/* --- VEHICLE ROUTES --- */}
        <Route path="/vehicles">
          <Route index element={<StaffRoute><VehicleIndex /></StaffRoute>} />
          <Route path="register" element={<VehicleForm mode="create" />} />
          <Route path=":id/edit" element={<StaffRoute><VehicleForm mode="edit" /></StaffRoute>} />
          <Route path="new" element={<StaffRoute><VehicleForm mode="create" /></StaffRoute>} />
        </Route>

        {/* --- FEE RATE ROUTES --- */}
        <Route path="/fees" element={<StaffRoute />}>
          <Route index element={<FeeRateIndex />} />
          <Route path=":id" element={<FeeRateDetail />} />
          <Route path=":id/edit" element={<FeeRateForm />} />
          <Route path="new" element={<FeeRateForm />} />
        </Route>

        {/* --- TRANSFER ROUTES --- */}
        <Route path="/transfers">
          <Route index element={
            <ProfileRouter
              studentComponent={<TransferIndex />}
              staffComponent={<TransferIndex />}
              adminComponent={<TransferIndex />}
            />
          } />
          <Route path="request" element={<TransferRequestForm />} />
          {/* <Route path=":id/review" element={<StaffRoute><TransferReviewForm /></StaffRoute>} /> */}
        </Route>

      </Route> {/* Kết thúc PrivateRoute Wrapper */}

      {/* Route 404 Not Found */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;