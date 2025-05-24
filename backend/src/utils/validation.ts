/**
 * Kiểm tra xem thông tin sinh viên có đầy đủ không
 * @param studentProfile Object chứa thông tin sinh viên
 * @returns Boolean cho biết thông tin đã đầy đủ hay chưa
 */
export const isStudentProfileComplete = (studentProfile: any): boolean => {
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
