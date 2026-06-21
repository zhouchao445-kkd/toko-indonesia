/**
 * Admin Financial Records Routes (P5-C)
 * GET /api/admin/financial-records        — List (filter: type/time/member/amount/page)
 * GET /api/admin/financial-records/export — Export CSV
 * READ-ONLY: no create/update/delete
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/financial-records
 */
router.get('/', requirePermission('financial_records', 'can_view'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Type filter (income/refund/withdrawal/adjustment)
    if (req.query.type) {
      conditions.push(`fr.type = $${paramIndex++}`);
      params.push(req.query.type);
    }

    // Member filter
    if (req.query.memberId) {
      conditions.push(`fr.member_id = $${paramIndex++}`);
      params.push(req.query.memberId);
    }

    // Date range
    if (req.query.startDate) {
      conditions.push(`fr.created_at >= $${paramIndex++}`);
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      conditions.push(`fr.created_at <= $${paramIndex++}`);
      params.push(req.query.endDate);
    }

    // Amount range
    if (req.query.minAmount) {
      conditions.push(`fr.amount >= $${paramIndex++}`);
      params.push(parseFloat(req.query.minAmount as string));
    }

    if (req.query.maxAmount) {
      conditions.push(`fr.amount <= $${paramIndex++}`);
      params.push(parseFloat(req.query.maxAmount as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM financial_records fr ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Summary stats
    const statsResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as total_refund,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawal,
        COALESCE(SUM(CASE WHEN type = 'adjustment' THEN amount ELSE 0 END), 0) as total_adjustment
       FROM financial_records fr ${whereClause}`,
      params
    );

    params.push(pageSize, offset);
    const result = await query(
      `SELECT fr.*, m.name as member_name, m.email as member_email
       FROM financial_records fr
       LEFT JOIN members m ON fr.member_id = m.id
       ${whereClause}
       ORDER BY fr.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      records: result.rows,
      stats: statsResult.rows[0],
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing financial records:', error);
    res.status(500).json({ error: 'Failed to list financial records' });
  }
});

/**
 * GET /api/admin/financial-records/export
 * Export as CSV
 */
router.get('/export', requirePermission('financial_records', 'can_view'), async (req: Request, res: Response) => {
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (req.query.type) {
      conditions.push(`fr.type = $${paramIndex++}`);
      params.push(req.query.type);
    }

    if (req.query.startDate) {
      conditions.push(`fr.created_at >= $${paramIndex++}`);
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      conditions.push(`fr.created_at <= $${paramIndex++}`);
      params.push(req.query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT fr.*, m.name as member_name
       FROM financial_records fr
       LEFT JOIN members m ON fr.member_id = m.id
       ${whereClause}
       ORDER BY fr.created_at DESC
       LIMIT 10000`,
      params
    );

    // Generate CSV
    const headers = ['ID', 'Type', 'Member', 'Amount', 'Balance After', 'Description', 'Reference', 'Created At'];
    const rows = result.rows.map((r: Record<string, unknown>) => [
      r.id,
      r.type,
      r.member_name || '',
      r.amount,
      r.balance_after,
      `"${(r.description as string || '').replace(/"/g, '""')}"`,
      r.reference_id || '',
      r.created_at
    ]);

    const csv = [headers.join(','), ...rows.map((row: unknown[]) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financial_records_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: unknown) {
    console.error('Error exporting financial records:', error);
    res.status(500).json({ error: 'Failed to export financial records' });
  }
});

export default router;
