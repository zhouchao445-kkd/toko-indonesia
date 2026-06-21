/**
 * Admin Messages Routes (P5-C)
 * GET  /api/admin/conversations/:id/messages — Pull messages (since=<timestamp>)
 * POST /api/admin/conversations/:id/messages — Send message
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { query } from '../lib/database';

const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/admin/conversations/:id/messages
 * Pull messages with optional since timestamp for incremental loading
 */
router.get('/:id/messages', requirePermission('support', 'can_view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const since = req.query.since as string;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Verify conversation exists
    const convResult = await query('SELECT id FROM conversations WHERE id = $1', [id]);
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    let messagesQuery = `SELECT * FROM messages WHERE conversation_id = $1`;
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (since) {
      messagesQuery += ` AND created_at > $${paramIndex++}`;
      params.push(since);
    }

    messagesQuery += ` ORDER BY created_at ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(messagesQuery, params);

    res.json({
      messages: result.rows,
      conversationId: id,
      hasMore: result.rows.length >= limit
    });
  } catch (error: unknown) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * POST /api/admin/conversations/:id/messages
 * Send a message in a conversation
 */
router.post('/:id/messages', requirePermission('support', 'can_create'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Verify conversation exists
    const convResult = await query('SELECT id, status FROM conversations WHERE id = $1', [id]);
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (convResult.rows[0].status === 'closed') {
      return res.status(400).json({ error: 'Cannot send messages in a closed conversation' });
    }

    const messageType = type || 'text';
    if (!['text', 'image'].includes(messageType)) {
      return res.status(400).json({ error: 'type must be text or image' });
    }

    // Insert message
    const result = await query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content, type, created_at)
       VALUES ($1, 'admin', $2, $3, $4, NOW())
       RETURNING *`,
      [id, req.admin!.id, content, messageType]
    );

    const message = result.rows[0];

    // Update conversation last_message_at
    await query(
      `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logOperation({
      admin_id: req.admin!.id,
      action: 'create',
      target_type: 'message',
      target_id: message.id,
      ip_address: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({ message });
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
