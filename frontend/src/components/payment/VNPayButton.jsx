import React, { useState } from 'react';
import { Button } from '../shared';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import { vnpayService } from '../../services/vnpay.service';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

/**
 * Nút thanh toán VNPay để thanh toán hóa đơn trực tuyến.
 */
const VNPayButton = ({ invoiceId, disabled, size = 'md', className = '' }) => {
    const [isLoading, setIsLoading] = useState(false); const handlePayVNPay = async () => {
        try {
            setIsLoading(true);

            // Hiển thị thông báo đang xử lý thanh toán
            toast.loading('Đang kết nối đến cổng thanh toán...', { id: 'vnpay-loading' });

            // Gọi API tạo URL thanh toán VNPay
            const result = await vnpayService.getPaymentUrl(invoiceId);

            if (result.paymentUrl) {
                // Xóa toast loading
                toast.dismiss('vnpay-loading');

                // Lưu thông tin thanh toán vào localStorage để kiểm tra khi quay lại
                localStorage.setItem('vnpay_payment_info', JSON.stringify({
                    payment_id: result.payment_id,
                    transaction_id: result.transaction_id,
                    invoice_id: invoiceId,
                    timestamp: Date.now()
                }));

                // Thông báo thành công
                toast.success('Đang chuyển đến trang thanh toán...');

                // Chuyển hướng người dùng đến trang thanh toán VNPay sau một chút để người dùng thấy thông báo
                setTimeout(() => {
                    window.location.href = result.paymentUrl;
                }, 500);
            } else {
                toast.dismiss('vnpay-loading');
                toast.error('Không thể tạo liên kết thanh toán.');
            }
        } catch (error) {
            console.error('Lỗi khi tạo thanh toán VNPay:', error);
            toast.dismiss('vnpay-loading');

            // Hiển thị thông báo lỗi từ server hoặc thông báo mặc định
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Đã xảy ra lỗi khi kết nối với cổng thanh toán.';

            // Kiểm tra nếu là lỗi chuyển hướng đến trang lỗi VNPay
            // Ví dụ nếu URL chứa "code=72" - lỗi số tiền không hợp lệ
            if (error.message && error.message.includes('code=72')) {
                toast.error('Số tiền thanh toán không hợp lệ (Mã lỗi: 72). Vui lòng liên hệ quản trị viên!');
                console.error('VNPay Error Code 72: Số tiền thanh toán không hợp lệ');
            } else if (error.message && error.message.includes('code=')) {
                // Trích xuất mã lỗi
                const codeMatch = error.message.match(/code=(\d+)/);
                const errorCode = codeMatch ? codeMatch[1] : 'unknown';
                toast.error(`Lỗi thanh toán VNPay (Mã lỗi: ${errorCode}). Vui lòng liên hệ quản trị viên!`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="primary"
            icon={<CreditCardIcon className="h-5 w-5" />}
            onClick={handlePayVNPay}
            isLoading={isLoading}
            disabled={disabled || isLoading}
            size={size}
            className={`bg-green-600 hover:bg-green-700 ${className}`}
        >
            Thanh toán VNPay
        </Button>
    );
};

VNPayButton.propTypes = {
    /** ID của hóa đơn cần thanh toán */
    invoiceId: PropTypes.number.isRequired,
    /** Trạng thái disabled của nút */
    disabled: PropTypes.bool,
    /** Kích thước của nút: sm, md, lg */
    size: PropTypes.string,
    /** CSS classes bổ sung */
    className: PropTypes.string
};

export default VNPayButton;
