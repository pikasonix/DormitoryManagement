import prisma from '../lib/prisma';
import { StudentProfile } from '@prisma/client';

// Re-export Prisma's StudentProfile type as Student for compatibility
type Student = StudentProfile;

// Create wrapper functions to simulate Sequelize-like behavior if needed
const Student = {
    // Compatibility methods if needed
    findByPk: async (id: number): Promise<Student | null> => {
        return await prisma.studentProfile.findUnique({
            where: { id }
        });
    },

    findOne: async (options?: any): Promise<Student | null> => {
        const where = options?.where || {};
        return await prisma.studentProfile.findFirst({
            where,
            include: options?.include
        });
    },

    findAll: async (options?: any): Promise<Student[]> => {
        const where = options?.where || {};
        return await prisma.studentProfile.findMany({
            where,
            include: options?.include
        });
    },
    create: async (data: any): Promise<Student> => {
        // Map Sequelize-style fields to Prisma fields if needed
        return await prisma.studentProfile.create({
            data: {
                // Map required fields for StudentProfile
                fullName: data.name,
                studentId: data.student_code,
                userId: data.user_id, // Required field
                phoneNumber: data.phone,
                // Add required fields from StudentProfile schema
                gender: 'MALE', // Default value, should be updated
                birthDate: new Date(), // Default value, should be updated
                identityCardNumber: data.identity_card_number || `DEFAULT-${Date.now()}`,
                faculty: data.faculty || 'DEFAULT',
                courseYear: data.course_year || 2023,
                startDate: new Date(),
                contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // Default 1 year contract
            }
        });
    }
};

export default Student;
