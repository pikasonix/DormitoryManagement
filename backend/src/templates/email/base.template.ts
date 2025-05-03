export const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background: #f0f4f8;
      border-radius: 8px;
      border-bottom: 3px solid #4f46e5;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 15px;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      padding: 20px 0;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://your-domain.com/logo.png" alt="QUẢN LÝ KÍ TÚC XÁ" class="logo">
    <h2>QUẢN LÝ KÍ TÚC XÁ</h2>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} QUẢN LÝ KÍ TÚC XÁ. Đã đăng ký bản quyền.</p>
    <p>Nếu bạn không yêu cầu email này, vui lòng bỏ qua.</p>
  </div>
</body>
</html>
`