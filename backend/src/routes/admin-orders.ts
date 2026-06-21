/**
 * Admin order management routes
 * Handles order listing, detail, and payment proof review
 */
import { Router, Request, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { OrderStatus, isValidTransition } from '../lib/orderStatus';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

/**
 * GET /api/admin/orders
 * Get all orders with filtering and pagination
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get orders
    const ordersResult = await query(
      `SELECT o.id, o.order_no, o.user_id, o.total_amount, o.shipping_fee, o.discount_amount,
        o.status, o.remark, o.created_at, o.updated_at,
        u.phone as user_phone, u.nickname as user_nickname
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
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
    console.error('Get admin orders error:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

/**
 * GET /api/admin/orders/:id
 * Get order detail for admin
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id;

    // Get order
    const orderResult = await query(
      `SELECT o.*, u.phone as user_phone, u.nickname as user_nickname
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

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

    // Get all payment proofs
    const proofsResult = await query(
      `SELECT id, file_path, amount, status, ip_address, created_at
       FROM payment_proofs WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    );

    // Get status history
    const historyResult = await query(
      `SELECT h.*, a.username as operator_username
       FROM order_status_history h
       LEFT JOIN admins a ON h.operator_id = a.id
       WHERE h.order_id = $1
       ORDER BY h.created_at ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_no: order.order_no,
          user_id: order.user_id,
          user_phone: order.user_phone,
          user_nickname: order.user_nickname,
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
    console.error('Get admin order detail error:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

/**
 * POST /api/admin/orders/:id/review-proof
 * Review payment proof (approve or reject)
 */
router.post('/:id/review-proof', requirePermission('orders', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const orderId = req.params.id as string;
    const { action } = req.body;
    const note = req.body.note as string | undefined;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '操作无效，必须是 approve 或 reject' });
    }

    // Check admin permissions (finance or super_admin)
    const hasPermission = admin.permissions.some(
      (p) => p.module === 'orders' && (p.can_edit || admin.roles.includes('super_admin'))
    );

    if (!hasPermission) {
      return res.status(403).json({ error: '无权审核订单' });
    }

    // Get order
    const orderResult = await query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // Check if status allows review
    const targetStatus = action === 'approve' ? OrderStatus.APPROVED : OrderStatus.REJECTED;

    if (!isValidTransition(order.status, targetStatus)) {
      return res.status(400).json({ error: '当前订单状态无法审核' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get latest pending proof
      const proofResult = await client.query(
        "SELECT id FROM payment_proofs WHERE order_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [orderId]
      );

      if (proofResult.rows.length > 0) {
        // Update proof status
        const proofStatus = action === 'approve' ? 'approved' : 'rejected';
        await client.query(
          "UPDATE payment_proofs SET status = $1 WHERE id = $2",
          [proofStatus, proofResult.rows[0].id]
        );
      }

      // Update order status
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [targetStatus, orderId]
      );

      // Insert status history
      const historyNote = action === 'approve'
        ? (note ? `审核通过: ${note}` : '审核通过')
        : (note ? `审核驳回: ${note}` : '审核驳回');

      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, order.status, targetStatus, historyNote, admin.id]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: action === 'approve' ? 'approve_payment_proof' : 'reject_payment_proof',
        target_type: 'order',
        target_id: orderId,
        before_data: { status: order.status },
        after_data: { status: targetStatus, note },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: action === 'approve' ? '审核通过' : '已驳回',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Review payment proof error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

/**
 * POST /api/admin/orders/:id/cancel
 * Cancel order (admin override)
 */
router.post('/:id/cancel', requirePermission('orders', 'can_delete'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const orderId = req.params.id as string;
    const reason = req.body.reason as string | undefined;

    // Check admin permissions (only super_admin or order_manager with edit permission)
    const hasPermission = admin.roles.includes('super_admin') ||
      admin.permissions.some((p) => p.module === 'orders' && p.can_edit);

    if (!hasPermission) {
      return res.status(403).json({ error: '无权取消订单' });
    }

    // Get order
    const orderResult = await query(
      'SELECT id, status, user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // Check if status allows cancellation (only before shipped)
    const cancellableStatuses = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PENDING_REVIEW,
      OrderStatus.APPROVED,
      OrderStatus.REJECTED,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ error: '当前订单状态无法取消' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update order status to cancelled
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [OrderStatus.CANCELLED, orderId]
      );

      // Restore product stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          orderId,
          order.status,
          OrderStatus.CANCELLED,
          `管理员取消: ${reason || '无原因'}`,
          admin.id,
        ]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'cancel_order',
        target_type: 'order',
        target_id: orderId,
        before_data: { status: order.status },
        after_data: { status: OrderStatus.CANCELLED, reason },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '订单已取消',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: '取消订单失败' });
  }
});

/**
 * POST /api/admin/orders/:id/ship
 * Mark order as shipped
 */
router.post('/:id/ship', requirePermission('orders', 'can_edit'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const orderId = req.params.id as string;
    const tracking_number = req.body.tracking_number as string | undefined;
    const tracking_company = req.body.tracking_company as string | undefined;

    // Check admin permissions
    const hasPermission = admin.permissions.some(
      (p) => p.module === 'orders' && (p.can_edit || admin.roles.includes('super_admin'))
    );

    if (!hasPermission) {
      return res.status(403).json({ error: '无权操作订单' });
    }

    // Get order
    const orderResult = await query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // Check if status allows shipping
    if (!isValidTransition(order.status, OrderStatus.SHIPPED)) {
      return res.status(400).json({ error: '当前订单状态无法发货' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update order status
      await client.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [OrderStatus.SHIPPED, orderId]
      );

      // Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          orderId,
          order.status,
          OrderStatus.SHIPPED,
          `已发货 - ${tracking_company || ''} ${tracking_number || ''}`.trim(),
          admin.id,
        ]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: admin.id,
        action: 'ship_order',
        target_type: 'order',
        target_id: orderId,
        before_data: { status: order.status },
        after_data: { status: OrderStatus.SHIPPED, tracking_number, tracking_company },
        ip_address: req.ip,
      });

      res.json({
        success: true,
        message: '已发货',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Ship order error:', error);
    res.status(500).json({ error: '发货失败' });
  }
});

export default router;
