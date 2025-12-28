"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserLinks } from "@/hooks/useUserLinks";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Users, Check, Plus, Settings } from "lucide-react";

interface AccountSwitcherProps {
  currentUserEmail?: string;
}

export function AccountSwitcher({ currentUserEmail }: AccountSwitcherProps) {
  const router = useRouter();
  const { data: userLinks, isLoading } = useUserLinks();
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);

  // Filter active linked accounts
  const linkedAccounts = userLinks?.filter((link) => link.status === "active") || [];

  // Get initials from email
  const getInitials = (email?: string) => {
    if (!email) return "?";
    const name = email.split("@")[0];
    return name.substring(0, 2).toUpperCase();
  };

  // Get display name from email
  const getDisplayName = (email?: string) => {
    if (!email) return "Unknown";
    return email.split("@")[0];
  };

  const handleSwitchAccount = (accountId: string | null) => {
    setCurrentAccount(accountId);
    // In a real implementation, this would switch the context to view another user's data
    // For now, we just update local state and refresh
    router.refresh();
  };

  const isViewingOther = currentAccount !== null;
  const displayEmail = isViewingOther
    ? linkedAccounts.find((l) => l.id === currentAccount)?.linked_user || currentUserEmail
    : currentUserEmail;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 py-6"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {getInitials(displayEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">
              {getDisplayName(displayEmail)}
            </p>
            {isViewingOther && (
              <p className="text-xs text-muted-foreground">Viewing as guest</p>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Current user's account */}
        <DropdownMenuItem
          onClick={() => handleSwitchAccount(null)}
          className="flex items-center gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {getInitials(currentUserEmail)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate">{getDisplayName(currentUserEmail)}</span>
          {!isViewingOther && <Check className="h-4 w-4" />}
          <Badge variant="secondary" className="text-xs">You</Badge>
        </DropdownMenuItem>

        {/* Linked accounts */}
        {linkedAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Linked Accounts
            </DropdownMenuLabel>
            {linkedAccounts.map((link) => (
              <DropdownMenuItem
                key={link.id}
                onClick={() => handleSwitchAccount(link.id)}
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {getInitials(link.linked_user)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">
                  {getDisplayName(link.linked_user)}
                </span>
                {currentAccount === link.id && <Check className="h-4 w-4" />}
                <Badge variant="outline" className="text-xs">
                  {link.permission}
                </Badge>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/settings?tab=sharing")}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          <span>Manage Sharing</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
