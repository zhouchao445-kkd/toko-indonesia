/**
 * Admin Bank Accounts Routes (P5-C)
 * GET    /api/admin/bank-accounts      — List
 * POST   /api/admin/bank-accounts      — Create
 * PUT    /api/admin/bank-accounts/:id  — Update
 * DELETE /api/admin/bank-accounts/:id  — Soft delete
 * Permission: super_admin ONLY
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/bank-accounts
 */
router.get('/', requirePermission('bank_accounts', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM bank_accounts WHERE status != 'deleted' ORDER BY sort_order ASC, bank_name ASC`
    );

    res.json({ bankAccounts: result.rows });
  } catch (error: unknown) {
    console.error('Error listing bank accounts:', error);
    res.status(500).json({ error: 'Failed to list bank accounts' });
  }
});

/**
 * GET /api/admin/bank-accounts/:id
 */
router.get('/:id', requirePermission('bank_accounts', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM bank_accounts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    res.json({ bankAccount: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error getting bank account:', error);
    res.status(500).json({ error: 'Failed to get bank account' });
  }
});

/**
 * POST /api/admin/bank-accounts
 */
router.post('/', requirePermission('bank_accounts', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { bank_name, account_number, account_holder, branch, logo_url, sort_order, status } = req.body;

    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({ error: 'bank_name, account_number, and account_holder are required' });
    }

    const result = await query(
      `INSERT INTO bank_accounts (bank_name, account_number, account_holder, branch, logo_url, sort_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [bank_name, account_number, account_holder, branch || null, logo_url || null, sort_order || 0, status || 'active']
    );

    const bankAccount = result.rows[0];

    await logOperation({
      admin_id: req.admin!.id,
      action: 'create',
      target_type: 'bank_account',
      target_id: bankAccount.id,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({ bankAccount });
  } catch (error: unknown) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

/**
 * PUT /api/admin/bank-accounts/:id
 */
router.put('/:id', requirePermission('bank_accounts', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bank_name, account_number, account_holder, branch, logo_url, sort_order, status } = req.body;

    const existing = await query('SELECT id FROM bank_accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const result = await query(
      `UPDATE bank_accounts SET
        bank_name = COALESCE($1, bank_name),
        account_number = COALESCE($2, account_number),
        account_holder = COALESCE($3, account_holder),
        branch = COALESCE($4, branch),
        logo_url = COALESCE($5, logo_url),
        sort_order = COALESCE($6, sort_order),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [bank_name, account_number, account_holder, branch, logo_url, sort_order, status, id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'bank_account',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ bankAccount: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

/**
 * DELETE /api/admin/bank-accounts/:id — Soft delete
 */
router.delete('/:id', requirePermission('bank_accounts', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE bank_accounts SET status = 'deleted', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    await logOperation({
      admin_id: req.admin!.id,
      action: 'delete',
      target_type: 'bank_account',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

export default router;
