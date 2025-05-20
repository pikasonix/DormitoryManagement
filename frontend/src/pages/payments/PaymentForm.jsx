// filepath: d:\CODE\DormitoryManagement\frontend\src\pages\payments\PaymentForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { paymentService } from '../../services/payment.service';
import { studentService } from '../../services/student.service';
import { invoiceService } from '../../services/invoice.service';
import { Input, Button, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format, parse } from 'date-fns';

// Invoice Modal Component
const InvoiceModal = ({ invoice, isOpen, onClose }) => {
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
                                {typeof invoice.amount === 'number'
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.amount)
                                    : invoice.amount}
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

const manualMethodOptions = [
    { value: 'Tiền mặt', label: 'Tiền mặt' },
    { value: 'Chuyển khoản', label: 'Chuyển khoản Ngân Hàng (Đã nhận)' },
    { value: 'Khác', label: 'Khác' },
];

// Function to map API payment method values to dropdown option values
const mapApiMethodToFormMethod = (apiMethod) => {
    if (!apiMethod) return 'Tiền mặt'; // Default value

    // Convert to lowercase for case-insensitive matching
    const method = apiMethod.toLowerCase();

    if (method.includes('bank') || method.includes('chuyển') || method.includes('khoản')) {
        return 'Chuyển khoản';
    } else if (method.includes('cash') || method.includes('tiền mặt')) {
        return 'Tiền mặt';
    } else {
        return 'Khác';
    }
};

const PaymentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const invoiceIdFromQuery = queryParams.get('invoiceId');

    const isEditMode = Boolean(id);
    const [formData, setFormData] = useState({
        studentId: '',
        invoiceId: invoiceIdFromQuery || '',
        amount: '',
        method: 'Tiền mặt', // Default to cash payment
        transactionDate: format(new Date(), 'yyyy-MM-dd'),
        details: '',
        status: 'success',
    });
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [foundStudent, setFoundStudent] = useState(null);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const searchTimerRef = useRef(null);

    // Function to view invoice details
    const handleViewInvoice = async (invoiceId) => {
        if (!invoiceId) return;

        try {
            setIsLoading(true);
            const invoice = await invoiceService.getInvoiceById(invoiceId);
            setInvoiceDetails(invoice);
            setShowInvoiceModal(true);
        } catch (error) {
            toast.error('Không thể tải thông tin hóa đơn');
            console.error('Error fetching invoice:', error);
        } finally {
            setIsLoading(false);
        }
    };    // Effect để tải dữ liệu từ invoiceId khi có query param
    useEffect(() => {
        if (!isEditMode && invoiceIdFromQuery) {
            setIsLoading(true);            // Tải thông tin hóa đơn từ invoiceId
            invoiceService.getInvoiceById(invoiceIdFromQuery)
                .then(invoiceData => {
                    console.log('Invoice data loaded from query:', invoiceData);
                    setInvoiceDetails(invoiceData);                    // Lưu lại studentProfileId từ dữ liệu hóa đơn để sử dụng khi tạo payment
                    console.log('Found studentProfileId in invoice:', invoiceData.studentProfileId);

                    // Lưu riêng studentProfileId vào state để có thể lấy từ nhiều nguồn
                    if (invoiceData.studentProfileId) {
                        window.lastLoadedStudentProfileId = parseInt(invoiceData.studentProfileId, 10);
                    }// Cập nhật formData với thông tin từ hóa đơn
                    const studentProfileIdNumber = invoiceData.studentProfileId ?
                        parseInt(invoiceData.studentProfileId, 10) : null;

                    console.log("Updating form data with invoice:", {
                        invoiceId: invoiceIdFromQuery,
                        amount: invoiceData.remainingAmount || invoiceData.totalAmount,
                        studentProfileId: studentProfileIdNumber,
                        originalProfileId: invoiceData.studentProfileId
                    });

                    setFormData(prev => ({
                        ...prev,
                        invoiceId: invoiceIdFromQuery,
                        amount: invoiceData.remainingAmount || invoiceData.totalAmount || '',
                        // Lưu studentProfileId từ hóa đơn để sử dụng khi tạo thanh toán
                        studentProfileId: studentProfileIdNumber,
                    }));

                    // Tải thông tin sinh viên nếu có studentProfileId
                    if (invoiceData.studentProfileId) {
                        studentService.getStudentById(invoiceData.studentProfileId)
                            .then(studentData => {
                                console.log('Student data loaded:', studentData);

                                setFoundStudent(studentData);
                                setHasSearched(true);

                                if (studentData?.studentId) {
                                    setFormData(prev => ({
                                        ...prev,
                                        studentId: studentData.studentId
                                    }));

                                    // Tải danh sách hóa đơn của sinh viên
                                    invoiceService.getAllInvoices({
                                        studentId: studentData.id,
                                        status: 'pending,partially_paid,overdue'
                                    })
                                        .then(res => setPendingInvoices(res.invoices || []))
                                        .catch(() => setPendingInvoices([]));
                                }
                            })
                            .catch(err => {
                                console.error('Error loading student:', err);
                                toast.error('Không thể tải thông tin sinh viên');
                            });
                    }
                })
                .catch(err => {
                    console.error('Error loading invoice:', err);
                    toast.error('Không thể tải thông tin hóa đơn');
                })
                .finally(() => setIsLoading(false));
        }
    }, [invoiceIdFromQuery, isEditMode]);

    // Effect để load dữ liệu khi ở chế độ edit
    useEffect(() => {
        if (isEditMode && id) {
            setIsLoading(true);
            setHasSearched(false); // Reset search state when loading
            paymentService.getPaymentById(id)
                .then(paymentData => {
                    console.log('Raw payment data from API:', paymentData);
                    // Format lại dữ liệu cho form
                    // Trước tiên, tìm hiểu cấu trúc của dữ liệu payment
                    console.log('Payment data loaded:', paymentData);
                    console.log('Payment method from API:', paymentData.paymentMethod);

                    // Tìm studentId từ studentProfile nếu có
                    let studentIdFromPayment = '';
                    if (paymentData.studentProfile && paymentData.studentProfile.studentId) {
                        studentIdFromPayment = paymentData.studentProfile.studentId;
                    } else if (paymentData.student && paymentData.student.studentId) {
                        studentIdFromPayment = paymentData.student.studentId;
                    } else if (paymentData.studentId) {
                        studentIdFromPayment = paymentData.studentId;
                    } const formattedData = {
                        studentId: studentIdFromPayment,
                        invoiceId: paymentData.invoiceId?.toString() || '',
                        amount: paymentData.amount?.toString() || '',
                        method: mapApiMethodToFormMethod(paymentData.paymentMethod),
                        transactionDate: paymentData.paymentDate ? format(new Date(paymentData.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                        details: paymentData.notes || '',
                        status: paymentData.status || 'success'
                    };

                    console.log('Formatted data:', formattedData);

                    setFormData(formattedData);
                    // Tìm thông tin sinh viên
                    if (studentIdFromPayment) {
                        setSearching(true);
                        studentService.getAllStudents({ keyword: studentIdFromPayment })
                            .then(response => {
                                const student = response.students?.find(s => s.studentId === studentIdFromPayment);
                                setFoundStudent(student || null);
                                setHasSearched(true); // Đánh dấu đã tìm kiếm xong khi load thông tin

                                if (student) {
                                    // Lấy tất cả hóa đơn của sinh viên (bao gồm cả đã thanh toán để load được đúng hóa đơn đang edit)
                                    invoiceService.getAllInvoices({ studentId: student.id })
                                        .then(res => {
                                            setPendingInvoices(res.invoices || []);
                                        })
                                        .catch(() => setPendingInvoices([]));
                                }
                            })
                            .catch(() => setFoundStudent(null))
                            .finally(() => setSearching(false));
                    }
                })
                .catch(error => {
                    toast.error('Không thể tải thông tin thanh toán');
                    navigate('/payments');
                })
                .finally(() => setIsLoading(false));
        }
    }, [id, isEditMode, navigate]);

    // Handler thay đổi input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

        if (name === 'invoiceId' && foundStudent) {
            // Kiểm tra nếu ID hóa đơn đã được nhập, validate xem có thuộc sinh viên này không
            if (value.trim() && pendingInvoices.length > 0 && !pendingInvoices.some(inv => inv.id.toString() === value.trim())) {
                // Không tìm thấy trong danh sách hóa đơn hiện có của sinh viên
                // Không set error ngay nhưng sẽ hiển thị cảnh báo
                console.log('Invoice ID may not belong to this student');
            }
        }

        if (name === 'studentId') {
            setFoundStudent(null);
            setPendingInvoices([]);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (value.trim().length >= 3) {
                setSearching(true);
                setHasSearched(false); // Reset khi bắt đầu tìm kiếm mới
                searchTimerRef.current = setTimeout(() => {
                    studentService.getAllStudents({ keyword: value.trim() })
                        .then(response => {
                            const student = response.students?.find(s => s.studentId === value.trim());
                            setFoundStudent(student || null);
                            setHasSearched(true); // Đánh dấu đã tìm kiếm xong

                            if (student) {
                                // Nếu đang sửa thanh toán, lấy tất cả hóa đơn; nếu tạo mới chỉ lấy hóa đơn chờ thanh toán
                                const invoiceParams = {
                                    studentId: student.id,
                                    ...(isEditMode ? {} : { status: 'pending' })
                                };

                                invoiceService.getAllInvoices(invoiceParams)
                                    .then(res => setPendingInvoices(res.invoices || []))
                                    .catch(() => setPendingInvoices([]));
                            } else {
                                setPendingInvoices([]);
                            }
                        })
                        .catch(() => {
                            setFoundStudent(null);
                            setHasSearched(true); // Đánh dấu đã tìm kiếm xong dù có lỗi
                        })
                        .finally(() => setSearching(false));
                }, 500);
            } else {
                setSearching(false);
                if (value.trim().length === 0) {
                    setHasSearched(false); // Reset nếu xóa hết nội dung
                }
            }
        }
    };    // Handler submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        // Kiểm tra nếu đang thanh toán từ hóa đơn (có thông tin hóa đơn chi tiết)
        const payingFromInvoice = Boolean(invoiceIdFromQuery && invoiceDetails?.studentProfileId);

        // Chỉ yêu cầu sinh viên nếu không có sẵn từ hóa đơn
        if (!payingFromInvoice) {
            if (!formData.studentId.trim()) {
                setErrors({ studentId: 'Vui lòng nhập mã số sinh viên.' });
                setIsSaving(false);
                return;
            }
            if (!foundStudent) {
                setErrors({ studentId: 'Không tìm thấy sinh viên.' });
                setIsSaving(false);
                return;
            }
        }

        if (!formData.invoiceId) {
            setErrors({ invoiceId: 'Vui lòng chọn hóa đơn.' });
            setIsSaving(false);
            return;
        }
        if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
            setErrors({ amount: 'Vui lòng nhập số tiền hợp lệ.' });
            setIsSaving(false);
            return;
        }
        if (!formData.method) {
            setErrors({ method: 'Vui lòng chọn phương thức.' });
            setIsSaving(false);
            return;
        }
        if (!formData.transactionDate) {
            setErrors({ transactionDate: 'Vui lòng chọn ngày.' });
            setIsSaving(false);
            return;
        } try {
            // Kiểm tra chi tiết foundStudent
            console.log('Student data before creating payload:', {
                found: !!foundStudent,
                id: foundStudent?.id,
                studentId: foundStudent?.studentId,
                studentProfileIdFromForm: formData.studentProfileId,
                invoiceId: formData.invoiceId,
                invoiceDetailsId: invoiceDetails?.id,
                invoiceDetailsStudentId: invoiceDetails?.studentProfileId,
                fullObject: foundStudent
            });            // Kiểm tra xem có studentProfileId trong formData hoặc từ foundStudent không
            let studentProfileId = formData.studentProfileId || (foundStudent && foundStudent.id);

            // Nếu vẫn không có và có invoiceId, thử lấy từ hóa đơn
            if (!studentProfileId && formData.invoiceId) {
                // Nếu đã có invoiceDetails và có studentProfileId
                if (invoiceDetails && invoiceDetails.studentProfileId) {
                    studentProfileId = invoiceDetails.studentProfileId;
                }
                // Nếu không có, cần fetch invoice data mới
                else if (formData.invoiceId) {
                    try {
                        toast.loading('Đang lấy thông tin hóa đơn...', { id: 'get-invoice' });
                        const invoice = await invoiceService.getInvoiceById(formData.invoiceId);
                        toast.dismiss('get-invoice');
                        if (invoice && invoice.studentProfileId) {
                            studentProfileId = invoice.studentProfileId;
                            // Lưu lại vào window để fallback lần sau
                            window.lastLoadedStudentProfileId = parseInt(invoice.studentProfileId, 10);
                        }
                    } catch (err) {
                        toast.dismiss('get-invoice');
                        toast.error('Không thể lấy thông tin hóa đơn');
                        console.error("Error fetching invoice for studentProfileId:", err);
                    }
                }
            }

            // Fallback cuối cùng: lấy từ window nếu vẫn chưa có
            if (!studentProfileId && window.lastLoadedStudentProfileId) {
                studentProfileId = window.lastLoadedStudentProfileId;
            }

            // Đảm bảo studentProfileId là số nguyên (chỉ khai báo 1 lần ở đây)
            const studentProfileIdNumber = parseInt(studentProfileId, 10);
            if (isNaN(studentProfileIdNumber)) {
                throw new Error('ID sinh viên không hợp lệ');
            }

            // Đảm bảo invoiceId là số nguyên
            const invoiceIdNumber = parseInt(formData.invoiceId, 10);
            if (isNaN(invoiceIdNumber)) {
                throw new Error('ID hóa đơn không hợp lệ');
            }

            const payload = {
                studentProfileId: studentProfileIdNumber, // Đảm bảo là số nguyên
                invoiceId: invoiceIdNumber, // Sử dụng số nguyên thay vì chuỗi
                amount: Number(formData.amount),
                paymentMethod: formData.method,
                paymentDate: formData.transactionDate,
                notes: formData.details,
                status: 'success',
            };

            // Thêm log để giúp gỡ lỗi
            console.log('Payment payload created:', {
                studentProfileId: payload.studentProfileId,
                invoiceId: payload.invoiceId,
                amount: payload.amount,
                fromInvoiceId: Boolean(invoiceIdFromQuery),
                invoiceDetails: invoiceDetails ? {
                    id: invoiceDetails.id,
                    studentProfileId: invoiceDetails.studentProfileId
                } : null
            });
            console.log('Sending payment payload:', payload); // Log để kiểm tra
            if (isEditMode) {
                await paymentService.updatePayment(id, payload);
                toast.success('Đã cập nhật thanh toán thành công!');
            } else {
                await paymentService.createPayment(payload);
                toast.success('Đã ghi nhận thanh toán thành công!');
            }
            navigate('/payments');
        } catch (err) {
            console.error("Payment error:", err);

            let errorMessage = 'Lưu thanh toán thất bại!';

            // Kiểm tra lỗi cụ thể để hiển thị thông báo rõ ràng hơn
            if (err.message.includes('studentProfileId') || err.message.includes('sinh viên')) {
                errorMessage = 'Không thể xác định thông tin sinh viên. Vui lòng chọn sinh viên hợp lệ hoặc tải lại trang.';
            } else if (err.message.includes('invoiceId') || err.message.includes('hóa đơn')) {
                errorMessage = 'Không thể xác định hóa đơn. Vui lòng chọn hóa đơn hợp lệ.';
            } else if (err.message.includes('amount') || err.message.includes('tiền')) {
                errorMessage = 'Số tiền thanh toán không hợp lệ. Vui lòng kiểm tra lại.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    // Options hóa đơn
    const invoiceOptions = [
        { value: '', label: '-- Chọn hóa đơn --' },
        ...pendingInvoices.map(inv => ({
            value: inv.id.toString(),
            label: `#${inv.invoiceNumber || inv.id} - ${inv.amount} VND${inv.status ? ` (${inv.status})` : ''}`
        }))
    ];

    // Kiểm tra xem hóa đơn hiện tại đã có trong danh sách chưa
    if (isEditMode && formData.invoiceId && !invoiceOptions.some(opt => opt.value === formData.invoiceId)) {
        // Có thể là hóa đơn đã thanh toán không nằm trong danh sách hóa đơn chờ
        // Thêm một option cho hóa đơn hiện tại nếu không có trong danh sách
        invoiceOptions.push({
            value: formData.invoiceId,
            label: `#ID: ${formData.invoiceId} - (Hiện tại)`
        });
    }

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Invoice Modal */}            <InvoiceModal
                invoice={invoiceDetails}
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
            />

            {/* Hiển thị thông tin hóa đơn khi tải từ query param */}            {/* Hiển thị thông tin hóa đơn khi tải từ query param */}
            {invoiceIdFromQuery && invoiceDetails && !showInvoiceModal && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-blue-900">Thông tin hóa đơn</h3>
                        <Button
                            type="button"
                            variant="text"
                            onClick={() => setShowInvoiceModal(true)}
                            className="text-blue-700"
                        >
                            Xem chi tiết
                        </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-blue-800">Mã hóa đơn</p>
                            <p className="text-blue-700">{invoiceDetails.invoiceNumber || invoiceDetails.id}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-800">Tổng số tiền</p>
                            <p className="text-blue-700 font-semibold">
                                {typeof invoiceDetails.totalAmount === 'number'
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoiceDetails.totalAmount)
                                    : invoiceDetails.totalAmount}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <Button
                    variant="link"
                    onClick={() => navigate(invoiceIdFromQuery ? '/invoices' : '/payments')}
                    icon={ArrowLeftIcon}
                    className="text-sm mb-4"
                >
                    {invoiceIdFromQuery ? 'Quay lại danh sách hóa đơn' : 'Quay lại lịch sử thanh toán'}
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode
                        ? 'Chỉnh sửa Giao dịch Thanh toán'
                        : invoiceIdFromQuery
                            ? 'Thanh toán Hóa đơn'
                            : 'Ghi nhận Thanh toán Thủ công'
                    }
                </h1>
                {isEditMode && <p className="text-gray-500 mt-1">ID: {id}</p>}
                {invoiceIdFromQuery && !isEditMode && (
                    <p className="text-gray-500 mt-1">Hóa đơn ID: {invoiceIdFromQuery}</p>
                )}
            </div>
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">                <div>
                <Input
                    label="Mã số Sinh viên *"
                    id="studentId"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                    disabled={isLoading || isSaving || Boolean(invoiceIdFromQuery)}
                    error={errors.studentId}
                    autoComplete="off"
                />
                {formData.studentId.trim().length >= 3 && searching && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800 flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang tìm kiếm sinh viên...
                        </p>
                    </div>
                )}
                {foundStudent && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                            <span className="font-medium text-green-600">Đã tìm thấy sinh viên:</span> {foundStudent.fullName}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                            {foundStudent.className && <span className="mr-2">Lớp: {foundStudent.className}</span>}
                            {foundStudent.roomNumber && <span className="mr-2">Phòng: {foundStudent.roomNumber}</span>}
                            {foundStudent.id && <span>ID: {foundStudent.id}</span>}
                        </p>
                    </div>
                )}
                {formData.studentId.trim().length >= 3 && !foundStudent && !searching && hasSearched && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 flex items-center">
                            <span className="mr-2">⚠️</span>
                            Không tìm thấy sinh viên với mã số này
                        </p>
                    </div>
                )}
            </div>
                {foundStudent && (
                    <div className="space-y-2">                        <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <Input
                                label="ID Hóa đơn cần thanh toán *"
                                id="invoiceId"
                                name="invoiceId"
                                value={formData.invoiceId}
                                onChange={handleChange}
                                required
                                disabled={isLoading || isSaving || Boolean(invoiceIdFromQuery)}
                                error={errors.invoiceId}
                                placeholder="Nhập ID hoặc chọn hóa đơn bên dưới"
                            />
                        </div>
                        {formData.invoiceId && (
                            <Button
                                type="button"
                                variant="icon"
                                onClick={() => handleViewInvoice(formData.invoiceId)}
                                className="mb-1"
                                disabled={isLoading || isSaving}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            </Button>
                        )}
                    </div>                        <Select
                            label="Danh sách hóa đơn"
                            id="selectInvoice"
                            name="selectInvoice"
                            value={formData.invoiceId}
                            onChange={(e) => {
                                handleChange({
                                    target: {
                                        name: "invoiceId",
                                        value: e.target.value
                                    }
                                });
                            }}
                            options={invoiceOptions}
                            disabled={isLoading || isSaving || pendingInvoices.length === 0 || Boolean(invoiceIdFromQuery)}
                        />
                        {formData.invoiceId && pendingInvoices.length > 0 && !pendingInvoices.some(inv => inv.id.toString() === formData.invoiceId) && (
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800 flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    Hóa đơn này không thuộc sinh viên đã chọn hoặc không tồn tại
                                </p>
                            </div>
                        )}
                    </div>
                )}
                <Input label="Số tiền thanh toán *" id="amount" name="amount" type="number" min="0" step="1000" required value={formData.amount} onChange={handleChange} disabled={isLoading || isSaving} error={errors.amount} />
                <Select label="Phương thức thanh toán *" id="method" name="method" required value={formData.method} onChange={handleChange} options={manualMethodOptions} disabled={isLoading || isSaving} error={errors.method} />
                <Input label="Ngày thanh toán *" id="transactionDate" name="transactionDate" type="date" required value={formData.transactionDate} onChange={handleChange} disabled={isLoading || isSaving} error={errors.transactionDate} />
                <Textarea label="Ghi chú (Tùy chọn)" id="details" name="details" rows={3} value={formData.details} onChange={handleChange} disabled={isLoading || isSaving} error={errors.details} />                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/payments')} disabled={isLoading || isSaving}>
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSaving}
                        disabled={isLoading || isSaving || (!foundStudent && !invoiceDetails?.studentProfileId)}
                    >
                        {isEditMode ? 'Lưu thay đổi' : 'Xác nhận Thanh toán'}
                    </Button>
                </div>
            </form>
        </div >
    );
};

export default PaymentForm;
