"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { aiApiKeysApi } from "@/lib/api";

interface AIKey {
  id: string;
  provider: string;
  key_name: string;
  is_primary: boolean;
  is_active: boolean;
  health_status: string;
  last_health_check: string | null;
  last_error_message: string | null;
  created_at: string;
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "perplexity", label: "Perplexity" },
];

function getHealthBadge(status: string) {
  switch (status) {
    case "healthy":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Healthy</Badge>;
    case "unhealthy":
    case "critical":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Unhealthy</Badge>;
    case "warning":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Warning</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Unknown</Badge>;
  }
}

function getProviderIcon(provider: string) {
  switch (provider) {
    case "anthropic":
      return "🤖";
    case "openai":
      return "🧠";
    case "perplexity":
      return "🔍";
    default:
      return "🔑";
  }
}

export function AIKeys() {
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState({ provider: "", key_name: "", api_key: "" });
  const [saving, setSaving] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await aiApiKeysApi.list();
      setKeys(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch AI keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const testConnection = async (keyId: string) => {
    setTesting(keyId);
    try {
      const response = await aiApiKeysApi.test(keyId);
      const result = response.data;

      // Update local state
      setKeys(keys.map(k =>
        k.id === keyId
          ? { ...k, health_status: result.data?.healthy ? "healthy" : "unhealthy", last_health_check: new Date().toISOString() }
          : k
      ));

      // Refresh from server
      await fetchKeys();
    } catch (error) {
      console.error("Test connection failed:", error);
      setKeys(keys.map(k =>
        k.id === keyId
          ? { ...k, health_status: "unhealthy", last_error_message: "Connection test failed" }
          : k
      ));
    } finally {
      setTesting(null);
    }
  };

  const viewKey = async (keyId: string) => {
    if (viewingKey === keyId) {
      setViewingKey(null);
      setDecryptedKey(null);
      return;
    }

    try {
      const response = await aiApiKeysApi.get(keyId);
      const result = response.data;
      if (result.success && result.data?.api_key) {
        setViewingKey(keyId);
        setDecryptedKey(result.data.api_key);
      }
    } catch (error) {
      console.error("Failed to reveal key:", error);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      await aiApiKeysApi.delete(keyId);
      setKeys(keys.filter(k => k.id !== keyId));
    } catch (error) {
      console.error("Failed to delete key:", error);
    }
  };

  const addKey = async () => {
    if (!newKey.provider || !newKey.key_name || !newKey.api_key) return;

    setSaving(true);
    try {
      await aiApiKeysApi.create(newKey);
      setAddDialogOpen(false);
      setNewKey({ provider: "", key_name: "", api_key: "" });
      await fetchKeys();
    } catch (error) {
      console.error("Failed to add key:", error);
    } finally {
      setSaving(false);
    }
  };

  const testAllConnections = async () => {
    setTestingAll(true);
    try {
      await aiApiKeysApi.healthCheckAll();
      await fetchKeys();
    } catch (error) {
      console.error("Failed to test all connections:", error);
    } finally {
      setTestingAll(false);
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 14) return "***";
    return `${key.substring(0, 8)}${"*".repeat(20)}${key.substring(key.length - 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              AI API Keys
            </CardTitle>
            <CardDescription>
              Manage your AI provider API keys for chat and analysis features
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testAllConnections}
              disabled={testingAll || keys.length === 0}
              title="Test all connections"
            >
              {testingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Test All
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Key
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
                <DialogDescription>
                  Add a new AI provider API key
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={newKey.provider} onValueChange={(v) => setNewKey({ ...newKey, provider: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input
                    placeholder="e.g., Production Key"
                    value={newKey.key_name}
                    onChange={(e) => setNewKey({ ...newKey, key_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={newKey.api_key}
                    onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={addKey} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No API keys configured</p>
            <p className="text-sm">Add your first AI provider key to enable chat features</p>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getProviderIcon(key.provider)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.key_name}</span>
                      {key.is_primary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {key.provider}
                    </div>
                    {viewingKey === key.id && decryptedKey && (
                      <code className="text-xs bg-black/50 px-2 py-1 rounded mt-1 block font-mono">
                        {decryptedKey}
                      </code>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getHealthBadge(key.health_status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => viewKey(key.id)}
                    title={viewingKey === key.id ? "Hide key" : "View key"}
                  >
                    {viewingKey === key.id ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => testConnection(key.id)}
                    disabled={testing === key.id}
                    title="Test connection"
                  >
                    {testing === key.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteKey(key.id)}
                    className="text-destructive hover:text-destructive"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
