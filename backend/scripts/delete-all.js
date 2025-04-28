const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllData() {
  try {
    console.log('Starting deletion process...');

    // Delete all bookings first
    console.log('Deleting bookings...');
    await prisma.booking.deleteMany({});

    // Delete all payments
    console.log('Deleting payments...');
    await prisma.payment.deleteMany({});

    // Delete all documents
    console.log('Deleting documents...');
    await prisma.document.deleteMany({});

    // Finally delete all residents
    console.log('Deleting residents...');
    await prisma.resident.deleteMany({});

    console.log('All data deleted successfully!');
  } catch (error) {
    console.error('Error deleting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllData(); 