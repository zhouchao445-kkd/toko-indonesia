/**
 * Admin members management routes
 * Handles member listing, detail, and management
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
 * GET /api/admin/members
 * Get members list with filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.phone LIKE $${params.length} OR u.nickname LIKE $${params.length} OR u.email LIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND u.status = $${params.length}`;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get members
    const membersResult = await query(
      `SELECT u.id, u.phone, u.email, u.nickname, u.avatar, u.status, u.balance,
        u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id AND status = 'completed') as total_spent
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset]
    );

    res.json({
      success: true,
      data: {
        members: membersResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: '获取会员列表失败' });
  }
});

/**
 * GET /api/admin/members/:id
 * Get member detail
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;

    // Get member info
    const memberResult = await query(
      `SELECT id, phone, email, nickname, avatar, status, balance, created_at, updated_at
       FROM users WHERE id = $1`,
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: '会员不存在' });
    }

    const member = memberResult.rows[0];

    // Get addresses
    const addressesResult = await query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [memberId]
    );

    // Get recent orders
    const ordersResult = await query(
      `SELECT id, order_no, total_amount, status, created_at
       FROM orders WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [memberId]
    );

    // Get statistics
    const statsResult = await query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN status = 'pending_payment' THEN total_amount ELSE 0 END), 0) as pending_amount
       FROM orders WHERE user_id = $1`,
      [memberId]
    );

    res.json({
      success: true,
      data: {
        member,
        addresses: addressesResult.rows,
        recent_orders: ordersResult.rows,
        statistics: statsResult.rows[0],
      },
    });
  } catch (error) {
    console.error('Get member detail error:', error);
    res.status(500).json({ error: '获取会员详情失败' });
  }
});

/**
 * POST /api/admin/members/:id/status
 * Update member status (active/banned)
 */
router.post('/:id/status', requirePermission('members', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const memberId = req.params.id;
    const { status } = req.body;

    if (!status || !['active', 'banned'].includes(status)) {
      return res.status(400).json({ error: '状态无效，必须是 active 或 banned' });
    }

    // Check permissions
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.permissions.some((p) => p.module === 'members' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权修改会员状态' });
    }

    // Get member
    const memberResult = await query(
      'SELECT id, status FROM users WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: '会员不存在' });
    }

    const member = memberResult.rows[0];
    const beforeStatus = member.status;

    // Update status
    await query(
      "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, memberId]
    );

    // Log operation
    await logOperation({
      admin_id: admin.id,
      action: 'update_member_status',
      target_type: 'member',
      target_id: memberId as string,
      before_data: { status: beforeStatus },
      after_data: { status },
      ip_address: req.ip,
    });

    res.json({
      success: true,
      message: status === 'active' ? '会员已激活' : '会员已封禁',
    });
  } catch (error) {
    console.error('Update member status error:', error);
    res.status(500).json({ error: '修改会员状态失败' });
  }
});

/**
 * POST /api/admin/members/:id/balance
 * Directly adjust member balance (super_admin / finance_super_admin only)
 */
router.post('/:id/balance', requirePermission('balance', 'can_delete'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const memberId = req.params.id;
    const { amount, reason } = req.body;

    if (amount === undefined || amount === null || typeof amount !== 'number') {
      return res.status(400).json({ error: '金额无效' });
    }

    if (!reason) {
      return res.status(400).json({ error: '原因不能为空' });
    }

    // Check permissions (only super_admin or finance_super_admin)
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin');

    if (!hasPermission) {
      return res.status(403).json({ error: '无权直接修改余额' });
    }

    // Get member
    const memberResult = await query(
      'SELECT id, balance FROM users WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: '会员不存在' });
    }

    const member = memberResult.rows[0];
    const beforeBalance = parseFloat(member.balance);
    const newBalance = beforeBalance + amount;

    if (newBalance < 0) {
      return res.status(400).json({ error: '余额不足，扣减后不能为负' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update balance
      await client.query(
        'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, memberId]
      );

      // Insert balance log
      await client.query(
        `INSERT INTO balance_logs (user_id, amount, type, reason, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [memberId, amount, 'admin_adjust', reason, admin.id]
      );

      // Insert balance change request (as direct, auto-approved)
      await client.query(
        `INSERT INTO balance_change_requests (member_id, amount, type, reason, status, requester_id, reviewer_id, created_at, reviewed_at)
         VALUES ($1, $2, 'direct', $3, 'approved', $4, $5, NOW(), NOW())`,
        [memberId, amount, reason, admin.id, admin.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'adjust_member_balance',
        target_type: 'member',
        target_id: memberId as string,
        before_data: { balance: beforeBalance },
        after_data: { balance: newBalance, amount, reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '余额已调整',
        data: {
          before_balance: beforeBalance,
          after_balance: newBalance,
          amount,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Adjust member balance error:', error);
    res.status(500).json({ error: '调整余额失败' });
  }
});

export default router;
