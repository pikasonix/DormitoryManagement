import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { buildingService } from '../../services/building.service'; // Lấy ds tòa nhà
import { amenityService } from '../../services/amenity.service'; // Lấy ds tiện nghi
import apiClient from '../../api/axios'; // Để upload ảnh
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Select from '../../components/shared/Select'; // Component Select dùng chung
import { ArrowLeftIcon, ArrowUpTrayIcon, PhotoIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RoomStatus, RoomType } from '@prisma/client'; // Import Enums nếu cần (hoặc định nghĩa const)

// Định nghĩa lại Enums nếu không import được từ backend
const ROOM_TYPES = [
    { value: 'ROOM_12', label: 'Phòng 12' },
    { value: 'ROOM_10', label: 'Phòng 10' },
    { value: 'ROOM_8', label: 'Phòng 8' },
    { value: 'ROOM_6', label: 'Phòng 6' },
    { value: 'MANAGEMENT', label: 'Phòng Quản lý' },
];
const ROOM_STATUSES = [
    { value: 'AVAILABLE', label: 'Còn chỗ' },
    { value: 'FULL', label: 'Đã đầy' },
    { value: 'UNDER_MAINTENANCE', label: 'Đang bảo trì' },
];

const API_ASSET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';


const RoomForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [room, setRoom] = useState({
        buildingId: '',
        number: '',
        type: '', // RoomType enum
        capacity: '',
        floor: '',
        status: 'AVAILABLE', // RoomStatus enum, mặc định AVAILABLE
        price: '',
        description: '',
        images: [], // Lưu ảnh hiện có khi edit
        // amenities: [], // Lưu amenity hiện có khi edit, cần cấu trúc phức tạp hơn để quản lý
    });
    const [buildings, setBuildings] = useState([]); // Danh sách tòa nhà cho dropdown
    const [allAmenities, setAllAmenities] = useState([]); // Danh sách tất cả tiện nghi
    const [selectedAmenities, setSelectedAmenities] = useState([]); // [{ amenityId: number, quantity: number, notes: string }]

    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [imageIdsToConnect, setImageIdsToConnect] = useState([]);
    const [imageIdsToRemove, setImageIdsToRemove] = useState([]);

    const [loading, setLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);


    // Fetch dữ liệu cần thiết (tòa nhà, tiện nghi, phòng nếu edit)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [buildingRes, amenityRes, roomRes] = await Promise.allSettled([
                    buildingService.getAllBuildings({ limit: 500 }), // Lấy nhiều tòa nhà
                    amenityService.getAllAmenities({ limit: 500 }),   // Lấy nhiều tiện nghi
                    isEditMode ? roomService.getRoomById(id) : Promise.resolve(null) // Chỉ fetch phòng nếu edit
                ]);

                // Xử lý kết quả tòa nhà
                if (buildingRes.status === 'fulfilled') {
                    setBuildings(buildingRes.value.data?.map(b => ({ value: b.id, label: `${b.name} (${b.address || 'N/A'})` })) || []);
                } else {
                    console.error("Lỗi lấy danh sách tòa nhà:", buildingRes.reason);
                    toast.error("Không thể tải danh sách tòa nhà.");
                }

                // Xử lý kết quả tiện nghi
                if (amenityRes.status === 'fulfilled') {
                    setAllAmenities(amenityRes.value.data?.map(a => ({ value: a.id, label: a.name })) || []);
                } else {
                    console.error("Lỗi lấy danh sách tiện nghi:", amenityRes.reason);
                    toast.error("Không thể tải danh sách tiện nghi.");
                }

                // Xử lý kết quả phòng (nếu edit)
                if (isEditMode) {
                    if (roomRes.status === 'fulfilled' && roomRes.value) {
                        const roomData = roomRes.value;
                        setRoom({
                            buildingId: roomData.buildingId || '',
                            number: roomData.number || '',
                            type: roomData.type || '',
                            capacity: roomData.capacity || '',
                            floor: roomData.floor || '',
                            status: roomData.status || 'AVAILABLE',
                            price: roomData.price?.toString() || '', // Chuyển Decimal thành string
                            description: roomData.description || '',
                            images: roomData.images || [],
                        });
                        setImageIdsToConnect(roomData.images?.map(img => img.id) || []);
                        // Khởi tạo selectedAmenities từ roomData.amenities (quan hệ RoomAmenity)
                        setSelectedAmenities(roomData.amenities?.map(ra => ({
                            amenityId: ra.amenityId,
                            quantity: ra.quantity || 1, // Số lượng từ bảng trung gian
                            notes: ra.notes || ''     // Ghi chú từ bảng trung gian
                        })) || []);

                    } else {
                        setError('Không thể tải dữ liệu phòng.');
                        console.error("Lỗi lấy dữ liệu phòng:", roomRes.reason || 'Không tìm thấy');
                        toast.error('Không thể tải dữ liệu phòng.');
                        navigate('/rooms');
                    }
                }

            } catch (err) { // Lỗi chung khác (ít khi xảy ra với Promise.allSettled)
                setError('Đã xảy ra lỗi khi tải dữ liệu cần thiết.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, isEditMode, navigate]);


    // --- Các hàm xử lý input, file, ảnh giống BuildingForm ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setRoom(prev => ({ ...prev, [name]: value }));
    };
    const handleFileChange = (e) => { /* ... Giống BuildingForm ... */ };
    const removeNewImage = (index) => { /* ... Giống BuildingForm ... */ };
    const markImageForRemoval = (imageId) => { /* ... Giống BuildingForm ... */ };
    const unmarkImageForRemoval = (imageId) => { /* ... Giống BuildingForm ... */ };

    // --- Xử lý thay đổi Tiện nghi ---
    const handleAmenityChange = (amenityId) => {
        setSelectedAmenities(prev => {
            const existingIndex = prev.findIndex(a => a.amenityId === amenityId);
            if (existingIndex > -1) {
                // Bỏ chọn -> Xóa khỏi mảng
                return prev.filter((_, i) => i !== existingIndex);
            } else {
                // Chọn mới -> Thêm vào mảng với quantity mặc định
                return [...prev, { amenityId: amenityId, quantity: 1, notes: '' }];
            }
        });
    };
    const handleAmenityDetailChange = (amenityId, field, value) => {
        setSelectedAmenities(prev => prev.map(am => {
            if (am.amenityId === amenityId) {
                return { ...am, [field]: field === 'quantity' ? (parseInt(value) || 1) : value }; // Cập nhật quantity hoặc notes
            }
            return am;
        }));
    };


    // Xử lý submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // --- Upload ảnh mới (Giống BuildingForm) ---
        let uploadedImageIds = [...imageIdsToConnect];
        if (imageFiles.length > 0) {
            /* ... Logic upload ảnh tương tự BuildingForm ... */
            // Nếu upload lỗi thì return; setIsSubmitting(false);
        }

        // --- Chuẩn bị dữ liệu phòng ---
        const payload = {
            // Bắt buộc
            buildingId: parseInt(room.buildingId),
            number: room.number,
            type: room.type, // Đã là enum hoặc string hợp lệ
            capacity: parseInt(room.capacity),
            floor: parseInt(room.floor),
            price: room.price ? new Decimal(room.price) : undefined, // Chuyển thành Decimal
            // Tùy chọn
            status: room.status, // Đã là enum hoặc string hợp lệ
            description: room.description,
            // Mảng tiện nghi để tạo/thay thế
            amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined, // Gửi mảng đã chọn
            // Mảng ID ảnh cuối cùng để connect/set
            imageIds: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
        };

        // Validate lại trước khi gửi
        if (isNaN(payload.buildingId) || !payload.number || !payload.type || isNaN(payload.capacity) || isNaN(payload.floor) || payload.price === undefined) {
            setError("Vui lòng điền đầy đủ thông tin bắt buộc và kiểm tra kiểu dữ liệu.");
            setIsSubmitting(false);
            return;
        }


        try {
            if (isEditMode) {
                await roomService.updateRoom(id, payload);
            } else {
                await roomService.createRoom(payload);
            }
            navigate('/rooms');
        } catch (err) {
            setError(err.response?.data?.message || err.message || (isEditMode ? 'Cập nhật phòng thất bại.' : 'Tạo phòng thất bại.'));
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cleanup preview URLs
    useEffect(() => { /* ... Giống BuildingForm ... */ });


    if (loading) return <div className="text-center py-10"><LoadingSpinner /></div>;
    // Không cần kiểm tra error ở đây vì đã xử lý trong useEffect


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/rooms" className="text-sm ..."><ArrowLeftIcon /> Quay lại Danh sách</Link>
                <h1 className="text-2xl font-bold ...">{isEditMode ? 'Chỉnh sửa Phòng' : 'Thêm Phòng mới'}</h1>
                <div></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 ...">
                {/* Phần Thông tin cơ bản */}
                <div>
                    <h3 className="...">Thông tin Phòng</h3>
                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Input Tòa nhà (Select) */}
                        <div className="sm:col-span-3">
                            <Select label="Tòa nhà *" name="buildingId" required value={room.buildingId} onChange={handleChange} options={buildings} disabled={buildings.length === 0} />
                        </div>
                        {/* Input Số phòng */}
                        <div className="sm:col-span-3">
                            <label htmlFor="number" className="...">Số phòng *</label>
                            <input type="text" name="number" id="number" required value={room.number} onChange={handleChange} className="mt-1 ..." />
                        </div>
                        {/* Input Loại phòng (Select) */}
                        <div className="sm:col-span-2">
                            <Select label="Loại phòng *" name="type" required value={room.type} onChange={handleChange} options={[{ value: '', label: 'Chọn loại phòng' }, ...ROOM_TYPES]} />
                        </div>
                        {/* Input Sức chứa */}
                        <div className="sm:col-span-2">
                            <label htmlFor="capacity" className="...">Sức chứa *</label>
                            <input type="number" name="capacity" id="capacity" required min="1" value={room.capacity} onChange={handleChange} className="mt-1 ..." />
                        </div>
                        {/* Input Tầng */}
                        <div className="sm:col-span-2">
                            <label htmlFor="floor" className="...">Tầng *</label>
                            <input type="number" name="floor" id="floor" required min="0" value={room.floor} onChange={handleChange} className="mt-1 ..." />
                        </div>
                        {/* Input Giá phòng */}
                        <div className="sm:col-span-3">
                            <label htmlFor="price" className="...">Giá phòng (VNĐ/tháng) *</label>
                            <input type="number" name="price" id="price" required min="0" step="1000" value={room.price} onChange={handleChange} className="mt-1 ..." />
                        </div>
                        {/* Input Trạng thái (Select - chỉ hiển thị khi edit?) */}
                        {isEditMode && (
                            <div className="sm:col-span-3">
                                <Select label="Trạng thái" name="status" value={room.status} onChange={handleChange} options={ROOM_STATUSES} />
                            </div>
                        )}
                        {/* Input Mô tả */}
                        <div className="sm:col-span-6">
                            <label htmlFor="description" className="...">Mô tả</label>
                            <textarea id="description" name="description" rows={3} value={room.description} onChange={handleChange} className="mt-1 ..."></textarea>
                        </div>
                    </div>
                </div>

                {/* Phần Tiện nghi */}
                <div className="pt-8">
                    <h3 className="...">Tiện nghi trong phòng</h3>
                    {/* Danh sách checkbox hoặc multi-select để chọn tiện nghi */}
                    <div className="mt-4 space-y-4">
                        {allAmenities.map(amenityOption => {
                            const isSelected = selectedAmenities.some(sa => sa.amenityId === amenityOption.value);
                            const selectedData = selectedAmenities.find(sa => sa.amenityId === amenityOption.value);
                            return (
                                <div key={amenityOption.value} className={`p-4 border rounded-md ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="relative flex items-start">
                                            <div className="flex h-6 items-center">
                                                <input
                                                    id={`amenity-${amenityOption.value}`}
                                                    name="selectedAmenities"
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleAmenityChange(amenityOption.value)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm leading-6">
                                                <label htmlFor={`amenity-${amenityOption.value}`} className="font-medium text-gray-900">{amenityOption.label}</label>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Hiển thị input quantity và notes nếu được chọn */}
                                    {isSelected && (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-4 pl-7">
                                            <div className="sm:col-span-2">
                                                <label htmlFor={`quantity-${amenityOption.value}`} className="block text-xs font-medium text-gray-500">Số lượng</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    id={`quantity-${amenityOption.value}`}
                                                    value={selectedData?.quantity || 1}
                                                    onChange={(e) => handleAmenityDetailChange(amenityOption.value, 'quantity', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label htmlFor={`notes-${amenityOption.value}`} className="block text-xs font-medium text-gray-500">Ghi chú (vd: tình trạng)</label>
                                                <input
                                                    type="text"
                                                    id={`notes-${amenityOption.value}`}
                                                    value={selectedData?.notes || ''}
                                                    onChange={(e) => handleAmenityDetailChange(amenityOption.value, 'notes', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {allAmenities.length === 0 && <p className="text-sm text-gray-500 mt-2">Chưa có tiện nghi nào được tạo. <Link to="/amenities/new" className="text-indigo-600 hover:underline">Tạo tiện nghi mới?</Link></p>}
                </div>


                {/* Phần Ảnh (Giống BuildingForm) */}
                <div className="pt-8">
                    <h3 className="...">Ảnh Phòng</h3>
                    {/* ... Logic hiển thị ảnh cũ, preview ảnh mới, input upload giống BuildingForm ... */}
                    {/* Nhớ thay mediaType thành 'ROOM_IMAGE' khi upload */}
                    <p className="text-center text-red-500 my-4">(Thêm phần quản lý ảnh giống BuildingForm ở đây)</p>
                </div>

                {/* Nút Submit */}
                <div className="pt-5">
                    {/* ... Nút Hủy và Lưu/Tạo giống BuildingForm ... */}
                    <p className="text-center text-red-500 my-4">(Thêm nút Hủy/Lưu giống BuildingForm ở đây)</p>
                </div>
            </form>
        </div>
    );
};

export default RoomForm;