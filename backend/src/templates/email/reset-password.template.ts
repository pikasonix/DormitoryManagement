export const resetPasswordTemplate = (name: string, resetLink: string) => `
<div style="text-align: center;">
  <h1>Đặt Lại Mật Khẩu</h1>
  <p>Xin chào ${name},</p>
  <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu tài khoản của bạn.</p>
  <p>Vui lòng nhấp vào nút bên dưới để tiếp tục quá trình đặt lại mật khẩu:</p>
  
  <a href="${resetLink}" class="button" style="color: white;">
    Đặt Lại Mật Khẩu
  </a>
  
  <p style="margin-top: 20px;">
    Liên kết này sẽ hết hạn trong vòng 1 giờ.
    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
  </p>
  
  <p style="font-size: 12px; color: #666; margin-top: 30px;">
    Nếu nút không hoạt động, vui lòng sao chép và dán liên kết sau vào trình duyệt của bạn:<br>
    <span style="color: #4f46e5;">${resetLink}</span>
  </p>
</div>
`