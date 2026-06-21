/**
 * Admin reviews management routes
 * Handles review listing and moderation
 */
import { Router, Request, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

/**
 * GET /api/admin/reviews
 * Get reviews list with filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, productId, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }

    if (productId) {
      params.push(productId);
      whereClause += ` AND r.product_id = $${params.length}`;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM reviews r ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get reviews
    const reviewsResult = await query(
      `SELECT r.id, r.user_id, r.product_id, r.order_id, r.rating, r.content, r.images,
        r.status, r.created_at, r.updated_at,
        u.phone as user_phone, u.nickname as user_nickname,
        p.name as product_name, p.main_image as product_image
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset]
    );

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: '获取评价列表失败' });
  }
});

/**
 * GET /api/admin/reviews/:id
 * Get review detail
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = req.params.id;

    const reviewResult = await query(
      `SELECT r.*, u.phone as user_phone, u.nickname as user_nickname,
        p.name as product_name, p.main_image as product_image
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: '评价不存在' });
    }

    res.json({
      success: true,
      data: reviewResult.rows[0],
    });
  } catch (error) {
    console.error('Get review detail error:', error);
    res.status(500).json({ error: '获取评价详情失败' });
  }
});

/**
 * POST /api/admin/reviews/:id/approve
 * Approve review
 */
router.post('/:id/approve', requirePermission('products', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const reviewId = req.params.id;

    // Check permissions
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.permissions.some((p) => p.module === 'reviews' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核评价' });
    }

    // Get review
    const reviewResult = await query(
      'SELECT id, status FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: '评价不存在' });
    }

    const review = reviewResult.rows[0];

    if (review.status === 'approved') {
      return res.status(400).json({ error: '评价已通过' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update review status
      await client.query(
        "UPDATE reviews SET status = 'approved', updated_at = NOW() WHERE id = $1",
        [reviewId]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'approve_review',
        target_type: 'review',
        target_id: reviewId as string,
        before_data: { status: review.status },
        after_data: { status: 'approved' },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '评价已通过',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

/**
 * POST /api/admin/reviews/:id/reject
 * Reject review
 */
router.post('/:id/reject', requirePermission('products', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const reviewId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: '拒绝原因不能为空' });
    }

    // Check permissions
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.permissions.some((p) => p.module === 'reviews' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核评价' });
    }

    // Get review
    const reviewResult = await query(
      'SELECT id, status FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: '评价不存在' });
    }

    const review = reviewResult.rows[0];

    if (review.status === 'rejected') {
      return res.status(400).json({ error: '评价已驳回' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update review status
      await client.query(
        "UPDATE reviews SET status = 'rejected', updated_at = NOW() WHERE id = $1",
        [reviewId]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'reject_review',
        target_type: 'review',
        target_id: reviewId as string,
        before_data: { status: review.status },
        after_data: { status: 'rejected', reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '评价已驳回',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

export default router;
