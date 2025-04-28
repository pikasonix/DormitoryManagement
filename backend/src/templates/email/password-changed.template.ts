export const passwordChangedTemplate = (name: string) => `
<div style="text-align: center;">
  <h1>Password Berhasil Diubah</h1>
  <p>Hai ${name},</p>
  <p>Password akun Anda di QUẢN LÝ KÍ TÚC XÁ telah berhasil diubah.</p>
  
  <p style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
    Jika Anda tidak melakukan perubahan ini, segera hubungi administrator.
  </p>

  <a href="${process.env.FRONTEND_URL}/login" class="button" style="color: white;">
    Masuk ke Dashboard
  </a>
  
  <p style="margin-top: 30px; font-size: 14px; color: #666;">
    Email ini dikirim untuk keamanan akun Anda.
  </p>
</div>
` 