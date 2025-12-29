import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Singularity - Health Protocol Tracking",
  description: "AI-powered health optimization platform for tracking biomarkers, supplements, and protocols",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
