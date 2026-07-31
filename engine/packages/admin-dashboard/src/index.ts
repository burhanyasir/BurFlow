import { Router } from 'express';
import dashboardRoutes from './routes/dashboard';

const router = Router();

// Mount admin dashboard routes under /admin-dashboard
router.use('/admin-dashboard', dashboardRoutes);

export default router;
