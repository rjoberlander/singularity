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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BIOMARKER_REFERENCE, BiomarkerReference } from "@/data/biomarkerReference";

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

  // Group biomarkers by name and get concerned ones
  const { concernedBiomarkers, biomarkerCount } = useMemo(() => {
    const biomarkersByName = new Map<string, Biomarker[]>();
    if (!biomarkers) return { concernedBiomarkers: [], biomarkerCount: 0 };

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

    // Find critical biomarkers
    const concerned: Array<{
      name: string;
      value: number;
      unit: string;
      status: "critical" | "suboptimal";
      reference: BiomarkerReference;
      biomarker: Biomarker;
    }> = [];

    BIOMARKER_REFERENCE.forEach((ref) => {
      const history = biomarkersByName.get(ref.name) || [];
      if (history.length > 0) {
        const latest = history.sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        )[0];
        const status = getValueStatus(latest.value, ref);
        if (status === "critical") {
          concerned.push({
            name: ref.name,
            value: latest.value,
            unit: latest.unit,
            status,
            reference: ref,
            biomarker: latest,
          });
        }
      }
    });

    return {
      concernedBiomarkers: concerned,
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

        {/* Concerned Biomarkers Section */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold">Concerned Biomarkers</h2>
              {concernedBiomarkers.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                  {concernedBiomarkers.length}
                </span>
              )}
            </div>
            <Link href="/biomarkers">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {concernedBiomarkers.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-primary mb-2">
                <Activity className="w-12 h-12 mx-auto opacity-50" />
              </div>
              <p className="text-muted-foreground">
                No critical biomarkers detected. Great job keeping your health on track!
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {concernedBiomarkers.map((item) => (
                <Link key={item.name} href={`/biomarkers/${item.biomarker.id}`}>
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-destructive/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Optimal: {item.reference.optimalRange.low} - {item.reference.optimalRange.high} {item.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-destructive">
                          {item.value} <span className="text-sm font-normal">{item.unit}</span>
                        </p>
                        <p className="text-xs text-destructive">Critical</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
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
