/**
 * Admin Categories Routes
 * POST /api/admin/categories - Create category
 * PUT /api/admin/categories/:id - Update category
 * DELETE /api/admin/categories/:id - Soft delete category
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
 * POST /api/admin/categories
 * Create a new category
 */
router.post('/', requirePermission('category', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { name, slug, icon_url, sort_order, status } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existing = await query(
      'SELECT id FROM categories WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    const result = await query(
      `INSERT INTO categories (name, slug, icon_url, sort_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [name, slug, icon_url || null, sort_order || 0, status || 'active']
    );

    const category = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'create',
      module: 'category',
      target_type: 'category',
      target_id: category.id,
      description: `Created category: ${name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/admin/categories/:id
 * Update a category
 */
router.put('/:id', requirePermission('category', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, icon_url, sort_order, status } = req.body;

    // Check if category exists
    const existing = await query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // If slug is being changed, check uniqueness
    if (slug && slug !== existing.rows[0].slug) {
      const slugExists = await query(
        'SELECT id FROM categories WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists.rows.length > 0) {
        return res.status(400).json({ error: 'Category with this slug already exists' });
      }
    }

    const result = await query(
      `UPDATE categories SET 
         name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         icon_url = COALESCE($3, icon_url),
         sort_order = COALESCE($4, sort_order),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, slug, icon_url, sort_order, status, id]
    );

    const category = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'category',
      target_type: 'category',
      target_id: id as string,
      description: `Updated category: ${category.name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Soft delete a category (set status to inactive)
 */
router.delete('/:id', requirePermission('category', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Soft delete by setting status to inactive
    await query(
      `UPDATE categories SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'delete',
      module: 'category',
      target_type: 'category',
      target_id: id as string,
      description: `Soft deleted category: ${existing.rows[0].name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
