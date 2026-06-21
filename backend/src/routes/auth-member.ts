// @ts-nocheck
/**
 * Member authentication routes
 * Handles registration, login, logout, and profile retrieval
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../lib/database';
import { isValidIndonesianPhone } from '../lib/phone';
import { logOperation } from '../middleware/operationLog';
import { authenticateMember, MemberRequest } from '../middleware/memberAuth';
import { generateToken } from '../lib/jwt';

const router: Router = Router();

// Password validation: >= 8 chars, at least 1 letter + 1 number
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * POST /api/auth/register
 * Register a new member account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, password, nickname } = req.body;

    // Validate phone format
    if (!isValidIndonesianPhone(phone)) {
      return res.status(400).json({
        error: '手机号格式不正确，必须为 +62 开头，后跟 8-12 位数字',
      });
    }

    // Validate password
    if (!password || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: '密码必须至少 8 位，包含字母和数字',
      });
    }

    // Validate nickname length (optional)
    if (nickname && nickname.length > 50) {
      return res.status(400).json({ error: '昵称不能超过 50 个字符' });
    }

    // Check phone uniqueness
    const existingUser = await query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: '该手机号已注册' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate nickname if not provided
    const finalNickname = nickname || `用户${phone.slice(-4)}`;

    // Insert user
    const insertResult = await query(
      `INSERT INTO users (phone, password_hash, nickname, status, balance, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', 0, '', NOW(), NOW())
       RETURNING id, phone, nickname, status, created_at`,
      [phone, passwordHash, finalNickname]
    );

    const user = insertResult.rows[0];

    // Generate JWT token (member tokens expire in 7 days)
    const token = generateToken(
      {
        userId: user.id,
        phone: user.phone,
        role: 'member',
      },
      'member'
    );

    // Log operation
    await logOperation({
      admin_id: user.id,
      action: 'register',
      target_type: 'user',
      target_id: user.id,
      before_data: null,
      after_data: { phone: user.phone, nickname: user.nickname },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          status: user.status,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/auth/login
 * Member login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validate phone format
    if (!isValidIndonesianPhone(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // Find user
    const userResult = await query(
      'SELECT id, phone, password_hash, nickname, status, avatar_url FROM users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    const user = userResult.rows[0];

    // Check status
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // Generate JWT token (member tokens expire in 7 days)
    const token = generateToken(
      {
        userId: user.id,
        phone: user.phone,
        role: 'member',
      },
      'member'
    );

    // Log operation
    await logOperation({
      admin_id: user.id,
      action: 'login',
      target_type: 'user',
      target_id: user.id,
      before_data: null,
      after_data: { phone: user.phone },
      ip_address: req.ip,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          status: user.status,
          avatar_url: user.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * GET /api/auth/me
 * Get current member profile
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
 * POST /api/auth/logout
 * Member logout (stateless, just returns success)
 */
router.post('/logout', authenticateMember, async (req: MemberRequest, res: Response) => {
  try {
    // Log operation
    await logOperation({
      admin_id: req.member!.id,
      action: 'logout',
      target_type: 'user',
      target_id: req.member!.id,
      before_data: null,
      after_data: null,
      ip_address: req.ip,
    });

    res.json({
      success: true,
      message: '退出成功',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '退出失败' });
  }
});

export default router;
