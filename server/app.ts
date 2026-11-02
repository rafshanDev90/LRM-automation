import express from "express";
import reportRoutes from "./src/routes/report.route.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const currentDir = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the public folder from this file rather than the process CWD
const publicPath = path.resolve(currentDir, 'src/public');

// 1. Explicitly catch the root web request and send the interface file
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 2. Serve static dashboard assets (CSS, JS, etc.) safely
app.use(express.static(publicPath));

// Ingress API routes injection
app.use('/api/reports', reportRoutes);

// Centralized error fallback, including upload limit failures from Multer
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.name === 'MulterError') {
    const isLimit = err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT';
    res.status(isLimit ? 413 : 400).json({
      success: false,
      error: isLimit ? 'Uploaded files exceed the allowed size or count.' : err.message
    });
    return;
  }

  console.error('Unhandled System Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal System Generation Failure',
    message: err.message
  });
});

export default app;
