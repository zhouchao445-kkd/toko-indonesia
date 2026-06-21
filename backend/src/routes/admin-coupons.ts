/**
 * Admin Coupons Routes (P5-C)
 * GET    /api/admin/coupons          — List (filter: status/type/time/page)
 * GET    /api/admin/coupons/:id      — Detail
 * POST   /api/admin/coupons          — Create
 * PUT    /api/admin/coupons/:id      — Update
 * DELETE /api/admin/coupons/:id      — Soft delete (status='inactive')
 * GET    /api/admin/coupons/:id/stats — Usage stats
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/coupons
 * List coupons with filters
 */
router.get('/', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Status filter
    if (req.query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(req.query.status);
    }

    // Type filter
    if (req.query.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(req.query.type);
    }

    // Search by code
    if (req.query.search) {
      conditions.push(`code ILIKE $${paramIndex++}`);
      params.push(`%${req.query.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM coupons ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT * FROM coupons ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      coupons: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing coupons:', error);
    res.status(500).json({ error: 'Failed to list coupons' });
  }
});

/**
 * GET /api/admin/coupons/:id
 * Get coupon detail
 */
router.get('/:id', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM coupons WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ coupon: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error getting coupon:', error);
    res.status(500).json({ error: 'Failed to get coupon' });
  }
});

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
router.post('/', requirePermission('marketing', 'can_create'), async (req: Request, res: Response) => {
  try {
    const {
      code, type, value, min_order_amount, max_discount,
      usage_limit, valid_from, valid_until, status
    } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'code, type, and value are required' });
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'type must be percentage or fixed' });
    }

    // Check code uniqueness
    const existing = await query('SELECT id FROM coupons WHERE code = $1', [code.toUpperCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    const result = await query(
      `INSERT INTO coupons (code, type, value, min_order_amount, max_discount, usage_limit, used_count, valid_from, valid_until, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        code.toUpperCase(), type, value,
        min_order_amount || 0, max_discount || null,
        usage_limit || null, valid_from || null, valid_until || null,
        status || 'active'
      ]
    );

    const coupon = result.rows[0];

    await logOperation({
      admin_id: req.admin!.id,
      action: 'create',
      target_type: 'coupon',
      target_id: coupon.id,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({ coupon });
  } catch (error: unknown) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * PUT /api/admin/coupons/:id
 * Update coupon
 */
router.put('/:id', requirePermission('marketing', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code, type, value, min_order_amount, max_discount,
      usage_limit, valid_from, valid_until, status
    } = req.body;

    const existing = await query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check code uniqueness if changing
    if (code && code.toUpperCase() !== existing.rows[0].code) {
      const dup = await query('SELECT id FROM coupons WHERE code = $1 AND id != $2', [code.toUpperCase(), id]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
    }

    const result = await query(
      `UPDATE coupons SET
        code = COALESCE($1, code),
        type = COALESCE($2, type),
        value = COALESCE($3, value),
        min_order_amount = COALESCE($4, min_order_amount),
        max_discount = COALESCE($5, max_discount),
        usage_limit = COALESCE($6, usage_limit),
        valid_from = COALESCE($7, valid_from),
        valid_until = COALESCE($8, valid_until),
        status = COALESCE($9, status),
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        code ? code.toUpperCase() : null, type, value,
        min_order_amount, max_discount, usage_limit,
        valid_from, valid_until, status, id
      ]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'coupon',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ coupon: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

/**
 * DELETE /api/admin/coupons/:id
 * Soft delete coupon
 */
router.delete('/:id', requirePermission('marketing', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE coupons SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    await logOperation({
      admin_id: req.admin!.id,
      action: 'delete',
      target_type: 'coupon',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

/**
 * GET /api/admin/coupons/:id/stats
 * Usage statistics for a coupon
 */
router.get('/:id/stats', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const couponResult = await query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (couponResult.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const coupon = couponResult.rows[0];

    // Get usage count from orders that used this coupon
    const usageResult = await query(
      `SELECT COUNT(*) as usage_count, COALESCE(SUM(discount_amount), 0) as total_discount
       FROM orders WHERE coupon_id = $1`,
      [id]
    );

    res.json({
      stats: {
        coupon_id: id,
        code: coupon.code,
        used_count: parseInt(usageResult.rows[0].usage_count) || coupon.used_count || 0,
        total_discount: parseFloat(usageResult.rows[0].total_discount) || 0,
        usage_limit: coupon.usage_limit,
        remaining: coupon.usage_limit ? coupon.usage_limit - (coupon.used_count || 0) : null
      }
    });
  } catch (error: unknown) {
    console.error('Error getting coupon stats:', error);
    res.status(500).json({ error: 'Failed to get coupon stats' });
  }
});

/**
 * POST /api/admin/coupons/:id/issue
 * Issue coupon to specific members or all active members
 */
router.post('/:id/issue', requirePermission('marketing', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { memberIds, issueToAll } = req.body;

    // Verify coupon exists
    const couponResult = await query('SELECT * FROM coupons WHERE id = $1 AND status = $2', [id, 'active']);
    if (couponResult.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found or inactive' });
    }

    const coupon = couponResult.rows[0];

    // Check if coupon has usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Coupon has reached usage limit' });
    }

    let targetMemberIds: string[] = [];

    if (issueToAll) {
      // Get all active members
      const membersResult = await query(
        "SELECT id FROM users WHERE status = 'active'",
        []
      );
      targetMemberIds = membersResult.rows.map((r: { id: string }) => r.id);
    } else if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      targetMemberIds = memberIds;
    } else {
      return res.status(400).json({ error: 'memberIds array or issueToAll flag is required' });
    }

    // Issue coupon to each member
    const issuedResults = [];
    for (const memberId of targetMemberIds) {
      // Check if member already has this coupon
      const existingResult = await query(
        'SELECT id FROM user_coupons WHERE user_id = $1 AND coupon_id = $2',
        [memberId, id]
      );

      if (existingResult.rows.length === 0) {
        const issueResult = await query(
          `INSERT INTO user_coupons (user_id, coupon_id, status, created_at, updated_at)
           VALUES ($1, $2, 'unused', NOW(), NOW())
           RETURNING *`,
          [memberId, id]
        );
        issuedResults.push(issueResult.rows[0]);
      }
    }

    // Update coupon used_count
    await query(
      'UPDATE coupons SET used_count = used_count + $1, updated_at = NOW() WHERE id = $2',
      [issuedResults.length, id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'issue_coupon',
      target_type: 'coupon',
      target_id: id as string,
      details: { issued_count: issuedResults.length, member_count: targetMemberIds.length },
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({
      message: `Coupon issued successfully`,
      issued_count: issuedResults.length,
      total_members: targetMemberIds.length
    });
  } catch (error: unknown) {
    console.error('Error issuing coupon:', error);
    res.status(500).json({ error: 'Failed to issue coupon' });
  }
});

/**
 * GET /api/admin/coupons/:id/usage
 * Detailed usage statistics for a coupon
 */
router.get('/:id/usage', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get coupon details
    const couponResult = await query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (couponResult.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const coupon = couponResult.rows[0];

    // Get issued count (user_coupons)
    const issuedResult = await query(
      'SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = $1',
      [id]
    );
    const issuedCount = parseInt(issuedResult.rows[0].count) || 0;

    // Get used count
    const usedResult = await query(
      "SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = $1 AND status = 'used'",
      [id]
    );
    const usedCount = parseInt(usedResult.rows[0].count) || 0;

    // Get unused count
    const unusedCount = issuedCount - usedCount;

    // Calculate conversion rate
    const conversionRate = issuedCount > 0 ? ((usedCount / issuedCount) * 100).toFixed(2) : '0';

    // Get recent 10 usage records
    const recentUsageResult = await query(
      `SELECT uc.*, u.username, u.email, u.phone
       FROM user_coupons uc
       LEFT JOIN users u ON uc.user_id = u.id
       WHERE uc.coupon_id = $1 AND uc.status = 'used'
       ORDER BY uc.used_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      usage: {
        coupon_id: id,
        code: coupon.code,
        issued_count: issuedCount,
        used_count: usedCount,
        unused_count: unusedCount,
        conversion_rate: conversionRate,
        usage_limit: coupon.usage_limit,
        remaining: coupon.usage_limit ? coupon.usage_limit - usedCount : null,
        recent_usage: recentUsageResult.rows
      }
    });
  } catch (error: unknown) {
    console.error('Error getting coupon usage:', error);
    res.status(500).json({ error: 'Failed to get coupon usage' });
  }
});

export default router;
