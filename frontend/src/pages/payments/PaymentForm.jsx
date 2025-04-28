import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/payment.service';
import { studentService } from '../../services/student.service';
import { invoiceService } from '../../services/invoice.service'; // Lấy ds hóa đơn chờ TT
import { Input, Button, Select, Textarea, DatePicker } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Options phương thức thanh toán thủ công
const manualMethodOptions = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'bank_transfer', label: 'Chuyển khoản NH (Đã nhận)' },
    { value: 'other', label: 'Khác' },
];

const PaymentForm = () => {
    const { id } = useParams(); // ID Payment nếu edit (ít dùng)
    const navigate = useNavigate();
    const isEditMode = Boolean(id); // Thường là tạo mới

    const [formData, setFormData] = useState({
        studentId: '',
        invoiceId: '',
        amount: '',
        method: 'cash', // Mặc định
        transactionDate: format(new Date(), 'yyyy-MM-dd'), // Ngày hiện tại
        details: '',
        status: 'success', // Mặc định là thành công khi ghi nhận thủ công
    });
    const [students, setStudents] = useState([]);
    const [pendingInvoices, setPendingInvoices] = useState([]); // Hóa đơn chờ của SV đã chọn
    const [isLoading, setIsLoading] = useState(true); // Load students/invoices ban đầu
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch students
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const studentData = await studentService.getAllStudents({ limit: 1000, fields: 'id,fullName,studentId' });
                setStudents(studentData.students || []);
                // Nếu edit mode, fetch payment data (ít dùng)
                // if(isEditMode) { ... }
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
                toast.error("Không thể tải dữ liệu cần thiết.");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [isEditMode, id]);

    // Fetch hóa đơn chờ thanh toán khi chọn sinh viên
    useEffect(() => {
        const fetchPendingInvoices = async () => {
            if (formData.studentId) {
                try {
                    const params = { studentId: formData.studentId, status: 'pending', limit: 50 };
                    const data = await invoiceService.getAllInvoices(params);
                    setPendingInvoices(data.invoices || []);
                    // Reset invoiceId nếu SV thay đổi
                    setFormData(prev => ({ ...prev, invoiceId: '' }));
                } catch (err) {
                    console.error("Lỗi tải hóa đơn chờ:", err);
                    setPendingInvoices([]);
                }
            } else {
                setPendingInvoices([]); // Reset nếu không chọn SV
                setFormData(prev => ({ ...prev, invoiceId: '' }));
            }
        };
        fetchPendingInvoices();
    }, [formData.studentId]);

    // Handler change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

        // Tự động điền số tiền khi chọn hóa đơn?
        if (name === 'invoiceId' && value) {
            const selectedInvoice = pendingInvoices.find(inv => inv.id.toString() === value);
            if (selectedInvoice) {
                setFormData(prev => ({ ...prev, amount: selectedInvoice.amount || '' }));
            }
        } else if (name === 'invoiceId' && !value) {
            setFormData(prev => ({ ...prev, amount: '' })); // Reset amount nếu bỏ chọn HĐ
        }
    };
    const handleDateChange = (date) => {
        setFormData(prev => ({ ...prev, transactionDate: date ? format(date, 'yyyy-MM-dd') : '' }));
    };


    // Handler submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        // Validation
        if (!formData.studentId) { /* ... */ }
        if (!formData.invoiceId) { /* ... */ } // Bắt buộc chọn hóa đơn?
        if (!formData.amount || parseFloat(formData.amount) <= 0) { /* ... */ }
        // ...

        try {
            const payload = {
                studentId: parseInt(formData.studentId),
                invoiceId: parseInt(formData.invoiceId),
                amount: parseFloat(formData.amount),
                method: formData.method,
                status: 'success', // Luôn là success khi ghi nhận thủ công
                transactionDate: formData.transactionDate ? new Date(formData.transactionDate).toISOString() : new Date().toISOString(), // Gửi ISO string
                details: formData.details || `Ghi nhận thanh toán thủ công ngày ${format(new Date(), 'dd/MM/yyyy')}`,
            };

            if (isEditMode) {
                // await paymentService.updatePayment(id, payload); // Ít dùng
            } else {
                await paymentService.createPayment(payload);
                toast.success('Đã ghi nhận thanh toán thành công!');
            }
            // Có thể cần cập nhật trạng thái hóa đơn liên quan? Backend nên xử lý.
            navigate('/payments');

        } catch (err) { /* ... error handling ... */ }
        finally { setIsSaving(false); }
    };

    // Options cho Selects
    const studentOptions = [{ value: '', label: '-- Chọn sinh viên --' }, ...students.map(s => ({ value: s.id.toString(), label: `${s.fullName} (${s.studentId || 'N/A'})` }))];
    const invoiceOptions = [{ value: '', label: '-- Chọn hóa đơn --' }, ...pendingInvoices.map(inv => ({ value: inv.id.toString(), label: `#${inv.invoiceNumber} - ${formatCurrency(inv.amount)} - Hạn: ${formatDate(inv.dueDate)}` }))];


    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <Button variant="link" onClick={() => navigate('/payments')} icon={ArrowLeftIcon} className="text-sm mb-4">
                    Quay lại lịch sử thanh toán
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? 'Chỉnh sửa Giao dịch' : 'Ghi nhận Thanh toán Thủ công'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                <Select label="Sinh viên *" id="studentId" name="studentId" value={formData.studentId} onChange={handleChange} options={studentOptions} required disabled={isSaving} searchable error={errors.studentId} />

                {/* Chỉ hiển thị chọn hóa đơn khi đã chọn SV */}
                {formData.studentId && (
                    <Select label="Hóa đơn cần thanh toán *" id="invoiceId" name="invoiceId" value={formData.invoiceId} onChange={handleChange} options={invoiceOptions} required disabled={isSaving || pendingInvoices.length === 0} error={errors.invoiceId} />
                )}

                <Input label="Số tiền thanh toán *" id="amount" name="amount" type="number" min="0" step="1000" required value={formData.amount} onChange={handleChange} disabled={isSaving} error={errors.amount} />
                <Select label="Phương thức thanh toán *" id="method" name="method" required value={formData.method} onChange={handleChange} options={manualMethodOptions} disabled={isSaving} error={errors.method} />

                {/* DatePicker hoặc Input date */}
                {/* <DatePicker label="Ngày thanh toán *" selected={formData.transactionDate ? parseISO(formData.transactionDate) : new Date()} onChange={handleDateChange} required disabled={isSaving} error={errors.transactionDate}/> */}
                <Input label="Ngày thanh toán *" id="transactionDate" name="transactionDate" type="date" required value={formData.transactionDate} onChange={handleChange} disabled={isSaving} error={errors.transactionDate} />


                <Textarea label="Ghi chú (Tùy chọn)" id="details" name="details" rows={3} value={formData.details} onChange={handleChange} disabled={isSaving} error={errors.details} />


                {/* Nút Submit */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => navigate('/payments')} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                        {isEditMode ? 'Lưu thay đổi' : 'Xác nhận Thanh toán'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default PaymentForm; // Chỉ export nếu bạn cần form này