import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { buildingService } from '../../services/building.service'; // Import service
import apiClient from '../../api/axios'; // Import apiClient để upload ảnh
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ArrowLeftIcon, PhotoIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const BuildingForm = () => {
    const { id } = useParams(); // Lấy ID từ URL nếu là trang edit
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [building, setBuilding] = useState({
        name: '',
        address: '',
        description: '',
        images: [], // Lưu trữ thông tin ảnh hiện có (từ getById)
    });
    const [imageFiles, setImageFiles] = useState([]); // Lưu trữ file ảnh mới chọn (File object)
    const [imagePreviews, setImagePreviews] = useState([]); // Lưu trữ URL preview ảnh mới
    const [imageIdsToConnect, setImageIdsToConnect] = useState([]); // Lưu ID ảnh đã upload thành công
    const [imageIdsToRemove, setImageIdsToRemove] = useState([]); // Lưu ID ảnh hiện có muốn xóa
    const [loading, setLoading] = useState(isEditMode); // Loading nếu là edit mode
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Fetch dữ liệu building nếu là edit mode
    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            buildingService.getBuildingById(id)
                .then(data => {
                    setBuilding({
                        name: data.name || '',
                        address: data.address || '',
                        description: data.description || '',
                        images: data.images || [], // Lưu mảng ảnh hiện có
                    });
                    setImageIdsToConnect(data.images?.map(img => img.id) || []); // Bắt đầu với các ID ảnh hiện có
                    setError(null);
                })
                .catch(err => {
                    setError('Không thể tải dữ liệu tòa nhà.');
                    console.error(err);
                    toast.error('Không thể tải dữ liệu tòa nhà.');
                    navigate('/buildings'); // Quay lại danh sách nếu lỗi
                })
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, navigate]);

    // Xử lý thay đổi input text
    const handleChange = (e) => {
        const { name, value } = e.target;
        setBuilding(prev => ({ ...prev, [name]: value }));
    };

    // Xử lý chọn file ảnh
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Kiểm tra dung lượng và loại file (ví dụ giới hạn 5 ảnh, 5MB/ảnh)
        const currentTotalFiles = building.images.length - imageIdsToRemove.length + imageFiles.length + files.length;
        if (currentTotalFiles > 5) {
            toast.error('Chỉ được phép tải lên tối đa 5 ảnh.');
            return;
        }

        const validFiles = [];
        const validPreviews = [];
        let errorFound = false;

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                toast.error(`File "${file.name}" quá lớn (tối đa 5MB).`);
                errorFound = true;
            } else if (!file.type.startsWith('image/')) {
                toast.error(`File "${file.name}" không phải là ảnh.`);
                errorFound = true;
            } else {
                validFiles.push(file);
                validPreviews.push(URL.createObjectURL(file));
            }
        });

        if (!errorFound || validFiles.length > 0) {
            setImageFiles(prev => [...prev, ...validFiles]);
            setImagePreviews(prev => [...prev, ...validPreviews]);
        }
        e.target.value = null; // Reset input file để có thể chọn lại cùng file
    };

    // Xóa ảnh preview (chưa upload)
    const removeNewImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            // Thu hồi URL object để tránh memory leak
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Đánh dấu ảnh hiện có để xóa
    const markImageForRemoval = (imageId) => {
        // Thêm vào danh sách xóa nếu chưa có
        if (!imageIdsToRemove.includes(imageId)) {
            setImageIdsToRemove(prev => [...prev, imageId]);
            // Cập nhật lại imageIdsToConnect để loại bỏ ID này ra
            setImageIdsToConnect(prev => prev.filter(id => id !== imageId));
        }
    };

    // Hủy đánh dấu xóa ảnh hiện có
    const unmarkImageForRemoval = (imageId) => {
        setImageIdsToRemove(prev => prev.filter(id => id !== imageId));
        // Thêm lại ID vào danh sách connect nếu nó chưa có (và ban đầu nó thuộc building này)
        if (building.images.some(img => img.id === imageId) && !imageIdsToConnect.includes(imageId)) {
            setImageIdsToConnect(prev => [...prev, imageId]);
        }
    };


    // Xử lý submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // -- Bước 1: Upload các file ảnh mới --
        const uploadedImageIds = [...imageIdsToConnect]; // Bắt đầu với các ID ảnh hiện có không bị xóa
        if (imageFiles.length > 0) {
            const uploadPromises = imageFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('mediaType', 'BUILDING_IMAGE'); // Đúng mediaType
                try {
                    const response = await apiClient.post('/media/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    return response.data?.media?.id; // Trả về ID ảnh đã upload
                } catch (uploadError) {
                    console.error(`Lỗi upload file ${file.name}:`, uploadError);
                    toast.error(`Lỗi khi tải lên ảnh: ${file.name}`);
                    return null; // Trả về null nếu upload lỗi
                }
            });

            const results = await Promise.all(uploadPromises);
            const successfulUploadIds = results.filter(id => id !== null);

            if (successfulUploadIds.length !== imageFiles.length) {
                // Có lỗi xảy ra trong quá trình upload
                toast.error('Có lỗi xảy ra khi tải lên một số ảnh. Vui lòng thử lại.');
                // Có thể cần xóa các ảnh đã lỡ upload thành công? (phức tạp)
                setIsSubmitting(false);
                return;
            }
            uploadedImageIds.push(...successfulUploadIds); // Thêm các ID mới vào danh sách
        }


        // -- Bước 2: Chuẩn bị dữ liệu gửi lên API tạo/sửa building --
        const payload = {
            name: building.name,
            address: building.address,
            description: building.description,
            imageIds: uploadedImageIds, // Mảng ID cuối cùng để connect/set
        };

        try {
            if (isEditMode) {
                // Gọi API cập nhật
                await buildingService.updateBuilding(id, payload);
            } else {
                // Gọi API tạo mới
                await buildingService.createBuilding(payload);
            }
            // Thành công -> quay về danh sách
            navigate('/buildings');
            // toast.success đã có trong service
        } catch (err) {
            setError(err.response?.data?.message || err.message || (isEditMode ? 'Cập nhật tòa nhà thất bại.' : 'Tạo tòa nhà thất bại.'));
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cleanup preview URLs khi component unmount
    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);


    if (loading && isEditMode) {
        return <div className="text-center py-10"><LoadingSpinner /></div>;
    }
    if (error && isEditMode) {
        return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded">{error}</div>;
    }


    return (
        <div className="space-y-6">
            {/* Nút Back và Tiêu đề */}
            <div className="flex items-center justify-between">
                <Link to="/buildings" className="text-sm font-medium text-gray-600 hover:text-indigo-600 flex items-center">
                    <ArrowLeftIcon className="h-5 w-5 mr-1" />
                    Quay lại Danh sách
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">
                    {isEditMode ? 'Chỉnh sửa Tòa nhà' : 'Thêm Tòa nhà mới'}
                </h1>
                <div></div> {/* Placeholder để đẩy tiêu đề vào giữa nếu cần */}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-6 shadow sm:rounded-lg">
                <div className="space-y-8 divide-y divide-gray-200">
                    {/* Phần Thông tin cơ bản */}
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin Tòa nhà</h3>
                        <p className="mt-1 text-sm text-gray-500">Nhập các thông tin cơ bản của tòa nhà.</p>

                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-6">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên tòa nhà *</label>
                                <input type="text" name="name" id="name" required value={building.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                            </div>
                            <div className="sm:col-span-6">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                                <input type="text" name="address" id="address" value={building.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                            </div>
                            <div className="sm:col-span-6">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả</label>
                                <textarea id="description" name="description" rows={3} value={building.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Phần Ảnh */}
                    <div className="pt-8">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Ảnh Tòa nhà</h3>
                        <p className="mt-1 text-sm text-gray-500">Tải lên hoặc quản lý ảnh cho tòa nhà (tối đa 5 ảnh).</p>

                        {/* Hiển thị ảnh hiện có */}
                        {isEditMode && building.images && building.images.length > 0 && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh hiện có:</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {building.images.map(image => (
                                        <div key={image.id} className="relative group">
                                            <img
                                                src={image.path.startsWith('http') ? image.path : `${API_ASSET_URL}${image.path}`}
                                                alt={`Ảnh tòa nhà ${image.id}`}
                                                className={`w-full h-24 object-cover rounded-md border ${imageIdsToRemove.includes(image.id) ? 'opacity-40 ring-2 ring-red-500 ring-offset-2' : ''}`} // Làm mờ ảnh đánh dấu xóa
                                            />
                                            {/* Nút Xóa/Hoàn tác */}
                                            <button
                                                type="button"
                                                onClick={() => imageIdsToRemove.includes(image.id) ? unmarkImageForRemoval(image.id) : markImageForRemoval(image.id)}
                                                className={`absolute top-1 right-1 p-0.5 rounded-full text-white ${imageIdsToRemove.includes(image.id) ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'} opacity-0 group-hover:opacity-100 transition-opacity`}
                                                title={imageIdsToRemove.includes(image.id) ? "Hoàn tác xóa" : "Xóa ảnh này"}
                                            >
                                                {imageIdsToRemove.includes(image.id) ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg> // Undo icon
                                                ) : (
                                                    <TrashIcon className="h-4 w-4" />
                                                )}

                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* Hiển thị ảnh mới upload preview */}
                        {imagePreviews.length > 0 && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh mới chọn:</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {imagePreviews.map((previewUrl, index) => (
                                        <div key={index} className="relative group">
                                            <img src={previewUrl} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded-md border" />
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(index)}
                                                className="absolute top-1 right-1 p-0.5 bg-red-600 rounded-full text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Xóa ảnh này khỏi danh sách upload"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input tải ảnh mới */}
                        <div className="mt-6">
                            <label htmlFor="building-images-upload" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                                <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Chọn ảnh mới
                            </label>
                            <input id="building-images-upload" name="buildingImages" type="file" multiple className="sr-only" onChange={handleFileChange} accept="image/*" />
                            <p className="text-xs text-gray-500 mt-1">Chọn tối đa 5 ảnh, mỗi ảnh không quá 5MB.</p>
                        </div>

                    </div>
                </div>

                {/* Nút Submit */}
                <div className="pt-5">
                    <div className="flex justify-end gap-x-3">
                        <Link to="/buildings" className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            Hủy
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                        >
                            {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                            {isSubmitting ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Tạo tòa nhà')}
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-600 mt-2 text-right">{error}</p>}
                </div>
            </form>
        </div>
    );
};

export default BuildingForm;