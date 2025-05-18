import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { amenityService } from '../../services/amenity.service';
import { Button, Table, Input, Pagination } from '../../components/shared'; // Thêm Pagination
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '../../hooks/useDebounce'; // Hook debounce (tùy chọn)

const AmenityIndex = () => {
  const [amenities, setAmenities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, limit: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigate = useNavigate();

  // Hàm fetch dữ liệu
  const fetchAmenities = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: page,
        limit: meta.limit,
        search: search || undefined, // Giả sử API hỗ trợ ?search=...
      };
      const data = await amenityService.getAllAmenities(params);
      setAmenities(data.amenities || []);
      setMeta(prev => ({ ...prev, ...data.meta }));
      setCurrentPage(data.meta?.page || 1);
    } catch (err) {
      setError('Không thể tải danh sách tiện nghi.');
    } finally {
      setIsLoading(false);
    }
  }, [meta.limit]);

  // Fetch khi component mount hoặc trang/search thay đổi
  useEffect(() => {
    fetchAmenities(currentPage, debouncedSearchTerm);
  }, [fetchAmenities, currentPage, debouncedSearchTerm]);

  // Hàm xử lý xóa
  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tiện nghi "${name}" không?`)) {
      try {
        await amenityService.deleteAmenity(id);
        toast.success(`Đã xóa tiện nghi "${name}" thành công!`);
        // Fetch lại trang hiện tại
        fetchAmenities(currentPage, debouncedSearchTerm);
      } catch (err) {
        toast.error(err?.message || `Xóa tiện nghi "${name}" thất bại. Có thể tiện nghi này đang được sử dụng.`);
      }
    }
  };

  // Xử lý chuyển trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // --- Cấu hình bảng ---
  const columns = useMemo(() => [
    {
      Header: 'Hình ảnh',
      accessor: 'url',
      Cell: ({ value }) => value ? <img src={value} alt="Hình ảnh" className="h-14 w-20 object-cover rounded mx-auto" onError={(e) => e.target.style.display = 'none'} /> : <span className="text-gray-400 text-xs">Không có</span>
    },
    { Header: 'Tên Tiện nghi', accessor: 'name', Cell: ({ value }) => <span className='font-medium'>{value}</span> },
    { Header: 'Mô tả', accessor: 'description', Cell: ({ value }) => <p className='text-sm text-gray-600 line-clamp-2'>{value || '-'}</p> }, // Giới hạn 2 dòng
    {
      Header: 'Hành động',
      accessor: 'actions',
      Cell: ({ row }) => (
        <div className="flex space-x-2 justify-center">
          <Button
            variant="icon"
            onClick={() => navigate(`/amenities/${row.original.id}/edit`)}
            tooltip="Chỉnh sửa"
          >
            <PencilSquareIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-800" />
          </Button>
          <Button
            variant="icon"
            onClick={() => handleDelete(row.original.id, row.original.name)}
            tooltip="Xóa"
          >
            <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
          </Button>
        </div>
      ),
    },
  ], [navigate, currentPage, debouncedSearchTerm]); // Thêm dependencies

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Quản lý Tiện nghi</h1>
        <Button onClick={() => navigate('/amenities/new')} icon={PlusIcon}>
          Thêm Tiện nghi mới
        </Button>
      </div>

      {/* Thanh tìm kiếm (Tùy chọn) */}
      <div className="max-w-sm">
        <Input
          placeholder="Tìm theo tên tiện nghi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>
      ) : (
        <>
          <Table columns={columns} data={amenities} />
          {/* Phân trang */}
          {meta.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AmenityIndex;