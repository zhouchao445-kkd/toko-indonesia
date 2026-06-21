/**
 * Admin Upload Routes
 * POST /api/admin/upload/image - Upload an image (products, banners, logos, etc.)
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logOperation } from '../middleware/operationLog';
import { requirePermission } from '../middleware/permission';
import { uploadSingle } from '../middleware/upload';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

/**
 * POST /api/admin/upload/image
 * Upload an image file
 * Returns the URL path for the uploaded file
 */
router.post(
  '/image',
  requirePermission('upload', 'can_create'),
  uploadSingle('images', 'admin'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const url = `/uploads/${file.filename}`;

      // Log operation
      await logOperation({
        operator_id: req.admin!.id,
        operator_name: req.admin!.username,
        action: 'create',
        module: 'upload',
        target_type: 'file',
        target_id: "0",
        description: `Uploaded image: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`,
        ip_address: req.ip || req.socket.remoteAddress || '',
        user_agent: req.get('user-agent') || ''
      });

      return res.status(201).json({
        url,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  }
);

export default router;
