import express from 'express';

import authRoutes from './auth.routes';
import studentRoutes from './student.routes';
import amenityRoutes from './amenity.routes';
import paymentRoutes from './payment.routes';
import roomRoutes from './room.routes';
import buildingRoutes from './building.routes';
import maintenanceRoutes from './maintenance.routes';
import mediaRoutes from './media.routes';
import invoiceRoutes from './invoice.routes';
import studentInvoiceRoutes from './student-invoice.routes';
import utilityRoutes from './utility.routes';
import transferRoutes from './transfer.routes';
import vehicleRoutes from './vehicle.routes';
import dashboardRoutes from './dashboard.routes';
import feeRoutes from './fee.routes';
import vnpayRoutes from './vnpay';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'API base routes working',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/amenities', amenityRoutes);
router.use('/payments', paymentRoutes);
router.use('/rooms', roomRoutes);
router.use('/buildings', buildingRoutes);
router.use('/maintenances', maintenanceRoutes);
router.use('/media', mediaRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/student/invoices', studentInvoiceRoutes);
router.use('/utilities', utilityRoutes);
router.use('/transfers', transferRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/fees', feeRoutes);
router.use('/vnpay', vnpayRoutes);

export default router;