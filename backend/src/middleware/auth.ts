import { Request, Response, NextFunction } from 'express';
import { query } from '../lib/database';
import { verifyToken } from '../lib/jwt';
import { JsonWebTokenError } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    username: string;
    roles: string[];
    permissions: Array<{
      module: string;
      can_view: boolean;
      can_create: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }>;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    const decoded = verifyToken(token) as { adminId: string };
    
    // Get admin info
    const adminResult = await query(
      'SELECT * FROM admins WHERE id = $1',
      [decoded.adminId]
    );

    if (adminResult.rows.length === 0) {
      res.status(401).json({ error: 'Unauthorized - Admin not found' });
      return;
    }

    const admin = adminResult.rows[0];

    if (admin.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    // Get roles and permissions
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

    req.admin = {
      id: admin.id,
      username: admin.username,
      roles,
      permissions
    };

    next();
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requirePermission(module: string, action: 'view' | 'create' | 'edit' | 'delete') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Super admin has all permissions
    if (req.admin.roles.includes('super_admin')) {
      next();
      return;
    }

    // Finance super admin has special permissions for financial operations
    if (req.admin.roles.includes('finance_super_admin') && module === 'finance') {
      next();
      return;
    }

    const permission = req.admin.permissions.find(p => p.module === module);
    
    if (!permission) {
      res.status(403).json({ error: 'No permission for this module' });
      return;
    }

    const hasPermission = permission[`can_${action}`];
    
    if (!hasPermission) {
      res.status(403).json({ error: `No permission to ${action} in ${module}` });
      return;
    }

    next();
  };
}
