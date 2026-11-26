import { Router } from 'express';
import mongoose from 'mongoose';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import authRoutes from '../modules/auth/auth.routes';
import budgetsRoutes from '../modules/budgets/budgets.routes';
import expensesRoutes from '../modules/expenses/expenses.routes';
import fuelRoutes from '../modules/fuel/fuel.routes';
import maintenanceRoutes from '../modules/maintenance/maintenance.routes';
import tripsRoutes from '../modules/trips/trips.routes';
import usersRoutes from '../modules/users/users.routes';
import vehiclesRoutes from '../modules/vehicles/vehicles.routes';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  sendSuccess(
    res,
    {
      service: 'vehixa-backend',
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    'Health check passed',
  );
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/trips', tripsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/fuel', fuelRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/budgets', budgetsRoutes);

export default router;
