"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordChangedTemplate = void 0;
const passwordChangedTemplate = (name) => `
<div style="text-align: center;">
  <h1>Đổi Mật Khẩu Thành Công</h1>
  <p>Xin chào ${name},</p>
  <p>Mật khẩu tài khoản của bạn trên QUẢN LÝ KÍ TÚC XÁ đã được thay đổi thành công.</p>
  
  <p style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
    Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với quản trị viên ngay lập tức.
  </p>

  <a href="${process.env.FRONTEND_URL}/login" class="button" style="color: white;">
    Đăng Nhập Vào Hệ Thống
  </a>
  
  <p style="margin-top: 30px; font-size: 14px; color: #666;">
    Email này được gửi để đảm bảo an toàn cho tài khoản của bạn.
  </p>
</div>
`;
exports.passwordChangedTemplate = passwordChangedTemplate;
