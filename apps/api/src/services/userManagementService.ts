import { supabase } from '../config/supabase';
import { 
  User, 
  UserInvitation, 
  AuditLog, 
  ApiResponse, 
  InviteUserRequest,
  UpdateUserRoleRequest,
  AuditAction 
} from '../types';
import crypto from 'crypto';
import { invalidateUserSessions } from '../utils/invalidateUserSessions';
import { emailService } from './emailService';

export class UserManagementService {
  // User Management Methods
  static async getAllUsersWithDetails(
    workspaceId?: string,
    page: number = 1,
    limit: number = 25,
    search?: string,
    role?: string,
    status?: string
  ): Promise<ApiResponse<{ users: User[]; total: number; page: number; totalPages: number }>> {
    try {
      // Calculate offset
      const offset = (page - 1) * limit;

      // Build base query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

      if (workspaceId) {
        query = supabase
          .from('users')
          .select(`
            *,
            workspace_members!inner(workspace_id)
          `, { count: 'exact' })
          .eq('workspace_members.workspace_id', workspaceId);
      }

      // Apply filters
      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      if (role) {
        query = query.eq('role', role);
      }

      if (status === 'active') {
        query = query
          .eq('is_active', true)
          .not('email', 'like', '%@invite.placeholder%'); // Exclude shareable invite link placeholders
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Always exclude shareable invite link placeholders from general user listing
      if (!status || status !== 'all') {
        query = query.not('email', 'like', '%@invite.placeholder%');
      }

      // Apply pagination and ordering
      query = query
        .order('full_name', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          users: data || [],
          total,
          page,
          totalPages
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.getAllUsersWithDetails error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async updateUserRole(
    userId: string,
    newRole: 'admin' | 'member',
    adminUserId: string,
    workspaceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<User>> {
    try {
      // Check if user exists and get current role
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !currentUser) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        };
      }

      // Prevent self-demotion if user is the last admin
      if (userId === adminUserId && currentUser.role === 'admin' && newRole === 'member') {
        const { data: adminCount } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true);

        if (adminCount && adminCount.length <= 1) {
          return {
            success: false,
            error: 'Cannot demote the last admin user',
            timestamp: new Date().toISOString()
          };
        }
      }

      // Update user role
      const { data, error } = await supabase
        .from('users')
        .update({
          role: newRole,
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

      // Log the action
      await this.logAuditEvent({
        workspace_id: workspaceId,
        user_id: adminUserId,
        target_user_id: userId,
        action: 'user_role_changed',
        details: {
          old_role: currentUser.role,
          new_role: newRole,
          email: currentUser.email
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.updateUserRole error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async deactivateUser(
    userId: string,
    adminUserId: string,
    workspaceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<User>> {
    try {
      // Check if user exists
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !currentUser) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        };
      }

      // Prevent self-deactivation if user is the last admin
      if (userId === adminUserId && currentUser.role === 'admin') {
        const { data: adminCount } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true)
          .neq('id', userId);

        if (!adminCount || adminCount.length === 0) {
          return {
            success: false,
            error: 'Cannot deactivate the last admin user',
            timestamp: new Date().toISOString()
          };
        }
      }

      // Deactivate user
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: false,
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

      // Invalidate all active sessions for the deactivated user
      try {
        await invalidateUserSessions(userId);
        console.log(`Sessions invalidated for deactivated user: ${userId}`);
      } catch (sessionError) {
        console.error('Failed to invalidate sessions:', sessionError);
        // Continue even if session invalidation fails
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: workspaceId,
        user_id: adminUserId,
        target_user_id: userId,
        action: 'user_deactivated',
        details: {
          email: currentUser.email,
          role: currentUser.role
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.deactivateUser error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async reactivateUser(
    userId: string,
    adminUserId: string,
    workspaceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<User>> {
    try {
      // Get current user details
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !currentUser) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        };
      }

      // Reactivate user
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: true,
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

      // Log the action
      await this.logAuditEvent({
        workspace_id: workspaceId,
        user_id: adminUserId,
        target_user_id: userId,
        action: 'user_reactivated',
        details: {
          email: currentUser.email,
          role: currentUser.role
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.reactivateUser error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async deleteUser(
    userId: string,
    adminUserId: string,
    workspaceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      // Check if user exists and is deactivated
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !currentUser) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        };
      }

      // Only allow deletion of deactivated users
      if (currentUser.is_active) {
        return {
          success: false,
          error: 'Cannot delete active users. Please deactivate the user first.',
          timestamp: new Date().toISOString()
        };
      }

      // Delete user record from database
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message,
          timestamp: new Date().toISOString()
        };
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: workspaceId,
        user_id: adminUserId,
        target_user_id: userId,
        action: 'user_deleted',
        details: {
          email: currentUser.email,
          role: currentUser.role,
          permanent: true
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data: { deleted: true },
        message: 'User deleted successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.deleteUser error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Invitation Management Methods
  static async inviteUser(
    invitation: InviteUserRequest & { channelIds?: string[] },
    invitedByUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<UserInvitation>> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, is_active')
        .eq('email', invitation.email.toLowerCase())
        .single();

      if (existingUser) {
        if (existingUser.is_active) {
          return {
            success: false,
            error: 'User with this email already exists and is active',
            timestamp: new Date().toISOString()
          };
        } else {
          // Reactivate existing user instead of sending invitation
          const reactivateResult = await this.reactivateUser(
            existingUser.id,
            invitedByUserId,
            invitation.workspace_id,
            ipAddress,
            userAgent
          );
          
          if (reactivateResult.success) {
            return {
              success: true,
              data: {
                id: 'reactivated',
                email: invitation.email,
                status: 'accepted'
              } as any,
              message: 'User has been reactivated',
              timestamp: new Date().toISOString()
            };
          }
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', invitation.email.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        return {
          success: false,
          error: 'Pending invitation already exists for this email',
          timestamp: new Date().toISOString()
        };
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation
      const { data, error } = await supabase
        .from('user_invitations')
        .insert({
          email: invitation.email.toLowerCase(),
          invited_by: invitedByUserId,
          workspace_id: invitation.workspace_id,
          role: invitation.role || 'member',
          token,
          expires_at: expiresAt.toISOString()
        })
        .select(`
          *,
          invited_by_user:users!user_invitations_invited_by_fkey(
            id, full_name, display_name, email
          )
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Store channel selections if provided
      if (invitation.channelIds && invitation.channelIds.length > 0) {
        const channelSelections = invitation.channelIds.map(channelId => ({
          user_invitation_id: data.id,
          channel_id: channelId
        }));

        const { error: channelError } = await supabase
          .from('user_channel_selections')
          .insert(channelSelections);

        if (channelError) {
          console.error('Failed to store channel selections:', channelError);
          // Don't fail the invitation for this, just log the error
        }
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: invitation.workspace_id,
        user_id: invitedByUserId,
        target_user_id: undefined,
        action: 'user_invited',
        details: {
          email: invitation.email,
          role: invitation.role || 'member',
          token_expires_at: expiresAt.toISOString(),
          selected_channels: invitation.channelIds || []
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      // Try to send invitation email
      try {
        // Check if email service is configured (using same env vars as EmailService)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.warn('Email service not configured, invitation email not sent');
          // Return success with a note about using invite link instead
          return {
            success: true,
            data,
            message: 'Invitation created successfully. Email service not configured - please use the invite link feature instead.',
            timestamp: new Date().toISOString()
          };
        }
        
        // Send invitation email using EmailService
        const inviterName = data.invited_by_user?.display_name || data.invited_by_user?.full_name || 'SlackKB Team';
        const invitationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${data.token}`;
        
        const emailSent = await emailService.sendInvitation({
          email: data.email,
          inviterName: inviterName,
          workspaceName: 'SlackKB Workspace', // TODO: Get actual workspace name from database
          invitationUrl: invitationUrl,
          expiresAt: new Date(data.expires_at)
        });
        
        if (emailSent) {
          console.log('✅ Invitation email sent successfully to:', data.email);
        } else {
          console.warn('⚠️ Invitation email failed to send to:', data.email);
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Still return success but with a warning about email
        return {
          success: true,
          data,
          message: 'Invitation created but email could not be sent. Please use the invite link feature instead.',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.inviteUser error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Generate invite link
  static async generateInviteLink(
    role: 'admin' | 'member',
    expiresInDays: number,
    maxUses: number,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<any>> {
    try {
      // Generate a secure random token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Create invite link record
      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          token,
          role,
          max_uses: maxUses,
          uses: 0,
          expires_at: expiresAt.toISOString(),
          created_by: adminUserId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create invite link:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: undefined, // invite links are global
        user_id: adminUserId,
        target_user_id: undefined,
        action: 'invite_link_created',
        details: { 
          resource_type: 'invite_links',
          resource_id: data.id,
          role, 
          expiresInDays, 
          maxUses 
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data: {
          id: data.id,
          token: data.token,
          role: data.role,
          max_uses: data.max_uses,
          expires_at: data.expires_at
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.generateInviteLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get all invite links
  static async getInviteLinks(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('invite_links')
        .select(`
          *,
          created_by_user:users!invite_links_created_by_fkey(
            id, full_name, display_name, email
          )
        `)
        .order('created_at', { ascending: false });

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
      console.error('UserManagementService.getInviteLinks error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Revoke invite link
  static async revokeInviteLink(
    linkId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('invite_links')
        .update({ is_active: false })
        .eq('id', linkId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: undefined, // invite links are global
        user_id: adminUserId,
        target_user_id: undefined,
        action: 'invite_link_revoked',
        details: {
          resource_type: 'invite_links',
          resource_id: linkId
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.revokeInviteLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getInvitations(workspaceId?: string): Promise<ApiResponse<UserInvitation[]>> {
    try {
      let query = supabase
        .from('user_invitations')
        .select(`
          *,
          invited_by_user:users!user_invitations_invited_by_fkey(
            id, full_name, display_name, email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

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
      console.error('UserManagementService.getInvitations error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async revokeInvitation(
    invitationId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<UserInvitation>> {
    try {
      // Get invitation details first
      const { data: invitation, error: getError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (getError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found',
          timestamp: new Date().toISOString()
        };
      }

      // Update invitation status
      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Log the action
      await this.logAuditEvent({
        workspace_id: invitation.workspace_id,
        user_id: adminUserId,
        target_user_id: undefined,
        action: 'invitation_revoked',
        details: {
          email: invitation.email,
          role: invitation.role,
          original_invited_by: invitation.invited_by
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.revokeInvitation error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async resendInvitation(
    invitationId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApiResponse<UserInvitation>> {
    try {
      // Get invitation details first
      const { data: invitation, error: getError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (getError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found',
          timestamp: new Date().toISOString()
        };
      }

      // Check if invitation is already accepted or expired
      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: `Cannot resend ${invitation.status} invitation`,
          timestamp: new Date().toISOString()
        };
      }

      // Generate new expiry date (7 days from now)
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      // Update the invitation with new expiry
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('user_invitations')
        .update({
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          timestamp: new Date().toISOString()
        };
      }

      // Get inviter details for the email
      const { data: inviterUser } = await supabase
        .from('users')
        .select('display_name, full_name')
        .eq('id', invitation.invited_by)
        .single();
      
      const inviterName = inviterUser?.display_name || inviterUser?.full_name || 'SlackKB Team';
      const invitationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
      
      // Send the invitation email again
      await emailService.sendInvitation({
        email: invitation.email,
        inviterName: inviterName,
        workspaceName: 'SlackKB Workspace',
        invitationUrl: invitationUrl,
        expiresAt: newExpiresAt
      });

      // Log the action
      await this.logAuditEvent({
        workspace_id: invitation.workspace_id,
        user_id: adminUserId,
        action: 'invitation_resent' as AuditAction,
        details: {
          invitation_id: invitationId,
          email: invitation.email,
          new_expires_at: newExpiresAt.toISOString()
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        data: updatedInvitation,
        message: 'Invitation resent successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.resendInvitation error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async acceptInvitation(
    token: string,
    userId: string
  ): Promise<ApiResponse<UserInvitation>> {
    try {
      // First validate and use the invite link
      const validationResult = await this.validateAndUseInviteLink(token);
      
      if (!validationResult.success || !validationResult.data) {
        return {
          success: false,
          error: validationResult.error || 'Invalid or expired invitation',
          timestamp: new Date().toISOString()
        };
      }

      const { invitation_id, role, workspace_id } = validationResult.data;

      // Get full invitation details
      const { data: invitation, error: getError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitation_id)
        .single();

      if (getError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found',
          timestamp: new Date().toISOString()
        };
      }

      // Update invitation status
      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Update user role if different from default
      if (invitation.role !== 'member') {
        await supabase
          .from('users')
          .update({ role: invitation.role })
          .eq('id', userId);
      }

      // Add user to selected channels
      const { data: channelSelections } = await supabase
        .from('user_channel_selections')
        .select('channel_id')
        .eq('user_invitation_id', invitation.id);

      if (channelSelections && channelSelections.length > 0) {
        const channelMemberships = channelSelections.map(selection => ({
          channel_id: selection.channel_id,
          user_id: userId
        }));

        // Use upsert to avoid duplicate key errors
        const { error: membershipError } = await supabase
          .from('channel_members')
          .upsert(channelMemberships, { 
            onConflict: 'channel_id,user_id',
            ignoreDuplicates: true 
          });

        if (membershipError) {
          console.error('Failed to add user to selected channels:', membershipError);
          // Don't fail the invitation acceptance, just log the error
        }
      }

      // Set user as requiring onboarding
      await supabase
        .from('users')
        .update({ 
          onboarding_completed: false,
          onboarding_step: 'profile_picture'
        })
        .eq('id', userId);

      // Log the action
      await this.logAuditEvent({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        target_user_id: userId,
        action: 'user_accepted_invitation',
        details: {
          email: invitation.email,
          role: invitation.role,
          invited_by: invitation.invited_by,
          channels_joined: channelSelections?.map(s => s.channel_id) || []
        }
      });

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.acceptInvitation error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Audit Log Methods
  static async getAuditLogs(
    workspaceId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ApiResponse<AuditLog[]>> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users!audit_logs_user_id_fkey(
            id, full_name, display_name, email
          ),
          target_user:users!audit_logs_target_user_id_fkey(
            id, full_name, display_name, email
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

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
      console.error('UserManagementService.getAuditLogs error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async logAuditEvent(params: {
    workspace_id?: string;
    user_id?: string;
    target_user_id?: string;
    action: AuditAction;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          workspace_id: params.workspace_id,
          user_id: params.user_id,
          target_user_id: params.target_user_id,
          action: params.action,
          details: params.details || {},
          ip_address: params.ip_address,
          user_agent: params.user_agent
        });
    } catch (error) {
      console.error('UserManagementService.logAuditEvent error:', error);
      // Don't throw here as audit logging shouldn't break main functionality
    }
  }

  // Utility Methods
  static async generateShareableInviteLink(
    workspaceId: string,
    role: 'admin' | 'member' = 'member',
    expiresInDays: number = 7,
    maxUses: number = 10,
    invitedByUserId?: string
  ): Promise<ApiResponse<{ link: string; token: string; expires_at: string; max_uses: number }>> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Store the shareable link token (you might want a separate table for this)
      // For now, we'll use the invitation system with a special email format
      const { error } = await supabase
        .from('user_invitations')
        .insert({
          email: `shareable-link-${token}@invite.placeholder`,
          invited_by: invitedByUserId || null,
          workspace_id: workspaceId,
          role,
          token,
          expires_at: expiresAt.toISOString(),
          max_uses: maxUses,
          uses_count: 0
        });

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const link = `${baseUrl}/invite/${token}`;

      return {
        success: true,
        data: {
          link,
          token,
          expires_at: expiresAt.toISOString(),
          max_uses: maxUses
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.generateShareableInviteLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async validateAndUseInviteLink(token: string): Promise<ApiResponse<{
    valid: boolean;
    invitation_id: string;
    role: string;
    workspace_id: string;
    remaining_uses: number;
    error_message?: string;
  }>> {
    try {
      // Call the database function to check and use invite
      const { data, error } = await supabase
        .rpc('check_and_use_invite', { p_token: token });

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Invalid invitation',
          timestamp: new Date().toISOString()
        };
      }

      const result = data[0];
      
      if (!result.valid) {
        return {
          success: false,
          error: result.error_message || 'Invalid invitation',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('UserManagementService.validateAndUseInviteLink error:', error);
      return {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async cleanupExpiredInvitations(): Promise<void> {
    try {
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('UserManagementService.cleanupExpiredInvitations error:', error);
    }
  }
}