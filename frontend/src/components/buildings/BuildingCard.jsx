import React from 'react';
import { BuildingOffice2Icon, PhotoIcon, UsersIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom'; // Import Link

// Giả định base URL của API để hiển thị ảnh
const API_ASSET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const BuildingCard = ({ building, onDelete, onEdit }) => {
    // Lấy ảnh đầu tiên làm ảnh đại diện (hoặc ảnh mặc định)
    const imageUrl = building.images?.[0]?.path
        ? (building.images[0].path.startsWith('http') ? building.images[0].path : `${API_ASSET_URL}${building.images[0].path}`)
        : null; // Hoặc một ảnh placeholder

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-xl flex flex-col">
            {/* Phần ảnh */}
            <div className="h-48 bg-gray-200 flex items-center justify-center relative">
                {imageUrl ? (
                    <img src={imageUrl} alt={`Ảnh tòa nhà ${building.name}`} className="w-full h-full object-cover" />
                ) : (
                    <PhotoIcon className="h-16 w-16 text-gray-400" />
                )}
                {/* Overlay hiển thị số lượng ảnh */}
                {building.images && building.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center">
                        <PhotoIcon className="h-3 w-3 mr-1" />
                        {building.images.length} ảnh
                    </div>
                )}
            </div>

            {/* Phần thông tin */}
            <div className="p-4 flex-grow">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center">
                    <BuildingOffice2Icon className="h-5 w-5 mr-2 text-indigo-600" />
                    {building.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={building.address || 'Chưa có địa chỉ'}>
                    Địa chỉ: {building.address || <span className="italic text-gray-400">Chưa cập nhật</span>}
                </p>
                <p className="text-sm text-gray-600 mb-3 text-justify line-clamp-3" title={building.description || 'Chưa có mô tả'}>
                    {building.description || <span className="italic text-gray-400">Chưa có mô tả</span>}
                </p>

                {/* Thông tin bổ sung (số phòng, số nhân viên) */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2 mt-auto">
                    <span className="flex items-center">
                        <RectangleGroupIcon className="h-4 w-4 mr-1" /> {/* Icon phòng */}
                        {building._count?.rooms ?? 0} phòng
                    </span>
                    <span className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1" /> {/* Icon nhân viên */}
                        {building.staff?.length ?? 0} nhân viên quản lý
                    </span>
                </div>

            </div>

            {/* Phần nút hành động */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
                {/* Nút Xem Chi Tiết/Sửa */}
                <Link
                    to={`/buildings/${building.id}/edit`} // Link đến trang sửa
                    // Hoặc dùng onEdit nếu muốn mở modal
                    // onClick={() => onEdit(building.id)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Xem/Sửa
                </Link>
                {/* Nút Xóa */}
                <button
                    onClick={() => onDelete(building.id, building.name)} // Truyền cả tên để xác nhận
                    className="px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Xóa
                </button>
            </div>
        </div>
    );
};

export default BuildingCard;