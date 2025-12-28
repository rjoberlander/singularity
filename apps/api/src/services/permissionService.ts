import { supabase } from '../config/supabase';
import { UserService } from './userService';

/**
 * Simplified Permission Service for Singularity
 *
 * Roles:
 * - owner: Full access to all their data, can invite family members
 * - member: Access to data shared with them (via user_links)
 *
 * Permission Levels (via user_links):
 * - read: Can view shared data
 * - write: Can view and edit shared data
 * - admin: Full access to shared data (like the owner)
 */
export class PermissionService {
  /**
   * Check if user has a specific permission
   * For Singularity, permissions are simplified to role-based
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) return false;

      // Owner has all permissions
      if (user.role === 'owner') return true;

      // Map permission strings to access levels
      const readPermissions = [
        'biomarkers.read',
        'supplements.read',
        'routines.read',
        'goals.read',
        'changelog.read',
        'docs.read'
      ];

      const writePermissions = [
        'biomarkers.write',
        'supplements.write',
        'routines.write',
        'goals.write',
        'changelog.write',
        'docs.write'
      ];

      // Members can read their own data
      if (readPermissions.includes(permission)) {
        return true;
      }

      // Members can write their own data
      if (writePermissions.includes(permission)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('PermissionService.hasPermission error:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has a permission pattern (wildcards)
   */
  static async hasPermissionPattern(userId: string, pattern: string): Promise<boolean> {
    // For simplicity, treat pattern as exact match for now
    return this.hasPermission(userId, pattern);
  }

  /**
   * Check if viewer can access target user's data for a specific resource
   */
  static async canAccessUserData(
    viewerId: string,
    targetUserId: string,
    resource: string,
    action: 'read' | 'write' = 'read'
  ): Promise<boolean> {
    // Users can always access their own data
    if (viewerId === targetUserId) return true;

    // Check if viewer has a link to target user's data
    const permissionLevel = await UserService.getPermissionLevel(viewerId, targetUserId);

    if (!permissionLevel) return false;

    // Map permission levels to actions
    if (action === 'read') {
      return ['read', 'write', 'admin', 'owner'].includes(permissionLevel);
    }

    if (action === 'write') {
      return ['write', 'admin', 'owner'].includes(permissionLevel);
    }

    return false;
  }

  /**
   * Get all user IDs that a viewer can access
   * Returns the viewer's own ID plus any linked users
   */
  static async getAccessibleUserIds(viewerId: string): Promise<string[]> {
    const userIds = [viewerId];

    try {
      // Get all active links where this user is the linked_user
      const { data, error } = await supabase
        .from('user_links')
        .select('owner_user')
        .eq('linked_user', viewerId)
        .eq('status', 'active');

      if (!error && data) {
        for (const link of data) {
          userIds.push(link.owner_user);
        }
      }

      return userIds;
    } catch (error) {
      console.error('PermissionService.getAccessibleUserIds error:', error);
      return userIds;
    }
  }
}
