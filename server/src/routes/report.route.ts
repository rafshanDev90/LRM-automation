import { Router } from 'express';
import { reportUploadMiddleware } from '../middlewares/upload.middleware.js';
import { ReportController } from '../controller/report.controller.js';

const router = Router();

// Accepts dynamic per-task file fields: task_0, task_1, ... (plus legacy `codeFiles`)
router.post(
  '/generate',
  reportUploadMiddleware.any(),
  ReportController.createReport
);

export default router;
