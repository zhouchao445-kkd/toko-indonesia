// @ts-nocheck
/**
 * Payment proof upload routes
 * Handles payment proof image upload and management
 */
import { Router, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateMember, MemberRequest } from '../middleware/memberAuth';
import { uploadPaymentProof, handleMulterError } from '../middleware/upload';
import { logOperation } from '../middleware/operationLog';
import { OrderStatus, isValidTransition } from '../lib/orderStatus';

const router: Router = Router();

/**
 * POST /api/orders/:orderId/payment-proof
 * Upload payment proof for an order
 */
router.post(
  '/:orderId/payment-proof',
  authenticateMember,
  uploadPaymentProof,
  handleMulterError,
  async (req: MemberRequest, res: Response) => {
    try {
      const member = req.member!;
      const orderId = req.params.orderId;
      const { amount } = req.body;

      // Validate amount
      const proofAmount = parseFloat(amount);
      if (isNaN(proofAmount) || proofAmount <= 0) {
        return res.status(400).json({ error: '转账金额无效' });
      }

      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: '请上传凭证图片' });
      }

      // Get order
      const orderResult = await query(
        'SELECT id, user_id, status, total_amount FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: '订单不存在' });
      }

      const order = orderResult.rows[0];

      // Verify order belongs to user
      if (order.user_id !== member.id) {
        return res.status(403).json({ error: '无权操作此订单' });
      }

      // Check if status allows proof upload
      if (!isValidTransition(order.status, OrderStatus.PENDING_REVIEW)) {
        return res.status(400).json({ error: '当前订单状态无法上传凭证' });
      }

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Mark existing proofs as superseded (keep audit trail)
        await client.query(
          "UPDATE payment_proofs SET status = 'superseded' WHERE order_id = $1 AND status = 'pending'",
          [orderId]
        );

        // Insert new payment proof
        const filePath = `/payment-proofs/${member.id}/${req.file.filename}`;
        const proofResult = await client.query(
          `INSERT INTO payment_proofs (order_id, user_id, file_path, amount, status, ip_address, created_at)
           VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
           RETURNING id, order_id, user_id, file_path, amount, status, created_at`,
          [orderId, member.id, filePath, proofAmount, req.ip]
        );

        // Update order status to pending_review
        await client.query(
          "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
          [OrderStatus.PENDING_REVIEW, orderId]
        );

        // Insert status history
        await client.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, note, operator_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [orderId, order.status, OrderStatus.PENDING_REVIEW, '用户上传付款凭证', member.id]
        );

        await client.query('COMMIT');

        // Log operation
        await logOperation({
          admin_id: member.id,
          action: 'upload_payment_proof',
          target_type: 'payment_proof',
          target_id: proofResult.rows[0].id,
          before_data: null,
          after_data: { order_id: orderId, amount: proofAmount, file_path: filePath },
          ip_address: req.ip,
        });

        res.status(201).json({
          success: true,
          message: '凭证上传成功',
          data: proofResult.rows[0],
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Upload payment proof error:', error);
      res.status(500).json({ error: '上传凭证失败' });
    }
  }
);

export default router;
