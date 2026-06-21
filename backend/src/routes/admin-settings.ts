/**
 * Admin Settings Routes
 * GET /api/admin/settings - List all settings (including values)
 * PUT /api/admin/settings/:key - Update a single setting
 * PUT /api/admin/settings - Batch update settings
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

// All routes require admin authentication + super_admin permission
router.use(authenticateToken);

/**
 * GET /api/admin/settings
 * List all settings with values (admin only)
 */
router.get('/', requirePermission('settings', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM settings ORDER BY key ASC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Error listing settings:', error);
    return res.status(500).json({ error: 'Failed to list settings' });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Update a single setting
 */
router.put('/:key', requirePermission('settings', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if setting exists
    const existing = await query(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const oldValue = existing.rows[0].value;

    const result = await query(
      `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
      [value, key]
    );

    const setting = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'settings',
      target_type: 'setting',
      target_id: setting.id,
      description: `Updated setting ${key}: ${oldValue} -> ${value}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json(setting);
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * PUT /api/admin/settings
 * Batch update settings
 */
router.put('/', requirePermission('settings', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { key, value }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const results = [];
    const changes = [];

    for (const item of items) {
      if (!item.key || item.value === undefined) {
        continue;
      }

      // Check if setting exists
      const existing = await query(
        'SELECT * FROM settings WHERE key = $1',
        [item.key]
      );

      if (existing.rows.length === 0) {
        continue;
      }

      const oldValue = existing.rows[0].value;

      if (oldValue !== item.value) {
        const result = await query(
          `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
          [item.value, item.key]
        );

        results.push(result.rows[0]);
        changes.push(`${item.key}: ${oldValue} -> ${item.value}`);
      }
    }

    // Log operation if any changes were made
    if (changes.length > 0) {
      await logOperation({
        operator_id: req.admin!.id,
        operator_name: req.admin!.username,
        action: 'edit',
        module: 'settings',
        target_type: 'setting',
        target_id: "0",
        description: `Batch updated ${changes.length} settings: ${changes.join(', ')}`,
        ip_address: req.ip || req.socket.remoteAddress || '',
        user_agent: req.get('user-agent') || ''
      });
    }

    return res.json({
      message: `Updated ${results.length} settings`,
      updated: results
    });
  } catch (error) {
    console.error('Error batch updating settings:', error);
    return res.status(500).json({ error: 'Failed to batch update settings' });
  }
});

export default router;
