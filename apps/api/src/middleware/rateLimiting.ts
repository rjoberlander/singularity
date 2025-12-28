import rateLimit from 'express-rate-limit';

// Remove custom key generator - let express-rate-limit handle it
// This avoids IPv6 and trust proxy issues

// Aggressive rate limiting for login attempts to prevent brute force attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 attempts per 15 minutes in production, 50 in dev
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests (only count failed login attempts)
  skipSuccessfulRequests: true,
});

// Rate limiting for registration to prevent spam account creation
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 20, // 3 accounts per hour in production, 20 in dev
  message: {
    success: false,
    error: 'Too many registration attempts from this IP, please try again after 1 hour.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for password reset requests to prevent email spam
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 reset attempts per 15 minutes in production, 10 in dev
  message: {
    success: false,
    error: 'Too many password reset requests from this IP, please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for email verification requests
export const emailVerificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 verification attempts per 5 minutes in production, 20 in dev
  message: {
    success: false,
    error: 'Too many email verification requests from this IP, please try again after 5 minutes.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiting for token refresh (users may refresh frequently)
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 200, // 50 refresh attempts per 15 minutes in production, 200 in dev
  message: {
    success: false,
    error: 'Too many token refresh requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General auth endpoint rate limiting (fallback for any auth endpoint not covered above)
export const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // 20 requests per 15 minutes in production, 100 in dev
  message: {
    success: false,
    error: 'Too many authentication requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI KB Agent rate limiting - more lenient for import operations
export const aiKbAgentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // 100 requests per 5 minutes in production
  message: {
    success: false,
    error: 'Too many AI KB requests. Please wait a moment and try again.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

// URL import rate limiting - very lenient for bulk operations
export const urlImportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 60 : 300, // 60 requests per minute in production
  message: {
    success: false,
    error: 'Import rate limit reached. Please wait before importing more URLs.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});