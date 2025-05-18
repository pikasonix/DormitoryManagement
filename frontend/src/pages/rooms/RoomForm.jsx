import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service'; // Cần lấy ds tòa nhà
import { amenityService } from '../../services/amenity.service'; // Cần lấy ds tiện nghi
import { Input, Button, Select, Textarea, MultiSelectCheckbox } from '../../components/shared'; // Thêm MultiSelectCheckbox
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

// Các tùy chọn cố định (phải khớp Enum backend)
const roomStatusOptions = [
    { value: 'AVAILABLE', label: 'Còn chỗ' },
    { value: 'FULL', label: 'Đủ người' },
    { value: 'UNDER_MAINTENANCE', label: 'Đang sửa chữa' },
];
const roomTypeOptions = [
    { value: 'MALE', label: 'Phòng Nam' },
    { value: 'FEMALE', label: 'Phòng Nữ' },
    { value: 'MANAGEMENT', label: 'Phòng quản lý' },
];

const RoomForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        buildingId: '',
        number: '',
        type: 'MALE', // Default room type changed to MALE
        capacity: 2, // Giá trị mặc định
        floor: 1,
        status: 'AVAILABLE',
        roomFee: 0, // Changed from price to roomFee
        description: '',
        amenities: [], // Mảng các object { amenityId, quantity, notes }
        images: [],    // Mảng các object media { id, path, url,... }
    });
    const [buildings, setBuildings] = useState([]); // Danh sách tòa nhà
    const [allAmenities, setAllAmenities] = useState([]); // Danh sách tất cả tiện nghi
    const [selectedAmenities, setSelectedAmenities] = useState({}); // { amenityId: { quantity: 1, notes: '' } }

    const [uploadedImageFiles, setUploadedImageFiles] = useState([]); // Files mới upload
    const [existingImageIds, setExistingImageIds] = useState([]); // ID ảnh cũ (khi edit)
    const [imagePreviews, setImagePreviews] = useState([]); // URL preview ảnh

    const [isLoading, setIsLoading] = useState(true); // Bắt đầu loading để fetch data liên quan
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // --- Fetch dữ liệu cần thiết (buildings, amenities, room data nếu edit) ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [buildingRes, amenityRes, roomRes] = await Promise.allSettled([
                    buildingService.getAllBuildings({ limit: 1000 }),
                    amenityService.getAllAmenities({ limit: 1000 }),
                    isEditMode ? roomService.getRoomById(id) : Promise.resolve(null), // Chỉ fetch room nếu edit
                ]);

                if (buildingRes.status === 'fulfilled') {
                    setBuildings(buildingRes.value.buildings || []);
                    console.log('Loaded buildings:', buildingRes.value.buildings);
                } else {
                    console.error("Lỗi tải tòa nhà:", buildingRes.reason);
                    toast.error("Không thể tải danh sách tòa nhà.");
                }

                if (amenityRes.status === 'fulfilled') {
                    setAllAmenities(amenityRes.value.amenities || []);
                } else {
                    console.error("Lỗi tải tiện nghi:", amenityRes.reason);
                    toast.error("Không thể tải danh sách tiện nghi.");
                }

                if (isEditMode) {
                    if (roomRes.status === 'fulfilled' && roomRes.value) {
                        const roomData = roomRes.value;
                        console.log('Room data loaded:', roomData); // Debug log
                        setFormData({
                            buildingId: roomData.buildingId?.toString() || '',
                            number: roomData.number || '',
                            type: roomData.type || 'MALE', // Updated default room type
                            capacity: roomData.capacity ?? 2,
                            floor: roomData.floor ?? 1,
                            status: roomData.status || 'AVAILABLE',
                            roomFee: parseFloat(roomData.roomFee) || 0, // Changed from price to roomFee
                            description: roomData.description || '',
                            images: roomData.images || [], // Lưu ảnh hiện có
                            amenities: roomData.amenities || [], // Lưu tiện nghi hiện có
                        });
                        // Xử lý tiện nghi đã chọn ban đầu
                        const initialSelectedAmenities = {};
                        (roomData.amenities || []).forEach(am => {
                            initialSelectedAmenities[am.amenityId] = {
                                quantity: am.quantity || 1,
                                notes: am.notes || ''
                            };
                        });
                        setSelectedAmenities(initialSelectedAmenities);
                        // Lưu ID ảnh cũ và tạo preview
                        setExistingImageIds((roomData.images || []).map(img => img.id));
                        setImagePreviews((roomData.images || []).map(img => img.path)); // Giả sử path là URL
                    } else {
                        console.error("Lỗi tải phòng:", roomRes.reason);
                        toast.error(`Không thể tải thông tin phòng (ID: ${id}).`);
                        navigate('/rooms');
                    }
                }

            } catch (err) {
                // Lỗi chung khác
                console.error("Lỗi fetch data form phòng:", err);
                toast.error("Đã xảy ra lỗi khi tải dữ liệu.");
                if (isEditMode) navigate('/rooms'); // Quay lại nếu lỗi nặng
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, isEditMode, navigate]);


    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    // Xử lý thay đổi trong MultiSelectCheckbox tiện nghi
    const handleAmenitySelectionChange = (selectedIds) => {
        const newSelectedAmenities = { ...selectedAmenities };
        // Xóa tiện nghi không còn được chọn
        Object.keys(newSelectedAmenities).forEach(amenityId => {
            if (!selectedIds.includes(parseInt(amenityId))) {
                delete newSelectedAmenities[amenityId];
            }
        });
        // Thêm tiện nghi mới được chọn (với giá trị mặc định)
        selectedIds.forEach(id => {
            if (!newSelectedAmenities[id]) {
                newSelectedAmenities[id] = { quantity: 1, notes: '' };
            }
        });
        setSelectedAmenities(newSelectedAmenities);
    };

    // Xử lý thay đổi số lượng/ghi chú của tiện nghi đã chọn
    const handleAmenityDetailChange = (amenityId, field, value) => {
        setSelectedAmenities(prev => ({
            ...prev,
            [amenityId]: {
                ...prev[amenityId],
                [field]: field === 'quantity' ? (parseInt(value, 10) || 1) : value
            }
        }));
    };


    // Xử lý chọn ảnh
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentFiles = [...uploadedImageFiles];
        const currentPreviews = [...imagePreviews];
        let errorsFound = false;

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB
                toast.error(`Ảnh "${file.name}" vượt quá 5MB.`);
                errorsFound = true;
                return;
            }
            // Kiểm tra trùng lặp (tùy chọn)
            if (currentFiles.some(f => f.name === file.name && f.size === file.size)) {
                // toast.warn(`Ảnh "${file.name}" đã được chọn.`);
                return;
            }
            currentFiles.push(file);
            currentPreviews.push(URL.createObjectURL(file));
        });

        if (!errorsFound) {
            setUploadedImageFiles(currentFiles);
            setImagePreviews(currentPreviews);
        }
        // Reset input để có thể chọn lại cùng file nếu xóa đi
        e.target.value = null;
    };

    // Xử lý xóa ảnh (cả preview và file nếu mới upload, hoặc đánh dấu xóa ảnh cũ)
    const handleRemoveImage = (indexToRemove) => {
        const newPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);
        setImagePreviews(newPreviews);

        // Xác định xem ảnh bị xóa là ảnh mới upload hay ảnh cũ
        const numExistingImages = existingImageIds.length;
        if (indexToRemove < numExistingImages) {
            // Đây là ảnh cũ -> xóa ID khỏi danh sách ảnh cũ
            const idToRemove = existingImageIds[indexToRemove];
            setExistingImageIds(prev => prev.filter(id => id !== idToRemove));
        } else {
            // Đây là ảnh mới upload -> xóa file khỏi danh sách file mới
            const fileIndexToRemove = indexToRemove - numExistingImages;
            setUploadedImageFiles(prev => prev.filter((_, idx) => idx !== fileIndexToRemove));
        }
    };


    // Xử lý Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        // --- Client Validation ---
        // (Thêm validation nếu cần: check số phòng unique trong tòa nhà?,...)
        if (!formData.buildingId) {
            setErrors({ buildingId: "Vui lòng chọn tòa nhà." });
            setIsSaving(false); return;
        }
        if (!formData.number.trim()) {
            setErrors({ number: "Vui lòng nhập số phòng." });
            setIsSaving(false); return;
        }
        if (formData.capacity <= 0) {
            setErrors({ capacity: "Sức chứa phải lớn hơn 0." });
            setIsSaving(false); return;
        }
        if (formData.roomFee < 0) {
            setErrors({ roomFee: "Giá phòng không thể âm." });
            setIsSaving(false); return;
        }
        // --- End Validation ---


        try {
            // 1. Upload ảnh mới
            const uploadedImageIds = [];
            if (uploadedImageFiles.length > 0) {
                toast.loading('Đang tải ảnh lên...', { id: 'uploading-images' });
                const uploadPromises = uploadedImageFiles.map(file => roomService.uploadMedia(file, 'room-image'));
                const uploadResults = await Promise.allSettled(uploadPromises);

                uploadResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value?.id) {
                        uploadedImageIds.push(result.value.id);
                    } else {
                        console.error(`Lỗi upload ảnh ${uploadedImageFiles[index]?.name}:`, result.reason);
                        // Ném lỗi hoặc hiển thị thông báo cụ thể
                        throw new Error(`Tải ảnh ${uploadedImageFiles[index]?.name} thất bại.`);
                    }
                });
                toast.dismiss('uploading-images'); // Ẩn toast loading
                toast.success('Tải ảnh thành công!');
            }            // 2. Chuẩn bị payload
            const finalImageIds = [...existingImageIds, ...uploadedImageIds]; // Kết hợp ID ảnh cũ và mới
            const finalAmenities = Object.entries(selectedAmenities).map(([id, details]) => ({
                amenityId: parseInt(id),
                quantity: details.quantity,
                notes: details.notes || null,
            }));

            const payload = {
                ...formData,
                buildingId: parseInt(formData.buildingId), // Chuyển sang số
                capacity: parseInt(formData.capacity),
                floor: parseInt(formData.floor),
                roomFee: parseFloat(formData.roomFee), // Changed from price to roomFee
                amenities: finalAmenities, // Dữ liệu tiện nghi đã xử lý
                imageIds: finalImageIds,   // Mảng ID ảnh cuối cùng
            };
            // Xóa trường images và amenities gốc khỏi payload (vì đã có imageIds và amenities đã xử lý)
            delete payload.images;
            // Không xóa amenities khỏi payload khi đã xử lý dữ liệu vào finalAmenities
            // delete payload.amenities;


            // 3. Gọi API tạo/cập nhật
            if (isEditMode) {
                await roomService.updateRoom(id, payload);
                toast.success('Cập nhật phòng thành công!');
            } else {
                await roomService.createRoom(payload);
                toast.success('Thêm phòng mới thành công!');
            }
            navigate('/rooms');

        } catch (err) {
            toast.dismiss('uploading-images'); // Đảm bảo ẩn toast loading nếu có lỗi
            console.error("Lỗi lưu phòng:", err);
            const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');
            if (err?.errors && Array.isArray(err.errors)) {
                const serverErrors = {};
                err.errors.forEach(fieldError => {
                    if (fieldError.field) serverErrors[fieldError.field] = fieldError.message;
                });
                setErrors(serverErrors);
                toast.error("Vui lòng kiểm tra lại thông tin.", { id: 'validation-error' });
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // --- Tạo options cho Select ---
    const buildingOptions = buildings.map(b => ({ value: b.id.toString(), label: `${b.name} (${b.address})` }));
    const amenityOptions = allAmenities.map(a => ({ value: a.id, label: a.name })); // Dùng cho MultiSelectCheckbox


    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto"> {/* Tăng max-width */}
            <div>
                <Button variant="link" onClick={() => navigate('/rooms')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại danh sách phòng
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? 'Chỉnh sửa thông tin Phòng' : 'Thêm Phòng mới'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6 space-y-8 divide-y divide-gray-200">

                    {/* --- Phần Thông tin cơ bản --- */}
                    <div className="pt-0"> {/* Bỏ pt-8 ở section đầu */}
                        <h3 className="text-base font-semibold leading-7 text-gray-900">Thông tin cơ bản</h3>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <Select label="Tòa nhà *" id="buildingId" name="buildingId" required value={formData.buildingId} onChange={handleChange} options={[{ value: '', label: '-- Chọn tòa nhà --' }, ...buildingOptions]} disabled={isSaving} error={errors.buildingId} />
                            </div>
                            <div className="sm:col-span-3">
                                <Input label="Số phòng *" id="number" name="number" required value={formData.number} onChange={handleChange} disabled={isSaving} error={errors.number} placeholder="Ví dụ: A101" />
                            </div>
                            <div className="sm:col-span-2">
                                <Select label="Loại phòng *" id="type" name="type" required value={formData.type} onChange={handleChange} options={roomTypeOptions} disabled={isSaving} error={errors.type} />
                            </div>
                            <div className="sm:col-span-2">
                                <Input label="Sức chứa (người) *" id="capacity" name="capacity" type="number" min="1" required value={formData.capacity} onChange={handleChange} disabled={isSaving} error={errors.capacity} />
                            </div>
                            <div className="sm:col-span-2">
                                <Input label="Tầng *" id="floor" name="floor" type="number" min="1" required value={formData.floor} onChange={handleChange} disabled={isSaving} error={errors.floor} />
                            </div>
                            <div className="sm:col-span-3">
                                <Input label="Giá phòng (VND/tháng) *" id="roomFee" name="roomFee" type="number" min="0" step="1000" required value={formData.roomFee} onChange={handleChange} disabled={isSaving} error={errors.roomFee} /> {/* Changed from price to roomFee */}
                            </div>
                            <div className="sm:col-span-3">
                                <Select label="Trạng thái *" id="status" name="status" required value={formData.status} onChange={handleChange} options={roomStatusOptions} disabled={isSaving} error={errors.status} />
                            </div>
                            <div className="sm:col-span-full">
                                <Textarea label="Mô tả thêm" id="description" name="description" rows={3} value={formData.description} onChange={handleChange} disabled={isSaving} error={errors.description} />
                            </div>
                        </div>
                    </div>

                    {/* --- Phần Tiện nghi --- */}
                    <div className="pt-8">
                        <h3 className="text-base font-semibold leading-7 text-gray-900">Tiện nghi trong phòng</h3>
                        <div className="mt-4">
                            <MultiSelectCheckbox
                                label="Chọn các tiện nghi"
                                options={amenityOptions}
                                selectedValues={Object.keys(selectedAmenities).map(id => parseInt(id))} // Lấy ID đã chọn
                                onChange={handleAmenitySelectionChange}
                                disabled={isSaving}
                            />
                        </div>
                        {/* Hiển thị input chi tiết cho các tiện nghi đã chọn */}
                        {Object.keys(selectedAmenities).length > 0 && (
                            <div className="mt-6 space-y-4 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-700">Chi tiết tiện nghi đã chọn:</h4>
                                {Object.entries(selectedAmenities).map(([amenityId, details]) => {
                                    const amenity = allAmenities.find(a => a.id === parseInt(amenityId));
                                    return (
                                        <div key={amenityId} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 border rounded-md bg-gray-50">
                                            <div className="sm:col-span-1">
                                                <p className="text-sm font-medium">{amenity?.name || `Tiện nghi ID: ${amenityId}`}</p>
                                            </div>
                                            <div className="sm:col-span-1">
                                                <Input
                                                    label="Số lượng"
                                                    type="number"
                                                    min="1"
                                                    id={`amenity-qty-${amenityId}`}
                                                    value={details.quantity}
                                                    onChange={(e) => handleAmenityDetailChange(amenityId, 'quantity', e.target.value)}
                                                    disabled={isSaving}
                                                    size="sm" // Kích thước nhỏ hơn
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <Input
                                                    label="Ghi chú"
                                                    id={`amenity-notes-${amenityId}`}
                                                    value={details.notes}
                                                    onChange={(e) => handleAmenityDetailChange(amenityId, 'notes', e.target.value)}
                                                    disabled={isSaving}
                                                    size="sm"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>


                    {/* --- Phần Hình ảnh --- */}
                    <div className="pt-8">
                        <h3 className="text-base font-semibold leading-7 text-gray-900">Hình ảnh phòng</h3>
                        <div className="mt-4">
                            <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                <ArrowUpTrayIcon className="-ml-0.5 h-5 w-5 text-gray-500" aria-hidden="true" />
                                Tải ảnh lên
                            </label>
                            <input id="image-upload" name="images" type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" />
                            <p className="mt-2 text-xs leading-5 text-gray-500">Cho phép JPG, GIF, PNG. Tối đa 5MB mỗi ảnh.</p>
                        </div>
                        {/* Hiển thị ảnh preview */}
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={src.startsWith('blob:') ? src : `/uploads/${src}`} // Simplified path resolution
                                            alt={`Preview ${index + 1}`}
                                            className="object-cover w-full h-full rounded-md border"
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/default-room.png' }} // Fallback ảnh lỗi
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Xóa ảnh"
                                            disabled={isSaving}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Nút Lưu/Hủy */}
                <div className="flex items-center justify-end gap-x-3 border-t border-gray-900/10 px-4 py-4 sm:px-6">
                    <Button type="button" variant="secondary" onClick={() => navigate('/rooms')} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : 'Thêm Phòng'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default RoomForm;