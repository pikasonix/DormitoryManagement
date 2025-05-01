import React, { useState, useRef, useEffect } from 'react';
import { mediaService } from '../../services/media.service'; // Import service upload
import { toast } from 'react-hot-toast';
import { ArrowUpTrayIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner'; // Import Spinner

const ImageUpload = ({
    label = "Tải ảnh lên",
    multiple = false, // Cho phép chọn nhiều ảnh không?
    maxFiles = 5,     // Số lượng ảnh tối đa (nếu multiple=true)
    maxSizeMB = 5,    // Kích thước tối đa mỗi ảnh (MB)
    accept = "image/*", // Loại file chấp nhận
    initialImageUrls = [], // Mảng URL hoặc path ảnh đã có (dùng khi edit)
    onUploadComplete, // Callback khi tất cả ảnh được upload thành công: onUploadComplete(uploadedMediaObjects)
    onFilesChange,    // Callback khi danh sách file thay đổi (bao gồm cả ảnh cũ và mới): onFilesChange({ existingUrls: [], newFiles: [] })
    className = '',
    disabled = false,
}) => {
    // State cho các file mới được chọn (chưa upload)
    const [selectedFiles, setSelectedFiles] = useState([]);
    // State cho URL preview của cả ảnh cũ và mới
    const [previewUrls, setPreviewUrls] = useState([]);
    // State cho các URL/path ảnh cũ cần giữ lại (khi edit)
    const [existingUrlsToKeep, setExistingUrlsToKeep] = useState([...initialImageUrls]);
    // State loading tổng
    const [isProcessing, setIsProcessing] = useState(false);
    // State lỗi của component
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    // --- Cập nhật preview khi initialImageUrls thay đổi ---
    useEffect(() => {
        setExistingUrlsToKeep([...initialImageUrls]);
        // Tạo preview từ initialImageUrls và selectedFiles
        const existingPreviews = [...initialImageUrls]; // Giả sử initialImageUrls là URL có thể hiển thị
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        const allPreviews = [...existingPreviews, ...newPreviews];
        setPreviewUrls(allPreviews);

        // Gọi callback onFilesChange để thông báo về trạng thái file hiện tại
        if (onFilesChange) {
            onFilesChange({ existingUrls: existingUrlsToKeep, newFiles: selectedFiles });
        }

        // Cleanup blob URLs khi component unmount hoặc selectedFiles thay đổi
        return () => {
            newPreviews.forEach(url => URL.revokeObjectURL(url));
        };
        // Thêm initialImageUrls và selectedFiles vào dependencies
    }, [initialImageUrls, selectedFiles]); // Không cần onFilesChange ở đây

    // --- Xử lý chọn file ---
    const handleFileSelect = (event) => {
        setError(null); // Xóa lỗi cũ
        const files = Array.from(event.target.files);
        if (!files.length) return;

        let currentFileCount = existingUrlsToKeep.length + selectedFiles.length;
        const filesToAdd = [];
        const previewsToAdd = [];
        let hasError = false;

        files.forEach(file => {
            // Kiểm tra số lượng tối đa nếu chọn nhiều file
            if (multiple && currentFileCount >= maxFiles) {
                toast.error(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
                hasError = true;
                return; // Dừng thêm file này và các file sau
            }
            // Kiểm tra kích thước
            if (file.size > maxSizeMB * 1024 * 1024) {
                toast.error(`Ảnh "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB) vượt quá ${maxSizeMB}MB.`);
                hasError = true;
                return; // Bỏ qua file này
            }
            // Kiểm tra trùng lặp (tùy chọn)
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                return; // Bỏ qua file đã có trong danh sách chờ upload
            }

            filesToAdd.push(file);
            previewsToAdd.push(URL.createObjectURL(file));
            currentFileCount++;
        });

        if (!hasError) {
            if (multiple) {
                setSelectedFiles(prev => [...prev, ...filesToAdd]);
            } else {
                // Nếu chỉ cho chọn 1 file, thay thế file cũ (nếu có)
                selectedFiles.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file))); // Thu hồi URL cũ
                setSelectedFiles(filesToAdd); // Chỉ giữ lại file mới nhất
                setExistingUrlsToKeep([]); // Xóa ảnh cũ nếu đang edit và chọn ảnh mới
            }
        }

        // Reset input để có thể chọn lại cùng file nếu cần
        event.target.value = null;
    };

    // --- Xử lý xóa ảnh (preview và file/url) ---
    const handleRemoveImage = (indexToRemove) => {
        const numExisting = existingUrlsToKeep.length;
        const newSelectedFiles = [...selectedFiles];
        const newExistingUrls = [...existingUrlsToKeep];

        if (indexToRemove < numExisting) {
            // Xóa ảnh cũ (đã tồn tại trên server)
            newExistingUrls.splice(indexToRemove, 1);
            setExistingUrlsToKeep(newExistingUrls);
        } else {
            // Xóa ảnh mới chọn (chưa upload)
            const selectedFileIndex = indexToRemove - numExisting;
            const fileToRemove = newSelectedFiles[selectedFileIndex];
            URL.revokeObjectURL(URL.createObjectURL(fileToRemove)); // Thu hồi blob URL
            newSelectedFiles.splice(selectedFileIndex, 1);
            setSelectedFiles(newSelectedFiles);
        }
        // Thông báo thay đổi file cho component cha
        if (onFilesChange) {
            onFilesChange({ existingUrls: newExistingUrls, newFiles: newSelectedFiles });
        }
    };

    // --- Hàm Trigger Upload (Có thể gọi từ nút riêng hoặc submit của form cha) ---
    // Component này sẽ không tự động upload khi chọn file,
    // mà sẽ cung cấp danh sách file và hàm upload để form cha quyết định khi nào upload.
    // Nếu muốn tự động upload, cần thêm logic ở handleFileSelect.
    const uploadSelectedFiles = async (context = 'default') => {
        if (!selectedFiles.length) {
            // Không có file mới để upload, trả về ID của ảnh cũ
            if (onUploadComplete) {
                const existingMedia = initialImageUrls.map((url, index) => ({
                    // Cần có cách lấy ID của ảnh cũ, có thể truyền vào `initialImageUrls` dạng [{id, url}]
                    // Giả sử initialImageUrls chỉ là URL/path, trả về null ID
                    id: null, // Hoặc lấy từ props nếu có
                    path: url, // Giữ lại path/url cũ
                    url: url // Giữ lại path/url cũ
                }));
                onUploadComplete(existingMedia.filter((_, i) => existingUrlsToKeep.includes(initialImageUrls[i])));
            }
            return;
        }

        setIsProcessing(true);
        setError(null);
        const uploadPromises = selectedFiles.map(file => mediaService.uploadMedia(file, context));
        const results = await Promise.allSettled(uploadPromises);

        const successfulUploads = [];
        const failedUploads = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value?.id) {
                successfulUploads.push(result.value); // Lưu object media trả về từ service
            } else {
                failedUploads.push(selectedFiles[index]?.name || `File ${index + 1}`);
                console.error(`Upload failed for ${selectedFiles[index]?.name}:`, result.reason);
            }
        });

        setIsProcessing(false);

        if (failedUploads.length > 0) {
            setError(`Lỗi tải lên các ảnh: ${failedUploads.join(', ')}`);
            toast.error(`Lỗi tải lên ${failedUploads.length} ảnh.`);
            // Không gọi onUploadComplete nếu có lỗi? Hoặc chỉ gọi với các ảnh thành công?
            if (onUploadComplete && successfulUploads.length > 0) {
                // Vẫn trả về các ảnh cũ + ảnh mới thành công
                const existingMediaToKeep = initialImageUrls
                    .map((url, index) => ({ id: null, path: url, url: url })) // Giả lập object media
                    .filter((_, i) => existingUrlsToKeep.includes(initialImageUrls[i]));
                onUploadComplete([...existingMediaToKeep, ...successfulUploads]);
            }

        } else {
            if (onUploadComplete) {
                // Trả về các ảnh cũ cần giữ + các ảnh mới đã upload thành công
                const existingMediaToKeep = initialImageUrls
                    .map((url, index) => ({ id: null, path: url, url: url })) // Giả lập object media
                    .filter((_, i) => existingUrlsToKeep.includes(initialImageUrls[i]));
                onUploadComplete([...existingMediaToKeep, ...successfulUploads]);
            }
            setSelectedFiles([]); // Xóa file đã upload thành công khỏi state
        }
    };

    // --- Xác định URL base cho ảnh cũ ---
    const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_URL || '';

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
            {/* Input chọn file */}
            <div>
                <label htmlFor={`file-upload-${label.replace(/\s+/g, '-')}`} className={`relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500 border border-dashed border-gray-300 px-4 py-2 inline-flex items-center ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <ArrowUpTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    <span>{multiple ? 'Chọn ảnh' : 'Chọn ảnh'}</span>
                    <input
                        id={`file-upload-${label.replace(/\s+/g, '-')}`}
                        ref={fileInputRef}
                        name="imageUpload"
                        type="file"
                        multiple={multiple}
                        accept={accept}
                        onChange={handleFileSelect}
                        className="sr-only"
                        disabled={disabled || isProcessing}
                    />
                </label>
                {/* Hiển thị số lượng/giới hạn */}
                {multiple && <span className='ml-3 text-xs text-gray-500'>{`${existingUrlsToKeep.length + selectedFiles.length} / ${maxFiles} ảnh`}</span>}
            </div>

            {/* Hiển thị Preview */}
            {previewUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {previewUrls.map((url, index) => {
                        const isExisting = index < existingUrlsToKeep.length;
                        const displayUrl = url.startsWith('blob:') ? url : (url.startsWith('http') ? url : `${UPLOADS_BASE_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`);
                        return (
                            <div key={index} className="relative group aspect-square border rounded-md overflow-hidden">
                                <img
                                    src={displayUrl}
                                    alt={`Preview ${index + 1}`}
                                    className="object-cover w-full h-full bg-gray-100"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'src/assets/default-avatar.png'; }} // Fallback
                                />
                                {/* Nút xóa */}
                                {!disabled && !isProcessing && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                                        title="Xóa ảnh"
                                    >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {/* Overlay loading nếu đang upload file này (cần logic phức tạp hơn) */}
                                {/* {isProcessing && index >= existingUrlsToKeep.length && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><LoadingSpinner size="sm"/></div>} */}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Hiển thị loading tổng */}
            {isProcessing && <div className='text-sm text-gray-600 flex items-center'><LoadingSpinner size="sm" className='mr-2' /> Đang xử lý ảnh...</div>}

            {/* Hiển thị lỗi */}
            {error && (
                <div className="text-xs text-red-600 flex items-center">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" /> {error}
                </div>
            )}

            {/* Thông tin giới hạn */}
            <p className="text-xs text-gray-500">
                {`Cho phép ${accept.replace('image/', '').toUpperCase()}. Tối đa ${maxSizeMB}MB/ảnh.`}
                {multiple && ` Tối đa ${maxFiles} ảnh.`}
            </p>

            {/* Nút Upload thủ công (Nếu không muốn tự động upload) */}
            {/* <Button onClick={() => uploadSelectedFiles('context-name')} disabled={isProcessing || !selectedFiles.length}>Upload ảnh đã chọn</Button> */}

        </div>
    );
};

export default ImageUpload; // Export component để dùng ở nơi khác