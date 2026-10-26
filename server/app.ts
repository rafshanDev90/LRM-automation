import express from "express";
import reportRoutes from "./src/routes/report.route.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

