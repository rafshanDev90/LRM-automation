import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { HighlightService } from '../services/highlight.service.js';
import { PdfService, TaskData } from '../services/pdf.service.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(currentDir, '../templates/default.report.html');

const MAX_TASKS = 20;
const MAX_FILES_PER_TASK = 10;

interface IncomingTask {
  title?: unknown;
  description?: unknown;
  outputLogs?: unknown;
}

class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Normalizes multipart values, which may arrive as a string or an array of strings. */
const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
};

export class ReportController {
  public static async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labTitle = asText(req.body.labTitle).trim() || asText(req.body.title).trim();
      const incomingTasks = ReportController.parseTasks(req.body);

      if (!labTitle) {
        throw new HttpError(400, 'A lab title is required.');
      }

      if (incomingTasks.length === 0) {
        throw new HttpError(400, 'At least one task is required.');
      }

      if (incomingTasks.length > MAX_TASKS) {
        throw new HttpError(400, `A report can contain at most ${MAX_TASKS} tasks.`);
      }

      // Validate and normalize every task before doing any expensive rendering work.
      const normalizedTasks = incomingTasks.map((task, index) => {
        const title = asText(task.title).trim();
        if (!title) {
          throw new HttpError(400, `Task ${index + 1} needs a title.`);
        }
        return {
          title,
          description: asText(task.description),
          outputLogs: asText(task.outputLogs)
        };
      });

      const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
      const filesByTask = ReportController.groupFilesByTask(uploadedFiles, normalizedTasks.length);

      const taskData: TaskData[] = normalizedTasks.map((task, index) => {
        const files = filesByTask.get(index) ?? [];
        return {
          ...task,
          highlightedFiles: HighlightService.highlightFiles(
            files.map((file) => ({
              originalName: file.originalname,
              rawContent: file.buffer.toString('utf-8')
            }))
          )
        };
      });

      const htmlTemplate = await fs.readFile(TEMPLATE_PATH, 'utf-8');
      const pdfBuffer = await PdfService.generateReport({ labTitle, tasks: taskData }, htmlTemplate);

      const slug =
        labTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'lab';

      const filename = `lab_report_${slug}_${Date.now()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.end(pdfBuffer);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Accepts either the new `tasks` JSON array or the legacy single-task payload
   * (`title`, `description`, `outputLogs`, `codeFiles`).
   */
  private static parseTasks(body: Request['body']): IncomingTask[] {
    const rawTasks = body?.tasks;

    if (typeof rawTasks === 'string' && rawTasks.trim() !== '') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawTasks);
      } catch {
        throw new HttpError(400, 'Task metadata must be valid JSON.');
      }

      if (!Array.isArray(parsed)) {
        throw new HttpError(400, 'Task metadata must be an array.');
      }

      return parsed as IncomingTask[];
    }

    const hasLegacyPayload =
      body?.title !== undefined || body?.description !== undefined || body?.outputLogs !== undefined;

    if (hasLegacyPayload) {
      return [{ title: body.title, description: body.description, outputLogs: body.outputLogs }];
    }

    return [];
  }

  private static groupFilesByTask(
    files: Express.Multer.File[],
    taskCount: number
  ): Map<number, Express.Multer.File[]> {
    const grouped = new Map<number, Express.Multer.File[]>();

    for (const file of files) {
      let taskIndex = 0;

      if (file.fieldname === 'codeFiles') {
        // Legacy single-task requests upload every file under `codeFiles`.
        taskIndex = 0;
      } else {
        const match = /^task_(\d+)$/.exec(file.fieldname);
        if (!match) {
          throw new HttpError(400, `Unexpected file field "${file.fieldname}".`);
        }
        taskIndex = Number(match[1]);
      }

      if (taskIndex < 0 || taskIndex >= taskCount) {
        throw new HttpError(
          400,
          `File "${file.originalname}" targets task ${taskIndex + 1}, which does not exist.`
        );
      }

      const bucket = grouped.get(taskIndex) ?? [];
      if (bucket.length >= MAX_FILES_PER_TASK) {
        throw new HttpError(
          400,
          `Task ${taskIndex + 1} can include at most ${MAX_FILES_PER_TASK} files.`
        );
      }

      bucket.push(file);
      grouped.set(taskIndex, bucket);
    }

    return grouped;
  }
}
