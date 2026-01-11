"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useAIChat, useExtractBiomarkers } from "@/hooks/useAI";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { useSupplements } from "@/hooks/useSupplements";
import { useGoals } from "@/hooks/useGoals";
import { useRoutines } from "@/hooks/useRoutines";
import { ChatMessage, Biomarker } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  User,
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  Activity,
  Pill,
  Target,
  Clock,
  AlertTriangle,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BIOMARKER_REFERENCE, BiomarkerReference } from "@/data/biomarkerReference";
import { calculateTrend, TrendDirection } from "@/utils/trendCalculation";
import { TrendingUp, TrendingDown, ArrowRight as TrendStable } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What supplements should I consider?",
  "Analyze my lab results",
  "How can I improve my sleep?",
  "Create a morning routine",
];

// Get value status from biomarkers page logic
function getValueStatus(
  value: number,
  ref: BiomarkerReference
): "optimal" | "suboptimal" | "critical" {
  if (value >= ref.optimalRange.low && value <= ref.optimalRange.high) {
    return "optimal";
  }
  const suboptLow = ref.suboptimalLowRange;
  const suboptHigh = ref.suboptimalHighRange;
  if (
    (suboptLow && value >= suboptLow.low && value < ref.optimalRange.low) ||
    (suboptHigh && value > ref.optimalRange.high && value <= suboptHigh.high)
  ) {
    return "suboptimal";
  }
  return "critical";
}

export default function DashboardPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useAIChat();
  const extractMutation = useExtractBiomarkers();

  // Fetch data for KPIs and concerned biomarkers
  const { data: biomarkers } = useBiomarkers({ limit: 1000 });
  const { data: supplements } = useSupplements();
  const { data: goals } = useGoals();
  const { data: routines } = useRoutines();

  // Group biomarkers by name and get concerned ones with trends
  const { biomarkerSections, biomarkerCount } = useMemo(() => {
    const biomarkersByName = new Map<string, Biomarker[]>();
    if (!biomarkers) return { biomarkerSections: { needsAttention: [], watchClosely: [], monitor: [], gettingBetter: [] }, biomarkerCount: 0 };

    biomarkers.forEach((b) => {
      const name = b.name.toLowerCase();
      const matched = BIOMARKER_REFERENCE.find(
        (ref) =>
          ref.name.toLowerCase() === name ||
          ref.aliases.some((a) => a.toLowerCase() === name)
      );
      const key = matched ? matched.name : b.name;
      if (!biomarkersByName.has(key)) {
        biomarkersByName.set(key, []);
      }
      biomarkersByName.get(key)!.push(b);
    });

    // Find critical and suboptimal biomarkers with trends
    type ConcernedBiomarker = {
      name: string;
      value: number;
      previousValue: number | null;
      change: number | null;
      percentChange: number | null;
      unit: string;
      status: "critical" | "suboptimal";
      trend: TrendDirection | null;
      history: number[];  // Last few values for mini trend
      reference: BiomarkerReference;
      biomarker: Biomarker;
    };

    const needsAttention: ConcernedBiomarker[] = [];  // Critical + Increasing
    const watchClosely: ConcernedBiomarker[] = [];    // Suboptimal + Increasing (yellow going up)
    const monitor: ConcernedBiomarker[] = [];         // Critical/Suboptimal + Stable/None
    const gettingBetter: ConcernedBiomarker[] = [];   // Any decreasing (getting better)

    BIOMARKER_REFERENCE.forEach((ref) => {
      const history = biomarkersByName.get(ref.name) || [];
      if (history.length > 0) {
        const sorted = [...history].sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        );
        const latest = sorted[0];
        const previous = sorted[1] || null;
        const status = getValueStatus(latest.value, ref);

        // Only include critical and suboptimal
        if (status === "critical" || status === "suboptimal") {
          const trendResult = calculateTrend(history, ref);
          const trend = trendResult.direction;

          // Calculate change from previous
          const change = previous ? latest.value - previous.value : null;
          const percentChange = previous && previous.value !== 0
            ? ((latest.value - previous.value) / previous.value) * 100
            : null;

          // Get last 4 values for mini trend display (chronological order)
          const historyValues = sorted.slice(0, 4).reverse().map(b => b.value);

          const item: ConcernedBiomarker = {
            name: ref.name,
            value: latest.value,
            previousValue: previous?.value || null,
            change,
            percentChange,
            unit: latest.unit,
            status,
            trend,
            history: historyValues,
            reference: ref,
            biomarker: latest,
          };

          // Categorize based on status and trend
          if (trend === "down") {
            // Getting better - any red/yellow that's decreasing
            gettingBetter.push(item);
          } else if (status === "critical" && trend === "up") {
            // Worst case: critical and getting worse
            needsAttention.push(item);
          } else if (status === "suboptimal" && trend === "up") {
            // Yellow and increasing - watch closely
            watchClosely.push(item);
          } else {
            // Critical/Suboptimal + stable/none - just monitor
            monitor.push(item);
          }
        }
      }
    });

    // Sort each section: critical before suboptimal
    const sortByStatus = (a: ConcernedBiomarker, b: ConcernedBiomarker) => {
      if (a.status === "critical" && b.status !== "critical") return -1;
      if (a.status !== "critical" && b.status === "critical") return 1;
      return 0;
    };

    needsAttention.sort(sortByStatus);
    watchClosely.sort(sortByStatus);
    monitor.sort(sortByStatus);
    gettingBetter.sort(sortByStatus);

    return {
      biomarkerSections: { needsAttention, watchClosely, monitor, gettingBetter },
      biomarkerCount: biomarkersByName.size,
    };
  }, [biomarkers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFileForAI = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || chatMutation.isPending || extractMutation.isPending) return;

    let userMessageContent = input.trim();
    const hasFile = !!attachedFile;
    const fileName = attachedFile?.name;
    const isImage = attachedFile?.type.startsWith("image/");

    const userMessage: ChatMessage = {
      role: "user",
      content: userMessageContent || (hasFile ? `Uploaded: ${fileName}` : ""),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (hasFile && attachedFile) {
      const fileToProcess = attachedFile;
      handleRemoveFile();

      const isPDF = fileToProcess.type === "application/pdf" || fileToProcess.name.toLowerCase().endsWith(".pdf");
      const isImageOrPDF = isImage || isPDF;

      try {
        if (isImageOrPDF) {
          const base64 = await processFileForAI(fileToProcess);
          if (base64) {
            const extractResult = await extractMutation.mutateAsync({
              image_base64: base64,
              source_type: "image",
            });

            const analysisPrompt = userMessageContent
              ? userMessageContent
              : "Please analyze these extracted biomarkers and provide insights.";

            const response = await chatMutation.mutateAsync({
              message: `${analysisPrompt}\n\nExtracted data from uploaded ${isPDF ? "PDF" : "image"}:\n${JSON.stringify(extractResult, null, 2)}`,
              include_user_data: true,
            });

            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: response.response,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
        } else {
          const textContent = await fileToProcess.text();
          const analysisPrompt = userMessageContent
            ? userMessageContent
            : "Please analyze this data and provide insights.";

          const response = await chatMutation.mutateAsync({
            message: `${analysisPrompt}\n\nContent from ${fileName}:\n${textContent.slice(0, 10000)}`,
            include_user_data: true,
          });

          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: response.response,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error: any) {
        console.error("Processing error:", error);
        const errorData = error?.response?.data;
        const isNoApiKey = errorData?.error_type === "NO_API_KEY";
        const apiErrorMessage = errorData?.error;

        if (isNoApiKey) {
          toast.error("No API key configured");
          const errorMessage: ChatMessage = {
            role: "assistant",
            content: "You don't have an AI API key configured yet.\n\nTo use the AI assistant, please go to Settings → AI Keys and add your Anthropic API key.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          toast.error("Failed to process file");
          const errorMessage: ChatMessage = {
            role: "assistant",
            content: apiErrorMessage || "Sorry, I had trouble processing that file. Please try again or paste the content directly.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
    } else {
      try {
        const response = await chatMutation.mutateAsync({
          message: userMessageContent,
          include_user_data: true,
        });

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        console.error("Chat error:", error);
        const errorData = error?.response?.data;
        const isNoApiKey = errorData?.error_type === "NO_API_KEY";

        if (isNoApiKey) {
          toast.error("No API key configured");
          const errorMessage: ChatMessage = {
            role: "assistant",
            content: "You don't have an AI API key configured yet.\n\nTo use the AI assistant, please go to Settings → AI Keys and add your Anthropic API key.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          toast.error("Failed to get response. Please try again.");
          const errorMessage: ChatMessage = {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAttachedFile(file);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      toast.success(`File attached: ${file.name}`);
    }
  };

  const isLoading = chatMutation.isPending || extractMutation.isPending;

  // KPI data
  const kpiData = [
    {
      label: "Biomarkers",
      value: biomarkerCount,
      subtext: "tracked",
      icon: Activity,
      href: "/biomarkers",
    },
    {
      label: "Supplements",
      value: supplements?.filter((s) => s.is_active).length || 0,
      subtext: "active",
      icon: Pill,
      href: "/supplements",
    },
    {
      label: "Goals",
      value: goals?.filter((g) => g.status === "active").length || 0,
      subtext: "in progress",
      icon: Target,
      href: "/goals",
    },
    {
      label: "Routines",
      value: routines?.length || 0,
      subtext: "configured",
      icon: Clock,
      href: "/routines",
    },
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]" data-testid="ai-chat-dashboard">
      {/* Left Column - KPIs and Concerned Biomarkers */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Here's an overview of your health tracking</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiData.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground">{kpi.subtext}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <kpi.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Biomarker Trends Section */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Biomarker Trends</h2>
            </div>
            <Link href="/biomarkers">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {biomarkerSections.needsAttention.length === 0 &&
           biomarkerSections.watchClosely.length === 0 &&
           biomarkerSections.monitor.length === 0 &&
           biomarkerSections.gettingBetter.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-primary mb-2">
                <Activity className="w-10 h-10 mx-auto opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground">
                All biomarkers are optimal! Great job!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Needs Attention: Critical + Increasing */}
              {biomarkerSections.needsAttention.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">
                      Needs Attention
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({biomarkerSections.needsAttention.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {biomarkerSections.needsAttention.map((item) => (
                      <BiomarkerTrendCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Watch Closely: Suboptimal increasing (yellow going up) */}
              {biomarkerSections.watchClosely.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                      Watch Closely
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({biomarkerSections.watchClosely.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {biomarkerSections.watchClosely.map((item) => (
                      <BiomarkerTrendCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Monitor: Critical/Suboptimal stable or no trend data */}
              {biomarkerSections.monitor.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Monitor
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({biomarkerSections.monitor.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {biomarkerSections.monitor.map((item) => (
                      <BiomarkerTrendCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Getting Better: Any decreasing */}
              {biomarkerSections.gettingBetter.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-green-500 uppercase tracking-wide">
                      Getting Better
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({biomarkerSections.gettingBetter.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {biomarkerSections.gettingBetter.map((item) => (
                      <BiomarkerTrendCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - AI Chat */}
      <div
        className="w-[400px] flex-shrink-0 flex flex-col border rounded-lg bg-card"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Chat Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">AI Health Assistant</h2>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-lg font-medium text-primary">Drop file here</p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">How can I help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask questions or upload lab results for analysis.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs"
                    data-testid={`suggested-prompt-${index}`}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))
          )}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File Preview */}
        {attachedFile && (
          <div className="mx-4 mb-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.txt,.csv,.json,.pdf"
              className="hidden"
              data-testid="file-input"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="shrink-0 h-10 w-10"
              data-testid="attach-file-button"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="min-h-[40px] max-h-[80px] text-sm resize-none"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isLoading}
              className="h-10 w-10 shrink-0"
              data-testid="send-button"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status colors matching the biomarkers page
const STATUS_COLORS = {
  optimal: "#6B8E5A",
  suboptimal: "#D4A84B",
  critical: "#8B4513",
};

interface BiomarkerTrendCardProps {
  item: {
    name: string;
    value: number;
    previousValue: number | null;
    change: number | null;
    percentChange: number | null;
    unit: string;
    status: "critical" | "suboptimal";
    trend: TrendDirection | null;
    history: number[];
    reference: BiomarkerReference;
    biomarker: Biomarker;
  };
}

// Mini sparkline component
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const height = 16;
  const width = 40;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BiomarkerTrendCard({ item }: BiomarkerTrendCardProps) {
  const statusColor = item.status === "critical" ? STATUS_COLORS.critical : STATUS_COLORS.suboptimal;
  const borderColor = item.status === "critical" ? "border-[#8B4513]/30" : "border-[#D4A84B]/30";

  const getTrendIcon = () => {
    if (item.trend === "up") {
      return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
    } else if (item.trend === "down") {
      return <TrendingDown className="w-3.5 h-3.5 text-green-500" />;
    } else if (item.trend === "stable") {
      return <TrendStable className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return null;
  };

  const formatChange = () => {
    if (item.change === null) return null;
    const sign = item.change > 0 ? '+' : '';
    const changeColor = item.change > 0 ? 'text-red-400' : 'text-green-500';
    return (
      <span className={`text-[10px] ${changeColor}`}>
        {sign}{item.change.toFixed(1)}
      </span>
    );
  };

  return (
    <Link href={`/biomarkers/${item.biomarker.id}`}>
      <div className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors cursor-pointer border ${borderColor}`}>
        {/* Status dot */}
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        {/* Name */}
        <span className="font-medium text-xs truncate min-w-0 flex-1">{item.name}</span>
        {/* Change (before sparkline) */}
        {formatChange()}
        {/* Mini sparkline */}
        {item.history.length >= 2 && (
          <MiniSparkline
            values={item.history}
            color={statusColor}
          />
        )}
        {/* Value */}
        <span
          className="text-xs font-semibold tabular-nums shrink-0"
          style={{ color: statusColor }}
        >
          {item.value}
        </span>
        {/* Unit */}
        <span className="text-[10px] text-muted-foreground shrink-0">{item.unit}</span>
        {/* Trend icon (at the end) */}
        {getTrendIcon()}
      </div>
    </Link>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`p-1.5 rounded-full ${
          isUser ? "bg-primary" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div
        className={`flex-1 max-w-[85%] rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.timestamp && (
          <p
            className={`text-xs mt-1 ${
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
