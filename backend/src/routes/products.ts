import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';
import { formatIDR } from '../lib/format';
import { getFullImageUrl } from '../lib/imageUrl';

const router: Router = Router();

/**
 * GET /api/products
 * List products with filtering, sorting, and pagination.
 * Query params:
 *   - category: category ID or slug (optional)
 *   - sort: manual | views | ctr (default: manual)
 *   - page: page number (default: 1)
 *   - pageSize: items per page (default: 20)
 *   - q: search keyword (ILIKE match on products.name / products.description)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, sort, page = '1', pageSize = '20', q } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * pageSizeNum;

    let sql = `
      SELECT 
        p.id, 
        p.name, 
        p.slug,
        p.main_image,
        p.price, 
        p.sales_count,
        p.view_count,
        p.click_count,
        p.category_id,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    const params: any[] = [];

    // Category filter (by ID or slug)
    if (category) {
      params.push(category as string);
      sql += ` AND (p.category_id = $${params.length}::uuid OR c.slug = $${params.length})`;
    }

    // Search filter (ILIKE on name, description, category name)
    if (q && (q as string).trim()) {
      params.push(`%${(q as string).trim()}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    // Sorting
    let orderBy: string;
    switch (sort) {
      case 'views':
        orderBy = 'p.view_count DESC';
        break;
      case 'ctr':
        orderBy = 'p.click_count DESC';
        break;
      case 'manual':
      default:
        orderBy = 'p.sort_order ASC, p.id ASC';
        break;
    }
    sql += ` ORDER BY ${orderBy}`;

    // Pagination
    params.push(pageSizeNum, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(sql, params);

    // Format output
    const products = result.rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      main_image: getFullImageUrl(p.main_image),
      price: formatIDR(Number(p.price)),
      price_raw: Number(p.price),
      sales_count: Number(p.sales_count) || 0,
      view_count: Number(p.view_count) || 0,
      click_count: Number(p.click_count) || 0,
      category_id: p.category_id,
      category_name: p.category_name,
    }));

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    const countParams: any[] = [];

    if (category) {
      countParams.push(category as string);
      countSql += ` AND (p.category_id = $${countParams.length}::uuid OR c.slug = $${countParams.length})`;
    }

    if (q && (q as string).trim()) {
      countParams.push(`%${(q as string).trim()}%`);
      countSql += ` AND (p.name ILIKE $${countParams.length} OR p.description ILIKE $${countParams.length} OR c.name ILIKE $${countParams.length})`;
    }

    const countResult = await pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(total / pageSizeNum),
          hasMore: pageNum < Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/hot
 * Get top N hot-selling products (by sales_count DESC, view_count DESC).
 * Query: limit (default 8)
 */
router.get('/hot', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '8', 10)));

    const sql = `
      SELECT 
        p.id, 
        p.name, 
        p.slug,
        p.main_image,
        p.price, 
        p.sales_count,
        p.view_count,
        p.category_id,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.sales_count DESC, p.view_count DESC
      LIMIT $1
    `;

    const result = await pool.query(sql, [limit]);

    const products = result.rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      main_image: getFullImageUrl(p.main_image),
      price: formatIDR(Number(p.price)),
      price_raw: Number(p.price),
      sales_count: Number(p.sales_count) || 0,
      category_id: p.category_id,
      category_name: p.category_name,
    }));

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching hot products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hot products' });
  }
});

/**
 * GET /api/products/:id
 * Product detail with images, video, params, and category info.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.main_image,
        p.video_url,
        p.stock,
        p.view_count,
        p.click_count,
        p.sales_count,
        p.sort_order,
        p.is_active,
        p.category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.icon_url as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const product = result.rows[0];

    // Get product images (up to 9, sorted by sort_order)
    const imagesResult = await pool.query(
      `SELECT id, image_url, sort_order 
       FROM product_images 
       WHERE product_id = $1 
       ORDER BY sort_order ASC 
       LIMIT 9`,
      [id]
    );

    // Get product params (sorted by sort_order)
    const paramsResult = await pool.query(
      `SELECT id, name, value, sort_order 
       FROM product_params 
       WHERE product_id = $1 
       ORDER BY sort_order ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: formatIDR(Number(product.price)),
        price_raw: Number(product.price),
        main_image: getFullImageUrl(product.main_image),
        video_url: product.video_url ? getFullImageUrl(product.video_url) : null,
        stock: Number(product.stock),
        view_count: Number(product.view_count),
        click_count: Number(product.click_count),
        sales_count: Number(product.sales_count) || 0,
        is_active: product.is_active,
        category_id: product.category_id,
        category_name: product.category_name,
        category_slug: product.category_slug,
        images: imagesResult.rows.map((img: any) => ({
          id: img.id,
          image_url: getFullImageUrl(img.image_url),
          sort_order: img.sort_order,
        })),
        params: paramsResult.rows.map((p: any) => ({
          id: p.id,
          name: p.name,
          value: p.value,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product detail' });
  }
});

/**
 * POST /api/products/:id/view
 * Increment view_count by 1 for the given product.
 */
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({
      success: true,
      data: { view_count: Number(result.rows[0].view_count) },
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ success: false, error: 'Failed to increment view count' });
  }
});

export default router;
