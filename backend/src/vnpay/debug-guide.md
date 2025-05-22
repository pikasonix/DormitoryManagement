// Cập nhật tháng 5/2024
// File hướng dẫn debug lỗi mã 72 VNPay

// Lỗi mã 72 thường xảy ra khi định dạng số tiền không đúng, đặc biệt là 
// khi có dấu thập phân (decimal). VNPay yêu cầu số tiền là số nguyên đơn vị đồng.

// I. NGUYÊN NHÂN
// 1. Số tiền có thể là chuỗi có phần thập phân: "467915.27"
// 2. Số tiền có thể là Decimal từ Prisma
// 3. Format số tiền không đúng khi gửi đến VNPay

// II. CÁCH KHẮC PHỤC
// 1. Xử lý chung cho các kiểu dữ liệu
//    - Chuyển về số bỏ phần thập phân: Math.floor()
//    - Đảm bảo nhất quán giữa khi tạo URL và khi verify callback

// 2. Kiểm tra kĩ định dạng
//    - Log số tiền ở mọi bước xử lý
//    - Đảm bảo không lỗi kiểu dữ liệu

// 3. Các trường hợp cụ thể
//    - Với các số tiền như "467915.27", cần dùng parseFloat() và Math.floor()
//    - Với chuỗi có thể có dấu phẩy "467,915.27", cần xóa dấu phẩy trước

// III. BẢNG MÃ LỖI VNPAY THƯỜNG GẶP
// 00: Giao dịch thành công
// 07: Giao dịch bị nghi ngờ gian lận
// 09: Thẻ/Tài khoản bị khóa
// 10: Xác thực thông tin thẻ sai
// 11: Đã hết hạn chờ thanh toán
// 12: Giao dịch bị hủy
// 24: Giao dịch không thành công
// 72: Số tiền không hợp lệ
// 99: Lỗi không xác định

// IV. LƯU Ý QUAN TRỌNG
// Với số tiền trong hóa đơn luôn xử lý để đảm bảo:
// 1. Đúng kiểu dữ liệu
// 2. Đúng format theo yêu cầu VNPay
// 3. Log đủ thông tin để debug
