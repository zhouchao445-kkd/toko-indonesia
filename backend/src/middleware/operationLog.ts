import { query } from '../lib/database';

interface OperationLogParams {
  admin_id?: string;
  operator_id?: string;
  operator_name?: string;
  action: string;
  module?: string;
  target_type: string;
  target_id?: string;
  description?: string;
  details?: any;
  before_data?: any;
  after_data?: any;
  ip_address?: string;
  user_agent?: string;
}

export async function logOperation(params: OperationLogParams): Promise<void> {
  try {
    const adminId = params.admin_id || params.operator_id || null;
    await query(
      `INSERT INTO operation_logs (admin_id, action, target_type, target_id, before_data, after_data, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        adminId,
        params.action.toUpperCase(),
        params.target_type,
        params.target_id,
        params.before_data ? JSON.stringify(params.before_data) : null,
        params.after_data ? JSON.stringify(params.after_data) : null,
        params.ip_address,
        params.user_agent
      ]
    );
  } catch (error) {
    console.error('Error logging operation:', error);
  }
}

// IMPORTANT: There is NO function to delete or update operation logs.
// This is intentional - operation logs are permanent and immutable.
// No one, including super admins, can delete or modify operation logs.
