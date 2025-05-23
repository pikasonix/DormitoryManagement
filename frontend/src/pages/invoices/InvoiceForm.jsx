import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service';
import { roomService } from '../../services/room.service';
import { Button, Input, Select, Textarea } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// Enum cho loại thanh toán
const PAYMENT_TYPES = [
    { value: 'ROOM_FEE', label: 'Tiền phòng' },
    { value: 'ELECTRICITY', label: 'Tiền điện' },
    { value: 'WATER', label: 'Tiền nước' },
    { value: 'PARKING', label: 'Phí gửi xe' },
    { value: 'OTHER_FEE', label: 'Khác' }
];

const InvoiceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    // States
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [rooms, setRooms] = useState([]); const [formData, setFormData] = useState({
        studentCode: '',
        roomNumber: '',
        buildingName: '',
        billingMonth: new Date().getMonth() + 1,
        billingYear: new Date().getFullYear(),
        dueDate: '',
        paymentDeadline: '',
        notes: '',
        items: [
            {
                type: 'ROOM_FEE',
                description: '',
                amount: ''
            }
        ]
    });

    // Load data khi component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Load students và rooms
                const [studentsData, roomsData] = await Promise.all([
                    studentService.getAllStudents(),
                    roomService.getAllRooms()
                ]);

                setStudents(studentsData.students || []);
                setRooms(roomsData.rooms || []);                // Nếu edit mode, load thông tin hóa đơn
                if (isEditMode) {
                    const invoiceData = await invoiceService.getInvoiceById(id);

                    // Determine if we need to populate student code or room info
                    let studentCode = '';
                    let roomNumber = '';
                    let buildingName = '';

                    // If invoice has student profile, try to get student code
                    if (invoiceData.studentProfile) {
                        studentCode = invoiceData.studentProfile.studentId || '';
                    }

                    // If invoice has room, get room number and building name
                    if (invoiceData.room) {
                        roomNumber = invoiceData.room.number || '';
                        buildingName = invoiceData.room.building?.name || '';
                    }

                    setFormData({
                        studentCode,
                        roomNumber,
                        buildingName,
                        billingMonth: invoiceData.billingMonth,
                        billingYear: invoiceData.billingYear,
                        dueDate: invoiceData.dueDate ? invoiceData.dueDate.split('T')[0] : '',
                        paymentDeadline: invoiceData.paymentDeadline ? invoiceData.paymentDeadline.split('T')[0] : '',
                        notes: invoiceData.notes || '',
                        items: invoiceData.items?.map(item => ({
                            type: item.type,
                            description: item.description,
                            amount: item.amount.toString()
                        })) || []
                    });
                }
            } catch (error) {
                console.error('Lỗi load dữ liệu:', error);
                toast.error('Không thể tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isEditMode]);

    // Xử lý thay đổi form
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Xử lý thay đổi item
    const handleItemChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    // Thêm item mới
    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { type: 'OTHER_FEE', description: '', amount: '' }]
        }));
    };

    // Xóa item
    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        if (!formData.studentCode && !(formData.roomNumber && formData.buildingName)) {
            toast.error('Vui lòng nhập mã sinh viên hoặc thông tin phòng (số phòng + tòa nhà)');
            return false;
        }

        if (formData.studentCode && (formData.roomNumber || formData.buildingName)) {
            toast.error('Chỉ có thể nhập mã sinh viên hoặc thông tin phòng, không thể nhập cả hai');
            return false;
        }

        if (formData.roomNumber && !formData.buildingName) {
            toast.error('Vui lòng nhập tên tòa nhà khi đã nhập số phòng');
            return false;
        }

        if (formData.buildingName && !formData.roomNumber) {
            toast.error('Vui lòng nhập số phòng khi đã nhập tòa nhà');
            return false;
        }

        if (!formData.dueDate || !formData.paymentDeadline) {
            toast.error('Vui lòng nhập đầy đủ ngày đến hạn và hạn thanh toán');
            return false;
        }

        if (formData.items.some(item => !item.description || !item.amount)) {
            toast.error('Vui lòng nhập đầy đủ thông tin cho tất cả các khoản thu');
            return false;
        }

        if (formData.items.some(item => isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0)) {
            toast.error('Số tiền phải là số dương');
            return false;
        }

        return true;
    };    // Xử lý submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return; setLoading(true);
        try {
            // Only include either student code or room information, not both
            const submitData = {
                billingMonth: formData.billingMonth,
                billingYear: formData.billingYear,
                dueDate: formData.dueDate,
                paymentDeadline: formData.paymentDeadline,
                notes: formData.notes,
                studentCode: formData.studentCode ? formData.studentCode : null,
                roomNumber: formData.studentCode ? null : (formData.roomNumber || null),
                buildingName: formData.studentCode ? null : (formData.buildingName || null),
                items: formData.items.map(item => ({
                    ...item,
                    amount: parseFloat(item.amount)
                }))
            };

            console.log('Submit data:', submitData);
            console.log('Student Code:', submitData.studentCode);
            console.log('Room Number:', submitData.roomNumber);
            console.log('Building Name:', submitData.buildingName);

            if (isEditMode) {
                await invoiceService.updateInvoice(id, submitData);
                toast.success('Cập nhật hóa đơn thành công!');
            } else {
                await invoiceService.createInvoice(submitData);
                toast.success('Tạo hóa đơn thành công!');
            }

            navigate('/invoices');
        } catch (error) {
            console.error('Lỗi submit:', error);
            toast.error(error?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Options cho select
    const studentOptions = [
        { value: '', label: 'Chọn sinh viên' },
        ...students.map(student => ({
            value: student.id.toString(),
            label: `${student.fullName} (${student.studentId || 'N/A'})`
        }))
    ];

    const roomOptions = [
        { value: '', label: 'Chọn phòng' },
        ...rooms.map(room => ({
            value: room.id.toString(),
            label: `Phòng ${room.number} - ${room.building?.name || ''}`
        }))
    ];

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={() => navigate('/invoices')}
                    variant="outline"
                    icon={ArrowLeftIcon}
                >
                    Quay lại
                </Button>
                <h1 className="text-2xl font-semibold">
                    {isEditMode ? 'Chỉnh sửa hóa đơn' : 'Tạo hóa đơn mới'}
                </h1>
            </div>            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Thông tin cơ bản */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Mã sinh viên <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                value={formData.studentCode} onChange={(e) => {
                                    handleChange('studentCode', e.target.value);
                                    // Always clear room fields when entering student code
                                    handleChange('roomNumber', '');
                                    handleChange('buildingName', '');
                                }}
                                placeholder="Ví dụ: SV123456"
                                disabled={!!(formData.roomNumber && formData.buildingName)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Số phòng <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                value={formData.roomNumber} onChange={(e) => {
                                    handleChange('roomNumber', e.target.value);
                                    // Always clear student code when entering room number
                                    handleChange('studentCode', '');
                                }}
                                placeholder="Ví dụ: 101"
                                disabled={!!formData.studentCode}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Tòa nhà <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                value={formData.buildingName} onChange={(e) => {
                                    handleChange('buildingName', e.target.value);
                                    // Always clear student code when entering building name
                                    handleChange('studentCode', '');
                                }}
                                placeholder="Ví dụ: Tòa A"
                                disabled={!!formData.studentCode} />
                        </div>
                    </div>

                    {/* Thông tin thanh toán */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Tháng thanh toán <span className="text-red-500">*</span>
                            </label>                            <Select
                                value={formData.billingMonth.toString()}
                                onChange={(e) => handleChange('billingMonth', parseInt(e.target.value))}
                                options={Array.from({ length: 12 }, (_, i) => ({
                                    value: (i + 1).toString(),
                                    label: `Tháng ${i + 1}`
                                }))}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Năm thanh toán <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                value={formData.billingYear}
                                onChange={(e) => handleChange('billingYear', parseInt(e.target.value))}
                                min={2020}
                                max={2030}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Ngày đến hạn <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Hạn thanh toán <span className="text-red-500">*</span>
                            </label>                            <Input
                                type="date"
                                value={formData.paymentDeadline}
                                onChange={(e) => handleChange('paymentDeadline', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Ghi chú</label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={3}
                            placeholder="Nhập ghi chú (tùy chọn)"
                        />
                    </div>

                    {/* Các khoản thu */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Các khoản thu</h3>
                            <Button
                                type="button"
                                onClick={addItem}
                                icon={PlusIcon}
                                size="sm"
                            >
                                Thêm khoản
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Loại <span className="text-red-500">*</span>
                                        </label>                                        <Select
                                            value={item.type}
                                            onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                                            options={PAYMENT_TYPES}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-2">
                                            Mô tả <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            placeholder="Nhập mô tả"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-2">
                                                Số tiền <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                type="number"
                                                value={item.amount}
                                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                step="1000"
                                            />
                                        </div>                                        {formData.items.length > 1 && (
                                            <Button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                variant="outline"
                                                className="mt-7 text-red-600 hover:text-red-700"
                                                size="sm"
                                            >
                                                Xóa
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tổng tiền */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Tổng tiền:</span>
                                <span className="text-blue-600">
                                    {formData.items.reduce((total, item) => {
                                        const amount = parseFloat(item.amount) || 0;
                                        return total + amount;
                                    }, 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit buttons */}
                    <div className="flex gap-4 pt-6">
                        <Button
                            type="button"
                            onClick={() => navigate('/invoices')}
                            variant="outline"
                            className="flex-1"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Đang xử lý...' : (isEditMode ? 'Cập nhật' : 'Tạo hóa đơn')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceForm;
