import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { roomService } from '../../services/room.service'; // Cần lấy ds phòng để chọn
import { Input, Button, Select, Textarea, DatePicker } from '../../components/shared'; // Thêm DatePicker nếu có
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Options ví dụ (cần định nghĩa đầy đủ hơn)
const genderOptions = [{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }];
const studentStatusOptions = [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }, /* Thêm các status khác */];

const StudentForm = () => {
  const { id } = useParams(); // ID của StudentProfile
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    // Các trường khớp với API POST /students và PUT /students/:id
    // Lưu ý: Cần làm rõ API tạo mới có cần email/password không, hay backend tự tạo?
    // Giả sử chỉ cần thông tin Profile ở đây
    studentId: '',
    firstName: '', // API yêu cầu firstName, lastName riêng
    lastName: '',
    email: '', // Có cần email ở đây không? Hay lấy từ User? API yêu cầu email.
    phone: '',
    address: '', // API yêu cầu address tổng
    dateOfBirth: '', // YYYY-MM-DD
    gender: '',
    roomId: '', // ID phòng đang ở (optional)
    status: 'ACTIVE', // Mặc định
    // Thêm các trường khác từ API doc (nếu form này quản lý tất cả)
    faculty: '',
    courseYear: '',
    className: '',
    //... các trường khác
    permanentAddress: '', // Tách địa chỉ nếu backend hỗ trợ
    // ... thông tin phụ huynh, khẩn cấp ...
  });
  const [rooms, setRooms] = useState([]); // Danh sách phòng để chọn
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Fetch dữ liệu phòng và student (nếu edit) ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch danh sách phòng (chỉ phòng trống?)
        const roomData = await roomService.getAllRooms({ status: 'AVAILABLE', limit: 1000 }); // Lấy phòng trống
        setRooms(roomData || []);

        // Fetch student data nếu edit
        if (isEditMode) {
          const studentData = await studentService.getStudentById(id);
          setFormData({
            studentId: studentData.studentId || '',
            // **Quan trọng: API trả về firstName, lastName nhưng state đang là fullName?**
            // Cần thống nhất. Giả sử state cũng dùng firstName, lastName
            firstName: studentData.firstName || '',
            lastName: studentData.lastName || '',
            email: studentData.email || '',
            phone: studentData.phone || '',
            address: studentData.address || '', // Địa chỉ tổng
            dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toISOString().split('T')[0] : '',
            gender: studentData.gender || '',
            roomId: studentData.roomId?.toString() || '', // Chuyển ID phòng sang string
            status: studentData.status || 'ACTIVE',
            // Map các trường khác từ studentData vào formData
            faculty: studentData.faculty || '',
            courseYear: studentData.courseYear || '',
            className: studentData.className || '',
            permanentAddress: studentData.permanentAddress || '', // Ví dụ
            // ... map các trường khác ...
          });
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu form sinh viên:", err);
        toast.error("Không thể tải dữ liệu cần thiết.");
        if (isEditMode) navigate('/students');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode, navigate]);


  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Hàm xử lý submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    // --- Client Validation (Cần bổ sung) ---
    if (!formData.studentId.trim()) { /* ... */ }
    if (!formData.firstName.trim()) { /* ... */ }
    if (!formData.lastName.trim()) { /* ... */ }
    // ... thêm validation cho các trường bắt buộc khác ...
    // --- End Validation ---

    // Chuẩn bị payload (chuyển đổi kiểu nếu cần)
    const payload = {
      ...formData,
      roomId: formData.roomId ? parseInt(formData.roomId, 10) : null, // Chuyển về số hoặc null
      courseYear: formData.courseYear ? parseInt(formData.courseYear, 10) : null,
      dateOfBirth: formData.dateOfBirth || null, // Gửi null nếu rỗng
    };
    // Xóa các trường không cần gửi hoặc không hợp lệ nếu cần
    // delete payload.address; // Nếu backend dùng permanentAddress

    try {
      if (isEditMode) {
        await studentService.updateStudent(id, payload);
        toast.success('Cập nhật hồ sơ sinh viên thành công!');
      } else {
        // **Làm rõ API tạo mới có cần tạo User không?**
        // Giả sử API /students tự xử lý User
        await studentService.createStudent(payload);
        toast.success('Thêm sinh viên mới thành công!');
      }
      navigate('/students'); // Quay về danh sách
    } catch (err) {
      console.error("Lỗi lưu sinh viên:", err);
      const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');
      if (err?.errors && Array.isArray(err.errors)) {
        const serverErrors = {};
        err.errors.forEach(fieldError => {
          if (fieldError.field) serverErrors[fieldError.field] = fieldError.message;
          else serverErrors.general = fieldError.message; // Lỗi chung
        });
        setErrors(serverErrors);
        if (serverErrors.general) toast.error(serverErrors.general);
        else toast.error("Vui lòng kiểm tra lại thông tin đã nhập.", { id: 'validation-error' });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- Options cho Select phòng ---
  const roomOptions = [
    { value: '', label: '-- Chọn phòng --' },
    // Chỉ hiển thị phòng còn trống? Hoặc tất cả?
    ...rooms.map(room => ({ value: room.id.toString(), label: `Phòng ${room.number} (${room.building?.name}) - ${room.capacity} chỗ` }))
  ];

  // --- Render ---
  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Button variant="link" onClick={() => navigate('/students')} icon={ArrowLeftIcon} className="text-sm mb-4">
          Quay lại danh sách sinh viên
        </Button>
        <h1 className="text-2xl font-semibold">
          {isEditMode ? 'Chỉnh sửa Hồ sơ Sinh viên' : 'Thêm Sinh viên mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-8 divide-y divide-gray-200"> {/* Thêm divide */}

        {/* Phần Thông tin cơ bản */}
        <div className="pt-0">
          <h3 className="text-base font-semibold leading-7 text-gray-900">Thông tin Sinh viên</h3>
          {errors.general && <p className='text-sm text-red-600 mt-1'>{errors.general}</p>}
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Input label="Mã Sinh viên *" id="studentId" name="studentId" required value={formData.studentId} onChange={handleChange} disabled={isSaving} error={errors.studentId} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Họ *" id="lastName" name="lastName" required value={formData.lastName} onChange={handleChange} disabled={isSaving} error={errors.lastName} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Tên *" id="firstName" name="firstName" required value={formData.firstName} onChange={handleChange} disabled={isSaving} error={errors.firstName} />
            </div>
            <div className="sm:col-span-3">
              {/* Email có cho sửa không? Nếu không thì disabled */}
              <Input label="Email liên hệ *" id="email" name="email" type="email" required value={formData.email} onChange={handleChange} disabled={isSaving || isEditMode} error={errors.email} hint={isEditMode ? "Email liên kết với tài khoản, không thể sửa." : ""} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Số điện thoại *" id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} disabled={isSaving} error={errors.phone} />
            </div>
            <div className="sm:col-span-3">
              {/* DatePicker hoặc Input type="date" */}
              <Input label="Ngày sinh *" id="dateOfBirth" name="dateOfBirth" type="date" required value={formData.dateOfBirth} onChange={handleChange} disabled={isSaving} error={errors.dateOfBirth} />
              {/* <DatePicker label="Ngày sinh *" selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null} onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date ? date.toISOString().split('T')[0] : '' }))} required disabled={isSaving} error={errors.dateOfBirth} /> */}
            </div>
            <div className="sm:col-span-3">
              <Select label="Giới tính *" id="gender" name="gender" required value={formData.gender} onChange={handleChange} options={genderOptions} disabled={isSaving} error={errors.gender} placeholder="-- Chọn giới tính --" />
            </div>
            <div className="sm:col-span-3">
              <Select label="Phòng ở" id="roomId" name="roomId" value={formData.roomId} onChange={handleChange} options={roomOptions} disabled={isSaving} error={errors.roomId} />
            </div>
            <div className="sm:col-span-3">
              <Select label="Trạng thái *" id="status" name="status" required value={formData.status} onChange={handleChange} options={studentStatusOptions} disabled={isSaving} error={errors.status} />
            </div>
            {/* Thêm các trường khác: faculty, courseYear, className */}
            <div className="sm:col-span-full">
              <Textarea label="Địa chỉ (Tổng quát)" id="address" name="address" rows={3} value={formData.address} onChange={handleChange} disabled={isSaving} error={errors.address} hint="Địa chỉ liên hệ hoặc địa chỉ tổng quát." />
            </div>
            {/* Có thể tách ra thành địa chỉ thường trú chi tiết nếu backend hỗ trợ */}
            {/* <div className="sm:col-span-full">
                             <Textarea label="Địa chỉ thường trú" id="permanentAddress" name="permanentAddress" ... />
                         </div> */}
          </div>
        </div>

        {/* Có thể thêm các section khác cho thông tin học vấn, gia đình, liên hệ khẩn cấp */}
        {/* <div className="pt-8"> <h3...>Thông tin Học vấn</h3> ... </div> */}
        {/* <div className="pt-8"> <h3...>Thông tin Gia đình</h3> ... </div> */}


        {/* Nút Submit */}
        <div className="flex items-center justify-end gap-x-3 pt-8 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={() => navigate('/students')} disabled={isSaving}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={isSaving}>
            {isEditMode ? 'Lưu thay đổi' : 'Thêm Sinh viên'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;