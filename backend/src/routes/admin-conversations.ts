/**
 * Admin Conversations Routes (P5-C)
 * GET    /api/admin/conversations           — List (filter: status/assigned/time/page)
 * GET    /api/admin/conversations/:id       — Detail (with messages)
 * POST   /api/admin/conversations/:id/assign — Assign customer service
 * POST   /api/admin/conversations/:id/close  — Close conversation
 * POST   /api/admin/conversations/:id/reopen — Reopen conversation
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/conversations
 */
router.get('/', requirePermission('support', 'can_view'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (req.query.status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(req.query.status);
    }

    if (req.query.customerServiceId) {
      conditions.push(`c.customer_service_id = $${paramIndex++}`);
      params.push(req.query.customerServiceId);
    }

    if (req.query.memberId) {
      conditions.push(`c.member_id = $${paramIndex++}`);
      params.push(req.query.memberId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM conversations c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT c.*,
              m.name as member_name, m.email as member_email, m.phone as member_phone,
              a.username as assigned_admin_name,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       LEFT JOIN members m ON c.member_id = m.id
       LEFT JOIN admins a ON c.customer_service_id = a.id
       ${whereClause}
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      conversations: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error: unknown) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

/**
 * GET /api/admin/conversations/:id
 */
router.get('/:id', requirePermission('support', 'can_view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const convResult = await query(
      `SELECT c.*,
              m.name as member_name, m.email as member_email, m.phone as member_phone, m.avatar as member_avatar,
              a.username as assigned_admin_name
       FROM conversations c
       LEFT JOIN members m ON c.member_id = m.id
       LEFT JOIN admins a ON c.customer_service_id = a.id
       WHERE c.id = $1`,
      [id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const since = req.query.since as string;
    let messagesQuery = `SELECT * FROM messages WHERE conversation_id = $1`;
    const messagesParams: unknown[] = [id];

    if (since) {
      messagesQuery += ` AND created_at > $2`;
      messagesParams.push(since);
    }

    messagesQuery += ` ORDER BY created_at ASC LIMIT 200`;

    const messagesResult = await query(messagesQuery, messagesParams);

    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error: unknown) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

/**
 * POST /api/admin/conversations/:id/assign
 */
router.post('/:id/assign', requirePermission('support', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customer_service_id } = req.body;

    if (!customer_service_id) {
      return res.status(400).json({ error: 'customer_service_id is required' });
    }

    const existing = await query('SELECT id FROM conversations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await query(
      `UPDATE conversations SET customer_service_id = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
      [customer_service_id, id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'conversation',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Conversation assigned successfully' });
  } catch (error: unknown) {
    console.error('Error assigning conversation:', error);
    res.status(500).json({ error: 'Failed to assign conversation' });
  }
});

/**
 * POST /api/admin/conversations/:id/close
 */
router.post('/:id/close', requirePermission('support', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, status FROM conversations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (existing.rows[0].status === 'closed') {
      return res.status(400).json({ error: 'Conversation is already closed' });
    }

    await query(
      `UPDATE conversations SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'conversation',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Conversation closed successfully' });
  } catch (error: unknown) {
    console.error('Error closing conversation:', error);
    res.status(500).json({ error: 'Failed to close conversation' });
  }
});

/**
 * POST /api/admin/conversations/:id/reopen
 */
router.post('/:id/reopen', requirePermission('support', 'can_edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, status FROM conversations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (existing.rows[0].status !== 'closed') {
      return res.status(400).json({ error: 'Only closed conversations can be reopened' });
    }

    await query(
      `UPDATE conversations SET status = 'active', closed_at = NULL, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'update',
      target_type: 'conversation',
      target_id: id as string,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Conversation reopened successfully' });
  } catch (error: unknown) {
    console.error('Error reopening conversation:', error);
    res.status(500).json({ error: 'Failed to reopen conversation' });
  }
});

export default router;
