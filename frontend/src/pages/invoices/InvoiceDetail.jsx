import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service'; // Để lấy tên SV
import { Button, Badge } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PrinterIcon, CreditCardIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format ngày
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi }); }
    catch (e) { return dateString; }
}

// Format tiền tệ
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Màu badge status
const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
        case 'PAID': return 'green';
        case 'UNPAID': return 'yellow';
        case 'PARTIALLY_PAID': return 'blue';
        case 'OVERDUE': return 'red';
        case 'CANCELLED': return 'gray';
        default: return 'gray';
    }
}
// Icon theo status
const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
        case 'PAID': return <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1 inline-block" />;
        case 'UNPAID':
        case 'PARTIALLY_PAID': return <ClockIcon className="h-5 w-5 text-yellow-500 mr-1 inline-block" />;
        case 'OVERDUE': return <XCircleIcon className="h-5 w-5 text-red-500 mr-1 inline-block" />;
        case 'CANCELLED': return <XCircleIcon className="h-5 w-5 text-gray-500 mr-1 inline-block" />;
        default: return null;
    }
};


const InvoiceDetail = () => {
    const { id } = useParams(); // ID hóa đơn
    const navigate = useNavigate(); const [invoice, setInvoice] = useState(null);
    const [studentName, setStudentName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // State khi cập nhật status

    useEffect(() => {
        const fetchInvoiceDetail = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const invoiceData = await invoiceService.getInvoiceById(id);
                setInvoice(invoiceData);

                // Lấy thông tin sinh viên từ studentProfile trong invoiceData
                if (invoiceData.studentProfile) {
                    setStudentName(invoiceData.studentProfile?.fullName ||
                        (invoiceData.studentProfile.studentId ? `ID: ${invoiceData.studentProfile.studentId}` : 'Không có thông tin'));
                } else if (invoiceData.studentProfileId) {
                    // Nếu chỉ có ID nhưng không có thông tin đầy đủ, thì fetch riêng
                    try {
                        const studentData = await studentService.getStudentById(invoiceData.studentProfileId);
                        setStudentName(studentData?.fullName || `ID: ${invoiceData.studentProfileId}`);
                    } catch (studentErr) {
                        console.warn("Không thể lấy tên sinh viên:", studentErr);
                        setStudentName(`ID: ${invoiceData.studentProfileId}`);
                    }
                } else {
                    setStudentName('Không có thông tin sinh viên');
                }

            } catch (err) {
                setError('Không thể tải chi tiết hóa đơn.');
                toast.error('Hóa đơn không tồn tại hoặc có lỗi xảy ra.');
                navigate('/invoices'); // Quay lại nếu lỗi
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoiceDetail();
    }, [id, navigate]);

    // Hàm cập nhật trạng thái hóa đơn (ví dụ: đánh dấu đã thanh toán)
    const handleUpdateStatus = async (newStatus) => {
        if (!invoice) return;
        if (window.confirm(`Bạn có chắc muốn cập nhật trạng thái hóa đơn #${id} thành "${newStatus.toUpperCase()}" không?`)) {
            setIsUpdatingStatus(true);
            try {
                const updatedInvoice = await invoiceService.updateInvoice(id, { status: newStatus });
                setInvoice(updatedInvoice); // Cập nhật lại state với dữ liệu mới
                toast.success('Cập nhật trạng thái hóa đơn thành công!');
            } catch (err) {
                toast.error(err?.message || 'Cập nhật trạng thái thất bại.');
            } finally {
                setIsUpdatingStatus(false);
            }
        }
    };


    // --- Render ---
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    if (error) return <div className="text-red-600 bg-red-100 p-4 rounded">Lỗi: {error}</div>;
    if (!invoice) return <div className="text-center p-6">Không tìm thấy thông tin hóa đơn.</div>;


    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header và nút Back */}
            <div>
                <Button variant="link" onClick={() => navigate('/invoices')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại danh sách hóa đơn
                </Button>                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Chi tiết Hóa đơn #{id}</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Ngày tạo: {formatDate(invoice.createdAt) || '-'} |
                            Hạn thanh toán: <span className={new Date(invoice.dueDate) < new Date() && invoice.status === 'UNPAID' ? 'text-red-600 font-semibold' : ''}>{formatDate(invoice.dueDate) || '-'}</span>
                        </p>
                    </div>
                    {/* Actions: In, Thanh toán (nếu chưa trả), Cập nhật status */}
                    <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                        {/* Nút cập nhật status (ví dụ) */}                        {(invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE') && (
                            <Button
                                variant='success'
                                onClick={() => handleUpdateStatus('PAID')}
                                isLoading={isUpdatingStatus}
                                disabled={isUpdatingStatus}
                                icon={CheckCircleIcon}
                            >
                                Đánh dấu Đã thanh toán
                            </Button>
                        )}
                        {invoice.status === 'PAID' && (
                            <Button
                                variant='warning'
                                onClick={() => handleUpdateStatus('UNPAID')}
                                isLoading={isUpdatingStatus}
                                disabled={isUpdatingStatus}
                            >
                                Đánh dấu Chờ thanh toán
                            </Button>
                        )}
                        {/* Nút In */}
                        <Button variant="outline" icon={PrinterIcon} onClick={() => window.print()}> {/* Đơn giản là print trang */}
                            In hóa đơn
                        </Button>
                        {/* Nút Thanh toán (nếu tích hợp cổng thanh toán) */}
                        {/* {invoice.status === 'pending' && <Button icon={CreditCardIcon}>Thanh toán ngay</Button>} */}
                    </div>
                </div>
            </div>

            {/* Thông tin chi tiết */}            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {/* Hiển thị thông tin sinh viên nếu có */}
                        {invoice.studentProfile && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">Sinh viên</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {studentName}
                                    {invoice.studentProfile.studentId && (
                                        <span className="font-mono text-gray-500 ml-2">
                                            [Mã SV: {invoice.studentProfile.studentId}]
                                        </span>
                                    )}
                                </dd>
                            </div>
                        )}

                        {/* Hiển thị thông tin phòng nếu có */}
                        {invoice.room && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">Phòng</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <span className="font-semibold">Phòng {invoice.room.number}</span>
                                    {invoice.room.building && (
                                        <span className="text-gray-600 ml-2">
                                            - Tòa {invoice.room.building.name}
                                        </span>
                                    )}
                                </dd>
                            </div>
                        )}

                        {/* Hiển thị số hóa đơn */}
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Số hóa đơn</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{id}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Tổng tiền</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold text-lg">{formatCurrency(invoice.totalAmount)}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Trạng thái</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                                {getStatusIcon(invoice.status)}
                                <Badge color={getStatusBadgeColor(invoice.status)}>
                                    {invoice.status?.toUpperCase() || 'N/A'}
                                </Badge>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Ngày hết hạn</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(invoice.dueDate)}</dd>
                        </div>
                        {/* Chi tiết các khoản phí */}
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Chi tiết khoản phí</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {invoice.items && invoice.items.length > 0 ? (
                                    <ul role="list" className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                        {invoice.items.map((item, index) => (
                                            <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                <div className="w-0 flex-1 flex items-center">
                                                    <span className="ml-2 flex-1 w-0 truncate">{item.description || 'Khoản phí không tên'}</span>
                                                </div>
                                                <div className="ml-4 flex-shrink-0">
                                                    {formatCurrency(item.amount)}
                                                </div>
                                            </li>
                                        ))}
                                        <li className="pl-3 pr-4 py-3 flex items-center justify-between text-sm bg-gray-100 font-semibold">
                                            <div className="w-0 flex-1 flex items-center">
                                                <span className="ml-2 flex-1 w-0 truncate">Tổng cộng</span>
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                {formatCurrency(invoice.totalAmount)}
                                            </div>
                                        </li>
                                    </ul>
                                ) : (
                                    <p className="text-gray-500">Không có chi tiết khoản phí.</p>
                                )}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetail;