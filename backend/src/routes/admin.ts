import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { JsonWebTokenError } from 'jsonwebtoken';
import { query } from '../lib/database';
import { generateToken, verifyToken } from '../lib/jwt';
import { logOperation } from '../middleware/operationLog';

const router: Router = Router();

// POST /api/admin/login - Admin login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find admin by username
    const adminResult = await query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = adminResult.rows[0];

    // Check if admin is active
    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get admin roles and permissions
    const rolesResult = await query(
      `SELECT r.name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete
       FROM admin_role_assignments ara
       JOIN roles r ON ara.role_id = r.id
       LEFT JOIN permissions p ON r.id = p.role_id
       WHERE ara.admin_id = $1`,
      [admin.id]
    );

    const roles = [...new Set(rolesResult.rows.map(r => r.name))];
    const permissions = rolesResult.rows
      .filter(r => r.module)
      .map(r => ({
        module: r.module,
        can_view: r.can_view,
        can_create: r.can_create,
        can_edit: r.can_edit,
        can_delete: r.can_delete
      }));

    // Generate JWT token (admin tokens expire in 8h)
    const token = generateToken(
      { 
        adminId: admin.id, 
        username: admin.username,
        roles
      },
      'admin'
    );

    // Update last login time
    await query(
      'UPDATE admins SET last_login_at = NOW() WHERE id = $1',
      [admin.id]
    );

    // Log operation
    await logOperation({
      admin_id: admin.id,
      action: 'LOGIN',
      target_type: 'admin',
      target_id: admin.id,
      after_data: { username: admin.username },
      ip_address: req.ip
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        roles,
        permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/me - Get current admin info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token) as { adminId: string; username: string; roles: string[] };
    
    const adminResult = await query(
      'SELECT * FROM admins WHERE id = $1',
      [decoded.adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminResult.rows[0];

    // Get admin roles and permissions
    const rolesResult = await query(
      `SELECT r.name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete
       FROM admin_role_assignments ara
       JOIN roles r ON ara.role_id = r.id
       LEFT JOIN permissions p ON r.id = p.role_id
       WHERE ara.admin_id = $1`,
      [admin.id]
    );

    const roles = [...new Set(rolesResult.rows.map(r => r.name))];
    const permissions = rolesResult.rows
      .filter(r => r.module)
      .map(r => ({
        module: r.module,
        can_view: r.can_view,
        can_create: r.can_create,
        can_edit: r.can_edit,
        can_delete: r.can_delete
      }));

    res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      roles,
      permissions
    });
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Get admin info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
