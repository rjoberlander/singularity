"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="bg-card rounded-lg border border-border p-8 text-center max-w-md mx-auto">
      <div className="mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
        <p className="text-muted-foreground">
          We&apos;ve sent a confirmation link to
        </p>
        {email && (
          <p className="font-medium text-primary mt-1">{email}</p>
        )}
      </div>

      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Click the link in the email to verify your account and get started.
        </p>
        <p>
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <Link href="/register" className="text-primary hover:underline">
            try again
          </Link>
          .
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground mb-3">
          Already confirmed your email?
        </p>
        <Link
          href="/login"
          className="inline-block bg-primary text-primary-foreground py-2 px-6 rounded-md font-medium hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="bg-card rounded-lg border border-border p-8 text-center max-w-md mx-auto">
        <p>Loading...</p>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
