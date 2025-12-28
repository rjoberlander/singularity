"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Pill } from "lucide-react";

interface CostSummaryCardProps {
  costs: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    activeCount: number;
    totalCount: number;
  };
}

export function CostSummaryCard({ costs }: CostSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Supplement Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pill className="w-4 h-4" />
            <span>
              {costs.activeCount} active / {costs.totalCount} total
            </span>
          </div>
        </div>

        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">${costs.daily.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per day</p>
            </div>
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">${costs.weekly.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per week</p>
            </div>
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">${costs.monthly.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </TabsContent>
          <TabsContent value="yearly" className="mt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">${costs.yearly.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per year</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
