import 'express';

declare global {
  namespace Express {
    interface Request {
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
      member?: {
        id: string;
        phone: string;
        role: string;
      };
    }
  }
}

export {};
