/**
 * File upload middleware using multer
 * Handles payment proof image uploads
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Upload directory configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PAYMENT_PROOFS_DIR = path.join(UPLOAD_DIR, 'payment-proofs');

// Ensure directories exist
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// File type whitelist
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Storage configuration for payment proofs
 * Path: /uploads/payment-proofs/{userId}/{orderId}-{timestamp}.{ext}
 */
const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).member?.id;
    if (!userId) {
      cb(new Error('User not authenticated'), '');
      return;
    }

    const userDir = path.join(PAYMENT_PROOFS_DIR, userId);
    ensureDir(userDir);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const orderId = (req.params as any).orderId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${orderId}-${timestamp}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for payment proofs
 * Only allows JPEG, PNG, WebP images
 */
function paymentProofFileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG、PNG、WebP 格式的图片'));
  }
}

/**
 * Multer instance for payment proof uploads
 */
export const uploadPaymentProof: RequestHandler = multer({
  storage: paymentProofStorage,
  fileFilter: paymentProofFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('file');

/**
 * General purpose upload middleware for admin uploads
 * @param subDir - Subdirectory under uploads (e.g., 'images', 'products')
 * @param prefix - Filename prefix (e.g., 'admin', 'product')
 */
export function uploadSingle(subDir: string = 'images', prefix: string = 'upload'): RequestHandler {
  const targetDir = path.join(UPLOAD_DIR, subDir);
  ensureDir(targetDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${prefix}-${timestamp}${ext}`;
      cb(null, filename);
    },
  });

  const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG、PNG、WebP 格式的图片'));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
  }).single('file');
}
export function handleMulterError(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: '文件大小不能超过 5MB' });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ error: '只能上传一个文件' });
      return;
    }
    res.status(400).json({ error: `上传错误: ${err.message}` });
    return;
  }

  if (err.message === '仅支持 JPG、PNG、WebP 格式的图片') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === 'User not authenticated') {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  next(err);
}

/**
 * Get the upload directory path
 */
export function getUploadDir(): string {
  return UPLOAD_DIR;
}

/**
 * Get the payment proofs directory path
 */
export function getPaymentProofsDir(): string {
  return PAYMENT_PROOFS_DIR;
}
