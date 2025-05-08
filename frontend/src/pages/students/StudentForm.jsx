import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { roomService } from '../../services/room.service';
import { Input, Button, Select, Textarea, DatePicker } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Options for select inputs
const genderOptions = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' }
];

const studentStatusOptions = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Không hoạt động' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'RENTING', label: 'Đang thuê phòng' }
];

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    gender: 'MALE',
    birthDate: '',
    identityCardNumber: '',
    faculty: '',
    courseYear: '',
    className: '',
    personalEmail: '',
    ethnicity: '',
    religion: '',
    priorityObject: '',
    permanentProvince: '',
    permanentDistrict: '',
    permanentAddress: '',
    status: 'PENDING_APPROVAL',
    startDate: new Date().toISOString().split('T')[0], // Today
    contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Next year
    roomId: '',
    // Optional family information
    fatherName: '',
    fatherDobYear: '',
    fatherPhone: '',
    fatherAddress: '',
    motherName: '',
    motherDobYear: '',
    motherPhone: '',
    motherAddress: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    emergencyContactAddress: ''
  });

  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch room data and student data (if editing)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch available rooms
        const roomData = await roomService.getAllRooms({ status: 'AVAILABLE', limit: 1000 });
        setRooms(roomData || []);

        // Fetch student data if editing
        if (isEditMode) {
          // Sử dụng phương thức mới để lấy thông tin sinh viên theo Profile ID
          const studentData = await studentService.getStudentByProfileId(id);
          setFormData({
            studentId: studentData.studentId || '',
            fullName: studentData.fullName || '',
            email: studentData.user?.email || '',
            phoneNumber: studentData.phoneNumber || '',
            birthDate: studentData.birthDate ? new Date(studentData.birthDate).toISOString().split('T')[0] : '',
            gender: studentData.gender || 'MALE',
            identityCardNumber: studentData.identityCardNumber || '',
            faculty: studentData.faculty || '',
            courseYear: studentData.courseYear?.toString() || '',
            className: studentData.className || '',
            personalEmail: studentData.personalEmail || '',
            ethnicity: studentData.ethnicity || '',
            religion: studentData.religion || '',
            priorityObject: studentData.priorityObject || '',
            permanentProvince: studentData.permanentProvince || '',
            permanentDistrict: studentData.permanentDistrict || '',
            permanentAddress: studentData.permanentAddress || '',
            status: studentData.status || 'PENDING_APPROVAL',
            startDate: studentData.startDate ? new Date(studentData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            contractEndDate: studentData.contractEndDate ? new Date(studentData.contractEndDate).toISOString().split('T')[0] : '',
            roomId: studentData.roomId?.toString() || '',
            // Family information
            fatherName: studentData.fatherName || '',
            fatherDobYear: studentData.fatherDobYear?.toString() || '',
            fatherPhone: studentData.fatherPhone || '',
            fatherAddress: studentData.fatherAddress || '',
            motherName: studentData.motherName || '',
            motherDobYear: studentData.motherDobYear?.toString() || '',
            motherPhone: studentData.motherPhone || '',
            motherAddress: studentData.motherAddress || '',
            emergencyContactRelation: studentData.emergencyContactRelation || '',
            emergencyContactPhone: studentData.emergencyContactPhone || '',
            emergencyContactAddress: studentData.emergencyContactAddress || '',
            // No password fields when editing
            password: '',
            confirmPassword: ''
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

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.studentId.trim()) newErrors.studentId = "Mã sinh viên là bắt buộc";
    if (!formData.fullName.trim()) newErrors.fullName = "Họ tên là bắt buộc";
    if (!formData.email.trim()) newErrors.email = "Email là bắt buộc";
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Số điện thoại là bắt buộc";
    if (!formData.birthDate) newErrors.birthDate = "Ngày sinh là bắt buộc";
    if (!formData.identityCardNumber.trim()) newErrors.identityCardNumber = "CMND/CCCD là bắt buộc";
    if (!formData.faculty.trim()) newErrors.faculty = "Khoa/Viện là bắt buộc";
    if (!formData.courseYear) newErrors.courseYear = "Khóa học là bắt buộc";
    if (!formData.startDate) newErrors.startDate = "Ngày bắt đầu ở là bắt buộc";
    if (!formData.contractEndDate) newErrors.contractEndDate = "Ngày kết thúc hợp đồng là bắt buộc";

    // Password validation only for new students
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = "Mật khẩu là bắt buộc";
      } else if (formData.password.length < 6) {
        newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    // Personal email validation (if provided)
    if (formData.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) {
      newErrors.personalEmail = "Email cá nhân không hợp lệ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSaving(true);

    // Prepare the payload
    const payload = {
      ...formData,
      roomId: formData.roomId ? parseInt(formData.roomId, 10) : null,
      courseYear: formData.courseYear ? parseInt(formData.courseYear, 10) : null,
      fatherDobYear: formData.fatherDobYear ? parseInt(formData.fatherDobYear, 10) : null,
      motherDobYear: formData.motherDobYear ? parseInt(formData.motherDobYear, 10) : null
    };

    // Remove confirmPassword as it's not needed in the API
    delete payload.confirmPassword;

    try {
      if (isEditMode) {
        await studentService.updateStudent(id, payload);
        toast.success('Cập nhật hồ sơ sinh viên thành công!');
      } else {
        await studentService.createStudent(payload);
        toast.success('Thêm sinh viên mới thành công!');
      }
      navigate('/students');
    } catch (err) {
      console.error("Lỗi lưu sinh viên:", err);
      const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');

      if (err?.errors && Array.isArray(err.errors)) {
        const serverErrors = {};
        err.errors.forEach(fieldError => {
          if (fieldError.field) serverErrors[fieldError.field] = fieldError.message;
          else serverErrors.general = fieldError.message;
        });
        setErrors(serverErrors);
        if (serverErrors.general) toast.error(serverErrors.general);
        else toast.error("Vui lòng kiểm tra lại thông tin đã nhập.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Options for room select
  const roomOptions = [
    { value: '', label: '-- Chọn phòng --' },
    ...(Array.isArray(rooms) ? rooms.map(room => ({
      value: room.id.toString(),
      label: `Phòng ${room.number} (${room.building?.name}) - ${room.capacity} chỗ`
    })) : [])
  ];

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Button variant="link" onClick={() => navigate('/students')} icon={ArrowLeftIcon} className="text-sm mb-4">
          Quay lại danh sách sinh viên
        </Button>
        <h1 className="text-2xl font-semibold">
          {isEditMode ? 'Chỉnh sửa Hồ sơ Sinh viên' : 'Thêm Tài khoản Sinh viên Mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-8 divide-y divide-gray-200">
        {/* Basic Information */}
        <div className="pt-0">
          <h3 className="text-base font-semibold leading-7 text-gray-900">1. Thông tin cơ bản</h3>
          {errors.general && <p className='text-sm text-red-600 mt-1'>{errors.general}</p>}
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Input
                label="Mã Sinh viên *"
                id="studentId"
                name="studentId"
                required
                value={formData.studentId}
                onChange={handleChange}
                disabled={isSaving || isEditMode}
                error={errors.studentId}
              />
            </div>

            <div className="sm:col-span-4">
              <Input
                label="Họ và tên *"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.fullName}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Email liên hệ *"
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isSaving || isEditMode}
                error={errors.email}
                hint={isEditMode ? "Email liên kết với tài khoản, không thể sửa." : ""}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Số điện thoại *"
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.phoneNumber}
              />
            </div>

            {!isEditMode && (
              <>
                <div className="sm:col-span-3">
                  <Input
                    label="Mật khẩu *"
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSaving}
                    error={errors.password}
                    hint="Mật khẩu phải có ít nhất 6 ký tự"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Xác nhận mật khẩu *"
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSaving}
                    error={errors.confirmPassword}
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-3">
              <Input
                label="Ngày sinh *"
                id="birthDate"
                name="birthDate"
                type="date"
                required
                value={formData.birthDate}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.birthDate}
              />
            </div>

            <div className="sm:col-span-3">
              <Select
                label="Giới tính *"
                id="gender"
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                options={genderOptions}
                disabled={isSaving}
                error={errors.gender}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Số CCCD/CMND *"
                id="identityCardNumber"
                name="identityCardNumber"
                required
                value={formData.identityCardNumber}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.identityCardNumber}
              />
            </div>

            <div className="sm:col-span-3">
              <Select
                label="Trạng thái *"
                id="status"
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                options={studentStatusOptions}
                disabled={isSaving}
                error={errors.status}
              />
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">2. Thông tin học tập</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Input
                label="Khoa/Viện *"
                id="faculty"
                name="faculty"
                required
                value={formData.faculty}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.faculty}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Khóa học *"
                id="courseYear"
                name="courseYear"
                type="number"
                required
                value={formData.courseYear}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.courseYear}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Lớp"
                id="className"
                name="className"
                value={formData.className}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.className}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Email cá nhân"
                id="personalEmail"
                name="personalEmail"
                type="email"
                value={formData.personalEmail}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.personalEmail}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Dân tộc"
                id="ethnicity"
                name="ethnicity"
                value={formData.ethnicity}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.ethnicity}
              />
            </div>
          </div>
        </div>

        {/* Dormitory Information */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">3. Thông tin Ký túc xá</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Select
                label="Phòng ở"
                id="roomId"
                name="roomId"
                value={formData.roomId}
                onChange={handleChange}
                options={roomOptions}
                disabled={isSaving}
                error={errors.roomId}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Ngày bắt đầu ở *"
                id="startDate"
                name="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.startDate}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Ngày kết thúc hợp đồng *"
                id="contractEndDate"
                name="contractEndDate"
                type="date"
                required
                value={formData.contractEndDate}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.contractEndDate}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">4. Địa chỉ thường trú</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Input
                label="Tỉnh/Thành phố"
                id="permanentProvince"
                name="permanentProvince"
                value={formData.permanentProvince}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.permanentProvince}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Quận/Huyện"
                id="permanentDistrict"
                name="permanentDistrict"
                value={formData.permanentDistrict}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.permanentDistrict}
              />
            </div>

            <div className="sm:col-span-6">
              <Textarea
                label="Địa chỉ chi tiết"
                id="permanentAddress"
                name="permanentAddress"
                rows={2}
                value={formData.permanentAddress}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.permanentAddress}
              />
            </div>
          </div>
        </div>

        {/* Family Information - Father */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">5. Thông tin gia đình - Cha</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Input
                label="Họ tên"
                id="fatherName"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.fatherName}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Năm sinh"
                id="fatherDobYear"
                name="fatherDobYear"
                type="number"
                value={formData.fatherDobYear}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.fatherDobYear}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Số điện thoại"
                id="fatherPhone"
                name="fatherPhone"
                value={formData.fatherPhone}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.fatherPhone}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Địa chỉ"
                id="fatherAddress"
                name="fatherAddress"
                value={formData.fatherAddress}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.fatherAddress}
              />
            </div>
          </div>
        </div>

        {/* Family Information - Mother */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">6. Thông tin gia đình - Mẹ</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Input
                label="Họ tên"
                id="motherName"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.motherName}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Năm sinh"
                id="motherDobYear"
                name="motherDobYear"
                type="number"
                value={formData.motherDobYear}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.motherDobYear}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Số điện thoại"
                id="motherPhone"
                name="motherPhone"
                value={formData.motherPhone}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.motherPhone}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Địa chỉ"
                id="motherAddress"
                name="motherAddress"
                value={formData.motherAddress}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.motherAddress}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="pt-8">
          <h3 className="text-base font-semibold leading-7 text-gray-900">7. Thông tin liên hệ khẩn cấp</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Input
                label="Quan hệ"
                id="emergencyContactRelation"
                name="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.emergencyContactRelation}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Số điện thoại"
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.emergencyContactPhone}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Địa chỉ"
                id="emergencyContactAddress"
                name="emergencyContactAddress"
                value={formData.emergencyContactAddress}
                onChange={handleChange}
                disabled={isSaving}
                error={errors.emergencyContactAddress}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-x-3 pt-8 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/students')}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isEditMode ? 'Lưu thay đổi' : 'Thêm Sinh viên'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;