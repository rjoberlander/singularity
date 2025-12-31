"use client";

import { useState } from "react";
import {
  useEightSleepStatus,
  useSleepSessions,
  useSleepAnalysis,
  useSleepTrends,
  useCorrelationSummary,
  useConnectEightSleep,
  useDisconnectEightSleep,
  useSyncEightSleep,
  useUpdateEightSleepSettings,
  useTimezones,
  formatDuration,
  formatTime,
  formatDate,
  getSleepScoreColor,
  getSleepScoreLabel,
  getImpactColor,
  SleepSession,
  SleepTrend,
  SupplementCorrelation,
} from "@/hooks/useEightSleep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Moon,
  Sun,
  Heart,
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Unplug,
  Plug,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Pill,
  BarChart3,
} from "lucide-react";

type ViewMode = "dashboard" | "history" | "insights" | "settings";

export default function SleepPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Connect form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncTime, setSyncTime] = useState("08:00");
  const [syncTimezone, setSyncTimezone] = useState("America/Los_Angeles");

  // Queries
  const { data: status, isLoading: statusLoading, error: statusError } = useEightSleepStatus();
  const { data: sessionsData, isLoading: sessionsLoading } = useSleepSessions({ limit: 14 });
  const { data: analysis, isLoading: analysisLoading } = useSleepAnalysis(30);
  const { data: trendsData } = useSleepTrends(30);
  const { data: correlationSummary } = useCorrelationSummary(90);
  const { data: timezonesData } = useTimezones();

  // Mutations
  const connectMutation = useConnectEightSleep();
  const disconnectMutation = useDisconnectEightSleep();
  const syncMutation = useSyncEightSleep();
  const updateSettingsMutation = useUpdateEightSleepSettings();

  const sessions = sessionsData?.sessions || [];
  const trends = trendsData?.trends || [];
  const timezones = timezonesData?.timezones || [];
  const lastNight = sessions[0];

  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync({
        email,
        password,
        sync_time: syncTime,
        sync_timezone: syncTimezone,
      });
      setShowConnectDialog(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect Eight Sleep?")) {
      await disconnectMutation.mutateAsync();
    }
  };

  const handleSync = async () => {
    await syncMutation.mutateAsync({});
  };

  // Not connected state
  if (!statusLoading && (!status?.connected || statusError)) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Moon className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Connect Eight Sleep</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            Track your sleep patterns, analyze trends, and discover how your supplements
            affect your sleep quality.
          </p>
          <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plug className="w-4 h-4 mr-2" />
                Connect Eight Sleep
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Eight Sleep</DialogTitle>
                <DialogDescription>
                  Enter your Eight Sleep account credentials to sync your sleep data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="syncTime">Daily Sync Time</Label>
                    <Input
                      id="syncTime"
                      type="time"
                      value={syncTime}
                      onChange={(e) => setSyncTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={syncTimezone} onValueChange={setSyncTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleConnect}
                  disabled={connectMutation.isPending || !email || !password}
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
                {connectMutation.isError && (
                  <p className="text-sm text-destructive text-center">
                    Failed to connect. Please check your credentials.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Loading state
  if (statusLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Moon className="w-8 h-8" />
            Sleep
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze your sleep patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "history", label: "History", icon: Clock },
          { id: "insights", label: "Insights", icon: Sparkles },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              viewMode === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {viewMode === "dashboard" && (
        <div className="space-y-6">
          {/* Last Night Summary */}
          {lastNight && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Last Night</h2>
                <span className="text-sm text-muted-foreground">
                  {formatDate(lastNight.date)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {/* Sleep Score */}
                <div className="text-center">
                  <div
                    className="text-4xl font-bold mb-1"
                    style={{ color: getSleepScoreColor(lastNight.sleep_score) }}
                  >
                    {lastNight.sleep_score ?? "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">Sleep Score</div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: getSleepScoreColor(lastNight.sleep_score) }}
                  >
                    {getSleepScoreLabel(lastNight.sleep_score)}
                  </div>
                </div>

                {/* Time Slept */}
                <div className="text-center">
                  <div className="text-2xl font-semibold mb-1">
                    {formatDuration(lastNight.time_slept)}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Slept</div>
                </div>

                {/* Deep Sleep */}
                <div className="text-center">
                  <div className="text-2xl font-semibold mb-1 text-indigo-500">
                    {lastNight.deep_sleep_pct?.toFixed(0) ?? "-"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Deep Sleep</div>
                </div>

                {/* HRV */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-2xl font-semibold">
                      {lastNight.avg_hrv?.toFixed(0) ?? "-"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Avg HRV</div>
                </div>

                {/* 2-4am Wake */}
                <div className="text-center">
                  {lastNight.woke_between_2_and_4_am ? (
                    <div className="flex items-center justify-center gap-1 text-amber-500">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {lastNight.wake_time_between_2_and_4_am}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <Moon className="w-5 h-5" />
                      <span className="text-sm font-medium">No wake</span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">2-4am Wake</div>
                </div>
              </div>
            </Card>
          )}

          {/* Stats Cards */}
          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Avg Score (30d)</div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: getSleepScoreColor(analysis.avg_sleep_score) }}
                >
                  {analysis.avg_sleep_score?.toFixed(0) ?? "-"}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Avg Deep Sleep</div>
                <div className="text-2xl font-bold text-indigo-500">
                  {analysis.avg_deep_sleep_pct?.toFixed(0) ?? "-"}%
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Avg HRV</div>
                <div className="text-2xl font-bold">
                  {analysis.avg_hrv?.toFixed(0) ?? "-"} ms
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">2-4am Wake Rate</div>
                <div className="text-2xl font-bold text-amber-500">
                  {(analysis.wake_2_4_am_rate * 100).toFixed(0)}%
                </div>
              </Card>
            </div>
          )}

          {/* Trends Chart */}
          {trends.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">30-Day Trend</h2>
              <SleepTrendChart trends={trends} />
            </Card>
          )}
        </div>
      )}

      {/* History View */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {sessionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No sleep sessions found. Sync your data to see history.
            </Card>
          ) : (
            sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      )}

      {/* Insights View */}
      {viewMode === "insights" && (
        <div className="space-y-6">
          {/* Recommendations */}
          {correlationSummary?.recommendations && correlationSummary.recommendations.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Recommendations
              </h2>
              <ul className="space-y-2">
                {correlationSummary.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Supplement Correlations */}
          {correlationSummary?.supplements && correlationSummary.supplements.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-primary" />
                Supplement Impact on Sleep
              </h2>
              <div className="space-y-4">
                {correlationSummary.supplements.slice(0, 8).map((correlation) => (
                  <CorrelationRow key={correlation.supplement_id} correlation={correlation} />
                ))}
              </div>
            </Card>
          )}

          {/* Insights */}
          {correlationSummary?.insights && correlationSummary.insights.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Insights
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {correlationSummary.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </Card>
          )}

          {!correlationSummary?.supplements?.length && !correlationSummary?.recommendations?.length && (
            <Card className="p-8 text-center text-muted-foreground">
              Not enough data for insights. Keep tracking for at least 14 days to see correlations.
            </Card>
          )}
        </div>
      )}

      {/* Settings View */}
      {viewMode === "settings" && (
        <div className="space-y-6 max-w-lg">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Sync Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Sync</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically sync sleep data daily
                  </div>
                </div>
                <Switch
                  checked={status?.sync_enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ sync_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Sync Time</Label>
                <Input
                  type="time"
                  value={status?.sync_time?.slice(0, 5) || "08:00"}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({ sync_time: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={status?.sync_timezone || "America/Los_Angeles"}
                  onValueChange={(value) =>
                    updateSettingsMutation.mutate({ sync_timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Connection</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Status</div>
                  <div className="text-sm text-green-500">Connected</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Last sync: {status?.last_sync_at ? formatDate(status.last_sync_at) : "Never"}
              </div>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                <Unplug className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Sub-components
function SleepTrendChart({ trends }: { trends: SleepTrend[] }) {
  const maxScore = 100;
  const reversedTrends = [...trends].reverse();

  return (
    <div className="h-48 flex items-end gap-1">
      {reversedTrends.map((trend, i) => {
        const score = trend.sleep_score || 0;
        const height = (score / maxScore) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: getSleepScoreColor(trend.sleep_score),
                minHeight: score > 0 ? "4px" : "0",
              }}
              title={`${formatDate(trend.date)}: ${score}`}
            />
            {trend.woke_2_4_am && (
              <div className="w-2 h-2 rounded-full bg-amber-500" title="Woke 2-4am" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SessionCard({ session }: { session: SleepSession }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="text-2xl font-bold w-12 text-center"
            style={{ color: getSleepScoreColor(session.sleep_score) }}
          >
            {session.sleep_score ?? "-"}
          </div>
          <div>
            <div className="font-medium">{formatDate(session.date)}</div>
            <div className="text-sm text-muted-foreground">
              {formatDuration(session.time_slept)} sleep
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-indigo-500 font-medium">
              {session.deep_sleep_pct?.toFixed(0) ?? "-"}%
            </div>
            <div className="text-xs text-muted-foreground">Deep</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{session.avg_hrv?.toFixed(0) ?? "-"}</div>
            <div className="text-xs text-muted-foreground">HRV</div>
          </div>
          {session.woke_between_2_and_4_am && (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </div>
    </Card>
  );
}

function CorrelationRow({ correlation }: { correlation: SupplementCorrelation }) {
  const ImpactIcon =
    correlation.impact === "positive"
      ? TrendingUp
      : correlation.impact === "negative"
      ? TrendingDown
      : Minus;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-8 rounded-full"
          style={{ backgroundColor: getImpactColor(correlation.impact) }}
        />
        <div>
          <div className="font-medium">{correlation.supplement_name}</div>
          <div className="text-xs text-muted-foreground">
            {correlation.days_with} nights with, {correlation.days_without} without
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="flex items-center gap-1">
            <ImpactIcon
              className="w-4 h-4"
              style={{ color: getImpactColor(correlation.impact) }}
            />
            <span
              className="font-medium"
              style={{ color: getImpactColor(correlation.impact) }}
            >
              {correlation.score_difference > 0 ? "+" : ""}
              {correlation.score_difference.toFixed(1)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Sleep score</div>
        </div>
        <div className="text-right">
          <div className="font-medium text-indigo-500">
            {correlation.deep_difference > 0 ? "+" : ""}
            {correlation.deep_difference.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">Deep sleep</div>
        </div>
      </div>
    </div>
  );
}
