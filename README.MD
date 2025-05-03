# Dormitory Management System

## Hướng dẫn cài đặt

### 1. Cài đặt môi trường
- Cài đặt NodeJS (recommend v22.11.0)
- Cài đặt PostgreSQL

### 2. Cài đặt các thư viện
```bash
# Backend
cd backend
npm i

# Frontend
cd frontend
npm i
```

### 3. Cấu hình cơ sở dữ liệu
- Tạo database PostgreSQL (recommend):
  - User: postgres
  - Password: admin
  - Database: postgres
  - Host/Port: localhost:5432
- Sửa nội dung file `.env` ở backend:
> **Lưu ý**: đã làm theo recommend thì không cần sửa file .env
```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<database>"
```

### 4. Cài đặt dữ liệu mẫu
```bash
npx prisma generate       # Tạo Prisma client
npx prisma db push        # Tạo schema trong database
npx prisma db seed        # Chạy seed tạo dữ liệu mẫu
```

> Xem database bằng cách chạy `npx prisma studio` hoặc truy cập trực tiếp PostgreSQL

### 5. Chạy ứng dụng
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

### Đường dẫn mặc định
- Frontend: http://localhost:5173
- Backend: http://localhost:5002




## Cấu trúc dự án

### Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL với Prisma ORM

### Cấu trúc Backend

```
backend/
├── prisma/                 # Prisma ORM configuration
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seed data
│   └── migrations/         # Database migrations
├── src/
│   ├── app.ts              # Express application setup
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware
│   ├── routes/             # API routes
│   ├── schemas/            # Data validation schemas
│   ├── services/           # Business logic
│   ├── templates/          # Email templates
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── uploads/                # Uploaded files storage
├── Dockerfile              # Docker configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

#### Chức năng chính Backend:
- **Authentication & Authorization**: Quản lý đăng nhập và phân quyền người dùng
- **CRUD API**: API cho tất cả các đối tượng (sinh viên, phòng, tòa nhà, hóa đơn...)
- **File Upload**: Xử lý tải lên và lưu trữ hình ảnh, tài liệu
- **Email Services**: Gửi thông báo, hóa đơn qua email
- **Report Generation**: Tạo báo cáo và thống kê

### Cấu trúc Frontend (React + Vite + TailwindCSS)

```
frontend/
├── public/                # Static assets
├── src/
│   ├── api/               # API clients
│   ├── assets/            # Images, fonts, etc.
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # Page layout components
│   ├── pages/             # Page components
│   ├── services/          # Service modules
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main application component
│   ├── index.css          # Global styles
│   └── main.jsx           # Entry point
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # TailwindCSS configuration
└── vite.config.ts         # Vite configuration
```

#### Chức năng chính Frontend:
- **Dashboard**: Giao diện quản trị tổng quan
- **User Management**: Quản lý người dùng (sinh viên, nhân viên, admin)
- **Room Management**: Quản lý phòng và tòa nhà
- **Invoice & Billing**: Quản lý hóa đơn và thanh toán
- **Reports & Analytics**: Báo cáo và phân tích dữ liệu
- **Maintenance Requests**: Quản lý yêu cầu bảo trì
- **Responsive Design**: Thiết kế tương thích trên nhiều thiết bị
