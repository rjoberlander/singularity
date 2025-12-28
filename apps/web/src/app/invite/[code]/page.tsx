"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAcceptInvite } from "@/hooks/useUserLinks";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Check, X, Loader2, LogIn } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function AcceptInvitePage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const acceptInvite = useAcceptInvite();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"pending" | "accepting" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const handleAccept = async () => {
    setStatus("accepting");
    setError(null);

    try {
      await acceptInvite.mutateAsync(code);
      setStatus("success");
      setTimeout(() => {
        router.push("/settings?tab=sharing");
      }, 2000);
    } catch (err: any) {
      setStatus("error");
      setError(err?.response?.data?.error || "Failed to accept invite. Please try again.");
    }
  };

  const handleDecline = () => {
    router.push("/dashboard");
  };

  // Still checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Family Sharing Invitation</CardTitle>
            <CardDescription>
              You have been invited to view someone&apos;s health data on Singularity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Please sign in or create an account to accept this invitation.
            </p>
            <div className="flex flex-col gap-2">
              <Link href={`/login?redirect=/invite/${code}`}>
                <Button className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href={`/register?redirect=/invite/${code}`}>
                <Button variant="outline" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Invitation Accepted!</h2>
              <p className="text-muted-foreground text-center">
                You can now view the shared health data.
                Redirecting to settings...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invite acceptance UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Family Sharing Invitation</CardTitle>
          <CardDescription>
            Someone wants to share their health data with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-sm text-center">
              <span className="text-muted-foreground">Invite Code: </span>
              <code className="font-mono text-primary">{code}</code>
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              By accepting this invitation, you will be able to view the
              inviter&apos;s health data based on the permissions they have granted.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={status === "accepting"}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={status === "accepting"}
              >
                {status === "accepting" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Accept
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
