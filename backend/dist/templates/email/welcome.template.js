"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeTemplate = void 0;
const welcomeTemplate = (name) => `
<div style="text-align: center;">
  <h1>Chào Mừng Đến Với QUẢN LÝ KÍ TÚC XÁ!</h1>
  <p>Xin chào ${name},</p>
  <p>Cảm ơn bạn đã tham gia QUẢN LÝ KÍ TÚC XÁ. Tài khoản của bạn đã được tạo thành công.</p>
  
  <div style="margin: 30px 0;">
    <p>Bây giờ bạn có thể:</p>
    <ul style="list-style: none; padding: 0;">
      <li>✓ Truy cập bảng điều khiển quản trị</li>
      <li>✓ Quản lý dữ liệu</li>
      <li>✓ Và các tính năng khác</li>
    </ul>
  </div>

  <a href="${process.env.FRONTEND_URL}/login" class="button" style="color: white;">
    Đăng Nhập Vào Hệ Thống
  </a>
  
  <p style="margin-top: 30px; font-size: 14px; color: #666;">
    Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.
  </p>
</div>
`;
exports.welcomeTemplate = welcomeTemplate;
