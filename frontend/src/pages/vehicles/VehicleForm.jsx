import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService } from '../../services/vehicle.service';
import { useAuth } from '../../contexts/AuthContext'; // Lấy user hiện tại
import { Input, Button, Select } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Options loại xe và trạng thái (giống như ở Index)
const vehicleTypeOptions = [ /* ... */];
const vehicleStatusOptions = [ /* ... */];

// Mode: 'create' (Student đăng ký), 'edit' (Admin/Staff sửa)
const VehicleForm = ({ mode = 'create' }) => {
    const { id } = useParams(); // ID của xe (chỉ có ở mode 'edit')
    const { user } = useAuth(); // Lấy user để biết ai đang thực hiện
    const navigate = useNavigate();
    const isEditMode = mode === 'edit' && Boolean(id);

    const [formData, setFormData] = useState({
        // ownerId sẽ được xử lý ở backend hoặc lấy từ user context khi tạo
        type: 'motorcycle', // Mặc định
        licensePlate: '',
        model: '',
        color: '',
        status: 'active', // Mặc định khi tạo/sửa
    });
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [ownerInfo, setOwnerInfo] = useState(''); // Hiển thị thông tin chủ xe khi edit

    // Fetch dữ liệu xe nếu là edit mode
    useEffect(() => {
        if (isEditMode) {
            setIsLoading(true);
            vehicleService.getVehicleById(id)
                .then(data => {
                    setFormData({
                        type: data.type || 'motorcycle',
                        licensePlate: data.licensePlate || '',
                        model: data.model || '',
                        color: data.color || '',
                        status: data.status || 'active',
                        // Không load ownerId vào form để sửa
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
    }, [id, isEditMode, navigate]);

    // Handler thay đổi input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    // Handler Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        // --- Validation ---
        if (!formData.type) { /* ... */ }
        if (!formData.licensePlate.trim()) { setErrors({ licensePlate: "Vui lòng nhập biển số xe." }); setIsSaving(false); return; }
        if (!formData.model.trim()) { setErrors({ model: "Vui lòng nhập hãng/model xe." }); setIsSaving(false); return; }
        if (!formData.color.trim()) { setErrors({ color: "Vui lòng nhập màu xe." }); setIsSaving(false); return; }
        // --- End Validation ---

        try {
            const payload = {
                type: formData.type,
                model: formData.model,
                color: formData.color,
                status: formData.status,
            };

            if (isEditMode) {
                // Khi sửa, không gửi biển số và ownerId
                payload.status = formData.status; // Cho phép sửa status
                await vehicleService.updateVehicle(id, payload);
                toast.success('Cập nhật thông tin xe thành công!');
                // Quay lại trang danh sách của Admin/Staff
                navigate('/vehicles');
            } else { // Chế độ tạo mới (Student đăng ký)
                payload.licensePlate = formData.licensePlate;
                // **Backend cần tự lấy ownerId từ user đang login**
                // Nếu backend yêu cầu ownerId:
                // if (!user?.profile?.id && !user?.id) throw new Error("Không xác định được người dùng.");
                // payload.ownerId = user.profile?.id || user.id; // Gửi studentId hoặc userId
                await vehicleService.createVehicle(payload);
                toast.success('Đăng ký xe thành công!');
                // Quay lại trang profile hoặc dashboard của student
                navigate('/profile'); // Hoặc navigate(-1)
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
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? `Chỉnh sửa Xe (${formData.licensePlate})` : 'Đăng ký Xe mới'}
                </h1>
                {isEditMode && ownerInfo && <p className="text-sm text-gray-600 mt-1">Chủ xe: {ownerInfo}</p>}
                {!isEditMode && <p className="mt-1 text-sm text-gray-600">Điền thông tin xe bạn muốn đăng ký gửi trong ký túc xá.</p>}
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
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
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : 'Đăng ký xe'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default VehicleForm;