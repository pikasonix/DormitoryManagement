import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance.service';
import { roomService } from '../../services/room.service'; // Dùng để upload ảnh
import { Input, Button, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext'; // Lấy thông tin user

const MaintenanceRequestForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    description: '',
    roomId: user?.studentProfile?.roomId || '', // Lấy roomId từ thông tin student profile
  });
  const [images, setImages] = useState([]); // Mảng các file ảnh
  const [imagePreviews, setImagePreviews] = useState([]); // Mảng URL preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Handler thay đổi input text
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Handler chọn ảnh
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentFiles = [...images];
    const currentPreviews = [...imagePreviews];
    let fileErrors = false;

    files.forEach(file => {
      if (currentFiles.length + files.length > 5) { // Giới hạn 5 ảnh
        toast.error("Chỉ được tải lên tối đa 5 ảnh.");
        fileErrors = true;
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB
        toast.error(`Ảnh "${file.name}" vượt quá 5MB.`);
        fileErrors = true;
        return;
      }
      // Check trùng (tùy chọn)
      if (currentFiles.some(f => f.name === file.name && f.size === file.size)) return;

      currentFiles.push(file);
      currentPreviews.push(URL.createObjectURL(file));
    });

    if (!fileErrors) {
      setImages(currentFiles);
      setImagePreviews(currentPreviews);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  // Handler xóa ảnh preview
  const handleRemoveImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  // Handler Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // --- Validation ---
    if (!formData.description.trim()) { setErrors({ description: "Vui lòng mô tả sự cố." }); setIsSubmitting(false); return; }
    if (!formData.roomId && !user?.studentProfile?.roomId) {
      toast.error("Không tìm thấy thông tin phòng. Vui lòng liên hệ quản lý.");
      setIsSubmitting(false);
      return;
    }
    // --- End Validation ---

    try {
      // 1. Upload ảnh (nếu có)
      let uploadedImageIds = [];
      if (images.length > 0) {
        toast.loading('Đang tải ảnh lên...', { id: 'upload-maintenance' });
        const uploadPromises = images.map(file => roomService.uploadMedia(file, 'maintenance-request')); // Dùng service upload chung
        const uploadResults = await Promise.allSettled(uploadPromises);
        uploadedImageIds = uploadResults
          .filter(result => result.status === 'fulfilled' && result.value?.id)
          .map(result => result.value.id);

        if (uploadedImageIds.length !== images.length) {
          toast.dismiss('upload-maintenance');
          toast.error('Có lỗi xảy ra khi tải lên một số ảnh.');
          // Có thể dừng lại hoặc tiếp tục không có ảnh lỗi?
          // throw new Error('Upload ảnh thất bại.'); // Dừng lại
        } else {
          toast.dismiss('upload-maintenance');
        }
      }

      // 2. Chuẩn bị payload cho API tạo request
      const payload = {
        title: formData.description.substring(0, 100), // Tự động lấy 100 ký tự đầu từ mô tả làm tiêu đề
        issue: formData.description, // Đổi từ description sang issue theo yêu cầu của API
        studentId: user?.studentProfile?.id, // Gửi studentId đến server
        roomId: formData.roomId || user?.studentProfile?.roomId, // Đảm bảo gửi roomId
        images: uploadedImageIds, // Mảng các ID ảnh đã upload
      };

      // Kiểm tra nếu không có roomId
      if (!payload.roomId) {
        throw new Error('Không tìm thấy thông tin phòng. Vui lòng liên hệ quản lý.');
      }

      console.log("Payload gửi đi:", payload); // Log để debug

      // 3. Gọi API tạo request
      await maintenanceService.createMaintenanceRequest(payload);
      toast.success('Đã gửi yêu cầu sửa chữa thành công!');
      navigate('/maintenance'); // Quay lại trang danh sách yêu cầu bảo trì

    } catch (err) {
      toast.dismiss('upload-maintenance'); // Đảm bảo tắt loading toast
      console.error("Lỗi gửi yêu cầu bảo trì:", err);
      const errorMsg = err?.message || 'Gửi yêu cầu thất bại.';
      if (err?.errors && Array.isArray(err.errors)) {
        const serverErrors = {};
        err.errors.forEach(fieldError => { if (fieldError.field) serverErrors[fieldError.field] = fieldError.message; });
        setErrors(serverErrors);
        toast.error("Vui lòng kiểm tra lại thông tin.", { id: 'validation-error' });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Button variant="link" onClick={() => navigate(-1)} icon={ArrowLeftIcon} className="text-sm mb-4">
          Quay lại
        </Button>
        <h1 className="text-2xl font-semibold">Gửi yêu cầu Sửa chữa / Bảo trì</h1>
        <p className="mt-1 text-sm text-gray-600">Mô tả sự cố bạn đang gặp phải trong phòng.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
        {/* Thông tin phòng (hiển thị từ context) */}
        <div className='p-4 bg-indigo-50 rounded-md border border-indigo-200'>
          <p className='text-sm font-medium text-indigo-800'>Yêu cầu cho phòng:</p>
          <p className='text-lg font-semibold text-indigo-900'>
            {user?.studentProfile?.room ?
              `Phòng ${user.studentProfile.room.number} (${user.studentProfile.room.building?.name || 'Chưa xác định tòa nhà'})` :
              'Chưa xác định phòng'}
          </p>
        </div>

        <Textarea
          label="Mô tả chi tiết *"
          id="description"
          name="description"
          rows={5}
          value={formData.description}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          error={errors.description}
          placeholder="Mô tả rõ ràng vấn đề bạn gặp phải, vị trí cụ thể (nếu có), thời điểm phát hiện,..."
        />

        {/* Upload hình ảnh */}
        <div>
          <label className="block text-sm font-medium leading-6 text-gray-900">Hình ảnh minh họa (Tối đa 5 ảnh, 5MB/ảnh)</label>
          <div className="mt-2">
            <label htmlFor="image-upload-maintenance" className="cursor-pointer relative inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <ArrowUpTrayIcon className="-ml-0.5 h-5 w-5 text-gray-500" aria-hidden="true" />
              Chọn ảnh
            </label>
            <input id="image-upload-maintenance" name="images" type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" ref={fileInputRef} />
          </div>
          {/* Preview ảnh đã chọn */}
          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative group aspect-square">
                  <img src={src} alt={`Preview ${index + 1}`} className="object-cover w-full h-full rounded-md border" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa ảnh"
                    disabled={isSubmitting}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút Submit */}
        <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            Gửi yêu cầu
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MaintenanceRequestForm;