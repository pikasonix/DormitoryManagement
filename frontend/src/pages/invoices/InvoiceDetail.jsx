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
const formatDate = (dateString) => { /* ... như ở Index ... */ }
// Format tiền tệ
const formatCurrency = (amount) => { /* ... như ở Index ... */ }
// Màu badge status
const getStatusBadgeColor = (status) => { /* ... như ở Index ... */ }
// Icon theo status
const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1 inline-block" />;
        case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500 mr-1 inline-block" />;
        case 'overdue': return <XCircleIcon className="h-5 w-5 text-red-500 mr-1 inline-block" />;
        case 'cancelled': return <XCircleIcon className="h-5 w-5 text-gray-500 mr-1 inline-block" />;
        default: return null;
    }
};


const InvoiceDetail = () => {
    const { id } = useParams(); // ID hóa đơn
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
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

                // Fetch tên sinh viên nếu có studentId
                if (invoiceData.studentId) {
                    try {
                        const studentData = await studentService.getStudentById(invoiceData.studentId);
                        setStudentName(studentData?.fullName || `ID: ${invoiceData.studentId}`);
                    } catch (studentErr) {
                        console.warn("Không thể lấy tên sinh viên:", studentErr);
                        setStudentName(`ID: ${invoiceData.studentId}`);
                    }
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
        if (window.confirm(`Bạn có chắc muốn cập nhật trạng thái hóa đơn #${invoice.invoiceNumber} thành "${newStatus.toUpperCase()}" không?`)) {
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
                </Button>
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Chi tiết Hóa đơn #{invoice.invoiceNumber || id}</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Ngày tạo: {formatDate(invoice.createdAt) || '-'} |
                            Hạn thanh toán: <span className={new Date(invoice.dueDate) < new Date() && invoice.status === 'pending' ? 'text-red-600 font-semibold' : ''}>{formatDate(invoice.dueDate) || '-'}</span>
                        </p>
                    </div>
                    {/* Actions: In, Thanh toán (nếu chưa trả), Cập nhật status */}
                    <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                        {/* Nút cập nhật status (ví dụ) */}
                        {invoice.status === 'pending' && (
                            <Button
                                variant='success'
                                onClick={() => handleUpdateStatus('paid')}
                                isLoading={isUpdatingStatus}
                                disabled={isUpdatingStatus}
                                icon={CheckCircleIcon}
                            >
                                Đánh dấu Đã thanh toán
                            </Button>
                        )}
                        {invoice.status === 'paid' && (
                            <Button
                                variant='warning'
                                onClick={() => handleUpdateStatus('pending')}
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

            {/* Thông tin chi tiết */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Sinh viên</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{studentName}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">Số hóa đơn</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{invoice.invoiceNumber || '-'}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Tổng tiền</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold text-lg">{formatCurrency(invoice.amount)}</dd>
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
                                                {formatCurrency(invoice.amount)}
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