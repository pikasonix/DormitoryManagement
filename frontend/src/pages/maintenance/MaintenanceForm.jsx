import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance.service';
import { studentService } from '../../services/student.service'; // Để lấy tên sinh viên
import { roomService } from '../../services/room.service'; // Để lấy thông tin phòng
// import { userService } from '../../services/user.service'; // (Tùy chọn) Lấy danh sách Staff để gán việc
import { Button, Select, Textarea, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, XCircleIcon, PencilSquareIcon, PaperClipIcon, EyeIcon, UserIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- Helper Functions ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { console.error("Date format error:", e); return dateString; }
}
const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi }); }
    catch (e) { console.error("DateTime format error:", e); return dateString; }
}
const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending': return 'yellow';
        case 'assigned': return 'purple';
        case 'in_progress': return 'blue';
        case 'completed': return 'green';
        case 'cancelled': return 'gray';
        default: return 'gray';
    }
};
const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1 inline-block" />;
        case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500 mr-1 inline-block" />;
        case 'assigned': return <UserIcon className="h-5 w-5 text-purple-500 mr-1 inline-block" />; // Icon cho trạng thái "Đã phân công"
        case 'in_progress': return <PencilSquareIcon className="h-5 w-5 text-blue-500 mr-1 inline-block" />;
        case 'cancelled': return <XCircleIcon className="h-5 w-5 text-gray-500 mr-1 inline-block" />;
        default: return null;
    }
};

const maintenanceStatusOptions = [
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'assigned', label: 'Đã phân công' },
    { value: 'in_progress', label: 'Đang xử lý' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
];

// --- Component ---
const MaintenanceForm = () => {
    const { id } = useParams(); // ID của Maintenance Request
    const navigate = useNavigate();
    const [request, setRequest] = useState(null);
    const [student, setStudent] = useState(null);
    const [room, setRoom] = useState(null);
    // const [staffList, setStaffList] = useState([]); // (Tùy chọn) Danh sách staff kỹ thuật
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    const [updateData, setUpdateData] = useState({
        status: '',
        staffNotes: '', // Giả sử backend dùng trường này
        // assignedStaffId: '', // (Tùy chọn)
    });

    // --- Fetch Data ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const requestData = await maintenanceService.getMaintenanceRequestById(id);
            setRequest(requestData);
            // Ensure status is always a valid value from maintenanceStatusOptions (case-insensitive)
            const statusFromApi = (requestData.status || '').toLowerCase();
            const validStatus = maintenanceStatusOptions.find(opt => opt.value.toLowerCase() === statusFromApi)?.value || maintenanceStatusOptions[0].value;
            setUpdateData({
                status: validStatus,
                staffNotes: requestData.staffNotes || requestData.notes || '',
                // assignedStaffId: requestData.assignedStaffId || '',
            });

            // Fetch thông tin liên quan song song
            const relatedPromises = [];
            if (requestData.studentId) {
                relatedPromises.push(studentService.getStudentById(requestData.studentId));
            } else { relatedPromises.push(Promise.resolve(null)); } // Placeholder

            if (requestData.roomId) {
                relatedPromises.push(roomService.getRoomById(requestData.roomId));
            } else { relatedPromises.push(Promise.resolve(null)); } // Placeholder

            // (Tùy chọn) Fetch danh sách Staff kỹ thuật
            // relatedPromises.push(userService.getAllUsers({ role: 'STAFF', position: 'Nhân viên kỹ thuật' }));

            const [studentRes, roomRes /*, staffRes*/] = await Promise.allSettled(relatedPromises);

            if (studentRes.status === 'fulfilled' && studentRes.value) setStudent(studentRes.value);
            else if (studentRes.status === 'rejected') console.warn("Lỗi tải thông tin sinh viên:", studentRes.reason);

            if (roomRes.status === 'fulfilled' && roomRes.value) setRoom(roomRes.value);
            else if (roomRes.status === 'rejected') console.warn("Lỗi tải thông tin phòng:", roomRes.reason);

            // if (staffRes.status === 'fulfilled' && staffRes.value) setStaffList(staffRes.value.users || []);
            // else if (staffRes.status === 'rejected') console.warn("Lỗi tải danh sách nhân viên:", staffRes.reason);


        } catch (err) {
            setError('Không thể tải chi tiết yêu cầu bảo trì.');
            toast.error('Yêu cầu không tồn tại hoặc có lỗi xảy ra.');
            console.error("Fetch maintenance detail error:", err);
            // navigate('/maintenance'); // Cân nhắc việc tự động quay lại
        } finally {
            setIsLoading(false);
        }
    }, [id]); // Chỉ phụ thuộc vào ID

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Gọi fetchData khi mount hoặc ID thay đổi

    // --- Handlers ---
    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setUpdateData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!request || isUpdating) return;
        setIsUpdating(true); try {
            const payload = {
                status: updateData.status,
                notes: updateData.staffNotes || null, // Gửi null nếu rỗng (backend mong đợi trường notes)
                staffNotes: updateData.staffNotes || null, // Giữ để tương thích ngược
                // assignedStaffId: updateData.assignedStaffId || null,
            };
            const updatedRequest = await maintenanceService.updateMaintenanceRequest(id, payload);
            // Cập nhật lại state request với dữ liệu mới nhất từ server
            setRequest(updatedRequest);            // Cập nhật lại updateData nếu cần (ví dụ: status đã thay đổi)
            setUpdateData({
                status: updatedRequest.status || '',
                staffNotes: updatedRequest.staffNotes || updatedRequest.notes || '',
                // assignedStaffId: updatedRequest.assignedStaffId || '',
            });
            toast.success('Cập nhật yêu cầu thành công!');
        } catch (err) {
            toast.error(err?.message || 'Cập nhật yêu cầu thất bại.');
            console.error("Update maintenance error:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    if (error) return <div className="text-red-600 bg-red-100 p-4 rounded text-center">Lỗi: {error}</div>;
    if (!request) return <div className="text-center p-6 text-gray-500">Không tìm thấy thông tin yêu cầu bảo trì.</div>;

    // Xác định URL base cho ảnh
    const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_URL || '';

    // (Tùy chọn) Options cho Select Staff
    // const staffOptions = [{ value: '', label: '-- Chưa gán --' }, ...staffList.map(s => ({ value: s.id, label: s.profile?.fullName || s.email }))];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header và Nút Back */}
            <div>
                <Button variant="link" onClick={() => navigate('/maintenance')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại danh sách yêu cầu
                </Button>
                <h1 className="text-2xl font-semibold text-gray-900">Chi tiết Yêu cầu Bảo trì #{id}</h1>
            </div>

            {/* Phần Thông tin chi tiết */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    {/* Tiêu đề và trạng thái */}
                    <div className="flex flex-wrap justify-between items-start gap-2">
                        <h3 className="text-lg leading-6 font-semibold text-gray-900">{request.title}</h3>
                        <div className="flex-shrink-0">
                            <Badge color={getStatusBadgeColor(request.status)}>
                                {getStatusIcon(request.status)}
                                {request.status?.toUpperCase() || 'N/A'}
                            </Badge>
                        </div>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-gray-500">
                        Yêu cầu bởi: <span className='font-medium'>{request.reportedBy?.fullName || request.studentId || '-'}</span>
                        <br />
                        Phòng: <span className='font-medium'>{room?.number || `ID: ${request.roomId}`}</span> ({room?.building?.name || 'N/A'})
                        <br />
                        Ngày yêu cầu: <span className='font-medium'>{formatDateTime(request.createdAt)}</span>
                    </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-5">
                    {/* Mô tả sự cố */}
                    <div>
                        <h4 className='text-sm font-medium text-gray-600 mb-1'>Mô tả sự cố:</h4>
                        <p className='text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border'>{request.issue || '-'}</p>
                    </div>

                    {/* Ảnh đính kèm */}
                    {request.images && request.images.length > 0 && (
                        <div>
                            <h4 className='text-sm font-medium text-gray-600 mb-2'>Hình ảnh đính kèm:</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {request.images.map((image, index) => {
                                    // **Kiểm tra cấu trúc image object và lấy URL đúng**
                                    const imageUrl = image.url || image.path; // Ưu tiên url nếu có
                                    const finalImageUrl = imageUrl
                                        ? (imageUrl.startsWith('http') ? imageUrl : `${UPLOADS_BASE_URL || ''}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`)
                                        : 'src/assets/default-avatar.png';
                                    return (
                                        <a key={image.id || index} href={finalImageUrl} target="_blank" rel="noopener noreferrer" className="relative block aspect-square group border rounded-md overflow-hidden bg-gray-100">
                                            <img src={finalImageUrl} alt={`Ảnh ${index + 1}`} className="object-contain w-full h-full" onError={(e) => { e.target.onerror = null; e.target.src = 'src/assets/default-avatar.png' }} />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                                                <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Ghi chú của Staff (nếu có) */}
                    <div>
                        <h4 className='text-sm font-medium text-gray-600 mb-1'>Ghi chú xử lý (Nhân viên):</h4>
                        <p className='text-sm text-gray-800 whitespace-pre-wrap bg-yellow-50 p-3 rounded border border-yellow-200'>{request.staffNotes || <span className='italic text-gray-500'>Chưa có ghi chú</span>}</p>
                    </div>

                    {/* (Tùy chọn) Nhân viên được gán */}
                    {/* <div>
                           <h4 className='text-sm font-medium text-gray-600 mb-1'>Nhân viên xử lý:</h4>
                           <p className='text-sm text-gray-800'>{request.assignedStaff?.profile?.fullName || request.assignedStaff?.email || <span className='italic text-gray-500'>Chưa gán</span>}</p>
                       </div> */}
                </div>
            </div>

            {/* Form Cập nhật trạng thái */}
            <form onSubmit={handleUpdateSubmit} className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Cập nhật Trạng thái & Ghi chú</h3>
                </div>
                <div className="px-4 py-5 sm:p-6 space-y-4">
                    <Select
                        label="Trạng thái mới *"
                        id="status"
                        name="status"
                        value={updateData.status}
                        onChange={handleUpdateChange}
                        options={maintenanceStatusOptions}
                        disabled={isUpdating}
                        required
                        placeholder={updateData.status ? undefined : '-- Chọn --'} // Nếu đã có trạng thái thì không hiển thị placeholder
                    />
                    {/* (Tùy chọn) Select gán việc */}
                    {/* <Select
                           label="Gán cho nhân viên"
                           id="assignedStaffId"
                           name="assignedStaffId"
                           value={updateData.assignedStaffId}
                           onChange={handleUpdateChange}
                           options={staffOptions}
                           disabled={isUpdating}
                           placeholder="-- Chọn nhân viên --"
                       /> */}
                    <Textarea
                        label="Ghi chú xử lý"
                        id="staffNotes"
                        name="staffNotes" // Tên giống với state để đảm bảo cập nhật đúng
                        rows={4}
                        value={updateData.staffNotes} // Lấy từ state updateData
                        onChange={handleUpdateChange}
                        disabled={isUpdating}
                        placeholder="Thêm ghi chú về quá trình xử lý, kết quả, vật tư sử dụng,..."
                    />
                </div>
                <div className="flex items-center justify-end gap-x-3 border-t border-gray-900/10 px-4 py-4 sm:px-6">
                    <Button type="submit" isLoading={isUpdating} disabled={isUpdating}>
                        Lưu cập nhật
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceForm;