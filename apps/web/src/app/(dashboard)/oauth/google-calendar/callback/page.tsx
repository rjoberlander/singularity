"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { googleCalendarApi } from "@/lib/api";
import { toast } from "sonner";

export default function GoogleCalendarCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Completing Google Calendar connection...");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authentication failed: ${error}`);
      toast.error("Google Calendar connection failed");
      setTimeout(() => router.push("/settings"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Google");
      toast.error("No authorization code received");
      setTimeout(() => router.push("/settings"), 3000);
      return;
    }

    try {
      const response = await googleCalendarApi.handleCallback(code);

      if (response.data?.success) {
        setStatus("success");
        setEmail(response.data.data?.google_email);
        setMessage("Google Calendar connected successfully!");
        toast.success("Google Calendar connected");
        setTimeout(() => router.push("/settings"), 2000);
      } else {
        throw new Error(response.data?.error || "Connection failed");
      }
    } catch (error: unknown) {
      console.error("OAuth callback error:", error);
      setStatus("error");

      let errorMessage = "Failed to connect Google Calendar";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setMessage(errorMessage);
      toast.error(errorMessage);
      setTimeout(() => router.push("/settings"), 3000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === "processing" && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processing...</h2>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Success!</h2>
              {email && (
                <p className="text-sm text-muted-foreground mb-2">
                  Connected as {email}
                </p>
              )}
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            </>
          )}

          <p className="text-muted-foreground">{message}</p>

          {status !== "processing" && (
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting you to Settings...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
