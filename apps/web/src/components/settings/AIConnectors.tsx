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
  Plug,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import { accessTokensApi } from "@/lib/api";
import { toast } from "sonner";

interface AccessToken {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function AIConnectors() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState({
    name: "",
    expires_in_days: "",
  });
  const [saving, setSaving] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testToken, setTestToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    reason?: string;
    token_name?: string;
  } | null>(null);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await accessTokensApi.list();
      setTokens(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      toast.error("Failed to load access tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const createToken = async () => {
    if (!newToken.name) {
      toast.error("Please enter a token name");
      return;
    }

    setSaving(true);
    try {
      const response = await accessTokensApi.create({
        name: newToken.name,
        expires_in_days: newToken.expires_in_days
          ? parseInt(newToken.expires_in_days)
          : undefined,
      });

      if (response.data?.success) {
        setCreatedToken(response.data.data.token);
        await fetchTokens();
        toast.success("Token created successfully");
      }
    } catch (error) {
      console.error("Failed to create token:", error);
      toast.error("Failed to create token");
    } finally {
      setSaving(false);
    }
  };

  const deleteToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this token?")) return;

    try {
      await accessTokensApi.delete(id);
      setTokens(tokens.filter((t) => t.id !== id));
      toast.success("Token revoked");
    } catch (error) {
      console.error("Failed to delete token:", error);
      toast.error("Failed to revoke token");
    }
  };

  const toggleToken = async (id: string) => {
    try {
      const response = await accessTokensApi.toggle(id);
      if (response.data?.success) {
        setTokens(
          tokens.map((t) =>
            t.id === id ? { ...t, is_active: response.data.data.is_active } : t
          )
        );
        toast.success(
          response.data.data.is_active ? "Token enabled" : "Token disabled"
        );
      }
    } catch (error) {
      console.error("Failed to toggle token:", error);
      toast.error("Failed to update token");
    }
  };

  const copyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      toast.success("Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const testConnection = async () => {
    if (!testToken) {
      toast.error("Please enter a token to test");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const response = await accessTokensApi.test(testToken);
      setTestResult(response.data?.data);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult({ valid: false, reason: "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const closeDialog = () => {
    setAddDialogOpen(false);
    setNewToken({ name: "", expires_in_days: "" });
    setCreatedToken(null);
    setCopied(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Token Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                AI Connector Access Tokens
              </CardTitle>
              <CardDescription>
                Generate tokens to connect Claude Desktop, Claude Code, or ChatGPT
                to your health data
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Token
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Access Token</DialogTitle>
                  <DialogDescription>
                    {createdToken
                      ? "Copy your token now. It won't be shown again!"
                      : "Generate a new token for your AI assistant"}
                  </DialogDescription>
                </DialogHeader>

                {createdToken ? (
                  <div className="space-y-4 py-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-green-500">
                          Token Created!
                        </span>
                      </div>
                      <code className="block text-sm bg-black/50 p-3 rounded font-mono break-all">
                        {createdToken}
                      </code>
                    </div>
                    <Button
                      onClick={copyToken}
                      className="w-full"
                      variant={copied ? "secondary" : "default"}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Token
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Token Name</Label>
                      <Input
                        placeholder="e.g., Claude Desktop, My MacBook"
                        value={newToken.name}
                        onChange={(e) =>
                          setNewToken({ ...newToken, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiration (Optional)</Label>
                      <Select
                        value={newToken.expires_in_days}
                        onValueChange={(v) =>
                          setNewToken({ ...newToken, expires_in_days: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Never expires" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Never expires</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {createdToken ? (
                    <Button onClick={closeDialog}>Done</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button onClick={createToken} disabled={saving}>
                        {saving && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Create Token
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No access tokens created</p>
              <p className="text-sm">
                Create a token to connect your AI assistant
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        token.is_active
                          ? "bg-green-500/20 text-green-500"
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      <Plug className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.name}</span>
                        {!token.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <code className="text-xs">{token.token_prefix}...</code>
                        {" · "}
                        Last used: {formatDate(token.last_used_at)}
                        {token.expires_at && (
                          <> · Expires: {formatDate(token.expires_at)}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleToken(token.id)}
                      title={token.is_active ? "Disable" : "Enable"}
                    >
                      {token.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteToken(token.id)}
                      className="text-destructive hover:text-destructive"
                      title="Revoke token"
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

      {/* Test Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Test Connection
          </CardTitle>
          <CardDescription>
            Verify that your token is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste your token here (sng_...)"
              value={testToken}
              onChange={(e) => setTestToken(e.target.value)}
              type="password"
            />
            <Button onClick={testConnection} disabled={testing}>
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Test"
              )}
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-lg ${
                testResult.valid
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">
                      Connection successful!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">
                      Connection failed: {testResult.reason}
                    </span>
                  </>
                )}
              </div>
              {testResult.token_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Token: {testResult.token_name}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Connect your AI assistant to Singularity Health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Claude Desktop */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="text-xl">🤖</span>
              Claude Desktop
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                Add to your Claude Desktop config (
                <code className="text-xs">claude_desktop_config.json</code>):
              </p>
              <pre className="text-xs bg-black/50 p-3 rounded overflow-x-auto">
{`{
  "mcpServers": {
    "singularity-health": {
      "command": "npx",
      "args": ["-y", "@singularity/mcp-server"],
      "env": {
        "SINGULARITY_API_URL": "${API_URL}",
        "SINGULARITY_API_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* Claude Code */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="text-xl">💻</span>
              Claude Code
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                Run these commands in your terminal:
              </p>
              <pre className="text-xs bg-black/50 p-3 rounded overflow-x-auto">
{`# Add the MCP server
claude mcp add singularity-health -- npx -y @singularity/mcp-server

# Set your token (in .env or export)
export SINGULARITY_API_TOKEN="YOUR_TOKEN_HERE"
export SINGULARITY_API_URL="${API_URL}"`}
              </pre>
            </div>
          </div>

          {/* ChatGPT */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="text-xl">🧠</span>
              ChatGPT (Custom GPT)
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                Create a Custom GPT with API Actions:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to ChatGPT &rarr; Explore GPTs &rarr; Create</li>
                <li>Add Actions and import the API schema</li>
                <li>Set Authentication to Bearer Token with your token</li>
                <li>
                  API Base URL:{" "}
                  <code className="text-xs bg-black/50 px-1 rounded">
                    {API_URL}
                  </code>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
