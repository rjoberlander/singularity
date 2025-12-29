"use client";

import { useState } from "react";
import { useUserLinks, useInviteUser, useRevokeUserLink } from "@/hooks/useUserLinks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Copy, Check, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function FamilySharing() {
  const { data: userLinks, isLoading } = useUserLinks();
  const inviteUser = useInviteUser();
  const revokeUserLink = useRevokeUserLink();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<"read" | "write" | "admin">("read");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeLinks = userLinks?.filter((link) => link.status === "active") || [];
  const pendingLinks = userLinks?.filter((link) => link.status === "pending") || [];

  const getInitials = (email?: string) => {
    if (!email) return "?";
    const name = email.split("@")[0];
    return name.substring(0, 2).toUpperCase();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUser.mutateAsync({
        email: inviteEmail || undefined,
        permission: invitePermission,
      });
      toast.success("Invitation sent successfully");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInvitePermission("read");
    } catch (error) {
      console.error("Failed to invite user:", error);
      toast.error("Failed to send invitation. Please try again.");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this access?")) return;
    try {
      await revokeUserLink.mutateAsync(id);
      toast.success("Access revoked");
    } catch (error) {
      console.error("Failed to revoke access:", error);
      toast.error("Failed to revoke access. Please try again.");
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Invite code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case "read":
        return "View Only";
      case "write":
        return "Can Edit";
      case "admin":
        return "Full Access";
      default:
        return permission;
    }
  };

  const getPermissionVariant = (permission: string): "default" | "secondary" | "destructive" => {
    switch (permission) {
      case "admin":
        return "destructive";
      case "write":
        return "default";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Family Sharing</CardTitle>
          <CardDescription>
            Share your health data with family members or healthcare providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Button */}
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Family Member
          </Button>

          {/* Pending Invites */}
          {pendingLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Invites</h3>
              {pendingLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-dashed"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Pending Invitation</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getPermissionVariant(link.permission)}>
                          {getPermissionLabel(link.permission)}
                        </Badge>
                        {link.invite_code && (
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">
                            {link.invite_code}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {link.invite_code && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteCode(link.invite_code!)}
                      >
                        {copiedCode === link.invite_code ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(link.id)}
                      disabled={revokeUserLink.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Links */}
          {activeLinks.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Shared With</h3>
              {activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(link.linked_user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {link.linked_user?.split("@")[0] || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">{link.linked_user}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getPermissionVariant(link.permission)}>
                      {getPermissionLabel(link.permission)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(link.id)}
                      disabled={revokeUserLink.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingLinks.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shared accounts</h3>
              <p className="text-muted-foreground">
                Invite family members to view or manage your health data
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Send an invitation to share your health data. You can invite by email or
              generate an invite code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="family@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to generate an invite code instead
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission">Permission Level</Label>
              <Select
                value={invitePermission}
                onValueChange={(value: "read" | "write" | "admin") =>
                  setInvitePermission(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">
                    <div className="flex flex-col">
                      <span>View Only</span>
                      <span className="text-xs text-muted-foreground">
                        Can view your health data
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="write">
                    <div className="flex flex-col">
                      <span>Can Edit</span>
                      <span className="text-xs text-muted-foreground">
                        Can view and modify data
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span>Full Access</span>
                      <span className="text-xs text-muted-foreground">
                        Complete access to your account
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteUser.isPending}>
                {inviteUser.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
