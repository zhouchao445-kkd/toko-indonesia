// @ts-nocheck
/**
 * Order routes
 * Handles order creation, listing, detail, and cancellation
 */
import { Router, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateMember, MemberRequest } from '../middleware/memberAuth';
import { logOperation } from '../middleware/operationLog';
import { OrderStatus, isValidTransition } from '../lib/orderStatus';

const router: Router = Router();

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const { items, addressId, shippingMethodId, couponCode, remark } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '订单商品不能为空' });
    }

    // Validate addressId
    if (!addressId) {
      return res.status(400).json({ error: '请选择收货地址' });
    }

    // Validate shippingMethodId
    if (!shippingMethodId) {
      return res.status(400).json({ error: '请选择物流方式' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verify address belongs to user
      const addressResult = await client.query(
        'SELECT id, name, phone, province, city, district, detail FROM user_addresses WHERE id = $1 AND user_id = $2',
        [addressId, member.id]
      );

      if (addressResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '收货地址不存在' });
      }

      const address = addressResult.rows[0];

      // 2. Verify shipping method exists
      const shippingResult = await client.query(
        'SELECT id, name, price FROM shipping_methods WHERE id = $1 AND status = $2',
        [shippingMethodId, 'active']
      );

      if (shippingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '物流方式不存在或不可用' });
      }

      const shippingMethod = shippingResult.rows[0];
      const shippingFee = parseFloat(shippingMethod.price);

      // 3. Verify all products exist and are active
      const productIds = items.map((item: any) => item.productId);
      const productsResult = await client.query(
        'SELECT id, name, main_image, price, status FROM products WHERE id = ANY($1::uuid[])',
        [productIds]
      );

      const productMap = new Map<string, any>();
      for (const p of productsResult.rows) {
        productMap.set(p.id, p);
      }

      // Check all products exist and are active
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `商品 ${item.productId} 不存在` });
        }
        if (product.status !== 'active') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `商品 ${product.name} 已下架` });
        }
      }

      // 3.5. Check stock availability and deduct
      for (const item of items) {
        const quantity = parseInt(item.quantity, 10) || 1;
        const stockResult = await client.query(
          'SELECT stock FROM products WHERE id = $1 AND stock >= $2',
          [item.productId, quantity]
        );

        if (stockResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `商品 ${productMap.get(item.productId).name} 库存不足` });
        }

        // Deduct stock atomically
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [quantity, item.productId]
        );
      }

      // 4. Calculate totals
      let subtotal = 0;
      const orderItems = items.map((item: any) => {
        const product = productMap.get(item.productId);
        const price = parseFloat(product.price);
        const quantity = parseInt(item.quantity, 10) || 1;
        subtotal += price * quantity;
        return {
          product_id: item.productId,
          product_name: product.name,
          product_image: product.main_image,
          price,
          quantity,
          subtotal: price * quantity,
        };
      });

      // 5. Validate coupon if provided
      let discount = 0;
      let couponId = null;

      if (couponCode) {
        const couponResult = await client.query(
          `SELECT id, discount_type, discount_value, min_amount, max_uses, used_count, expires_at
           FROM coupons WHERE code = $1 AND status = 'active'`,
          [couponCode]
        );

        if (couponResult.rows.length > 0) {
          const coupon = couponResult.rows[0];

          // Check expiry
          if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: '优惠券已过期' });
          }

          // Check usage limit
          if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: '优惠券已用完' });
          }

          // Check minimum amount
          if (coupon.min_amount && subtotal < parseFloat(coupon.min_amount)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `订单金额需满 ${coupon.min_amount} 才能使用此优惠券`,
            });
          }

          // Calculate discount
          if (coupon.discount_type === 'percentage') {
            discount = subtotal * (parseFloat(coupon.discount_value) / 100);
          } else {
            discount = parseFloat(coupon.discount_value);
          }

          couponId = coupon.id;
        }
      }

      const totalAmount = subtotal + shippingFee - discount;

      // 6. Generate order number
      const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 7. Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (order_no, user_id, total_amount, shipping_fee, discount_amount, status,
          address_snapshot, shipping_method_id, coupon_id, remark, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING id, order_no, user_id, total_amount, shipping_fee, discount_amount, status, created_at`,
        [
          orderNo,
          member.id,
          totalAmount,
          shippingFee,
          discount,
          OrderStatus.PENDING_PAYMENT,
          JSON.stringify(address),
          shippingMethodId,
          couponId,
          remark || null,
        ]
      );

      const order = orderResult.rows[0];

      // 8. Insert order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            order.id,
            item.product_id,
            item.product_name,
            item.product_image,
            item.price,
            item.quantity,
            item.subtotal,
          ]
        );
      }

      // 9. Clear cart items for ordered products
      await client.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::uuid[])',
        [member.id, productIds]
      );

      // 10. Update coupon usage count
      if (couponId) {
        await client.query(
          'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
          [couponId]
        );
      }

      // 11. Get bank accounts for payment
      const banksResult = await client.query(
        'SELECT id, bank_name, account_number, account_name FROM bank_accounts WHERE status = $1 ORDER BY sort_order',
        ['active']
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: member.id,
        action: 'create_order',
        target_type: 'order',
        target_id: order.id,
        before_data: null,
        after_data: { order_no: order.order_no, total_amount: order.total_amount },
        ip_address: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_no: order.order_no,
            total_amount: order.total_amount,
            shipping_fee: order.shipping_fee,
            discount_amount: order.discount_amount,
            status: order.status,
            created_at: order.created_at,
          },
          banks: banksResult.rows,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

/**
 * GET /api/orders
 * Get current member's order list
 */
router.get('/', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const { status, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [member.id];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const ordersResult = await query(
      `SELECT id, order_no, total_amount, shipping_fee, discount_amount, status, remark, created_at, updated_at
       FROM orders ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset]
    );

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

/**
 * GET /api/orders/:id
 * Get order detail
 */
router.get('/:id', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const orderId = req.params.id;

    // Get order
    const orderResult = await query(
      `SELECT id, order_no, user_id, total_amount, shipping_fee, discount_amount, status,
        address_snapshot, shipping_method_id, coupon_id, remark, created_at, updated_at
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // Verify order belongs to user
    if (order.user_id !== member.id) {
      return res.status(403).json({ error: '无权查看此订单' });
    }

    // Get order items
    const itemsResult = await query(
      `SELECT id, product_id, product_name, product_image, price, quantity, subtotal
       FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    // Get shipping method
    const shippingResult = await query(
      'SELECT id, name, price FROM shipping_methods WHERE id = $1',
      [order.shipping_method_id]
    );

    // Get payment proofs
    const proofsResult = await query(
      `SELECT id, file_path, amount, status, created_at
       FROM payment_proofs WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    );

    // Get order status history
    const historyResult = await query(
      `SELECT id, from_status, to_status, note, operator_id, created_at
       FROM order_status_history WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_no: order.order_no,
          total_amount: order.total_amount,
          shipping_fee: order.shipping_fee,
          discount_amount: order.discount_amount,
          status: order.status,
          address: order.address_snapshot,
          remark: order.remark,
          created_at: order.created_at,
          updated_at: order.updated_at,
        },
        items: itemsResult.rows,
        shipping_method: shippingResult.rows[0] || null,
        payment_proofs: proofsResult.rows,
        status_history: historyResult.rows,
      },
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel an order
 */
router.post('/:id/cancel', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const orderId = req.params.id as string;

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get order
      const orderResult = await client.query(
        'SELECT id, user_id, status FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '订单不存在' });
      }

      const order = orderResult.rows[0];

      // Verify order belongs to user
      if (order.user_id !== member.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: '无权操作此订单' });
      }

      // Check if cancellation is allowed
      if (!isValidTransition(order.status, OrderStatus.CANCELLED)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '当前订单状态无法取消' });
      }

      // Get order items for stock rollback
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      // Rollback stock for each item
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [OrderStatus.CANCELLED, orderId]
      );

      // Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, order.status, OrderStatus.CANCELLED, '用户取消订单', member.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: member.id,
        action: 'cancel_order',
        target_type: 'order',
        target_id: orderId,
        before_data: { status: order.status },
        after_data: { status: OrderStatus.CANCELLED },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '订单已取消',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: '取消订单失败' });
  }
});

export default router;
