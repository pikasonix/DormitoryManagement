import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { feeService } from '../../services/fee.service';
import { Button, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
}

// Format currency
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Get fee type label
const getFeeTypeLabel = (feeType) => {
    switch (feeType) {
        case 'ROOM_FEE': return 'Tiền phòng';
        case 'ELECTRICITY': return 'Tiền điện';
        case 'WATER': return 'Tiền nước';
        case 'PARKING': return 'Phí gửi xe';
        case 'OTHER_FEE': return 'Phí khác';
        default: return feeType;
    }
}

// Get vehicle type label
const getVehicleTypeLabel = (vehicleType) => {
    switch (vehicleType) {
        case 'BICYCLE': return 'Xe đạp';
        case 'MOTORBIKE': return 'Xe máy';
        case 'ELECTRIC_BICYCLE': return 'Xe đạp/máy điện';
        case 'CAR': return 'Ô tô';
        case 'OTHER': return 'Khác';
        default: return '-';
    }
}

const FeeRateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feeRate, setFeeRate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch fee rate details
    useEffect(() => {
        const fetchFeeRate = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await feeService.getFeeRateById(id);
                setFeeRate(data);
            } catch (err) {
                setError('Không thể tải thông tin đơn giá');
                toast.error('Đơn giá không tồn tại hoặc có lỗi xảy ra.');
                navigate('/fees');
            } finally {
                setIsLoading(false);
            }
        };
        fetchFeeRate();
    }, [id, navigate]);

    // Handle delete
    const handleDelete = async () => {
        if (!feeRate) return;

        if (window.confirm(`Bạn có chắc chắn muốn xóa đơn giá "${feeRate.name}" không?`)) {
            try {
                await feeService.deleteFeeRate(id);
                toast.success(`Đã xóa đơn giá "${feeRate.name}" thành công!`);
                navigate('/fees');
            } catch (err) {
                toast.error(err?.message || `Xóa đơn giá "${feeRate.name}" thất bại.`);
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    if (error) {
        return <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>;
    }

    if (!feeRate) {
        return <div className="text-center p-6">Không tìm thấy thông tin đơn giá.</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header and Back button */}
            <div>
                <Button
                    variant="link"
                    onClick={() => navigate('/fees')}
                    icon={ArrowLeftIcon}
                    className="text-sm mb-4"
                >
                    Quay lại danh sách đơn giá
                </Button>
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{feeRate.name}</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            ID: {id} | Cập nhật: {formatDate(feeRate.updatedAt)}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                        <Button
                            variant="primary"
                            icon={PencilIcon}
                            onClick={() => navigate(`/fees/${id}/edit`)}
                        >
                            Chỉnh sửa
                        </Button>
                        <Button
                            variant="danger"
                            icon={TrashIcon}
                            onClick={handleDelete}
                        >
                            Xóa
                        </Button>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Tên đơn giá</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold">
                                {feeRate.name}
                            </dd>
                        </div>

                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Loại phí</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {getFeeTypeLabel(feeRate.feeType)}
                            </dd>
                        </div>

                        {feeRate.feeType === 'PARKING' && feeRate.vehicleType && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                                <dt className="text-sm font-medium text-gray-500">Loại phương tiện</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {getVehicleTypeLabel(feeRate.vehicleType)}
                                </dd>
                            </div>
                        )}

                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Đơn giá</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold text-lg">
                                {formatCurrency(feeRate.unitPrice)}
                                {feeRate.unit && <span className="text-sm font-normal text-gray-600 ml-1">/ {feeRate.unit}</span>}
                            </dd>
                        </div>

                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Trạng thái</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <Badge color={feeRate.isActive ? 'green' : 'gray'}>
                                    {feeRate.isActive ? 'Đang áp dụng' : 'Không áp dụng'}
                                </Badge>
                            </dd>
                        </div>

                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Áp dụng từ ngày</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {formatDate(feeRate.effectiveFrom)}
                            </dd>
                        </div>

                        {feeRate.effectiveTo && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                                <dt className="text-sm font-medium text-gray-500">Áp dụng đến ngày</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {formatDate(feeRate.effectiveTo)}
                                </dd>
                            </div>
                        )}

                        {feeRate.description && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">Mô tả</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">
                                    {feeRate.description}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default FeeRateDetail;
