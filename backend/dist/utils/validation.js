"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStudentProfileComplete = void 0;
/**
 * Kiểm tra xem thông tin sinh viên có đầy đủ không
 * @param studentProfile Object chứa thông tin sinh viên
 * @returns Boolean cho biết thông tin đã đầy đủ hay chưa
 */
const isStudentProfileComplete = (studentProfile) => {
    // Các trường thông tin bắt buộc cần đầy đủ để xem là đã cập nhật
    const requiredFields = [
        'fullName',
        'studentId',
        'phoneNumber',
        'birthDate',
        'identityCardNumber',
        'faculty',
        'permanentAddress',
        'emergencyContactPhone'
    ];
    // Kiểm tra từng trường bắt buộc
    for (const field of requiredFields) {
        if (!studentProfile[field]) {
            return false;
        }
    }
    return true;
};
exports.isStudentProfileComplete = isStudentProfileComplete;
