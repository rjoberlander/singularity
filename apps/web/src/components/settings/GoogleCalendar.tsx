"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Settings2,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { googleCalendarApi } from "@/lib/api";
import { toast } from "sonner";

interface OAuthConfig {
  configured: boolean;
  clientIdPreview?: string;
  redirectUri?: string;
}

interface ConnectionStatus {
  connected: boolean;
  google_email?: string;
  is_syncing?: boolean;
  last_sync_at?: string | null;
  sync_enabled?: boolean;
  sync_error?: string | null;
  scopes?: string[];
}

interface CalendarEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink?: string;
}

export function GoogleCalendar() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // OAuth config state
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchConfig(), fetchStatus()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await googleCalendarApi.getConfig();
      setOauthConfig(response.data?.data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await googleCalendarApi.getStatus();
      const data = response.data?.data;
      setStatus(data);

      if (data?.connected) {
        setSyncEnabled(data.sync_enabled ?? true);
        // Fetch calendars and events
        await Promise.all([fetchCalendars(), fetchUpcomingEvents()]);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!clientId || !clientSecret) {
      toast.error("Please enter both Client ID and Client Secret");
      return;
    }

    setSavingConfig(true);
    try {
      await googleCalendarApi.saveConfig({
        client_id: clientId,
        client_secret: clientSecret,
      });
      toast.success("Google OAuth configuration saved");
      setConfigDialogOpen(false);
      setClientId("");
      setClientSecret("");
      await fetchConfig();
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!confirm("Are you sure you want to delete the OAuth configuration?")) {
      return;
    }

    try {
      await googleCalendarApi.deleteConfig();
      setOauthConfig({ configured: false });
      toast.success("OAuth configuration deleted");
    } catch (error) {
      console.error("Failed to delete config:", error);
      toast.error("Failed to delete configuration");
    }
  };

  const fetchCalendars = async () => {
    try {
      const response = await googleCalendarApi.listCalendars();
      const cals = response.data?.data || [];
      setCalendars(cals);
      // Set primary calendar as selected
      const primary = cals.find((c: CalendarEntry) => c.primary);
      if (primary) {
        setSelectedCalendar(primary.id);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await googleCalendarApi.getUpcomingEvents(7);
      setUpcomingEvents(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await googleCalendarApi.getAuthUrl();
      const authUrl = response.data?.data?.authUrl;

      if (authUrl) {
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        toast.error("Failed to get authorization URL");
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Failed to initiate Google Calendar connection");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) {
      return;
    }

    setDisconnecting(true);
    try {
      await googleCalendarApi.disconnect();
      setStatus({ connected: false });
      setCalendars([]);
      setUpcomingEvents([]);
      toast.success("Google Calendar disconnected");
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await googleCalendarApi.testConnection();
      if (response.data?.success) {
        toast.success("Connection test successful!");
        await fetchStatus();
      } else {
        toast.error(response.data?.error || "Connection test failed");
      }
    } catch (error) {
      console.error("Test failed:", error);
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await googleCalendarApi.updateSettings({
        sync_enabled: syncEnabled,
        primary_calendar_id: selectedCalendar || undefined,
      });
      toast.success("Settings saved");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "";

    const date = new Date(start);
    const isAllDay = !event.start.dateTime;

    if (isAllDay) {
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* OAuth Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Google OAuth Configuration
              </CardTitle>
              <CardDescription>
                Configure your Google Cloud OAuth credentials
              </CardDescription>
            </div>
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-2" />
                  {oauthConfig?.configured ? "Update" : "Configure"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Google OAuth Configuration</DialogTitle>
                  <DialogDescription>
                    Enter your Google Cloud OAuth credentials to enable calendar
                    integration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="xxxx.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="clientSecret"
                        type={showSecret ? "text" : "password"}
                        placeholder="GOCSPX-..."
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                    <p className="font-medium">How to get credentials:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>
                        Go to{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Google Cloud Console
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Create OAuth 2.0 Client ID (Web application)</li>
                      <li>
                        Add redirect URI:{" "}
                        <code className="text-xs bg-black/20 px-1 rounded">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/oauth/google-calendar/callback`
                            : "/oauth/google-calendar/callback"}
                        </code>
                      </li>
                      <li>Enable Google Calendar API</li>
                    </ol>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfigDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={savingConfig}>
                    {savingConfig && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Configuration
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {oauthConfig?.configured ? (
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-500">Configured</p>
                  <p className="text-sm text-muted-foreground">
                    Client ID: {oauthConfig.clientIdPreview}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteConfig}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-yellow-500 font-medium">
                  OAuth credentials not configured
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You need to add your Google OAuth Client ID and Secret to connect
                your calendar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>
                Connect your Google Calendar to sync events with your health
                tracking
              </CardDescription>
            </div>
            {!status?.connected && oauthConfig?.configured && (
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Connect
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="space-y-4">
              {/* Connection Info */}
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {status.google_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-destructive hover:text-destructive"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Sync Error */}
              {status.sync_error && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-500">
                    {status.sync_error}
                  </span>
                </div>
              )}

              {/* Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sync Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow fetching calendar events
                    </p>
                  </div>
                  <Switch
                    checked={syncEnabled}
                    onCheckedChange={setSyncEnabled}
                  />
                </div>

                {calendars.length > 0 && (
                  <div className="space-y-2">
                    <Label>Primary Calendar</Label>
                    <Select
                      value={selectedCalendar}
                      onValueChange={setSelectedCalendar}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            <div className="flex items-center gap-2">
                              {cal.backgroundColor && (
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cal.backgroundColor }}
                                />
                              )}
                              {cal.summary}
                              {cal.primary && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full sm:w-auto"
                >
                  {savingSettings && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Google Calendar not connected</p>
              <p className="text-sm">
                Connect to sync your calendar events with health tracking
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events Card */}
      {status?.connected && upcomingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Your next 7 days of events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="p-2 bg-primary/10 rounded">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatEventTime(event)}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.location}
                      </p>
                    )}
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                1
              </span>
              <p>
                Connect your Google Calendar to allow Singularity to read your
                events (read-only access).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                2
              </span>
              <p>
                Your calendar events can be used to correlate health metrics
                with your schedule.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                3
              </span>
              <p>
                AI assistants can access your calendar to provide
                schedule-aware health recommendations.
              </p>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Privacy:</strong> We only request read-only access to your
              calendar. Your events are never stored permanently and are only
              accessed when needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
