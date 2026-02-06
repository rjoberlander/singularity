"use client";

import { ApiUsage } from "@/components/settings/ApiUsage";

export default function UsagePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Usage</h1>
        <p className="text-muted-foreground">
          Track your API usage and costs across RV Locations, Travel, and other features
        </p>
      </div>

      <ApiUsage />
    </div>
  );
}
