import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';
import { getFullImageUrl } from '../lib/imageUrl';

const router: Router = Router();

/**
 * GET /api/banners?active=1
 * Returns active banners (is_active=1), sorted by sort_order ASC.
 * Fields: id, title, image_url, link_url, sort_order
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const active = req.query.active === '1';
    let sql = `SELECT id, title, image_url, link_url, sort_order FROM banners`;
    const params: any[] = [];

    if (active) {
      sql += ` WHERE is_active = true`;
    }
    sql += ` ORDER BY sort_order ASC`;

    const result = await pool.query(sql, params);

    const banners = result.rows.map((b: any) => ({
      ...b,
      image_url: getFullImageUrl(b.image_url),
    }));

    res.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch banners' });
  }
});

export default router;
