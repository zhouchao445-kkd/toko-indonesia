/**
 * Admin Ad Schedules Routes (P5-C)
 * GET    /api/admin/ad-schedules      — List
 * POST   /api/admin/ad-schedules      — Create
 * PUT    /api/admin/ad-schedules/:id  — Update
 * DELETE /api/admin/ad-schedules/:id  — Soft delete
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/ad-schedules
 */
router.get('/', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (req.query.status) {
      conditions.push(`s.status = $${paramIndex++}`);
      params.push(req.query.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM ad_schedules s ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT s.*, b.image_url as banner_image, p.image_url as popup_image
       FROM ad_schedules s
       LEFT JOIN banners b ON s.banner_id = b.id
       LEFT JOIN popups p ON s.popup_id = p.id
       ${whereClause}
       ORDER BY s.start_time DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      adSchedules: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing ad schedules:', error);
    res.status(500).json({ error: 'Failed to list ad schedules' });
  }
});

/**
 * POST /api/admin/ad-schedules
 */
router.post('/', requirePermission('marketing', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { banner_id, popup_id, start_time, end_time, target_pages, status } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }

    if (!banner_id && !popup_id) {
      return res.status(400).json({ error: 'Either banner_id or popup_id is required' });
    }

    const result = await query(
      `INSERT INTO ad_schedules (banner_id, popup_id, start_time, end_time, target_pages, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [
        banner_id || null, popup_id || null,
        start_time, end_time,
        JSON.stringify(target_pages || ['home']),
        status || 'active'
      ]
    );

    const schedule = result.rows[0];

    await logOperation({
      admin_id: req.admin!.id,
      action: 'create',
      target_type: 'ad_schedule',
      target_id: schedule.id,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({ adSchedule: schedule });
  } catch (error: unknown) {
    console.error('Error creating ad schedule:', error);
    res.status(500).json({ error: 'Failed to create ad schedule' });
  }
});

/**
 * PUT /api/admin/ad-schedules/:id
 */
router.put('/:id', requirePermission('marketing', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { banner_id, popup_id, start_time, end_time, target_pages, status } = req.body;

    const existing = await query('SELECT id FROM ad_schedules WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ad schedule not found' });
    }

    const result = await query(
      `UPDATE ad_schedules SET
        banner_id = COALESCE($1, banner_id),
        popup_id = COALESCE($2, popup_id),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        target_pages = COALESCE($5, target_pages),
        status = COALESCE($6, status),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        banner_id, popup_id, start_time, end_time,
        target_pages ? JSON.stringify(target_pages) : null,
        status, id
      ]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'ad_schedule',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ adSchedule: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error updating ad schedule:', error);
    res.status(500).json({ error: 'Failed to update ad schedule' });
  }
});

/**
 * DELETE /api/admin/ad-schedules/:id — Soft delete
 */
router.delete('/:id', requirePermission('marketing', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE ad_schedules SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad schedule not found' });
    }

    await logOperation({
      admin_id: req.admin!.id,
      action: 'delete',
      target_type: 'ad_schedule',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Ad schedule deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting ad schedule:', error);
    res.status(500).json({ error: 'Failed to delete ad schedule' });
  }
});

export default router;
