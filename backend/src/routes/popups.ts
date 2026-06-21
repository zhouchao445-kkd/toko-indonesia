import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';
import { getFullImageUrl } from '../lib/imageUrl';

const router: Router = Router();

/**
 * GET /api/popups?active=1
 * Returns active popups (is_active=1).
 * Fields: id, title, image_url, content, link_url, display_frequency
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const active = req.query.active === '1';
    let sql = `SELECT id, title, image_url, content, link_url, display_frequency FROM popups`;
    const params: any[] = [];

    if (active) {
      sql += ` WHERE is_active = true`;
    }

    const result = await pool.query(sql, params);

    const popups = result.rows.map((p: any) => ({
      ...p,
      image_url: getFullImageUrl(p.image_url),
    }));

    res.json({
      success: true,
      data: popups,
    });
  } catch (error) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch popups' });
  }
});

export default router;
