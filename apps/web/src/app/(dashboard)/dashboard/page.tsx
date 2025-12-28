"use client";

import Link from "next/link";
import {
  Activity,
  Pill,
  Target,
  Clock,
  Plus,
  Camera,
  MessageCircle
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
}

function StatsCard({ title, value, subtitle, icon, href }: StatsCardProps) {
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
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
          value="--"
          subtitle="tracked"
          icon={<Activity className="w-6 h-6" />}
          href="/biomarkers"
        />
        <StatsCard
          title="Supplements"
          value="--"
          subtitle="active"
          icon={<Pill className="w-6 h-6" />}
          href="/supplements"
        />
        <StatsCard
          title="Goals"
          value="--"
          subtitle="in progress"
          icon={<Target className="w-6 h-6" />}
          href="/goals"
        />
        <StatsCard
          title="Routines"
          value="--"
          subtitle="daily"
          icon={<Clock className="w-6 h-6" />}
          href="/routines"
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
            title="Log Supplement"
            icon={<Plus className="w-5 h-5" />}
            href="/supplements/add"
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
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Activity className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground">
            Start tracking your health to see updates here
          </p>
        </div>
      </div>
    </div>
  );
}
