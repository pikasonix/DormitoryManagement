import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircleIcon as BadgeCheckIcon, XCircleIcon, CalendarIcon, CreditCardIcon, SwatchIcon as ColorSwatchIcon, TruckIcon, IdentificationIcon, CurrencyYenIcon } from '@heroicons/react/24/solid';
import { Badge, Card } from '../shared';
import { feeService } from '../../services/fee.service';

// Hàm chuyển đổi loại xe sang tên hiển thị
const getVehicleTypeName = (type) => {
    switch (type) {
        case 'MOTORBIKE': return 'Xe máy';
        case 'BICYCLE': return 'Xe đạp';
        case 'ELECTRIC_BICYCLE': return 'Xe đạp/máy điện';
        case 'CAR': return 'Ô tô';
        case 'OTHER': return 'Khác';
        default: return type;
    }
};

// Hàm format ngày tháng
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi });
    } catch (e) {
        return dateString;
    }
};

// Hàm format tiền tệ
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const VehicleCard = ({ vehicle, onEdit, onDelete }) => {
    const [parkingFee, setParkingFee] = useState(null);
    const [isLoadingFee, setIsLoadingFee] = useState(false);

    // Lấy URL ảnh nếu có
    const vehicleImage = vehicle?.images && vehicle.images.length > 0
        ? `${import.meta.env.VITE_UPLOADS_URL}/${vehicle.images[0].path}`
        : '/src/assets/default-vehicle.png';    // Lấy thông tin phí gửi xe
    useEffect(() => {
        const fetchParkingFee = async () => {
            if (vehicle?.vehicleType) {
                setIsLoadingFee(true);
                try {
                    const fee = await feeService.getParkingFee(vehicle.vehicleType);
                    setParkingFee(fee);
                } catch (error) {
                    console.error('Error fetching parking fee:', error);
                    setParkingFee(null);
                } finally {
                    setIsLoadingFee(false);
                }
            }
        };

        fetchParkingFee();
    }, [vehicle?.vehicleType]);

    return (
        <Card className="overflow-hidden">
            {/* Header with vehicle image and status */}
            <div className="relative">
                {/* Vehicle image */}
                <div className="h-48 w-full bg-gray-200 overflow-hidden">
                    <img
                        src={vehicleImage}
                        alt={`${vehicle?.brand || ''} ${vehicle?.model || ''}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/src/assets/default-vehicle.png';
                        }}
                    />
                </div>

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                    {vehicle?.isActive ? (
                        <Badge color="green" className="px-3 py-1 flex items-center">
                            <BadgeCheckIcon className="h-4 w-4 mr-1" />
                            Đang hoạt động
                        </Badge>
                    ) : (
                        <Badge color="red" className="px-3 py-1 flex items-center">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Không hoạt động
                        </Badge>
                    )}
                </div>
            </div>

            {/* Vehicle information */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            {vehicle?.brand} {vehicle?.model}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono font-medium">
                            {vehicle?.licensePlate}
                        </p>
                    </div>
                    <Badge color="blue" className="px-2 py-1">
                        {getVehicleTypeName(vehicle?.vehicleType)}
                    </Badge>
                </div>

                {/* Vehicle details */}
                <div className="space-y-2 mt-4">
                    <div className="flex items-center text-sm">
                        <ColorSwatchIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="text-gray-700">Màu sắc: <span className="font-medium">{vehicle?.color || 'N/A'}</span></span>
                    </div>

                    <div className="flex items-center text-sm">
                        <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="text-gray-700">Đăng ký: <span className="font-medium">{formatDate(vehicle?.startDate)}</span></span>
                    </div>                    {vehicle?.parkingCardNo && (
                        <div className="flex items-center text-sm">
                            <CreditCardIcon className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="text-gray-700">Số thẻ: <span className="font-medium font-mono">{vehicle?.parkingCardNo}</span></span>
                        </div>
                    )}

                    {/* Hiển thị phí gửi xe hàng tháng */}
                    <div className="flex items-center text-sm">
                        <CurrencyYenIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="text-gray-700">
                            Phí hàng tháng:
                            <span className="font-medium text-blue-600 ml-1">
                                {isLoadingFee
                                    ? 'Đang tải...'
                                    : parkingFee
                                        ? formatCurrency(parkingFee.unitPrice)
                                        : 'Chưa thiết lập'}
                            </span>
                        </span>
                    </div>

                    {vehicle?.studentProfile && (
                        <div className="flex items-center text-sm">
                            <IdentificationIcon className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="text-gray-700">
                                Mã SV: <span className="font-medium">{vehicle?.studentProfile?.studentId}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                {(onEdit || onDelete) && (
                    <div className="mt-5 flex justify-end space-x-3 pt-3 border-t border-gray-200">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(vehicle?.id)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                            >
                                Chỉnh sửa
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(vehicle?.id, vehicle?.licensePlate)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default VehicleCard;