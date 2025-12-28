import { supabase } from '../config/supabase';
import { User, ApiResponse, UserLink } from '../types';

export class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('UserService.getUserById error:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is ok
          console.error('Error fetching user by email:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('UserService.getUserByEmail error:', error);
      return null;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.updateUserProfile error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('UserService.updateLastLogin error:', error);
      // Don't throw error as this shouldn't break authentication
    }
  }

  static async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          role: userData.role || 'member',
          is_active: true,
          onboarding_completed: false,
          onboarding_step: 'profile',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.createUser error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async completeOnboarding(userId: string): Promise<ApiResponse<User>> {
    return this.updateUserProfile(userId, {
      onboarding_completed: true,
      onboarding_step: 'completed'
    } as Partial<User>);
  }

  static async updateOnboardingStep(
    userId: string,
    step: 'profile' | 'goals' | 'supplements' | 'completed'
  ): Promise<ApiResponse<User>> {
    const updates: Partial<User> = { onboarding_step: step };
    if (step === 'completed') {
      updates.onboarding_completed = true;
    }
    return this.updateUserProfile(userId, updates);
  }

  // ============================================
  // Family Sharing (User Links)
  // ============================================

  static async getLinkedUsers(userId: string): Promise<ApiResponse<UserLink[]>> {
    try {
      const { data, error } = await supabase
        .from('user_links')
        .select(`
          *,
          owner:users!user_links_owner_user_fkey(id, name, email),
          linked:users!user_links_linked_user_fkey(id, name, email)
        `)
        .or(`owner_user.eq.${userId},linked_user.eq.${userId}`)
        .eq('status', 'active');

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.getLinkedUsers error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async createInviteLink(
    ownerId: string,
    permission: 'read' | 'write' | 'admin' = 'read'
  ): Promise<ApiResponse<UserLink>> {
    try {
      const inviteCode = crypto.randomUUID();

      const { data, error } = await supabase
        .from('user_links')
        .insert({
          owner_user: ownerId,
          permission,
          status: 'pending',
          invite_code: inviteCode,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.createInviteLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async acceptInvite(
    inviteCode: string,
    userId: string
  ): Promise<ApiResponse<UserLink>> {
    try {
      // Find the pending invite
      const { data: invite, error: findError } = await supabase
        .from('user_links')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('status', 'pending')
        .single();

      if (findError || !invite) {
        return {
          success: false,
          error: 'Invalid or expired invite code',
          timestamp: new Date().toISOString()
        };
      }

      // Update the invite to active
      const { data, error } = await supabase
        .from('user_links')
        .update({
          linked_user: userId,
          status: 'active'
        })
        .eq('id', invite.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data,
        message: 'Successfully linked accounts',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.acceptInvite error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async revokeLink(linkId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_links')
        .update({ status: 'revoked' })
        .eq('id', linkId)
        .eq('owner_user', userId); // Only owner can revoke

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Link revoked successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserService.revokeLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if a user has access to view another user's data
   */
  static async hasAccessToUser(viewerId: string, targetUserId: string): Promise<boolean> {
    // User can always access their own data
    if (viewerId === targetUserId) return true;

    try {
      const { data, error } = await supabase
        .from('user_links')
        .select('id')
        .eq('owner_user', targetUserId)
        .eq('linked_user', viewerId)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('UserService.hasAccessToUser error:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('UserService.hasAccessToUser error:', error);
      return false;
    }
  }

  /**
   * Get permission level for a linked user
   */
  static async getPermissionLevel(
    viewerId: string,
    targetUserId: string
  ): Promise<'read' | 'write' | 'admin' | 'owner' | null> {
    // User is owner of their own data
    if (viewerId === targetUserId) return 'owner';

    try {
      const { data, error } = await supabase
        .from('user_links')
        .select('permission')
        .eq('owner_user', targetUserId)
        .eq('linked_user', viewerId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      return data.permission as 'read' | 'write' | 'admin';
    } catch (error) {
      console.error('UserService.getPermissionLevel error:', error);
      return null;
    }
  }
}
