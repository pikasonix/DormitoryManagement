import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildingService } from '../../services/building.service';
import { Input, Button, Textarea } from '../../components/shared'; // Import component chung
import ImageUpload from '../../components/shared/ImageUpload'; // Import component upload ảnh
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const BuildingForm = () => {
    const { id } = useParams(); // Lấy id từ URL nếu là edit mode
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        totalRooms: 0,
    });
    const [isLoading, setIsLoading] = useState(isEditMode); // Loading nếu là edit mode
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({}); // State cho lỗi validation từ server

    // State cho ảnh
    const [buildingImages, setBuildingImages] = useState([]);
    const [imageIds, setImageIds] = useState([]);
    const imageUploadRef = useRef(null); // Ref để truy cập đến component ImageUpload

    // Fetch dữ liệu building nếu là edit mode
    useEffect(() => {
        if (isEditMode) {
            setIsLoading(true);
            buildingService.getBuildingById(id)
                .then(data => {
                    // Populate form data (đảm bảo các trường khớp)
                    setFormData({
                        name: data.name || '',
                        address: data.address || '',
                        description: data.description || '',
                        totalRooms: data.totalRooms ?? 0, // Dùng ?? để xử lý null/undefined
                    });

                    // Lưu thông tin ảnh nếu có
                    if (data.images && data.images.length > 0) {
                        setBuildingImages(data.images);
                        setImageIds(data.images.map(img => img.id));
                    }
                })
                .catch(err => {
                    toast.error(`Không thể tải thông tin tòa nhà (ID: ${id}).`);
                    console.error(err);
                    navigate('/buildings'); // Quay về danh sách nếu không tìm thấy
                })
                .finally(() => setIsLoading(false));
        }
        // Chỉ chạy khi id thay đổi (và lần đầu)
    }, [id, isEditMode, navigate]);

    // Xử lý thay đổi input
    const handleChange = (e) => {
        const { name, value, type } = e.target;

        // Đặc biệt xử lý cho textarea (description)
        if (name === 'description') {
            // Đảm bảo giá trị description luôn được cập nhật, kể cả khi là chuỗi rỗng
            setFormData(prev => ({
                ...prev,
                description: value // Không thực hiện xử lý đặc biệt nào cho description
            }));
            console.log("Description updated to:", value);
        } else {
            // Xử lý bình thường cho các trường khác
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
            }));
        }

        // Xóa lỗi khi user nhập lại
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Xử lý submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({}); // Xóa lỗi cũ

        // --- Client-side validation cơ bản (tùy chọn) ---
        if (!formData.name.trim()) {
            setErrors({ name: "Tên tòa nhà là bắt buộc." });
            setIsSaving(false);
            return;
        }
        if (!formData.address.trim()) {
            setErrors({ address: "Địa chỉ là bắt buộc." });
            setIsSaving(false);
            return;
        }
        // --- Kết thúc validation ---

        try {
            // Upload ảnh nếu có (đây là method trong component ImageUpload)
            if (imageUploadRef.current && typeof imageUploadRef.current.uploadSelectedFiles === 'function') {
                await imageUploadRef.current.uploadSelectedFiles('building-image');
            }

            // Tạo bản sao của formData và loại bỏ totalRooms
            const { totalRooms, ...dataToSubmit } = formData;

            // Thêm imageIds vào dữ liệu gửi đi nếu có
            if (imageIds.length > 0) {
                dataToSubmit.imageIds = imageIds;
            }

            if (isEditMode) {
                await buildingService.updateBuilding(id, dataToSubmit);
                toast.success('Cập nhật tòa nhà thành công!');
            } else {
                await buildingService.createBuilding(dataToSubmit);
                toast.success('Thêm tòa nhà mới thành công!');
            }
            navigate('/buildings'); // Quay về trang danh sách
        } catch (err) {
            console.error("Lỗi lưu tòa nhà:", err);
            const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');
            // Hiển thị lỗi validation từ server nếu có
            if (err?.errors && Array.isArray(err.errors)) {
                const serverErrors = {};
                err.errors.forEach(fieldError => {
                    if (fieldError.field) serverErrors[fieldError.field] = fieldError.message;
                });
                setErrors(serverErrors);
                toast.error("Vui lòng kiểm tra lại thông tin đã nhập.", { id: 'validation-error' });
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <Button variant="link" onClick={() => navigate('/buildings')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại danh sách
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? 'Chỉnh sửa Tòa nhà' : 'Thêm Tòa nhà mới'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                <Input
                    label="Tên Tòa nhà *"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    error={errors.name}
                />
                <Input
                    label="Địa chỉ *"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    error={errors.address}
                />
                <Input
                    label="Tổng số phòng"
                    id="totalRooms"
                    name="totalRooms"
                    type="number"
                    value={formData.totalRooms}
                    disabled={true}
                    readOnly={true}
                    helpText="Số phòng được tính tự động dựa trên số lượng phòng trong cơ sở dữ liệu."
                />
                <Textarea
                    label="Mô tả"
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isSaving}
                    error={errors.description}
                />

                {/* Component upload ảnh tòa nhà */}
                <ImageUpload
                    ref={imageUploadRef}
                    label="Ảnh tòa nhà"
                    multiple={true}
                    maxFiles={10}
                    maxSizeMB={5}
                    initialImageUrls={buildingImages.map(img => img.path)}
                    disabled={isSaving}
                    onUploadComplete={(uploadedMedia) => {
                        // Lưu ID của các ảnh đã upload để gửi lên server
                        setImageIds(uploadedMedia.map(media => media.id).filter(Boolean));
                    }}
                />

                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/buildings')} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : 'Thêm Tòa nhà'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default BuildingForm;