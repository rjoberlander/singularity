"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { MobileNav } from "./MobileNav";
import {
  LogOut,
  User as UserIcon,
  Settings,
  Moon,
} from "lucide-react";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Mobile menu */}
      <MobileNav />

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme toggle placeholder */}
        <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
          <Moon className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg"
          >
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="hidden sm:block text-sm font-medium">
              {user.email?.split("@")[0]}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20">
                <div className="p-2">
                  <p className="px-3 py-2 text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="border-t border-border" />
                <div className="p-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-md"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-md text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
