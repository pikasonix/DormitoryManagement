import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { roomService } from '../../services/room.service'; // Lấy ds phòng để chọn
import apiClient from '../../api/axios'; // Để upload avatar
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Select from '../../components/shared/Select';
import { ArrowLeftIcon, CameraIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { StudentStatus, Gender } from '@prisma/client'; // Import Enums nếu cần

// Định nghĩa lại Enums nếu không import được
const STUDENT_STATUSES = [ /* ... giống StudentIndex ... */];
const GENDERS = [{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }];

const API_ASSET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const StudentForm = () => {
  const { id: profileId } = useParams(); // Lấy profileId nếu là edit
  const navigate = useNavigate();
  const isEditMode = Boolean(profileId);

  const [formData, setFormData] = useState({
    // User fields (chỉ cần khi tạo mới)
    email: '',
    password: '',
    confirmPassword: '', // Để xác nhận password khi tạo
    // StudentProfile fields
    studentId: '', fullName: '', gender: '', birthDate: '', identityCardNumber: '',
    phoneNumber: '', faculty: '', courseYear: '', className: '', permanentProvince: '',
    permanentDistrict: '', permanentAddress: '', status: 'PENDING_APPROVAL', startDate: '', contractEndDate: '',
    personalEmail: '', ethnicity: '', religion: '', priorityObject: '',
    fatherName: '', fatherDobYear: '', fatherPhone: '', fatherAddress: '',
    motherName: '', motherDobYear: '', motherPhone: '', motherAddress: '',
    emergencyContactRelation: '', emergencyContactPhone: '', emergencyContactAddress: '',
    roomId: '', // ID phòng
    avatarId: null, // ID avatar đã upload
    // Chỉ lưu trữ thông tin avatar hiện có khi edit
    currentAvatarPath: null,
  });
  const [rooms, setRooms] = useState([]); // Danh sách phòng để chọn
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dữ liệu phòng và student cũ (nếu edit)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Luôn lấy danh sách phòng (có thể lọc phòng còn trống?)
        const roomRes = await roomService.getAllRooms({ limit: 1000, hasVacancy: !isEditMode }); // Lấy phòng còn trống khi tạo mới
        setRooms([{ value: '', label: 'Chưa xếp phòng' }, ...roomRes.data.map(r => ({ value: r.id, label: `${r.number} (${r.building.name}) - ${r.actualOccupancy}/${r.capacity}` }))]);

        if (isEditMode) {
          const studentData = await studentService.getStudentById(profileId);
          setFormData({
            // Không lấy email/password ở đây vì không cho sửa trực tiếp
            studentId: studentData.studentId || '',
            fullName: studentData.fullName || '',
            gender: studentData.gender || '',
            birthDate: studentData.birthDate ? new Date(studentData.birthDate).toISOString().split('T')[0] : '',
            identityCardNumber: studentData.identityCardNumber || '',
            phoneNumber: studentData.phoneNumber || '',
            faculty: studentData.faculty || '',
            courseYear: studentData.courseYear || '',
            className: studentData.className || '',
            permanentProvince: studentData.permanentProvince || '',
            permanentDistrict: studentData.permanentDistrict || '',
            permanentAddress: studentData.permanentAddress || '',
            status: studentData.status || 'PENDING_APPROVAL',
            startDate: studentData.startDate ? new Date(studentData.startDate).toISOString().split('T')[0] : '',
            contractEndDate: studentData.contractEndDate ? new Date(studentData.contractEndDate).toISOString().split('T')[0] : '',
            personalEmail: studentData.personalEmail || '',
            ethnicity: studentData.ethnicity || '',
            religion: studentData.religion || '',
            priorityObject: studentData.priorityObject || '',
            fatherName: studentData.fatherName || '',
            fatherDobYear: studentData.fatherDobYear || '',
            fatherPhone: studentData.fatherPhone || '',
            fatherAddress: studentData.fatherAddress || '',
            motherName: studentData.motherName || '',
            motherDobYear: studentData.motherDobYear || '',
            motherPhone: studentData.motherPhone || '',
            motherAddress: studentData.motherAddress || '',
            emergencyContactRelation: studentData.emergencyContactRelation || '',
            emergencyContactPhone: studentData.emergencyContactPhone || '',
            emergencyContactAddress: studentData.emergencyContactAddress || '',
            roomId: studentData.roomId || '',
            avatarId: studentData.user?.avatarId || null, // Lấy avatarId hiện tại
            currentAvatarPath: studentData.user?.avatar?.path || null, // Lấy path avatar hiện tại
          });
          setNewAvatarPreview(null); // Reset preview khi load data edit
          setNewAvatarFile(null);
        }
      } catch (err) {
        setError(isEditMode ? 'Không thể tải dữ liệu sinh viên.' : 'Không thể tải danh sách phòng.');
        console.error(err);
        toast.error(isEditMode ? 'Không thể tải dữ liệu sinh viên.' : 'Không thể tải danh sách phòng.');
        if (isEditMode) navigate('/students'); // Quay lại nếu lỗi load data edit
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profileId, isEditMode, navigate]);


  // --- Các hàm xử lý input, file, ảnh (Tương tự Building/Room Form) ---
  const handleChange = (e) => { /* ... */ };
  const handleAvatarChange = (e) => { /* ... (Giống ProfileEditForm) ... */ };

  // Xử lý Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate password khi tạo mới
    if (!isEditMode && formData.password !== formData.confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp.');
      setIsSubmitting(false);
      return;
    }
    if (!isEditMode && formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      setIsSubmitting(false);
      return;
    }


    // --- Upload Avatar mới (nếu có) ---
    let uploadedAvatarId = formData.avatarId; // Giữ ID cũ mặc định khi edit
    if (newAvatarFile) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', newAvatarFile);
      uploadFormData.append('mediaType', 'USER_AVATAR');
      try {
        const response = await apiClient.post('/media/upload', uploadFormData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedAvatarId = response.data?.media?.id; // Lấy ID mới
        toast.success('Tải ảnh đại diện mới thành công!');
      } catch (uploadError) {
        console.error("Lỗi tải ảnh đại diện:", uploadError);
        toast.error(uploadError.response?.data?.message || 'Tải ảnh đại diện thất bại.');
        setIsSubmitting(false);
        return;
      }
    }
    // --- Kết thúc Upload ---


    // --- Chuẩn bị Payload ---
    // Tách các trường của User và Profile
    const { email, password, confirmPassword, currentAvatarPath, ...profilePayload } = formData;

    // Chuyển đổi kiểu dữ liệu và gán avatarId
    const finalPayload = {
      ...profilePayload,
      courseYear: parseInt(profilePayload.courseYear) || null,
      fatherDobYear: parseInt(profilePayload.fatherDobYear) || null,
      motherDobYear: parseInt(profilePayload.motherDobYear) || null,
      birthDate: profilePayload.birthDate || null,
      startDate: profilePayload.startDate || null,
      contractEndDate: profilePayload.contractEndDate || null,
      roomId: parseInt(profilePayload.roomId) || null, // Chuyển thành số hoặc null
      avatarId: uploadedAvatarId, // Gán ID avatar mới (hoặc cũ nếu không đổi)
    };

    // Thêm email, password chỉ khi tạo mới
    if (!isEditMode) {
      finalPayload.email = email;
      finalPayload.password = password;
    }


    // --- Gọi API ---
    try {
      if (isEditMode) {
        // Gọi API Update (PUT /students/:id hoặc PUT /users/:userId/profile)
        // Cần thống nhất API endpoint. Tạm dùng /students/:id
        await studentService.updateStudent(profileId, finalPayload);
      } else {
        // Gọi API Create (POST /students)
        await studentService.createStudent(finalPayload);
      }
      navigate('/students'); // Quay về danh sách
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEditMode ? 'Cập nhật thất bại.' : 'Tạo mới thất bại.'));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup preview
  useEffect(() => { /* ... Giống BuildingForm ... */ });


  if (loading) return <div className="text-center py-10"><LoadingSpinner /></div>;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/students" className="text-sm ..."><ArrowLeftIcon /> Quay lại Danh sách</Link>
        <h1 className="text-2xl font-bold ...">{isEditMode ? 'Chỉnh sửa Sinh viên' : 'Thêm Sinh viên mới'}</h1>
        <div></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 ... bg-white p-6 shadow sm:rounded-lg">
        {/* --- Phần Thông tin Tài khoản (Chỉ hiển thị khi tạo mới) --- */}
        {!isEditMode && (
          <div>
            <h3 className="...">Thông tin Tài khoản Đăng nhập</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="email" className="...">Email đăng nhập *</label>
                <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 ..." />
              </div>
              <div className="sm:col-span-3"> {/* Placeholder */} </div>
              <div className="sm:col-span-3">
                <label htmlFor="password" className="...">Mật khẩu *</label>
                <input type="password" name="password" id="password" required value={formData.password} onChange={handleChange} className="mt-1 ..." />
                <p className="mt-1 text-xs text-gray-500">Ít nhất 6 ký tự.</p>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="confirmPassword" className="...">Xác nhận Mật khẩu *</label>
                <input type="password" name="confirmPassword" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="mt-1 ..." />
              </div>
            </div>
          </div>
        )}

        {/* --- Phần Ảnh đại diện (Giống ProfileEditForm) --- */}
        <div className="pt-8">
          <h3 className="...">Ảnh đại diện</h3>
          {/* ... Logic hiển thị avatar cũ/mới, input upload giống ProfileEditForm ... */}
          <p className="text-center text-red-500 my-4">(Thêm phần quản lý avatar giống ProfileEditForm ở đây)</p>
        </div>


        {/* --- Phần Thông tin Sinh viên (Giống ProfileEditForm) --- */}
        <div className="pt-8">
          <h3 className="...">Thông tin Sinh viên</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* ... Thêm tất cả các input cho StudentProfile như studentId, fullName, gender, birthDate, ... */}
            {/* Ví dụ: */}
            <div className="sm:col-span-3">
              <label htmlFor="fullName" className="...">Họ và tên *</label>
              <input type="text" name="fullName" id="fullName" required value={formData.fullName} onChange={handleChange} className="mt-1 ..." />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="studentId" className="...">Mã sinh viên *</label>
              <input type="text" name="studentId" id="studentId" required value={formData.studentId} onChange={handleChange} className="mt-1 ..." />
            </div>
            {/* ... THÊM RẤT NHIỀU INPUT KHÁC ... */}
            <p className="sm:col-span-6 text-center text-red-500 my-4">(Thêm đầy đủ các trường input cho StudentProfile ở đây)</p>
          </div>
        </div>

        {/* --- Phần Thông tin Phòng --- */}
        <div className="pt-8">
          <h3 className="...">Thông tin Phòng ở</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Select label="Phòng hiện tại" name="roomId" value={formData.roomId} onChange={handleChange} options={rooms} disabled={rooms.length <= 1} />
            </div>
            <div className="sm:col-span-3">
              <Select label="Trạng thái ở *" name="status" required value={formData.status} onChange={handleChange} options={STUDENT_STATUSES} />
            </div>
            {/* Thêm input cho startDate, contractEndDate, checkInDate, checkOutDate */}
            {/* ... */}
            <p className="sm:col-span-6 text-center text-red-500 my-4">(Thêm input cho ngày bắt đầu, kết thúc, checkin, checkout)</p>
          </div>
        </div>

        {/* --- Các phần thông tin khác (Gia đình, Khẩn cấp - nếu cần sửa) --- */}
        {/* ... Thêm các section và input tương ứng ... */}


        {/* Nút Submit */}
        <div className="pt-5">
          <div className="flex justify-end gap-x-3">
            <Link to="/students" className="rounded-md bg-white ...">Hủy</Link>
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-md bg-indigo-600 ... disabled:opacity-50">
              {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {isSubmitting ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Tạo Sinh viên')}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2 text-right">{error}</p>}
        </div>
      </form>

    </div>
  );
};

export default StudentForm;