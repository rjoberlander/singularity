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
import protocolDocsRoutes from './routes/protocolDocs';

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true }));

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
      docs: '/api/v1/protocol-docs'
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
app.use('/api/v1/protocol-docs', authenticateUser, protocolDocsRoutes);

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
});

export default app;
