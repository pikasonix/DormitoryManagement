import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService } from '../../services/vehicle.service';
import { studentService } from '../../services/student.service';
import { useAuth } from '../../contexts/AuthContext'; // Lấy user hiện tại
import { Input, Button, Select } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Options loại xe và trạng thái
const vehicleTypeOptions = [
    { value: 'MOTORBIKE', label: 'Xe máy' },
    { value: 'BICYCLE', label: 'Xe đạp' },
    { value: 'ELECTRIC_BICYCLE', label: 'Xe đạp/máy điện' },
    { value: 'CAR', label: 'Ô tô' },
    { value: 'OTHER', label: 'Khác' },
];

const vehicleStatusOptions = [
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Không hoạt động' },
];

// Hàm sinh mã thẻ gửi xe
function generateParkingCardNo(studentId, vehicleType, studentProfileId) {
    // 7 số cuối mã số sinh viên
    const studentIdStr = String(studentId);
    const last7 = studentIdStr.slice(-7);
    // Ký tự loại xe
    let typeChar = 'O';
    switch (vehicleType) {
        case 'BICYCLE': typeChar = 'B'; break;
        case 'MOTORBIKE': typeChar = 'M'; break;
        case 'CAR': typeChar = 'C'; break;
        case 'ELECTRIC_BICYCLE': typeChar = 'E'; break;
        case 'OTHER': typeChar = 'O'; break;
        default: typeChar = 'O';
    }
    // 4 ký tự cuối id (studentProfileId)
    const idStr = String(studentProfileId).padStart(4, '0');
    const last4 = idStr.slice(-4);
    // Checksum: tổng các số mod 10
    const sum = (last7 + last4).split('').reduce((acc, c) => acc + (parseInt(c) || 0), 0);
    const checksum = String(sum % 10);
    // Ghép lại
    return (last7 + typeChar + last4 + checksum).padStart(13, '0');
}

// Mode: 'create' (Student đăng ký), 'edit' (Admin/Staff sửa)
const VehicleForm = ({ mode = 'create' }) => {
    const { id } = useParams(); // ID của xe (chỉ có ở mode 'edit')
    const { user } = useAuth(); // Lấy user để biết ai đang thực hiện
    const navigate = useNavigate();
    const isEditMode = mode === 'edit' && Boolean(id); const [formData, setFormData] = useState({
        // ownerId sẽ được xử lý ở backend hoặc lấy từ user context khi tạo
        type: 'MOTORBIKE', // Mặc định
        licensePlate: '',
        model: '',
        color: '',
        status: 'active', // Mặc định khi tạo/sửa
        studentId: '', // Thêm mã số sinh viên cho admin tạo xe cho sinh viên
    });
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [ownerInfo, setOwnerInfo] = useState(''); // Hiển thị thông tin chủ xe khi edit
    const [isAdmin, setIsAdmin] = useState(false); // Kiểm tra nếu người dùng là admin hoặc staff
    const [foundStudent, setFoundStudent] = useState(null); // Lưu thông tin sinh viên khi tìm thấy

    // Xác định nếu người dùng là admin/staff
    useEffect(() => {
        const userRole = user?.role || '';
        setIsAdmin(userRole === 'ADMIN' || userRole === 'STAFF');
    }, [user]);

    // Fetch dữ liệu xe nếu là edit mode
    useEffect(() => {
        if (isEditMode) {
            setIsLoading(true);
            vehicleService.getVehicleById(id)
                .then(data => {
                    setFormData({
                        type: data.vehicleType || 'MOTORBIKE', // Đúng trường backend trả về
                        licensePlate: data.licensePlate || '',
                        model: data.model || '',
                        color: data.color || '',
                        status: data.isActive === false ? 'inactive' : 'active', // Chuyển đổi từ isActive
                        studentId: data.studentProfile?.studentId || '', // Nếu cần hiển thị mã SV
                    });
                    // **Cần lấy tên chủ xe để hiển thị** (Giả sử ownerId là studentId)
                    if (data.ownerId) {
                        // studentService.getStudentById(data.ownerId)
                        //    .then(owner => setOwnerInfo(owner?.fullName || `ID: ${data.ownerId}`))
                        //    .catch(() => setOwnerInfo(`ID: ${data.ownerId}`));
                        setOwnerInfo(`ID Chủ xe: ${data.ownerId}`); // Tạm hiển thị ID
                    }
                })
                .catch(err => {
                    toast.error(`Không thể tải thông tin xe (ID: ${id}).`);
                    navigate('/vehicles'); // Quay lại nếu lỗi
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false); // Không cần load khi tạo
        }
    }, [id, isEditMode, navigate]);    // Biến để lưu timer debounce
    const searchTimerRef = React.useRef(null);

    // Cleanup timer khi component unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);

    // Handler thay đổi input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

        // Nếu trường là studentId và có giá trị, thực hiện tìm kiếm sinh viên
        if (name === 'studentId' && isAdmin) {
            // Reset thông tin sinh viên đã tìm thấy trước đó
            setFoundStudent(null);

            // Xóa timer cũ nếu có
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }

            // Chỉ tìm kiếm nếu độ dài mã sinh viên >= 3 ký tự
            if (value.trim().length >= 3) {
                // Debounce: đợi 500ms sau khi người dùng ngừng gõ rồi mới tìm kiếm
                searchTimerRef.current = setTimeout(() => {
                    // Tìm thông tin sinh viên dựa trên mã sinh viên
                    studentService.getAllStudents({ keyword: value.trim() })
                        .then(response => {
                            const student = response.students?.find(s => s.studentId === value.trim());
                            if (student) {
                                setFoundStudent(student);
                                // Xóa lỗi nếu có
                                if (errors.studentId) {
                                    setErrors(prev => ({ ...prev, studentId: null }));
                                }
                            }
                        })
                        .catch(error => {
                            console.error("Lỗi tìm kiếm sinh viên:", error);
                            // Không hiển thị thông báo lỗi ngay, chỉ khi submit form
                        });
                }, 500);
            }
        }
    };

    // Handler Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});        // --- Validation ---
        if (!formData.type) { /* ... */ }
        if (!formData.licensePlate.trim()) { setErrors({ licensePlate: "Vui lòng nhập biển số xe." }); setIsSaving(false); return; }
        if (!formData.model.trim()) { setErrors({ model: "Vui lòng nhập hãng/model xe." }); setIsSaving(false); return; }
        if (!formData.color.trim()) { setErrors({ color: "Vui lòng nhập màu xe." }); setIsSaving(false); return; }
        // Validation cho mã sinh viên nếu là admin đăng ký xe cho sinh viên
        if (!isEditMode && isAdmin && !formData.studentId.trim()) {
            setErrors({ studentId: "Vui lòng nhập mã số sinh viên." });
            setIsSaving(false);
            return;
        }
        // --- End Validation ---

        try {
            const payload = {
                vehicleType: formData.type, // Đổi từ 'type' sang 'vehicleType' cho đúng backend
                model: formData.model,
                color: formData.color,
                status: formData.status,
            };

            if (isEditMode) {
                // Khi sửa, không gửi biển số và ownerId
                payload.status = formData.status; // Cho phép sửa status
                // Đảm bảo gửi đúng trường trạng thái cho backend
                if (formData.status === 'active') {
                    payload.isActive = true;
                } else if (formData.status === 'inactive') {
                    payload.isActive = false;
                }
                await vehicleService.updateVehicle(id, payload);
                toast.success('Cập nhật thông tin xe thành công!');
                // Quay lại trang danh sách của Admin/Staff
                navigate('/vehicles');
            } else { // Chế độ tạo mới
                payload.licensePlate = formData.licensePlate;
                payload.startDate = new Date().toISOString(); // Thêm ngày bắt đầu gửi xe

                // Nếu là admin/staff thì gửi thêm mã sinh viên
                if (isAdmin && formData.studentId.trim()) {
                    // Sử dụng sinh viên đã tìm thấy trước đó nếu có
                    if (foundStudent) {
                        payload.studentProfileId = foundStudent.id;
                    } else {
                        // Nếu chưa tìm thấy, tìm lại
                        try {
                            const students = await studentService.getAllStudents({ keyword: formData.studentId });
                            const student = students.students?.find(s => s.studentId === formData.studentId);

                            if (!student) {
                                throw new Error(`Không tìm thấy sinh viên với mã số ${formData.studentId}`);
                            }

                            payload.studentProfileId = student.id;
                        } catch (studentError) {
                            toast.error(studentError.message || `Không tìm thấy sinh viên với mã số ${formData.studentId}`);
                            setErrors({ studentId: `Không tìm thấy sinh viên với mã số ${formData.studentId}` });
                            setIsSaving(false);
                            return;
                        }
                    }
                } else {
                    // Sinh viên tự đăng ký - backend sẽ tự lấy studentProfileId từ token
                }

                // Tạo xe trước, sau đó update parkingCardNo với id vừa tạo
                const createdVehicle = await vehicleService.createVehicle(payload);
                // Sinh mã thẻ gửi xe dựa trên id vehicle_registrations
                let parkingCardNo = null;
                try {
                    // Ưu tiên lấy studentId từ foundStudent hoặc từ payload
                    let studentIdForCard = foundStudent?.studentId || formData.studentId;
                    let studentProfileIdForCard = createdVehicle.studentProfileId || payload.studentProfileId;
                    parkingCardNo = generateParkingCardNo(studentIdForCard, formData.type, createdVehicle.id);
                    // Gọi update để set parkingCardNo
                    await vehicleService.updateVehicle(createdVehicle.id, { parkingCardNo });
                } catch (err) {
                    // Nếu lỗi vẫn tiếp tục, chỉ cảnh báo
                    toast.error('Không thể sinh mã thẻ gửi xe tự động.');
                }
                toast.success('Đăng ký xe thành công!');

                // Quay lại trang phù hợp theo vai trò
                if (isAdmin) {
                    navigate('/vehicles'); // Admin quay lại trang quản lý xe
                } else {
                    navigate('/profile'); // Sinh viên quay lại trang profile
                }
            }

        } catch (err) {
            console.error("Lỗi lưu thông tin xe:", err);
            const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Đăng ký thất bại.');
            if (err?.errors && Array.isArray(err.errors)) { /* ... xử lý lỗi validation ... */ }
            else { toast.error(errorMsg); }
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                {/* Nút quay lại tùy theo ngữ cảnh */}
                <Button variant="link" onClick={() => navigate(isEditMode ? '/vehicles' : -1)} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại
                </Button>                <h1 className="text-2xl font-semibold">
                    {isEditMode ? `Chỉnh sửa Xe (${formData.licensePlate})` :
                        isAdmin ? 'Đăng ký Xe cho Sinh viên' : 'Đăng ký Xe mới'}
                </h1>
                {isEditMode && ownerInfo && <p className="text-sm text-gray-600 mt-1">Chủ xe: {ownerInfo}</p>}
                {!isEditMode && !isAdmin && <p className="mt-1 text-sm text-gray-600">Điền thông tin xe bạn muốn đăng ký gửi trong ký túc xá.</p>}
                {!isEditMode && isAdmin && <p className="mt-1 text-sm text-gray-600">Điền thông tin xe và mã số sinh viên để đăng ký gửi xe.</p>}
            </div>
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {/* Trường nhập mã sinh viên chỉ hiển thị khi Admin/Staff tạo mới (đặt lên đầu) */}
                {!isEditMode && isAdmin && (
                    <div>
                        <Input
                            label="Mã số sinh viên *"
                            id="studentId"
                            name="studentId"
                            required
                            value={formData.studentId}
                            onChange={handleChange}
                            disabled={isSaving}
                            error={errors.studentId}
                            placeholder="Nhập mã số sinh viên để đăng ký xe"
                        />
                        {formData.studentId.trim().length >= 3 && !foundStudent && !errors.studentId && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800 flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang tìm kiếm sinh viên...
                                </p>
                            </div>
                        )}
                        {foundStudent && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-800">
                                    <span className="font-medium text-green-600">✓ Đã tìm thấy sinh viên:</span> {foundStudent.fullName}
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    {foundStudent.className && <span className="mr-2">Lớp: {foundStudent.className}</span>}
                                    {foundStudent.roomNumber && <span className="mr-2">Phòng: {foundStudent.roomNumber}</span>}
                                    {foundStudent.id && <span>ID: {foundStudent.id}</span>}
                                </p>
                            </div>
                        )}
                        {formData.studentId.trim().length >= 3 && !foundStudent && errors.studentId && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800 flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    Không tìm thấy sinh viên với mã số này
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Trường Biển số chỉ hiển thị/nhập khi tạo mới */}
                {!isEditMode && (
                    <Input
                        label="Biển số xe *"
                        id="licensePlate"
                        name="licensePlate"
                        required
                        value={formData.licensePlate}
                        onChange={handleChange}
                        disabled={isSaving}
                        error={errors.licensePlate}
                        placeholder="Ví dụ: 29A-12345"
                        uppercase={true} // Tự động viết hoa?
                    />
                )}
                <Select
                    label="Loại xe *"
                    id="type"
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    options={vehicleTypeOptions}
                    disabled={isSaving}
                    error={errors.type}
                />
                <Input
                    label="Hãng xe / Model *"
                    id="model"
                    name="model"
                    required
                    value={formData.model}
                    onChange={handleChange}
                    disabled={isSaving}
                    error={errors.model}
                    placeholder="Ví dụ: Honda Wave Alpha, Vinfast Fadil..."
                />
                <Input
                    label="Màu sắc *"
                    id="color"
                    name="color"
                    required
                    value={formData.color}
                    onChange={handleChange}
                    disabled={isSaving}
                    error={errors.color}
                    placeholder="Ví dụ: Đen, Trắng bạc,..."
                />
                {/* Trạng thái chỉ hiển thị khi edit (Admin/Staff sửa) */}
                {isEditMode && (
                    <Select
                        label="Trạng thái"
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        options={vehicleStatusOptions}
                        disabled={isSaving}
                        error={errors.status}
                    />
                )}


                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate(isEditMode ? '/vehicles' : -1)} disabled={isSaving}>
                        Hủy
                    </Button>                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : isAdmin ? 'Đăng ký xe cho sinh viên' : 'Đăng ký xe'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default VehicleForm;