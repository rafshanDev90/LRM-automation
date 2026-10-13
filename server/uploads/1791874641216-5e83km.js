import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { httpLogStream } from './utils/logger.js';
import { UPLOADS_DIR } from './utils/uploadPaths.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// cPanel sits behind Apache/LiteSpeed, so trust the first proxy hop for
// correct client IPs (rate limiting, logging).
app.set('trust proxy', 1);

// Security headers. Product images are served from the API origin but embedded
// by the storefront/admin on other origins, so allow cross-origin embedding.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Serve user-uploaded product images from the backend project directory.
app.use('/uploads', express.static(UPLOADS_DIR));

// Allow the storefront and the admin dashboard to call the API. `allowedOrigins`
// combines CLIENT_URL/ADMIN_URL with the live production origins, normalized so a
// trailing slash in the env vars cannot silently reject every preflight.
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
  }),
);

// Body parsers.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Prevent stale browser caching on admin API calls.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Stream every HTTP request through Winston at the `http` level.
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: httpLogStream,
  })
);

// Basic rate limiting for the whole API.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  })
);

// Service index.
app.get('/', (req, res) => {
  res.json({ name: 'Fashion Store API', health: '/api/health' });
});

// API routes.
app.use('/api', routes);

// 404 + centralized error handling (must be last).
app.use(notFound);
app.use(errorHandler);

export default app;
