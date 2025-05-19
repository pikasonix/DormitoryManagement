import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { amenityService } from '../../services/amenity.service';
import { Input, Button, Textarea } from '../../components/shared'; // Import component chung
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const AmenityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
  });
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch dữ liệu amenity nếu là edit mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      amenityService.getAmenityById(id)
        .then(data => {
          setFormData({
            name: data.name || '',
            description: data.description || '',
            url: data.url || '',
          });
        })
        .catch(err => {
          toast.error(`Không thể tải thông tin tiện nghi (ID: ${id}).`);
          console.error(err);
          navigate('/amenities');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false); // Không cần load gì khi tạo mới
    }
  }, [id, isEditMode, navigate]);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    if (!formData.name.trim()) {
      setErrors({ name: "Tên tiện nghi là bắt buộc." });
      setIsSaving(false);
      return;
    }

    try {
      // Chỉ gửi các trường có giá trị
      const payload = {
        name: formData.name,
        description: formData.description || null, // Gửi null nếu rỗng
        url: formData.url || null,
      };

      if (isEditMode) {
        await amenityService.updateAmenity(id, payload);
        toast.success('Cập nhật tiện nghi thành công!');
      } else {
        await amenityService.createAmenity(payload);
        toast.success('Thêm tiện nghi mới thành công!');
      }
      navigate('/amenities');
    } catch (err) {
      console.error("Lỗi lưu tiện nghi:", err);
      const errorMsg = err?.message || (isEditMode ? 'Cập nhật thất bại.' : 'Thêm mới thất bại.');
      if (err?.errors && Array.isArray(err.errors)) {
        const serverErrors = {};
        err.errors.forEach(fieldError => { if (fieldError.field) serverErrors[fieldError.field] = fieldError.message; });
        setErrors(serverErrors);
        toast.error("Vui lòng kiểm tra lại thông tin.", { id: 'validation-error' });
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
    <div className="space-y-6 max-w-lg mx-auto"> {/* Giảm max-width */}
      <div>
        <Button variant="link" onClick={() => navigate('/amenities')} icon={ArrowLeftIcon} className="text-sm mb-4">
          Quay lại danh sách tiện nghi
        </Button>
        <h1 className="text-2xl font-semibold">
          {isEditMode ? 'Chỉnh sửa Tiện nghi' : 'Thêm Tiện nghi mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
        <Input
          label="Tên Tiện nghi *"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={isSaving}
          error={errors.name}
        />
        <Textarea
          label="Mô tả"
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          disabled={isSaving}
          error={errors.description}
        />


        <Input
          label="URL Hình ảnh (Tùy chọn)"
          id="url"
          name="url"
          type="url" // Kiểu url để có validation cơ bản
          value={formData.url}
          onChange={handleChange}
          disabled={isSaving}
          error={errors.url}
          placeholder="https://example.com/image.jpg"
          hint="Dán đường dẫn URL đến hình ảnh minh họa tiện nghi."
        />

        {/* Preview hình ảnh nếu có */}
        {formData.url && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xem trước Hình ảnh</label>
            <img src={formData.url} alt="Image Preview" className="max-h-48 rounded border shadow-sm object-contain" onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}

        {/* Nút Submit */}
        <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
          <Button variant="secondary" onClick={() => navigate('/amenities')} disabled={isSaving}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={isSaving}>
            {isEditMode ? 'Lưu thay đổi' : 'Thêm Tiện nghi'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AmenityForm;