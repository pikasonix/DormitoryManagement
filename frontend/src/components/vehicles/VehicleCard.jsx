import React from 'react';
import Badge from '../shared/Badge';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const statusColor = (isActive) => (isActive ? 'green' : 'yellow');

const VehicleCard = ({ vehicle, onEdit, onDelete }) => {
    return (
        <div className={`bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border transition-shadow ${vehicle.isActive ? 'border-gray-100 hover:shadow-lg' : 'border-yellow-200 bg-yellow-50/30 hover:shadow-md'}`}>
            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col items-center justify-center w-24">
                    <div className="text-lg font-mono font-bold text-blue-700">{vehicle.licensePlate || 'N/A'}</div>
                    <Badge color={statusColor(vehicle.isActive)}>{vehicle.isActive ? 'Đã duyệt' : 'Chờ duyệt'}</Badge>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="font-semibold text-gray-700">Loại xe:</div>
                    <div>{vehicle.vehicleType === 'MOTORBIKE' ? 'Xe máy' :
                        vehicle.vehicleType === 'BICYCLE' ? 'Xe đạp' :
                            vehicle.vehicleType === 'ELECTRIC_BICYCLE' ? 'Xe đạp/máy điện' :
                                vehicle.vehicleType === 'CAR' ? 'Ô tô' :
                                    vehicle.vehicleType || 'N/A'}</div>
                    <div className="font-semibold text-gray-700">Hãng/Model:</div>
                    <div>{vehicle.brand || ''}{vehicle.brand && vehicle.model ? ' - ' : ''}{vehicle.model || ''}</div>
                    <div className="font-semibold text-gray-700">Màu:</div>
                    <div>{vehicle.color || 'N/A'}</div>
                    <div className="font-semibold text-gray-700">Ngày đăng ký:</div>
                    <div>{vehicle.startDate ? new Date(vehicle.startDate).toLocaleDateString('vi-VN') : 'N/A'}</div>
                    {vehicle.parkingCardNo && (
                        <>
                            <div className="font-semibold text-gray-700">Mã thẻ gửi xe:</div>
                            <div className="font-mono">{vehicle.parkingCardNo}</div>
                        </>
                    )}
                </div>
            </div>
            <div className="flex flex-row gap-2 justify-end items-center">
                {onEdit && (
                    <button onClick={() => onEdit(vehicle.id)} className="p-2 rounded hover:bg-yellow-100" title="Chỉnh sửa">
                        <PencilSquareIcon className="h-5 w-5 text-yellow-600" />
                    </button>
                )}
                {onDelete && (
                    <button onClick={() => onDelete(vehicle.id, vehicle.licensePlate)} className="p-2 rounded hover:bg-red-100" title="Xóa">
                        <TrashIcon className="h-5 w-5 text-red-600" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VehicleCard;
