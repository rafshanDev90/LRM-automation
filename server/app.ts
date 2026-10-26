import express from "express";
import reportRoutes from "./src/routes/report.route.js";
import path from "path"; // Fixed: Changed from path/win32 to platform-agnostic path

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the absolute path to your public folder safely across Linux, macOS, and Windows
const publicPath = path.resolve('src/public');

// 1. Explicitly catch the root web request and send the interface file
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 2. Serve static dashboard assets (CSS, JS, etc.) safely
app.use(express.static(publicPath));

// Ingress API routes injection
app.use('/api/reports', reportRoutes);

// Simple centralized global catch-all error fallback handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled System Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal System Generation Failure',
    message: err.message
  });
});

export default app;
