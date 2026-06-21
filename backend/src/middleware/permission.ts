/**
 * Permission checking helpers for admin routes
 */
import { AuthRequest } from './auth';

/**
 * Check if admin has a specific permission
 * @param req - Authenticated request with admin info
 * @param module - Module name (e.g., 'product', 'category')
 * @param action - Action name ('can_view', 'can_create', 'can_edit', 'can_delete')
 * @returns true if admin has permission
 */
export function hasPermission(
  req: AuthRequest,
  module: string,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
): boolean {
  if (!req.admin) return false;
  
  // Super admin has all permissions
  if (req.admin.roles.includes('super_admin')) return true;
  
  const perm = req.admin.permissions.find(p => p.module === module);
  if (!perm) return false;
  
  return perm[action];
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(
  module: string,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
) {
  return (req: AuthRequest, res: any, next: any) => {
    if (!hasPermission(req, module, action)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `You don't have permission to ${action.replace('can_', '')} ${module}` 
      });
    }
    next();
  };
}

/**
 * Check if admin is super_admin
 */
export function isSuperAdmin(req: AuthRequest): boolean {
  return req.admin?.roles.includes('super_admin') ?? false;
}
