/**
 * Admin Banners Routes (P5-C)
 * Backend CRUD for banners (public banners.ts remains read-only)
 * GET    /api/admin/banners      — List
 * GET    /api/admin/banners/:id  — Detail
 * POST   /api/admin/banners      — Create
 * PUT    /api/admin/banners/:id  — Update
 * DELETE /api/admin/banners/:id  — Soft delete
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/banners
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
      conditions.push(`status = $${paramIndex++}`);
      params.push(req.query.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM banners ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT * FROM banners ${whereClause} ORDER BY sort_order ASC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      banners: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing banners:', error);
    res.status(500).json({ error: 'Failed to list banners' });
  }
});

/**
 * GET /api/admin/banners/:id
 */
router.get('/:id', requirePermission('marketing', 'can_view'), async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM banners WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json({ banner: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error getting banner:', error);
    res.status(500).json({ error: 'Failed to get banner' });
  }
});

/**
 * POST /api/admin/banners
 */
router.post('/', requirePermission('marketing', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { image_url, link_url, sort_order, status, valid_from, valid_until } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }

    const result = await query(
      `INSERT INTO banners (image_url, link_url, sort_order, status, valid_from, valid_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [image_url, link_url || null, sort_order || 0, status || 'active', valid_from || null, valid_until || null]
    );

    const banner = result.rows[0];

    await logOperation({
      admin_id: req.admin!.id,
      action: 'create',
      target_type: 'banner',
      target_id: banner.id,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({ banner });
  } catch (error: unknown) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

/**
 * PUT /api/admin/banners/:id
 */
router.put('/:id', requirePermission('marketing', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { image_url, link_url, sort_order, status, valid_from, valid_until } = req.body;

    const existing = await query('SELECT id FROM banners WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    const result = await query(
      `UPDATE banners SET
        image_url = COALESCE($1, image_url),
        link_url = COALESCE($2, link_url),
        sort_order = COALESCE($3, sort_order),
        status = COALESCE($4, status),
        valid_from = COALESCE($5, valid_from),
        valid_until = COALESCE($6, valid_until),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [image_url, link_url, sort_order, status, valid_from, valid_until, id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'banner',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ banner: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

/**
 * DELETE /api/admin/banners/:id — Soft delete
 */
router.delete('/:id', requirePermission('marketing', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE banners SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    await logOperation({
      admin_id: req.admin!.id,
      action: 'delete',
      target_type: 'banner',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Banner deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

export default router;
