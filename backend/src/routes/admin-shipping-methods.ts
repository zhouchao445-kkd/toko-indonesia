/**
 * Admin Shipping Methods Routes
 * GET /api/admin/shipping-methods - List all shipping methods
 * POST /api/admin/shipping-methods - Create shipping method
 * PUT /api/admin/shipping-methods/:id - Update shipping method
 * DELETE /api/admin/shipping-methods/:id - Soft delete shipping method
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

/**
 * GET /api/admin/shipping-methods
 * List all shipping methods
 */
router.get('/', requirePermission('shipping', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM shipping_methods ORDER BY sort_order ASC, name ASC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Error listing shipping methods:', error);
    return res.status(500).json({ error: 'Failed to list shipping methods' });
  }
});

/**
 * POST /api/admin/shipping-methods
 * Create a new shipping method
 */
router.post('/', requirePermission('shipping', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { name, code, fee, estimated_days, sort_order, status } = req.body;

    if (!name || !code || fee === undefined) {
      return res.status(400).json({ error: 'Name, code, and fee are required' });
    }

    // Check if code already exists
    const existing = await query(
      'SELECT id FROM shipping_methods WHERE code = $1',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Shipping method with this code already exists' });
    }

    const result = await query(
      `INSERT INTO shipping_methods (name, code, fee, estimated_days, sort_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name, code, fee, estimated_days || null, sort_order || 0, status || 'active']
    );

    const method = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'create',
      module: 'shipping',
      target_type: 'shipping_method',
      target_id: method.id,
      description: `Created shipping method: ${name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.status(201).json(method);
  } catch (error) {
    console.error('Error creating shipping method:', error);
    return res.status(500).json({ error: 'Failed to create shipping method' });
  }
});

/**
 * PUT /api/admin/shipping-methods/:id
 * Update a shipping method
 */
router.put('/:id', requirePermission('shipping', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, fee, estimated_days, sort_order, status } = req.body;

    // Check if shipping method exists
    const existing = await query(
      'SELECT * FROM shipping_methods WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Shipping method not found' });
    }

    // If code is being changed, check uniqueness
    if (code && code !== existing.rows[0].code) {
      const codeExists = await query(
        'SELECT id FROM shipping_methods WHERE code = $1 AND id != $2',
        [code, id]
      );

      if (codeExists.rows.length > 0) {
        return res.status(400).json({ error: 'Shipping method with this code already exists' });
      }
    }

    const result = await query(
      `UPDATE shipping_methods SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        fee = COALESCE($3, fee),
        estimated_days = COALESCE($4, estimated_days),
        sort_order = COALESCE($5, sort_order),
        status = COALESCE($6, status),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *`,
      [name, code, fee, estimated_days, sort_order, status, id]
    );

    const method = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'shipping',
      target_type: 'shipping_method',
      target_id: id as string,
      description: `Updated shipping method: ${method.name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json(method);
  } catch (error) {
    console.error('Error updating shipping method:', error);
    return res.status(500).json({ error: 'Failed to update shipping method' });
  }
});

/**
 * DELETE /api/admin/shipping-methods/:id
 * Soft delete a shipping method
 */
router.delete('/:id', requirePermission('shipping', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if shipping method exists
    const existing = await query(
      'SELECT * FROM shipping_methods WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Shipping method not found' });
    }

    // Soft delete by setting status to inactive
    await query(
      `UPDATE shipping_methods SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'delete',
      module: 'shipping',
      target_type: 'shipping_method',
      target_id: id as string,
      description: `Soft deleted shipping method: ${existing.rows[0].name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json({ message: 'Shipping method deleted successfully' });
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    return res.status(500).json({ error: 'Failed to delete shipping method' });
  }
});

export default router;
