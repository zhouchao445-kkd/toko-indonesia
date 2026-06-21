/**
 * Member authentication middleware
 * Validates JWT tokens for member users (not admin)
 */
import { Request, Response, NextFunction } from 'express';
import { query } from '../lib/database';
import { verifyToken } from '../lib/jwt';

// Extend Request to include member user info
export interface MemberRequest extends Request {
  member?: {
    id: string;
    phone: string;
    nickname: string;
    role: string;
  };
}

/**
 * Middleware to authenticate member users
 * Extracts JWT from Authorization header and validates
 */
export async function authenticateMember(
  req: MemberRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    const token = authHeader.substring(7);

    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch {
      res.status(401).json({ error: '登录已过期，请重新登录' });
      return;
    }

    // Check if this is a member token (not admin)
    if (decoded.role !== 'member') {
      res.status(401).json({ error: '无效的令牌类型' });
      return;
    }

    // Verify user exists and is active
    const userResult = await query(
      'SELECT id, phone, nickname, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: '用户不存在' });
      return;
    }

    const user = userResult.rows[0];
    if (user.status !== 'active') {
      res.status(403).json({ error: '账号已被禁用' });
      return;
    }

    // Attach user info to request
    req.member = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      role: 'member',
    };

    next();
  } catch (error) {
    console.error('Member auth error:', error);
    res.status(500).json({ error: '认证失败' });
  }
}

/**
 * Optional member authentication
 * Does not reject if no token, but attaches user if valid token exists
 */
export async function optionalMemberAuth(
  req: MemberRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch {
      next();
      return;
    }

    if (decoded.role !== 'member') {
      next();
      return;
    }

    const userResult = await query(
      'SELECT id, phone, nickname, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].status === 'active') {
      req.member = {
        id: userResult.rows[0].id,
        phone: userResult.rows[0].phone,
        nickname: userResult.rows[0].nickname,
        role: 'member',
      };
    }

    next();
  } catch (error) {
    console.error('Optional member auth error:', error);
    next();
  }
}
