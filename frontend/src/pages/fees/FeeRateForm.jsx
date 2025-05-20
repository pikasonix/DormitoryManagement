import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { feeService } from '../../services/fee.service';
import { Button, Input, Select, Checkbox, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Fee type options
const feeTypeOptions = [
    { value: 'ROOM_FEE', label: 'Tiền phòng' },
    { value: 'ELECTRICITY', label: 'Tiền điện' },
    { value: 'WATER', label: 'Tiền nước' },
    { value: 'PARKING', label: 'Phí gửi xe' },
    { value: 'OTHER_FEE', label: 'Phí khác' }
];

// Vehicle type options (for parking fee)
const vehicleTypeOptions = [
    { value: 'BICYCLE', label: 'Xe đạp' },
    { value: 'MOTORBIKE', label: 'Xe máy' },
    { value: 'ELECTRIC_BICYCLE', label: 'Xe đạp/máy điện' },
    { value: 'CAR', label: 'Ô tô' },
    { value: 'OTHER', label: 'Khác' }
];

// Format date for input
const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return format(d, 'yyyy-MM-dd');
};

const FeeRateForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formMode, setFormMode] = useState('create');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        feeType: 'ROOM_FEE',
        vehicleType: '',
        unitPrice: '',
        unit: '',
        effectiveFrom: formatDateForInput(new Date()),
        effectiveTo: '',
        description: '',
        isActive: true
    });

    // Form validation
    const [errors, setErrors] = useState({});

    // Load data if editing
    useEffect(() => {
        if (id) {
            setFormMode('edit');
            fetchFeeRate();
        }
    }, [id]);

    // Fetch fee rate for editing
    const fetchFeeRate = async () => {
        setIsLoading(true);
        try {
            const data = await feeService.getFeeRateById(id);
            setFormData({
                name: data.name || '',
                feeType: data.feeType || 'ROOM_FEE',
                vehicleType: data.vehicleType || '',
                unitPrice: data.unitPrice || '',
                unit: data.unit || '',
                effectiveFrom: formatDateForInput(data.effectiveFrom),
                effectiveTo: data.effectiveTo ? formatDateForInput(data.effectiveTo) : '',
                description: data.description || '',
                isActive: data.isActive
            });
        } catch (err) {
            toast.error('Không thể tải thông tin đơn giá');
            navigate('/fees');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });

        // Clear error when field is updated
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên đơn giá là bắt buộc';
        }

        if (!formData.unitPrice) {
            newErrors.unitPrice = 'Đơn giá là bắt buộc';
        } else if (isNaN(formData.unitPrice) || Number(formData.unitPrice) <= 0) {
            newErrors.unitPrice = 'Đơn giá phải là số dương';
        }

        if (!formData.effectiveFrom) {
            newErrors.effectiveFrom = 'Ngày áp dụng là bắt buộc';
        }

        if (formData.feeType === 'PARKING' && !formData.vehicleType) {
            newErrors.vehicleType = 'Loại phương tiện là bắt buộc cho phí gửi xe';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        setIsSaving(true);

        try {
            // Prepare data
            const submitData = {
                ...formData,
                unitPrice: Number(formData.unitPrice)
            };

            // Only include vehicleType if fee type is PARKING
            if (formData.feeType !== 'PARKING') {
                delete submitData.vehicleType;
            }

            if (formMode === 'create') {
                await feeService.createFeeRate(submitData);
                toast.success('Tạo đơn giá mới thành công!');
            } else {
                await feeService.updateFeeRate(id, submitData);
                toast.success('Cập nhật đơn giá thành công!');
            }

            navigate('/fees');
        } catch (err) {
            toast.error(err?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <Button
                    variant="link"
                    onClick={() => navigate('/fees')}
                    icon={ArrowLeftIcon}
                    className="text-sm mb-4 w-fit"
                >
                    Quay lại danh sách đơn giá
                </Button>
                <h1 className="text-2xl font-semibold">
                    {formMode === 'create' ? 'Thêm Đơn Giá Mới' : 'Chỉnh Sửa Đơn Giá'}
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <Input
                        label="Tên đơn giá"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        required
                    />

                    {/* Fee Type */}
                    <Select
                        label="Loại phí"
                        id="feeType"
                        name="feeType"
                        value={formData.feeType}
                        onChange={handleChange}
                        options={feeTypeOptions}
                        required
                    />

                    {/* Vehicle Type (only for PARKING) */}
                    {formData.feeType === 'PARKING' && (
                        <Select
                            label="Loại phương tiện"
                            id="vehicleType"
                            name="vehicleType"
                            value={formData.vehicleType}
                            onChange={handleChange}
                            options={vehicleTypeOptions}
                            error={errors.vehicleType}
                            required
                        />
                    )}

                    {/* Unit Price */}
                    <Input
                        label="Đơn giá (VNĐ)"
                        id="unitPrice"
                        name="unitPrice"
                        type="number"
                        value={formData.unitPrice}
                        onChange={handleChange}
                        error={errors.unitPrice}
                        required
                        min="0"
                        step="0.01"
                    />

                    {/* Unit */}
                    <Input
                        label="Đơn vị tính"
                        id="unit"
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        placeholder="VD: kWh, m³, tháng"
                    />

                    {/* Effective From */}
                    <Input
                        label="Áp dụng từ ngày"
                        id="effectiveFrom"
                        name="effectiveFrom"
                        type="date"
                        value={formData.effectiveFrom}
                        onChange={handleChange}
                        error={errors.effectiveFrom}
                        required
                    />

                    {/* Effective To */}
                    <Input
                        label="Áp dụng đến ngày (để trống nếu không có hạn)"
                        id="effectiveTo"
                        name="effectiveTo"
                        type="date"
                        value={formData.effectiveTo}
                        onChange={handleChange}
                    />
                </div>

                {/* Description */}
                <Textarea
                    label="Mô tả"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                />

                {/* Is Active */}
                <Checkbox
                    label="Đang áp dụng"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                />

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        variant="primary"
                        icon={CheckIcon}
                        isLoading={isSaving}
                        disabled={isSaving}
                    >
                        {formMode === 'create' ? 'Tạo Đơn Giá' : 'Cập Nhật'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default FeeRateForm;
