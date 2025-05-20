// PaymentNew.jsx - Component tạo thanh toán mới từ một hóa đơn
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/payment.service';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service';
import { roomService } from '../../services/room.service';
import { Input, Button, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Options phương thức thanh toán
const paymentMethodOptions = [
    { value: '', label: '-- Chọn phương thức --' },
    { value: 'Tiền mặt', label: 'Tiền mặt' },
    { value: 'Chuyển khoản', label: 'Chuyển khoản ngân hàng' },
    { value: 'Khác', label: 'Phương thức khác' },
];

// Component modal hiển thị chi tiết hóa đơn
const InvoiceDetailsModal = ({ invoice, isOpen, onClose }) => {
    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-medium text-gray-900">Chi tiết hóa đơn #{invoice.invoiceNumber || invoice.id}</h3>
                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Mã hóa đơn</p>
                            <p>{invoice.invoiceNumber || invoice.id}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Trạng thái</p>
                            <p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${invoice.status === 'paid'
                                        ? 'bg-green-100 text-green-800'
                                        : invoice.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                    {invoice.status === 'paid' ? 'Đã thanh toán' :
                                        invoice.status === 'pending' ? 'Chờ thanh toán' :
                                            invoice.status === 'overdue' ? 'Quá hạn' : invoice.status}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-500">Sinh viên</p>
                        <p>{invoice.studentName || (invoice.studentProfile ? invoice.studentProfile.fullName : 'Không có thông tin')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Số tiền</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {typeof invoice.totalAmount === 'number'
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount)
                                    : invoice.totalAmount}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Ngày tạo</p>
                            <p>{invoice.createdAt ? format(new Date(invoice.createdAt), 'dd/MM/yyyy') : 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Loại hóa đơn</p>
                            <p>{invoice.type || 'Không xác định'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Hạn thanh toán</p>
                            <p>{invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : 'N/A'}</p>
                        </div>
                    </div>

                    {invoice.description && (
                        <div>
                            <p className="text-sm font-medium text-gray-500">Mô tả</p>
                            <p className="text-gray-700">{invoice.description}</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 border-t pt-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onClose}
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

// Component chính
const PaymentNew = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const invoiceId = queryParams.get('invoiceId');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [student, setStudent] = useState(null);
    const [room, setRoom] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        amount: '',
        method: 'Tiền mặt', // Mặc định là tiền mặt
        transactionDate: format(new Date(), 'yyyy-MM-dd'),
        details: '',
    });

    // Thêm hàm tính số tiền còn lại
    const getRemainingAmount = () => {
        if (!invoice) return null;
        // Ép kiểu về number nếu là string
        const total = typeof invoice.totalAmount === 'number' ? invoice.totalAmount : Number(invoice.totalAmount);
        const paid = typeof invoice.paidAmount === 'number' ? invoice.paidAmount : Number(invoice.paidAmount);
        const remain = typeof invoice.remainingAmount === 'number' ? invoice.remainingAmount : Number(invoice.remainingAmount);

        if (!isNaN(remain) && remain !== 0) {
            return remain;
        }
        if (!isNaN(total)) {
            if (!isNaN(paid)) {
                return total - paid;
            }
            return total;
        }
        return null;
    };

    // Tải thông tin hóa đơn và sinh viên
    useEffect(() => {
        const fetchInvoiceData = async () => {
            if (!invoiceId) {
                toast.error('Không có thông tin hóa đơn');
                navigate('/invoices');
                return;
            }

            try {
                setIsLoading(true);
                const invoiceData = await invoiceService.getInvoiceById(invoiceId);
                setInvoice(invoiceData);
                console.log('Loaded invoice data:', invoiceData);

                // Tính số tiền còn lại
                let remainingAmount;
                // Ưu tiên dùng remainingAmount từ API nếu có (cả khi là chuỗi)
                if (invoiceData.remainingAmount != null && !isNaN(Number(invoiceData.remainingAmount))) {
                    remainingAmount = Number(invoiceData.remainingAmount);
                }
                // Nếu không, tính bằng totalAmount - paidAmount
                else if (invoiceData.totalAmount != null && !isNaN(Number(invoiceData.totalAmount))) {
                    const totalNum = Number(invoiceData.totalAmount);
                    const paidNum = invoiceData.paidAmount != null && !isNaN(Number(invoiceData.paidAmount))
                        ? Number(invoiceData.paidAmount)
                        : 0;
                    remainingAmount = totalNum - paidNum;
                }
                // Mặc định là 0 nếu không có thông tin
                else {
                    remainingAmount = 0;
                }

                // Cập nhật form với số tiền còn lại (đảm bảo là số)
                setFormData(prev => ({
                    ...prev,
                    amount: remainingAmount
                }));

                if (invoiceData.studentProfileId) {
                    try {
                        console.log('Fetching studentProfile with ID:', invoiceData.studentProfileId);
                        const studentData = await studentService.getStudentByProfileId(invoiceData.studentProfileId);
                        setStudent(studentData);
                        console.log('Loaded student data:', studentData);
                    } catch (error) {
                        console.error('Error loading student:', error);
                        toast.error('Không thể tải thông tin sinh viên');
                    }
                } else if (invoiceData.roomId) {
                    try {
                        console.log('Fetching room with ID:', invoiceData.roomId);
                        const roomData = await roomService.getRoomById(invoiceData.roomId);
                        setRoom(roomData);
                        console.log('Loaded room data:', roomData);
                    } catch (err) {
                        console.error('Error loading room:', err);
                        toast.error('Không thể tải thông tin phòng');
                    }
                }
            } catch (error) {
                console.error('Error loading invoice:', error);
                toast.error('Không thể tải thông tin hóa đơn');
                navigate('/invoices');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoiceData();
    }, [invoiceId, navigate]);

    // Xử lý thay đổi form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Xử lý submit form
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Kiểm tra form
        const newErrors = {};

        if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
            newErrors.amount = 'Vui lòng nhập số tiền hợp lệ';
        }

        if (!formData.method) {
            newErrors.method = 'Vui lòng chọn phương thức thanh toán';
        }

        if (!formData.transactionDate) {
            newErrors.transactionDate = 'Vui lòng chọn ngày thanh toán';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setIsSaving(true); const paymentData = {
                invoiceId: invoice.id,
                amount: Number(formData.amount),
                paymentMethod: formData.method,
                paymentDate: formData.transactionDate,
                notes: formData.details,
                status: 'success',
            };

            // Nếu là thanh toán cá nhân
            if (student?.id) {
                paymentData.studentProfileId = parseInt(student.id, 10);
                console.log('Adding studentProfileId to payment:', student.id);
            } else if (room?.residents && room.residents.length > 0) {
                // Thanh toán theo phòng: dùng resident đầu tiên làm payer
                const payerId = room.residents[0].id;
                paymentData.studentProfileId = parseInt(payerId, 10);
                console.log('Using room resident as payer:', payerId);
            } else if (invoice.studentProfileId) {
                // Fallback cá nhân
                paymentData.studentProfileId = parseInt(invoice.studentProfileId, 10);
                console.log('Using invoice.studentProfileId:', invoice.studentProfileId);
            }

            await paymentService.createPayment(paymentData);
            toast.success('Đã ghi nhận thanh toán thành công!');
            navigate('/invoices'); // Quay lại trang danh sách hóa đơn
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Không thể tạo thanh toán. Vui lòng thử lại!');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Modal chi tiết hóa đơn */}
            <InvoiceDetailsModal
                invoice={invoice}
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
            />

            <div>
                <Button
                    variant="link"
                    onClick={() => navigate('/invoices')}
                    icon={ArrowLeftIcon}
                    className="text-sm mb-4"
                >
                    Quay lại danh sách hóa đơn
                </Button>

                <h1 className="text-2xl font-semibold">Thanh toán Hóa đơn</h1>
                <p className="text-gray-500 mt-1">Hóa đơn ID: {invoiceId}</p>
            </div>

            {/* Thông tin hóa đơn */}
            {invoice && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-medium text-blue-900">Thông tin hóa đơn</h2>
                        <Button
                            type="button"
                            variant="text"
                            onClick={() => setShowInvoiceModal(true)}
                            className="text-blue-700 text-sm"
                        >
                            Xem chi tiết
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-blue-800">Mã hóa đơn</p>
                            <p className="font-medium">{invoice.invoiceNumber || invoice.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Trạng thái</p>
                            <p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                    ${invoice.status === 'PAID'
                                        ? 'bg-green-100 text-green-800'
                                        : invoice.status === 'UNPAID'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : invoice.status === 'OVERDUE'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {invoice.status}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Tổng tiền hóa đơn</p>
                            <p className="font-medium">
                                {typeof invoice.totalAmount === 'number'
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount)
                                    : invoice.totalAmount}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Đã thanh toán</p>
                            <p className="font-medium">
                                {typeof invoice.totalAmount === 'number' && typeof invoice.remainingAmount === 'number'
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount - invoice.remainingAmount)
                                    : invoice.paidAmount || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Số tiền còn lại</p>
                            <p className="font-medium text-red-600">
                                {(() => {
                                    const remain = getRemainingAmount();
                                    return remain !== null
                                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(remain)
                                        : 'N/A';
                                })()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Hạn thanh toán</p>
                            <p className="font-medium">
                                {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Mã số sinh viên</p>
                            <p className="font-mono font-medium">{student?.studentId || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Họ tên sinh viên</p>
                            <p className="font-medium">{student?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-800">Phòng</p>
                            <p className="font-medium">
                                {student?.room
                                    ? `${student.room.building?.name} - Phòng ${student.room.number}`
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Form thanh toán */}
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                <Input
                    label="Số tiền thanh toán *"
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={isLoading || isSaving}
                    error={errors.amount}
                    hint={
                        (() => {
                            const remain = getRemainingAmount();
                            return remain !== null
                                ? `Thanh toán số tiền còn lại: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(remain)}`
                                : undefined;
                        })()
                    }
                />

                <Select
                    label="Phương thức thanh toán *"
                    id="method"
                    name="method"
                    required
                    value={formData.method}
                    onChange={handleChange}
                    options={paymentMethodOptions}
                    disabled={isLoading || isSaving}
                    error={errors.method}
                />

                <Input
                    label="Ngày thanh toán *"
                    id="transactionDate"
                    name="transactionDate"
                    type="date"
                    required
                    value={formData.transactionDate}
                    onChange={handleChange}
                    disabled={isLoading || isSaving}
                    error={errors.transactionDate}
                />

                <Textarea
                    label="Ghi chú (Tùy chọn)"
                    id="details"
                    name="details"
                    rows={3}
                    value={formData.details}
                    onChange={handleChange}
                    disabled={isLoading || isSaving}
                    error={errors.details}
                />

                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/invoices')}
                        disabled={isLoading || isSaving}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSaving}
                        disabled={isLoading || isSaving}
                    >
                        Xác nhận Thanh toán
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default PaymentNew;
