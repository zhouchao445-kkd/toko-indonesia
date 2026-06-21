/**
 * Admin payment proofs management routes
 * Handles payment proof listing and review
 */
import { Router, Request, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { OrderStatus, isValidTransition } from '../lib/orderStatus';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

/**
 * GET /api/admin/payment-proofs
 * Get payment proofs list with filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND pp.status = $${params.length}`;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM payment_proofs pp ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get payment proofs
    const proofsResult = await query(
      `SELECT pp.id, pp.order_id, pp.user_id, pp.file_path, pp.amount, pp.status, pp.ip_address, pp.created_at,
        o.order_no, o.total_amount as order_total, o.status as order_status,
        u.phone as user_phone, u.nickname as user_nickname
       FROM payment_proofs pp
       LEFT JOIN orders o ON pp.order_id = o.id
       LEFT JOIN users u ON pp.user_id = u.id
       ${whereClause}
       ORDER BY pp.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset]
    );

    res.json({
      success: true,
      data: {
        proofs: proofsResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get payment proofs error:', error);
    res.status(500).json({ error: '获取凭证列表失败' });
  }
});

/**
 * GET /api/admin/payment-proofs/:id
 * Get payment proof detail
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const proofId = req.params.id;

    const proofResult = await query(
      `SELECT pp.*, o.order_no, o.total_amount as order_total, o.status as order_status,
        u.phone as user_phone, u.nickname as user_nickname
       FROM payment_proofs pp
       LEFT JOIN orders o ON pp.order_id = o.id
       LEFT JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      [proofId]
    );

    if (proofResult.rows.length === 0) {
      return res.status(404).json({ error: '凭证不存在' });
    }

    res.json({
      success: true,
      data: proofResult.rows[0],
    });
  } catch (error) {
    console.error('Get payment proof detail error:', error);
    res.status(500).json({ error: '获取凭证详情失败' });
  }
});

/**
 * POST /api/admin/payment-proofs/:id/approve
 * Approve payment proof
 */
router.post('/:id/approve', requirePermission('orders', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const proofId = req.params.id;
    const note = req.body.note as string | undefined;

    // Check permissions
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin') ||
      admin.permissions.some((p) => p.module === 'orders' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核凭证' });
    }

    // Get proof
    const proofResult = await query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = $1',
      [proofId]
    );

    if (proofResult.rows.length === 0) {
      return res.status(404).json({ error: '凭证不存在' });
    }

    const proof = proofResult.rows[0];

    if (proof.status !== 'pending') {
      return res.status(400).json({ error: '凭证已处理' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update proof status
      await client.query(
        "UPDATE payment_proofs SET status = 'approved', updated_at = NOW() WHERE id = $1",
        [proofId]
      );

      // Update order status to approved
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [OrderStatus.APPROVED, proof.order_id]
      );

      // Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [proof.order_id, OrderStatus.PENDING_REVIEW, OrderStatus.APPROVED, note || '凭证审核通过', admin.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'approve_payment_proof',
        target_type: 'payment_proof',
        target_id: proofId as string,
        before_data: { status: 'pending' },
        after_data: { status: 'approved', order_id: proof.order_id, note },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '凭证已审核通过',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Approve payment proof error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

/**
 * POST /api/admin/payment-proofs/:id/reject
 * Reject payment proof
 */
router.post('/:id/reject', requirePermission('orders', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const proofId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: '拒绝原因不能为空' });
    }

    // Check permissions
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.roles.includes('finance_super_admin') ||
      admin.permissions.some((p) => p.module === 'orders' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核凭证' });
    }

    // Get proof
    const proofResult = await query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = $1',
      [proofId]
    );

    if (proofResult.rows.length === 0) {
      return res.status(404).json({ error: '凭证不存在' });
    }

    const proof = proofResult.rows[0];

    if (proof.status !== 'pending') {
      return res.status(400).json({ error: '凭证已处理' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update proof status
      await client.query(
        "UPDATE payment_proofs SET status = 'rejected', updated_at = NOW() WHERE id = $1",
        [proofId]
      );

      // Update order status to rejected
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [OrderStatus.REJECTED, proof.order_id]
      );

      // Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [proof.order_id, OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED, `凭证驳回: ${reason}`, admin.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'reject_payment_proof',
        target_type: 'payment_proof',
        target_id: proofId as string,
        before_data: { status: 'pending' },
        after_data: { status: 'rejected', order_id: proof.order_id, reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '凭证已驳回',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reject payment proof error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

export default router;
