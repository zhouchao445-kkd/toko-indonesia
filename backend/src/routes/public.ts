import { Router, Request, Response } from 'express';
import { pool } from '../lib/database';

const router: Router = Router();

// Format price to Indonesian Rupiah format
const formatPrice = (price: number): string => {
  return `Rp ${price.toLocaleString('id-ID')}`;
};

// GET /api/categories - Get all active categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, icon_url, sort_order FROM categories WHERE status = $1 ORDER BY sort_order ASC',
      ['ACTIVE']
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// GET /api/banners - Get active banners
router.get('/banners', async (req: Request, res: Response) => {
  try {
    const active = req.query.active === '1' ? true : false;
    let query = 'SELECT id, title, image_url, link_url, sort_order FROM banners';
    let params: any[] = [];

    if (active) {
      query += ' WHERE status = $1';
      params.push('ACTIVE');
    }
    query += ' ORDER BY sort_order ASC';

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch banners' });
  }
});

// GET /api/popups - Get active popups
router.get('/popups', async (req: Request, res: Response) => {
  try {
    const active = req.query.active === '1' ? true : false;
    let query = 'SELECT id, title, image_url, link_url FROM popups';
    let params: any[] = [];

    if (active) {
      query += ' WHERE status = $1';
      params.push('ACTIVE');
    }

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch popups' });
  }
});

// GET /api/products - Get products with filtering, sorting, and pagination
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, sort, page = '1', limit = '20', q } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.stock, 
        p.status,
        p.sort_order,
        p.view_count,
        p.click_count,
        p.category_id,
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as main_image,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.status = 'ACTIVE'
    `;
    const params: any[] = [];

    // Category filter
    if (category) {
      params.push(category);
      query += ` AND p.category_id = $${params.length}`;
    }

    // Search filter
    if (q) {
      params.push(`%${q}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    // Sorting
    let orderBy = 'p.sort_order ASC';
    if (sort === 'popular') {
      orderBy = 'total_sold DESC';
    } else if (sort === 'views') {
      orderBy = 'p.view_count DESC';
    } else if (sort === 'clicks') {
      orderBy = 'p.click_count DESC';
    }

    query += ` GROUP BY p.id, c.name ORDER BY ${orderBy}`;

    // Pagination
    params.push(limitNum, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Format prices
    const products = result.rows.map((p: any) => ({
      ...p,
      price: p.price,
      price_formatted: formatPrice(p.price),
      total_sold: parseInt(p.total_sold, 10),
    }));

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'ACTIVE'
    `;
    const countParams: any[] = [];

    if (category) {
      countParams.push(category);
      countQuery += ` AND p.category_id = $${countParams.length}`;
    }

    if (q) {
      countParams.push(`%${q}%`);
      countQuery += ` AND (p.name ILIKE $${countParams.length} OR p.description ILIKE $${countParams.length} OR c.name ILIKE $${countParams.length})`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/hot - Get top 8 hot selling products
router.get('/products/hot', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.price, 
        p.stock,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as main_image,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id
      ORDER BY total_sold DESC, p.view_count DESC
      LIMIT 8
    `;

    const result = await pool.query(query);
    const products = result.rows.map((p: any) => ({
      ...p,
      price: p.price,
      price_formatted: formatPrice(p.price),
      total_sold: parseInt(p.total_sold, 10),
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

// GET /api/products/:id - Get product detail
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.icon_url as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = result.rows[0];

    // Get product images
    const imagesResult = await pool.query(
      'SELECT id, image_url, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    // Get product params
    const paramsResult = await pool.query(
      'SELECT id, name, value FROM product_params WHERE product_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...product,
        price: product.price,
        price_formatted: formatPrice(product.price),
        images: imagesResult.rows,
        params: paramsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product detail' });
  }
});

// POST /api/products/:id/view - Increment view count
router.post('/products/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({
      success: true,
      data: { view_count: result.rows[0].view_count },
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ success: false, error: 'Failed to increment view count' });
  }
});

// GET /api/settings - Get site settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    
    // Convert to object
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
