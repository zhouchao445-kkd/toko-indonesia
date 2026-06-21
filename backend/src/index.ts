import express, { Express } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
import { corsMiddleware } from './middleware/cors';
import { requestLogger } from './middleware/logger';

// Routes - Admin (P2)
import adminRoutes from './routes/admin';

// Routes - Public API (P3-A)
import categoriesRoutes from './routes/categories';
import bannersRoutes from './routes/banners';
import popupsRoutes from './routes/popups';
import productsRoutes from './routes/products';
import settingsRoutes from './routes/settings';

// Routes - Member (P4-A)
import usersRoutes from './routes/users';
import authMemberRoutes from './routes/auth-member';
import cartRoutes from './routes/cart';
import ordersRoutes from './routes/orders';
import paymentProofsRoutes from './routes/payment-proofs';
import adminOrdersRoutes from './routes/admin-orders';

// Routes - Admin Management (P5-A)
import adminCategoriesRoutes from './routes/admin-categories';
import adminProductsRoutes from './routes/admin-products';
import adminShippingMethodsRoutes from './routes/admin-shipping-methods';
import adminSettingsRoutes from './routes/admin-settings';
import adminUploadRoutes from './routes/admin-upload';

// Routes - Admin P5-B
import adminPaymentProofsRoutes from './routes/admin-payment-proofs';
import adminReviewsRoutes from './routes/admin-reviews';
import adminMembersRoutes from './routes/admin-members';
import adminBalanceRoutes from './routes/admin-balance';

// Routes - Admin P5-C (Marketing + Finance + Support)
import adminCouponsRoutes from './routes/admin-coupons';
import adminBannersRoutes from './routes/admin-banners';
import adminPopupsRoutes from './routes/admin-popups';
import adminAdSchedulesRoutes from './routes/admin-ad-schedules';
import adminWithdrawalsRoutes from './routes/admin-withdrawals';
import adminFinancialRecordsRoutes from './routes/admin-financial-records';
import adminBankAccountsRoutes from './routes/admin-bank-accounts';
import adminConversationsRoutes from './routes/admin-conversations';
import adminMessagesRoutes from './routes/admin-messages';

// Routes - Admin P6 (Statistics)
import adminStatisticsRoutes from './routes/admin-statistics';

const app: Express = express();
const PORT = parseInt(process.env.BACKEND_PORT || '9000', 10);

// Upload directory configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const ABSOLUTE_UPLOAD_DIR = path.resolve(__dirname, '..', UPLOAD_DIR);

// Ensure upload directory exists
if (!fs.existsSync(ABSOLUTE_UPLOAD_DIR)) {
  fs.mkdirSync(ABSOLUTE_UPLOAD_DIR, { recursive: true });
}

// ── Global Middleware ──────────────────────────────────────────────
app.use(corsMiddleware);
app.use(express.json());
app.use(requestLogger);

// ── Static File Hosting for Uploads ────────────────────────────────
// Whitelist of allowed MIME types for uploaded files (P6 security fix)
// Only images and PDFs are allowed; other types return 403 Forbidden
const ALLOWED_UPLOAD_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf', // Payment proofs may be PDF
]);

app.use('/uploads', (req, res, next) => {
  // Only allow GET requests for serving files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine MIME type from file extension (since express.static hasn't run yet)
  const ext = path.extname(req.path).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  };

  const mime = mimeMap[ext];
  if (!mime || !ALLOWED_UPLOAD_MIMES.has(mime)) {
    return res.status(403).json({ error: 'File type not allowed' });
  }

  // Prevent directory traversal attacks
  if (req.path.includes('..')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}, express.static(ABSOLUTE_UPLOAD_DIR));

// ── Health Check ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: '@ecommerce/backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Admin Routes (P2) ─────────────────────────────────────────────
app.use('/api/admin', adminRoutes);

// ── Admin Orders Routes (P4-A) ─────────────────────────────────────
app.use('/api/admin/orders', adminOrdersRoutes);

// ── Admin Management Routes (P5-A) ─────────────────────────────────
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/products', adminProductsRoutes);
app.use('/api/admin/shipping-methods', adminShippingMethodsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/upload', adminUploadRoutes);

// ── Admin P5-B Routes ──────────────────────────────────────────────
app.use('/api/admin/payment-proofs', adminPaymentProofsRoutes);
app.use('/api/admin/reviews', adminReviewsRoutes);
app.use('/api/admin/members', adminMembersRoutes);
app.use('/api/admin/balance', adminBalanceRoutes);

// ── Admin P5-C Marketing Routes ─────────────────────────────────────
app.use('/api/admin/coupons', adminCouponsRoutes);
app.use('/api/admin/banners', adminBannersRoutes);
app.use('/api/admin/popups', adminPopupsRoutes);
app.use('/api/admin/ad-schedules', adminAdSchedulesRoutes);

// ── Admin P5-C Finance Routes ───────────────────────────────────────
app.use('/api/admin/withdrawals', adminWithdrawalsRoutes);
app.use('/api/admin/financial-records', adminFinancialRecordsRoutes);
app.use('/api/admin/bank-accounts', adminBankAccountsRoutes);

// ── Admin P5-C Support Routes ───────────────────────────────────────
app.use('/api/admin/conversations', adminConversationsRoutes);
app.use('/api/admin/conversations', adminMessagesRoutes);

// ── Admin Heartbeat (P5-C) ──────────────────────────────────────────
app.get('/api/admin/heartbeat', (_req, res) => {
  res.json({ server_time: new Date().toISOString(), status: 'ok' });
});

// ── Admin Statistics Routes (P6) ────────────────────────────────────
app.use('/api/admin/statistics', adminStatisticsRoutes);

// ── Public API Routes (P3-A) ──────────────────────────────────────
app.use('/api/categories', categoriesRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/popups', popupsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/settings', settingsRoutes);

// ── Member API Routes (P4-A) ──────────────────────────────────────
app.use('/api/users', usersRoutes);
app.use('/api/auth', authMemberRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/orders', paymentProofsRoutes); // Payment proofs are under /api/orders/:orderId/payment-proof

// ── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Backend] Health check: http://localhost:${PORT}/health`);
  console.log(`[Backend] Uploads dir:  ${ABSOLUTE_UPLOAD_DIR}`);
  console.log(`[Backend] Static files: http://localhost:${PORT}/uploads/*`);
  console.log(`[Backend] Admin API:    http://localhost:${PORT}/api/admin`);
  console.log(`[Backend] Member API:`);
  console.log(`  - POST /api/auth/register`);
  console.log(`  - POST /api/auth/login`);
  console.log(`  - GET  /api/auth/me`);
  console.log(`  - POST /api/auth/logout`);
  console.log(`  - GET  /api/users/me`);
  console.log(`  - PUT  /api/users/me`);
  console.log(`  - GET  /api/users/me/addresses`);
  console.log(`  - POST /api/users/me/addresses`);
  console.log(`  - PUT  /api/users/me/addresses/:id`);
  console.log(`  - DELETE /api/users/me/addresses/:id`);
  console.log(`  - GET  /api/cart`);
  console.log(`  - POST /api/cart`);
  console.log(`  - PUT  /api/cart/:itemId`);
  console.log(`  - DELETE /api/cart/:itemId`);
  console.log(`  - DELETE /api/cart`);
  console.log(`  - POST /api/orders`);
  console.log(`  - GET  /api/orders`);
  console.log(`  - GET  /api/orders/:id`);
  console.log(`  - POST /api/orders/:id/cancel`);
  console.log(`  - POST /api/orders/:orderId/payment-proof`);
});

// Export Prisma Client for use in other modules
export { prisma };

export default app;
