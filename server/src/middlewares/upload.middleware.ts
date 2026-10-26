// src/middleware/upload.middleware.ts
import multer from 'multer';

// Process incoming file uploads purely in-memory to prevent disk bloating
const storage = multer.memoryStorage();

export const reportUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit per source asset block
    files: 10                  // 10 max files per report compilation run
  }
});
