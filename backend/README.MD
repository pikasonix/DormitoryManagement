BÁO CÁO TEST API

POST /auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}

{
  "email": "staff1@example.com",
  "password": "staff123"
}

{
  "email": "student1@example.com",
  "password": "student123"
}

Đã test 
    đúng thông tin
    sai thông tin
    thiếu trường
    tài khoản bị khoá (isActive = false)

GET /auth/me
Đã test 
    đúng token
    sai token
    không có token

