import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Configure proxy BEFORE any other imports (for sandbox environments)
import './config/proxy';

// Import routes
import authRoutes from './routes/auth';
import biomarkerRoutes from './routes/biomarkers';
import supplementRoutes from './routes/supplements';
import routineRoutes from './routes/routines';
import goalRoutes from './routes/goals';
import aiRoutes from './routes/ai';
import userRoutes from './routes/users';
import aiAPIKeyRoutes from './modules/ai-api-keys/routes';
import healthChatRoutes from './modules/kb-agent/routes';
import eightSleepRoutes from './modules/eight-sleep/routes';
import adminRoutes from './routes/admin';
import { startSyncScheduler } from './modules/eight-sleep/jobs/syncScheduler';

// Import cron jobs
import { startAIKeyHealthCheckCron } from './cron/aiKeyHealthCheck';

// Import middleware
import { authenticateUser } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiting';

// Import config
import { APP_NAME, APP_VERSION } from './config/workspace';

const app = express();
const PORT = process.env.PORT || 3001;

// ==============================================
// Middleware
// ==============================================

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Web app
  'http://localhost:8081',  // Mobile app (Expo)
  process.env.FRONTEND_URL, // Production URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing - 100MB limit for large PDF files (base64 encoded)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Rate limiting
app.use(rateLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ==============================================
// Routes
// ==============================================

// Health check (public)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app: APP_NAME,
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  });
});

// API version info (public)
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    app: APP_NAME,
    version: APP_VERSION,
    description: 'AI-Powered Health Protocol Tracking API',
    endpoints: {
      auth: '/api/v1/auth',
      biomarkers: '/api/v1/biomarkers',
      supplements: '/api/v1/supplements',
      routines: '/api/v1/routines',
      goals: '/api/v1/goals',
      ai: '/api/v1/ai',
      users: '/api/v1/users',
      aiApiKeys: '/api/v1/ai-api-keys',
      chat: '/api/v1/chat',
      eightSleep: '/api/v1/eight-sleep',
      admin: '/api/v1/admin'
    }
  });
});

// Public routes (no auth required)
app.use('/api/v1/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/v1/biomarkers', authenticateUser, biomarkerRoutes);
app.use('/api/v1/supplements', authenticateUser, supplementRoutes);
app.use('/api/v1/routines', authenticateUser, routineRoutes);
app.use('/api/v1/goals', authenticateUser, goalRoutes);
app.use('/api/v1/ai', authenticateUser, aiRoutes);
app.use('/api/v1/users', authenticateUser, userRoutes);
app.use('/api/v1/ai-api-keys', aiAPIKeyRoutes); // Auth handled in routes
app.use('/api/v1/chat', healthChatRoutes); // Health AI chat assistant
app.use('/api/v1/eight-sleep', authenticateUser, eightSleepRoutes); // Eight Sleep integration
app.use('/api/v1/admin', adminRoutes); // Admin routes (auth handled in routes)

// ==============================================
// Error Handling
// ==============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// Server Start
// ==============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🧬 ${APP_NAME} API v${APP_VERSION}                     ║
║   Health Protocol Tracking Server                ║
║                                                  ║
║   Server running on port ${PORT}                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);

  // Start cron jobs
  startAIKeyHealthCheckCron();

  // Start Eight Sleep sync scheduler
  startSyncScheduler();
});

export default app;
