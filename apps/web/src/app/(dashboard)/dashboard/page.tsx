"use client";

import Link from "next/link";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { useSupplements } from "@/hooks/useSupplements";
import { useGoals } from "@/hooks/useGoals";
import { useRoutines } from "@/hooks/useRoutines";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Pill,
  Target,
  Clock,
  Plus,
  Camera,
  MessageCircle,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  loading?: boolean;
}

function StatsCard({ title, value, subtitle, icon, href, loading }: StatsCardProps) {
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-16 mt-1" />
          ) : (
            <p className="text-3xl font-bold mt-1">{value}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
      </div>
    </Link>
  );
}

interface QuickActionProps {
  title: string;
  icon: React.ReactNode;
  href: string;
}

function QuickAction({ title, icon, href }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
    >
      <div className="text-primary">{icon}</div>
      <span className="font-medium">{title}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: biomarkers, isLoading: biomarkersLoading } = useBiomarkers();
  const { data: supplements, isLoading: supplementsLoading } = useSupplements();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: routines, isLoading: routinesLoading } = useRoutines();

  const activeSupplements = supplements?.filter((s) => s.is_active) || [];
  const activeGoals = goals?.filter((g) => g.status === "active") || [];

  // Get recent biomarkers for activity feed
  const recentBiomarkers = biomarkers?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your health tracking
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Biomarkers"
          value={biomarkers?.length || 0}
          subtitle="tracked"
          icon={<Activity className="w-6 h-6" />}
          href="/biomarkers"
          loading={biomarkersLoading}
        />
        <StatsCard
          title="Supplements"
          value={activeSupplements.length}
          subtitle="active"
          icon={<Pill className="w-6 h-6" />}
          href="/supplements"
          loading={supplementsLoading}
        />
        <StatsCard
          title="Goals"
          value={activeGoals.length}
          subtitle="in progress"
          icon={<Target className="w-6 h-6" />}
          href="/goals"
          loading={goalsLoading}
        />
        <StatsCard
          title="Routines"
          value={routines?.length || 0}
          subtitle="configured"
          icon={<Clock className="w-6 h-6" />}
          href="/routines"
          loading={routinesLoading}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="Add Lab Results"
            icon={<Camera className="w-5 h-5" />}
            href="/biomarkers/add"
          />
          <QuickAction
            title="Add Supplement"
            icon={<Plus className="w-5 h-5" />}
            href="/supplements"
          />
          <QuickAction
            title="Chat with AI"
            icon={<MessageCircle className="w-5 h-5" />}
            href="/chat"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Biomarkers</h2>
        {biomarkersLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : recentBiomarkers.length > 0 ? (
          <div className="space-y-3">
            {recentBiomarkers.map((biomarker) => (
              <Link
                key={biomarker.id}
                href={`/biomarkers/${biomarker.id}`}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{biomarker.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(biomarker.date_tested).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {biomarker.value} <span className="text-sm font-normal text-muted-foreground">{biomarker.unit}</span>
                  </p>
                  {biomarker.status && (
                    <p className={`text-xs ${
                      biomarker.status === "optimal" || biomarker.status === "normal"
                        ? "text-green-500"
                        : biomarker.status === "high"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}>
                      {biomarker.status.charAt(0).toUpperCase() + biomarker.status.slice(1)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
            <Link
              href="/biomarkers"
              className="block text-center text-sm text-primary hover:underline py-2"
            >
              View all biomarkers
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No biomarkers yet</p>
            <p className="text-sm text-muted-foreground">
              Start tracking your health by adding lab results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
