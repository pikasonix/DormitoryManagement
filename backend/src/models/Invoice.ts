import prisma from '../lib/prisma';
import { Invoice as PrismaInvoice, InvoiceStatus, Payment as PrismaPayment } from '@prisma/client';

// Re-export Prisma's Invoice type to maintain compatibility
type Invoice = PrismaInvoice;
type Payment = PrismaPayment;

// Create wrapper functions to simulate Sequelize-like behavior if needed
const Invoice = {
    // Compatibility methods if needed
    findByPk: async (id: number): Promise<Invoice | null> => {
        return await prisma.invoice.findUnique({
            where: { id }
        });
    },

    findAll: async (options?: any): Promise<Invoice[]> => {
        const where = options?.where || {};
        return await prisma.invoice.findMany({
            where,
            include: options?.include
        });
    },

    create: async (data: any): Promise<Invoice> => {
        return await prisma.invoice.create({
            data
        });
    },

    update: async (data: any, options: any): Promise<Invoice> => {
        return await prisma.invoice.update({
            where: options.where,
            data
        });
    }
};

export default Invoice;
