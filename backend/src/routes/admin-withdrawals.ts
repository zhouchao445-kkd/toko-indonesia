/**
 * Admin Withdrawals Routes (P5-C)
 * GET    /api/admin/withdrawals           — List (filter: status/time/member/page)
 * GET    /api/admin/withdrawals/:id       — Detail
 * POST   /api/admin/withdrawals/:id/approve — Approve
 * POST   /api/admin/withdrawals/:id/reject  — Reject (with reason)
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/withdrawals
 */
router.get('/', requirePermission('withdrawals', 'can_view'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (req.query.status) {
      conditions.push(`w.status = $${paramIndex++}`);
      params.push(req.query.status);
    }

    if (req.query.memberId) {
      conditions.push(`w.member_id = $${paramIndex++}`);
      params.push(req.query.memberId);
    }

    if (req.query.startDate) {
      conditions.push(`w.created_at >= $${paramIndex++}`);
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      conditions.push(`w.created_at <= $${paramIndex++}`);
      params.push(req.query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM withdrawal_requests w ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT w.*, m.name as member_name, m.email as member_email, m.phone as member_phone,
              ba.bank_name, ba.account_number, ba.account_holder
       FROM withdrawal_requests w
       LEFT JOIN members m ON w.member_id = m.id
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      withdrawals: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing withdrawals:', error);
    res.status(500).json({ error: 'Failed to list withdrawals' });
  }
});

/**
 * GET /api/admin/withdrawals/:id
 */
router.get('/:id', requirePermission('withdrawals', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT w.*, m.name as member_name, m.email as member_email, m.phone as member_phone,
              ba.bank_name, ba.account_number, ba.account_holder, ba.branch
       FROM withdrawal_requests w
       LEFT JOIN members m ON w.member_id = m.id
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       WHERE w.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    // Get member's withdrawal history
    const historyResult = await query(
      `SELECT id, amount, status, created_at, approved_at
       FROM withdrawal_requests
       WHERE member_id = $1 AND id != $2
       ORDER BY created_at DESC LIMIT 10`,
      [result.rows[0].member_id, req.params.id]
    );

    res.json({
      withdrawal: result.rows[0],
      history: historyResult.rows
    });
  } catch (error: unknown) {
    console.error('Error getting withdrawal:', error);
    res.status(500).json({ error: 'Failed to get withdrawal' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/approve
 */
router.post('/:id/approve', requirePermission('withdrawals', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    const withdrawal = existing.rows[0];
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending withdrawals can be approved' });
    }

    // Update withdrawal status
    await query(
      `UPDATE withdrawal_requests
       SET status = 'approved', approver_id = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.admin!.id, id]
    );

    // Create financial record
    await query(
      `INSERT INTO financial_records (type, member_id, amount, balance_after, description, reference_type, reference_id, created_at)
       VALUES ('withdrawal', $1, $2, $3, $4, 'withdrawal_request', $5, NOW())`,
      [
        withdrawal.member_id,
        withdrawal.amount,
        withdrawal.remaining_balance || 0,
        `Withdrawal approved by ${req.admin!.username}`,
        id
      ]
    );

    // Deduct member balance
    await query(
      'UPDATE members SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [withdrawal.amount, withdrawal.member_id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'withdrawal',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Withdrawal approved successfully' });
  } catch (error: unknown) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/reject
 */
router.post('/:id/reject', requirePermission('withdrawals', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const existing = await query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    const withdrawal = existing.rows[0];
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending withdrawals can be rejected' });
    }

    // Update withdrawal status
    await query(
      `UPDATE withdrawal_requests
       SET status = 'rejected', reject_reason = $1, approver_id = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [reason, req.admin!.id, id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'withdrawal',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Withdrawal rejected successfully' });
  } catch (error: unknown) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

export default router;
