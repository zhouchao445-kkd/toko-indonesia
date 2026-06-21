import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';

const router: Router = Router();

/**
 * GET /api/settings
 * Returns all settings as key-value pairs.
 * Used by frontend to read LOGO, site name, work hours, etc.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM settings WHERE status = 'ACTIVE' ORDER BY key ASC`
    );

    // Convert rows to a flat key-value object
    const settings: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

export default router;
