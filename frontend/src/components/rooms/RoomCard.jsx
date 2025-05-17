import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingOffice2Icon, UsersIcon, CurrencyDollarIcon, PhotoIcon, WrenchIcon, TagIcon, Square2StackIcon } from '@heroicons/react/24/outline';
import Badge from '../shared/Badge'; // Import Badge component

const API_ASSET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const RoomCard = ({ room, onDelete }) => {
    const imageUrl = room.images?.[0]?.path
        ? (room.images[0].path.startsWith('http') ? room.images[0].path : `${API_ASSET_URL}${room.images[0].path}`)
        : null;

    // Hàm trả về màu và text cho trạng thái phòng
    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return { color: 'green', text: 'Còn chỗ' };
            case 'FULL': return { color: 'red', text: 'Đã đầy' };
            case 'UNDER_MAINTENANCE': return { color: 'yellow', text: 'Bảo trì' };
            default: return { color: 'gray', text: status };
        }
    };

    const statusBadge = getStatusBadge(room.status);

    // Hàm lấy text cho loại phòng
    const getRoomTypeText = (type) => {
        switch (type) {
            case 'MALE': return 'Phòng Nam';
            case 'FEMALE': return 'Phòng Nữ';
            case 'MANAGEMENT': return 'Phòng Quản lý';
            default: return type;
        }
    };


    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-xl flex flex-col">
            {/* Ảnh phòng */}
            <div className="h-40 bg-gray-200 flex items-center justify-center relative">
                {imageUrl ? (
                    <img src={imageUrl} alt={`Phòng ${room.number}`} className="w-full h-full object-cover" />
                ) : (
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                )}
                {/* Số lượng ảnh */}
                {room.images && room.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                        <PhotoIcon className="h-3 w-3 mr-1" />{room.images.length}
                    </div>
                )}
                {/* Trạng thái phòng */}
                <div className="absolute top-2 left-2">
                    <Badge color={statusBadge.color}>{statusBadge.text}</Badge>
                </div>
            </div>

            {/* Thông tin phòng */}
            <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-1 flex items-center justify-between">
                        <span>Phòng {room.number}</span>
                        <span className="text-sm font-normal text-indigo-600 flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                            {/* Format tiền tệ */}
                            {new Intl.NumberFormat('vi-VN').format(room.roomFee || 0)}đ/tháng
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 flex items-center">
                        <BuildingOffice2Icon className="h-3 w-3 mr-1" />
                        {room.building?.name || 'N/A'} - Tầng {room.floor}
                    </p>
                    <p className="text-xs text-gray-500 mb-2 flex items-center">
                        <TagIcon className="h-3 w-3 mr-1" />
                        Loại: {getRoomTypeText(room.type)}
                    </p>
                    <p className="text-xs text-gray-500 mb-3 flex items-center">
                        <UsersIcon className="h-3 w-3 mr-1" />
                        {room.actualOccupancy}/{room.capacity} người
                        ({room.capacity - room.actualOccupancy} chỗ trống)
                    </p>
                    {/* Mô tả (nếu có) */}
                    {room.description && (
                        <p className="text-xs text-gray-600 italic border-t pt-2 mt-2 line-clamp-2" title={room.description}>
                            {room.description}
                        </p>
                    )}
                </div>

                {/* Các thông tin khác (vd: tiện nghi chính) */}
                <div className="mt-3 text-xs text-gray-500">
                    {/* Hiển thị một vài tiện nghi nổi bật */}
                    {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {room.amenities.slice(0, 3).map(({ amenity }) => ( // Chỉ hiển thị 3 tiện nghi đầu
                                <span key={amenity.id} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                                    {amenity.name}
                                </span>
                            ))}
                            {room.amenities.length > 3 && <span className="text-[10px] text-gray-400">...</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* Nút hành động */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
                <Link
                    to={`/rooms/${room.id}/edit`}
                    className="px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Sửa
                </Link>
                <button
                    onClick={() => onDelete(room.id, room.number, room.building?.name)} // Truyền thêm thông tin để xác nhận
                    className="px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Xóa
                </button>
            </div>
        </div>
    );
};

export default RoomCard;