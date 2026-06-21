/**
 * Admin balance management routes
 * Handles balance change requests (review flow) and balance logs
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
 * GET /api/admin/balance/requests
 * Get balance change requests list
 */
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND bcr.status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND bcr.type = $${params.length}`;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM balance_change_requests bcr ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get requests
    const requestsResult = await query(
      `SELECT bcr.*,
        u.phone as member_phone, u.nickname as member_nickname,
        ra.username as requester_username,
        rv.username as reviewer_username
       FROM balance_change_requests bcr
       LEFT JOIN users u ON bcr.member_id = u.id
       LEFT JOIN admins ra ON bcr.requester_id = ra.id
       LEFT JOIN admins rv ON bcr.reviewer_id = rv.id
       ${whereClause}
       ORDER BY bcr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset]
    );

    res.json({
      success: true,
      data: {
        requests: requestsResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get balance requests error:', error);
    res.status(500).json({ error: '获取余额变更申请列表失败' });
  }
});

/**
 * POST /api/admin/balance/requests
 * Create balance change request (order_manager applies)
 */
router.post('/requests', requirePermission('balance', 'can_create'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const { member_id, amount, reason } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: '会员ID不能为空' });
    }

    if (amount === undefined || amount === null || typeof amount !== 'number') {
      return res.status(400).json({ error: '金额无效' });
    }

    if (!reason) {
      return res.status(400).json({ error: '原因不能为空' });
    }

    // Check permissions (order_manager or higher)
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin') ||
      admin.permissions.some((p) => p.module === 'orders' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权申请余额变更' });
    }

    // Check if member exists
    const memberResult = await query(
      'SELECT id, balance FROM users WHERE id = $1',
      [member_id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: '会员不存在' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert request
      const insertResult = await client.query(
        `INSERT INTO balance_change_requests (member_id, amount, type, reason, status, requester_id, created_at)
         VALUES ($1, $2, 'review', $3, 'pending', $4, NOW())
         RETURNING id`,
        [member_id, amount, reason, admin.id]
      );

      await client.query('COMMIT');

      const requestId = insertResult.rows[0].id;

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'create_balance_request',
        target_type: 'balance_request',
        target_id: requestId as string,
        before_data: null,
        after_data: { member_id, amount, reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '余额变更申请已提交',
        data: { id: requestId },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create balance request error:', error);
    res.status(500).json({ error: '创建申请失败' });
  }
});

/**
 * POST /api/admin/balance/requests/:id/approve
 * Approve balance change request (finance_super_admin / super_admin)
 */
router.post('/requests/:id/approve', requirePermission('balance', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const requestId = req.params.id;
    const note = req.body.note as string | undefined;

    // Check permissions (only super_admin or finance_super_admin)
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin');

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核余额变更' });
    }

    // Get request
    const requestResult = await query(
      `SELECT bcr.*, u.balance as current_balance
       FROM balance_change_requests bcr
       LEFT JOIN users u ON bcr.member_id = u.id
       WHERE bcr.id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: '申请不存在' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ error: '申请已处理' });
    }

    const currentBalance = parseFloat(request.current_balance);
    const newBalance = currentBalance + request.amount;

    if (newBalance < 0) {
      return res.status(400).json({ error: '余额不足，扣减后不能为负' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update request status
      await client.query(
        "UPDATE balance_change_requests SET status = 'approved', reviewer_id = $1, reviewed_at = NOW() WHERE id = $2",
        [admin.id, requestId]
      );

      // Update member balance
      await client.query(
        'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, request.member_id]
      );

      // Insert balance log
      await client.query(
        `INSERT INTO balance_logs (user_id, amount, type, reason, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [request.member_id, request.amount, 'balance_change', request.reason, admin.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'approve_balance_request',
        target_type: 'balance_request',
        target_id: requestId as string,
        before_data: { status: 'pending', balance: currentBalance },
        after_data: { status: 'approved', balance: newBalance, amount: request.amount, note },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '申请已通过',
        data: {
          before_balance: currentBalance,
          after_balance: newBalance,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Approve balance request error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

/**
 * POST /api/admin/balance/requests/:id/reject
 * Reject balance change request (finance_super_admin / super_admin)
 */
router.post('/requests/:id/reject', requirePermission('balance', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const requestId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: '拒绝原因不能为空' });
    }

    // Check permissions (only super_admin or finance_super_admin)
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin');

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核余额变更' });
    }

    // Get request
    const requestResult = await query(
      'SELECT id, status FROM balance_change_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: '申请不存在' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ error: '申请已处理' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update request status
      await client.query(
        "UPDATE balance_change_requests SET status = 'rejected', reviewer_id = $1, reviewed_at = NOW() WHERE id = $2",
        [admin.id, requestId]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'reject_balance_request',
        target_type: 'balance_request',
        target_id: requestId as string,
        before_data: { status: 'pending' },
        after_data: { status: 'rejected', reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '申请已驳回',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reject balance request error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

/**
 * GET /api/admin/balance/logs
 * Get balance logs for a member
 */
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, page = '1', pageSize = '20' } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: '会员ID不能为空' });
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    // Count total
    const countResult = await query(
      'SELECT COUNT(*) FROM balance_logs WHERE user_id = $1',
      [memberId]
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get logs
    const logsResult = await query(
      `SELECT bl.*, a.username as operator_username
       FROM balance_logs bl
       LEFT JOIN admins a ON bl.operator_id = a.id
       WHERE bl.user_id = $1
       ORDER BY bl.created_at DESC
       LIMIT $1 OFFSET $2`,
      [size, offset]
    );

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get balance logs error:', error);
    res.status(500).json({ error: '获取余额日志失败' });
  }
});

export default router;
