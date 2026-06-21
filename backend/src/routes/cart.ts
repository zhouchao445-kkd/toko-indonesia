// @ts-nocheck
/**
 * Shopping cart routes
 * Handles cart CRUD for authenticated members
 */
import { Router, Response } from 'express';
import { query } from '../lib/database';
import { authenticateMember, MemberRequest } from '../middleware/memberAuth';

const router: Router = Router();

/**
 * GET /api/cart
 * Get current member's cart with product snapshots
 */
router.get('/', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;

    const result = await query(
      `SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.name,
        p.main_image,
        p.price,
        p.status as product_status
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [member.id]
    );

    // Calculate total price
    let totalItems = 0;
    let totalPrice = 0;

    const items = result.rows.map((item: any) => {
      totalItems += item.quantity;
      if (item.product_status === 'active') {
        totalPrice += parseFloat(item.price) * item.quantity;
      }
      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        product: {
          name: item.name,
          main_image: item.main_image,
          price: parseFloat(item.price),
          status: item.product_status,
        },
      };
    });

    res.json({
      success: true,
      data: {
        items,
        total_items: totalItems,
        total_price: totalPrice,
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: '获取购物车失败' });
  }
});

/**
 * POST /api/cart
 * Add item to cart or increase quantity if exists
 */
router.post('/', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const { productId, quantity } = req.body;

    // Validate productId
    if (!productId) {
      return res.status(400).json({ error: '商品 ID 不能为空' });
    }

    // Validate quantity
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: '数量必须大于 0' });
    }

    // Check product exists and is active
    const productResult = await query(
      'SELECT id, name, status FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    if (productResult.rows[0].status !== 'active') {
      return res.status(400).json({ error: '商品已下架' });
    }

    // Check if item already in cart
    const existingResult = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [member.id, productId]
    );

    if (existingResult.rows.length > 0) {
      // Update quantity (max 99)
      const newQuantity = Math.min(existingResult.rows[0].quantity + qty, 99);

      await query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, existingResult.rows[0].id]
      );

      res.json({
        success: true,
        message: '购物车数量已更新',
        data: {
          id: existingResult.rows[0].id,
          product_id: productId,
          quantity: newQuantity,
        },
      });
    } else {
      // Insert new item
      const insertResult = await query(
        `INSERT INTO cart_items (user_id, product_id, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, user_id, product_id, quantity, created_at, updated_at`,
        [member.id, productId, qty]
      );

      res.status(201).json({
        success: true,
        message: '已加入购物车',
        data: insertResult.rows[0],
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: '加入购物车失败' });
  }
});

/**
 * PUT /api/cart/:itemId
 * Update cart item quantity
 */
router.put('/:itemId', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    // Validate quantity
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: '数量无效' });
    }

    // Verify item belongs to user
    const existingResult = await query(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, member.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '购物车项不存在' });
    }

    if (qty === 0) {
      // Delete item
      await query('DELETE FROM cart_items WHERE id = $1', [itemId]);
      res.json({
        success: true,
        message: '已从购物车移除',
      });
    } else {
      // Update quantity (max 99)
      const newQuantity = Math.min(qty, 99);
      await query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, itemId]
      );

      res.json({
        success: true,
        message: '数量已更新',
        data: {
          id: itemId,
          quantity: newQuantity,
        },
      });
    }
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: '更新购物车失败' });
  }
});

/**
 * DELETE /api/cart/:itemId
 * Remove single item from cart
 */
router.delete('/:itemId', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const itemId = req.params.itemId;

    // Verify item belongs to user
    const existingResult = await query(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, member.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '购物车项不存在' });
    }

    await query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    res.json({
      success: true,
      message: '已从购物车移除',
    });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ error: '删除购物车项失败' });
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart for current member
 */
router.delete('/', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;

    await query('DELETE FROM cart_items WHERE user_id = $1', [member.id]);

    res.json({
      success: true,
      message: '购物车已清空',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: '清空购物车失败' });
  }
});

export default router;
