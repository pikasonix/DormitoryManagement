import prisma from '../lib/prisma';
import { Payment as PrismaPayment } from '@prisma/client';

// Re-export Prisma's Payment type to maintain compatibility
type Payment = PrismaPayment;

// Create wrapper functions to simulate Sequelize-like behavior if needed
const Payment = {
    // Compatibility methods if needed
    findByPk: async (id: number): Promise<Payment | null> => {
        return await prisma.payment.findUnique({
            where: { id }
        });
    },

    findAll: async (options?: any): Promise<Payment[]> => {
        const where = options?.where || {};
        return await prisma.payment.findMany({
            where,
            include: options?.include
        });
    },

    create: async (data: any): Promise<Payment> => {
        // Convert from Sequelize format to Prisma format
        const prismaData = {
            invoiceId: data.invoice_id,
            studentProfileId: data.student_id,
            amount: data.amount,
            paymentMethod: data.payment_method,
            transactionCode: data.transaction_id || '',
            paymentDate: data.payment_date || new Date(),
            notes: typeof data.payment_details === 'object'
                ? JSON.stringify(data.payment_details)
                : data.payment_details || null
        };

        return await prisma.payment.create({
            data: prismaData
        });
    },

    update: async (instance: any, data: any): Promise<Payment> => {
        // For compatibility with Sequelize's instance.update() pattern
        if (instance.id) {
            return await prisma.payment.update({
                where: { id: instance.id },
                data: {
                    transactionCode: data.transaction_id || data.transactionCode || instance.transactionCode,
                    paymentMethod: data.payment_method || data.paymentMethod || instance.paymentMethod,
                    notes: data.notes || instance.notes
                }
            });
        } else {
            throw new Error('Invalid payment instance for update');
        }
    }
};

export default Payment;
