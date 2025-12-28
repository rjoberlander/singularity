import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseClient } from '../config/supabase';
import { User } from '../types';
import { UserService } from '../services/userService';
import { PermissionService } from '../services/permissionService';

// Note: supabaseClient is pre-configured with proxy support in config/supabase.ts

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  console.log('🔒 [AUTH] Middleware called for:', req.method, req.originalUrl);

  // Bypass auth for public invitation validation endpoints
  // Users need to validate invite tokens BEFORE they have accounts/are logged in
  if (req.originalUrl?.match(/\/api\/v1\/invitations\/[^\/]+\/validate$/)) {
    return next();
  }

  try {
    // Development bypass for testing
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
      console.log('🚧 Development bypass enabled for:', req.path);
      req.user = {
        id: 'dev-user-id',
        email: 'dev@singularity.app',
        role: 'owner',
        is_active: true,
      } as User;
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        error_type: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token using pre-configured supabaseClient (has proxy support)
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      console.error('🔴 [AUTH] Token verification failed:', error?.message || 'No user returned');
      console.error('🔴 [AUTH] Full error:', JSON.stringify(error, null, 2));
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        error_type: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch additional user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      console.error('User ID that failed lookup:', user.id);
      console.error('User email from token:', user.email);

      // Check if user not found vs other database error
      if (userError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          error_type: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error fetching user data',
        error_type: 'DATABASE_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is active (default to true if field doesn't exist)
    if (userData.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'User account is deactivated',
        error_type: 'ACCOUNT_DEACTIVATED',
        timestamp: new Date().toISOString()
      });
    }

    // Update last login time asynchronously
    UserService.updateLastLogin(userData.id).catch(err => {
      console.error('Failed to update last login:', err);
    });

    // Attach user to request object
    req.user = userData;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
      error_type: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    // Verify token using pre-configured supabaseClient (has proxy support)
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (!error && user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        req.user = userData;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if there's an error
  }
};

// Alias for authenticateUser for backward compatibility
export const authenticateToken = authenticateUser;
export const requireAuth = authenticateUser;

// Convenience middleware for owner-only routes
export const requireOwner = [
  authenticateUser,
  requireRole(['owner'])
];

// Helper to get client IP address
export const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown';
};

// Enhanced permission-based authorization middleware

/**
 * Require a specific permission for access
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_type: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const hasPermission = await PermissionService.hasPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Permission denied. Required permission: ${permission}`,
          error_type: 'INSUFFICIENT_PERMISSIONS',
          required_permission: permission,
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal permission check error',
        error_type: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Require any of the specified permissions for access
 */
export const requireAnyPermission = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_type: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const hasAnyPermission = await PermissionService.hasAnyPermission(req.user.id, permissions);

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          error: `Permission denied. Required any of: ${permissions.join(', ')}`,
          error_type: 'INSUFFICIENT_PERMISSIONS',
          required_permissions: permissions,
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal permission check error',
        error_type: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
};
