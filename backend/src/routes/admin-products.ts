/**
 * Admin Products Routes
 * GET /api/admin/products - List products with pagination/filtering
 * POST /api/admin/products - Create product
 * PUT /api/admin/products/:id - Update product
 * DELETE /api/admin/products/:id - Soft delete product
 * PUT /api/admin/products/:id/images - Replace product images
 * PUT /api/admin/products/:id/params - Replace product parameters
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
 * GET /api/admin/products
 * List products with pagination, filtering, and sorting
 */
router.get('/', requirePermission('product', 'can_view'), async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search,
      category_id,
      status,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    const offset = (pageNum - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category_id) {
      conditions.push(`p.category_id = $${paramIndex}`);
      params.push(category_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column
    const validSortColumns = ['created_at', 'updated_at', 'name', 'price', 'stock', 'view_count', 'click_count', 'sort_order'];
    const sortColumn = validSortColumns.includes(sort as string) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get products with category name
    const result = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return res.json({
      products: result.rows,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing products:', error);
    return res.status(500).json({ error: 'Failed to list products' });
  }
});

/**
 * POST /api/admin/products
 * Create a new product
 */
router.post('/', requirePermission('product', 'can_create'), async (req: Request, res: Response) => {
  try {
    const {
      name, slug, description, price, original_price, stock,
      category_id, sort_order, view_count, click_count,
      main_image, video_url, status
    } = req.body;

    if (!name || !slug || price === undefined) {
      return res.status(400).json({ error: 'Name, slug, and price are required' });
    }

    // Check if slug already exists
    const existing = await query(
      'SELECT id FROM products WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    const result = await query(
      `INSERT INTO products (
        name, slug, description, price, original_price, stock,
        category_id, sort_order, view_count, click_count,
        main_image, video_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        name, slug, description || null, price, original_price || null,
        stock || 0, category_id || null, sort_order || 0,
        view_count || 0, click_count || 0,
        main_image || null, video_url || null, status || 'active'
      ]
    );

    const product = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'create',
      module: 'product',
      target_type: 'product',
      target_id: product.id,
      description: `Created product: ${name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update a product
 */
router.put('/:id', requirePermission('product', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, slug, description, price, original_price, stock,
      category_id, sort_order, view_count, click_count,
      main_image, video_url, status
    } = req.body;

    // Check if product exists
    const existing = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If slug is being changed, check uniqueness
    if (slug && slug !== existing.rows[0].slug) {
      const slugExists = await query(
        'SELECT id FROM products WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists.rows.length > 0) {
        return res.status(400).json({ error: 'Product with this slug already exists' });
      }
    }

    const result = await query(
      `UPDATE products SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        original_price = COALESCE($5, original_price),
        stock = COALESCE($6, stock),
        category_id = $7,
        sort_order = COALESCE($8, sort_order),
        view_count = COALESCE($9, view_count),
        click_count = COALESCE($10, click_count),
        main_image = COALESCE($11, main_image),
        video_url = COALESCE($12, video_url),
        status = COALESCE($13, status),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *`,
      [
        name, slug, description, price, original_price, stock,
        category_id, sort_order, view_count, click_count,
        main_image, video_url, status, id
      ]
    );

    const product = result.rows[0];

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'product',
      target_type: 'product',
      target_id: id as string,
      description: `Updated product: ${product.name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Soft delete a product
 */
router.delete('/:id', requirePermission('product', 'can_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existing = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete by setting status to inactive
    await query(
      `UPDATE products SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'delete',
      module: 'product',
      target_type: 'product',
      target_id: id as string,
      description: `Soft deleted product: ${existing.rows[0].name}`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * PUT /api/admin/products/:id/images
 * Replace product images (array of images with sort_order)
 */
router.put('/:id/images', requirePermission('product', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { images } = req.body; // Array of { image_url, sort_order }

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: 'Images must be an array' });
    }

    // Check if product exists
    const existing = await query(
      'SELECT id FROM products WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete existing images
    await query('DELETE FROM product_images WHERE product_id = $1', [id]);

    // Insert new images
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      await query(
        `INSERT INTO product_images (product_id, image_url, sort_order, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, img.image_url, img.sort_order ?? i]
      );
    }

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'product',
      target_type: 'product',
      target_id: id as string,
      description: `Updated ${images.length} images for product`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json({ message: 'Product images updated successfully', count: images.length });
  } catch (error) {
    console.error('Error updating product images:', error);
    return res.status(500).json({ error: 'Failed to update product images' });
  }
});

/**
 * PUT /api/admin/products/:id/params
 * Replace product parameters (array of params with sort_order)
 */
router.put('/:id/params', requirePermission('product', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { params } = req.body; // Array of { param_name, param_value, sort_order }

    if (!Array.isArray(params)) {
      return res.status(400).json({ error: 'Params must be an array' });
    }

    // Check if product exists
    const existing = await query(
      'SELECT id FROM products WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete existing params
    await query('DELETE FROM product_params WHERE product_id = $1', [id]);

    // Insert new params
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      await query(
        `INSERT INTO product_params (product_id, param_name, param_value, sort_order, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, param.param_name, param.param_value, param.sort_order ?? i]
      );
    }

    // Log operation
    await logOperation({
      operator_id: req.admin!.id,
      operator_name: req.admin!.username,
      action: 'edit',
      module: 'product',
      target_type: 'product',
      target_id: id as string,
      description: `Updated ${params.length} params for product`,
      ip_address: req.ip || req.socket.remoteAddress || '',
      user_agent: req.get('user-agent') || ''
    });

    return res.json({ message: 'Product params updated successfully', count: params.length });
  } catch (error) {
    console.error('Error updating product params:', error);
    return res.status(500).json({ error: 'Failed to update product params' });
  }
});

export default router;
