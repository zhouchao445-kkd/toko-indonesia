// @ts-nocheck
/**
 * Member user routes
 * Handles profile management and address CRUD
 */
import { Router, Response } from 'express';
import { query, getPool } from '../lib/database';
import { authenticateMember, MemberRequest } from '../middleware/memberAuth';
import { logOperation } from '../middleware/operationLog';

const router: Router = Router();

/**
 * GET /api/users/me
 * Get current member profile with balance
 */
router.get('/me', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;

    const userResult = await query(
      'SELECT id, phone, nickname, status, avatar_url, created_at FROM users WHERE id = $1',
      [member.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];

    // Get balance
    const balanceResult = await query(
      'SELECT amount FROM balances WHERE user_id = $1',
      [member.id]
    );

    const balance = balanceResult.rows.length > 0
      ? parseFloat(balanceResult.rows[0].amount)
      : 0;

    res.json({
      success: true,
      data: {
        ...user,
        balance,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * PUT /api/users/me
 * Update current member profile (nickname, avatar_url only)
 */
router.put('/me', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const { nickname, avatar_url } = req.body;

    // Validate nickname length
    if (nickname && nickname.length > 50) {
      return res.status(400).json({ error: '昵称不能超过 50 个字符' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex++}`);
      values.push(nickname);
    }

    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(member.id);

    const updateResult = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, phone, nickname, status, avatar_url, created_at, updated_at`,
      values
    );

    // Log operation
    await logOperation({
      admin_id: member.id,
      action: 'update_profile',
      target_type: 'user',
      target_id: member.id,
      before_data: null,
      after_data: { nickname, avatar_url },
      ip_address: req.ip,
    });

    res.json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

/**
 * GET /api/users/me/addresses
 * Get all addresses for current member
 */
router.get('/me/addresses', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;

    const result = await query(
      `SELECT id, name, phone, province, city, district, detail, is_default, created_at, updated_at
       FROM user_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [member.id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: '获取地址列表失败' });
  }
});

/**
 * POST /api/users/me/addresses
 * Create a new address for current member
 */
router.post('/me/addresses', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const { name, phone, province, city, district, detail, is_default } = req.body;

    // Validate required fields
    if (!name || !phone || !province || !city || !district || !detail) {
      return res.status(400).json({ error: '请填写完整的地址信息' });
    }

    // Validate name length
    if (name.length > 50) {
      return res.status(400).json({ error: '收货人姓名不能超过 50 个字符' });
    }

    // Validate detail length
    if (detail.length > 200) {
      return res.status(400).json({ error: '详细地址不能超过 200 个字符' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
          [member.id]
        );
      }

      // Insert new address
      const insertResult = await client.query(
        `INSERT INTO user_addresses (user_id, name, phone, province, city, district, detail, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, user_id, name, phone, province, city, district, detail, is_default, created_at, updated_at`,
        [member.id, name, phone, province, city, district, detail, is_default || false]
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: member.id,
        action: 'create_address',
        target_type: 'user_address',
        target_id: insertResult.rows[0].id,
        before_data: null,
        after_data: insertResult.rows[0],
        ip_address: req.ip,
      });

      res.status(201).json({
        success: true,
        data: insertResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: '创建地址失败' });
  }
});

/**
 * PUT /api/users/me/addresses/:id
 * Update an existing address
 */
router.put('/me/addresses/:id', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const addressId = req.params.id as string;
    const { name, phone, province, city, district, detail, is_default } = req.body;

    // Verify address belongs to user
    const existingResult = await query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, member.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '地址不存在' });
    }

    // Validate lengths
    if (name && name.length > 50) {
      return res.status(400).json({ error: '收货人姓名不能超过 50 个字符' });
    }
    if (detail && detail.length > 200) {
      return res.status(400).json({ error: '详细地址不能超过 200 个字符' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [member.id, addressId]
        );
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
      if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
      if (province !== undefined) { updates.push(`province = $${paramIndex++}`); values.push(province); }
      if (city !== undefined) { updates.push(`city = $${paramIndex++}`); values.push(city); }
      if (district !== undefined) { updates.push(`district = $${paramIndex++}`); values.push(district); }
      if (detail !== undefined) { updates.push(`detail = $${paramIndex++}`); values.push(detail); }
      if (is_default !== undefined) { updates.push(`is_default = $${paramIndex++}`); values.push(is_default); }

      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '没有要更新的字段' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(addressId, member.id);

      const updateResult = await client.query(
        `UPDATE user_addresses SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
         RETURNING id, user_id, name, phone, province, city, district, detail, is_default, created_at, updated_at`,
        values
      );

      await client.query('COMMIT');

      // Log operation
      await logOperation({
        admin_id: member.id,
        action: 'update_address',
        target_type: 'user_address',
        target_id: addressId,
        before_data: null,
        after_data: updateResult.rows[0],
        ip_address: req.ip,
      });

      res.json({
        success: true,
        data: updateResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: '更新地址失败' });
  }
});

/**
 * DELETE /api/users/me/addresses/:id
 * Delete an address
 */
router.delete('/me/addresses/:id', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    const member = req.member!;
    const addressId = req.params.id as string;

    // Verify address belongs to user
    const existingResult = await query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, member.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '地址不存在' });
    }

    // Delete address
    await query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, member.id]
    );

    // Log operation
    await logOperation({
      admin_id: member.id,
      action: 'delete_address',
      target_type: 'user_address',
      target_id: addressId,
      before_data: { id: addressId },
      after_data: null,
      ip_address: req.ip,
    });

    res.json({
      success: true,
      message: '地址已删除',
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: '删除地址失败' });
  }
});

export default router;
