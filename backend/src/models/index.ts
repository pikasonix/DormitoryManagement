import Student from './Student';
import Invoice from './Invoice';
import Payment from './Payment';

// Lưu ý: Mối quan hệ trong Prisma được thiết lập trong schema.prisma
// Không cần thiết lập mối quan hệ ở đây như trong Sequelize

export {
    Student,
    Invoice,
    Payment
};
