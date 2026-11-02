// src/middleware/upload.middleware.ts
import multer from 'multer';

// Process incoming file uploads purely in-memory to prevent disk bloating
const storage = multer.memoryStorage();

export const reportUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit per source asset block
    files: 50,                 // Hard cap across the whole lab (per-task cap is enforced in the controller)
    fieldSize: 2 * 1024 * 1024 // Guards the JSON task metadata field
  }
});
