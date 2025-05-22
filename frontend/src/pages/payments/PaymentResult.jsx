import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vnpayService } from '../../services/vnpay.service';
import { Button } from '../../components/shared';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

/**
 * Trang hiển thị kết quả thanh toán VNPay.
 */
const PaymentResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const paymentStatus = queryParams.get('status');
    const paymentId = queryParams.get('paymentId');
    const responseCode = queryParams.get('responseCode');
    // Get raw VNPay return parameters
    const resultParams = {
        isVerified: queryParams.get('isVerified'),
        isSuccess: queryParams.get('isSuccess'),
        message: queryParams.get('message'),
        vnp_Amount: queryParams.get('vnp_Amount'),
        vnp_BankCode: queryParams.get('vnp_BankCode'),
        vnp_BankTranNo: queryParams.get('vnp_BankTranNo'),
        vnp_CardType: queryParams.get('vnp_CardType'),
        vnp_OrderInfo: queryParams.get('vnp_OrderInfo'),
        vnp_PayDate: queryParams.get('vnp_PayDate'),
        vnp_TransactionNo: queryParams.get('vnp_TransactionNo'),
        vnp_TransactionStatus: queryParams.get('vnp_TransactionStatus'),
        vnp_TxnRef: queryParams.get('vnp_TxnRef')
    };

    const [payment, setPayment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPaymentDetails = async () => {
            try {
                if (paymentId) {
                    const paymentData = await vnpayService.getPaymentDetails(paymentId);
                    setPayment(paymentData);
                } else {
                    // Nếu không có paymentId, thử lấy từ localStorage
                    const storedPaymentInfo = localStorage.getItem('vnpay_payment_info');
                    if (storedPaymentInfo) {
                        const paymentInfo = JSON.parse(storedPaymentInfo);
                        if (paymentInfo.payment_id) {
                            const paymentData = await vnpayService.getPaymentDetails(paymentInfo.payment_id);
                            setPayment(paymentData);
                        } else {
                            throw new Error('Không tìm thấy thông tin thanh toán');
                        }
                    } else {
                        throw new Error('Không tìm thấy thông tin thanh toán');
                    }
                }
            } catch (error) {
                console.error('Error fetching payment details:', error);
                setError('Không thể lấy thông tin thanh toán. Vui lòng kiểm tra trong lịch sử thanh toán của bạn.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPaymentDetails();
    }, [paymentId]);

    // Xóa thông tin thanh toán từ localStorage sau khi đã xử lý
    useEffect(() => {
        return () => {
            localStorage.removeItem('vnpay_payment_info');
        };
    }, []);    // Get any error message from the URL
    const errorMessage = queryParams.get('errorMessage');

    // Decode error message
    const getErrorDescription = (code, errorMsg) => {
        if (errorMsg === 'So_tien_khong_hop_le') return 'Số tiền thanh toán không hợp lệ';
        if (errorMsg === 'Giao_dich_bi_nghi_ngo_gian_lan') return 'Giao dịch bị nghi ngờ gian lận';
        if (errorMsg === 'The_hoac_TK_bi_khoa') return 'Thẻ/tài khoản bị khóa';
        if (errorMsg === 'Giao_dich_da_het_han') return 'Giao dịch đã hết hạn';
        if (errorMsg === 'Giao_dich_bi_huy') return 'Giao dịch bị hủy';
        if (errorMsg === 'Khach_hang_huy_giao_dich') return 'Khách hàng đã hủy giao dịch';
        if (errorMsg === 'Loi_thanh_toan') return 'Lỗi trong quá trình thanh toán';

        // If no specific error message, check response code
        if (code === '72') return 'Số tiền thanh toán không hợp lệ';
        if (code === '07') return 'Giao dịch bị nghi ngờ gian lận';
        if (code === '09') return 'Thẻ/tài khoản bị khóa';
        if (code === '11') return 'Giao dịch đã hết hạn';
        if (code === '12') return 'Giao dịch bị hủy';
        if (code === '24') return 'Khách hàng đã hủy giao dịch';

        return 'Giao dịch không thành công';
    };

    // Render icon và message dựa trên status
    const renderStatusInfo = () => {
        if (paymentStatus === 'success' || responseCode === '00') {
            return {
                icon: <CheckCircleIcon className="h-16 w-16 text-green-500" />,
                title: 'Thanh toán thành công!',
                message: 'Giao dịch của bạn đã được xử lý thành công.',
                titleColor: 'text-green-600'
            };
        } else if (paymentStatus === 'error') {
            return {
                icon: <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />,
                title: 'Lỗi xử lý thanh toán!',
                message: 'Đã xảy ra lỗi trong quá trình xử lý thanh toán của bạn.',
                titleColor: 'text-yellow-600'
            };
        } else {
            // Get detailed error description
            const errorDetail = getErrorDescription(responseCode, errorMessage);

            return {
                icon: <XCircleIcon className="h-16 w-16 text-red-500" />,
                title: 'Thanh toán thất bại!',
                message: `${errorDetail} (Mã lỗi: ${responseCode || 'N/A'})`,
                titleColor: 'text-red-600'
            };
        }
    };

    const statusInfo = renderStatusInfo();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="link"
                    onClick={() => navigate('/invoices')}
                    icon={ArrowLeftIcon}
                    className="text-sm mb-4"
                >
                    Quay lại danh sách hóa đơn
                </Button>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b flex flex-col items-center">
                        {statusInfo.icon}
                        <h1 className={`mt-4 text-2xl font-semibold ${statusInfo.titleColor}`}>{statusInfo.title}</h1>
                        <p className="mt-1 text-gray-600">{statusInfo.message}</p>
                    </div>

                    {/* Payment Info */}
                    {isLoading ? (
                        <div className="flex justify-center p-10">
                            <LoadingSpinner text="Đang tải thông tin thanh toán..." />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center">
                            <p className="text-red-500">{error}</p>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/invoices')}
                                className="mt-4"
                            >
                                Xem danh sách hóa đơn
                            </Button>
                        </div>
                    ) : payment ? (
                        <>
                            {/* Raw VNPay result details */}
                            <div className="p-6 border-t">
                                <h2 className="text-lg font-semibold mb-4">Chi tiết VNPay</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(resultParams).map(([key, value]) => (
                                        <div key={key}>
                                            <p className="text-sm font-medium text-gray-500">{key}</p>
                                            <p className="text-gray-900">{value || 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-sm text-gray-500">Mã giao dịch</p>
                                        <p className="font-mono">{payment.transactionCode || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Ngày thanh toán</p>
                                        <p>{payment.paymentDate ? format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Số tiền</p>
                                        <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phương thức thanh toán</p>
                                        <p>{payment.paymentMethod}</p>
                                    </div>
                                </div>

                                {payment.invoice && (
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-sm text-gray-500 mb-2">Thông tin hóa đơn</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Mã hóa đơn</p>
                                                <p className="font-mono">{payment.invoice.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Tổng tiền hóa đơn</p>
                                                <p>{formatCurrency(payment.invoice.totalAmount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Trạng thái hóa đơn</p>
                                                <p className={`${payment.invoice.status === 'PAID' ? 'text-green-600' : payment.invoice.status === 'PARTIALLY_PAID' ? 'text-blue-600' : 'text-red-600'}`}>
                                                    {payment.invoice.status}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {payment.studentProfile && (
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-sm text-gray-500 mb-2">Thông tin sinh viên</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Mã sinh viên</p>
                                                <p className="font-mono">{payment.studentProfile.studentId}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Họ và tên</p>
                                                <p>{payment.studentProfile.fullName}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            Không tìm thấy thông tin thanh toán
                        </div>
                    )}

                    {/* Actions */}
                    <div className="p-6 border-t bg-gray-50 flex justify-between">
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/invoices')}
                        >
                            Quay lại danh sách hóa đơn
                        </Button>
                        {payment && (
                            <Button
                                variant="primary"
                                onClick={() => navigate('/payments')}
                            >
                                Xem lịch sử thanh toán
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentResult;
