import { Request, Response, NextFunction } from 'express';
import { HighlightService, CodeFilePayload } from '../services/highlight.service.js';
import { PdfService } from '../services/pdf.service.js';
import fs from 'fs/promises';
import path from 'path';

export class ReportController {
  public static async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, outputLogs } = req.body;
      const uploadedFiles = req.files as Express.Multer.File[] || [];

      // 1. Map raw file buffers into string payloads for parsing
      const filePayloads: CodeFilePayload[] = uploadedFiles.map(file => ({
        originalName: file.originalname,
        rawContent: file.buffer.toString('utf-8')
      }));

      // 2. Execute server-side syntax tokenization
      const highlightedFiles = HighlightService.highlightFiles(filePayloads);

      // 3. Load the structural HTML/CSS blueprint template from disk
      const templatePath = path.resolve('src/templates/default.report.html');
      const htmlTemplate = await fs.readFile(templatePath, 'utf-8');

      // 4. Compile layout and render the PDF binary array via Puppeteer
      const pdfBuffer = await PdfService.generateReport({
        title,
        description,
        highlightedFiles,
        outputLogs
      }, htmlTemplate);

      // 5. Build safe file naming and force browser attachment download
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `report_${sanitizedTitle}_${Date.now()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
