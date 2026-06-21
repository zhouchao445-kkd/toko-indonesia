import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';
import { getFullImageUrl } from '../lib/imageUrl';

const router: Router = Router();

/**
 * GET /api/categories
 * Returns all active categories, sorted by sort_order ASC.
 * Fields: id, name, slug, icon_url, sort_order
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, icon_url, sort_order 
       FROM categories 
       WHERE status = 'ACTIVE' 
       ORDER BY sort_order ASC`
    );

    const categories = result.rows.map((cat: any) => ({
      ...cat,
      icon_url: getFullImageUrl(cat.icon_url),
    }));

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

export default router;
