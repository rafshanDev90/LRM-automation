import { Router } from 'express';
import { reportUploadMiddleware } from '../middlewares/upload.middleware.js';
import { ReportController } from '../controller/report.controller.js';

const router = Router();

// Endpoint handles mixed text payloads and multi-file code arrays
router.post(
  '/generate',
  reportUploadMiddleware.array('codeFiles', 10), 
  ReportController.createReport
);

export default router;
