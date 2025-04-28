export const resetPasswordTemplate = (name: string, resetLink: string) => `
<div style="text-align: center;">
  <h1>Reset Password</h1>
  <p>Hai ${name},</p>
  <p>Kami menerima permintaan untuk reset password akun Anda.</p>
  <p>Klik tombol di bawah ini untuk melanjutkan proses reset password:</p>
  
  <a href="${resetLink}" class="button" style="color: white;">
    Reset Password
  </a>
  
  <p style="margin-top: 20px;">
    Link ini akan kadaluarsa dalam 1 jam.
    Jika Anda tidak meminta reset password, abaikan email ini.
  </p>
  
  <p style="font-size: 12px; color: #666; margin-top: 30px;">
    Jika tombol tidak berfungsi, copy dan paste link berikut ke browser Anda:<br>
    <span style="color: #4f46e5;">${resetLink}</span>
  </p>
</div>
` 