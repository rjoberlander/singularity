"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  FileText,
  Send,
  Bot,
  HelpCircle,
  Edit3,
  Beaker,
  Target,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUpdateBiomarker, useDeleteBiomarker } from "@/hooks/useBiomarkers";
import { Biomarker } from "@/types";
import { BiomarkerReference } from "@/data/biomarkerReference";
import {
  calculateTrend,
  getTrendColor,
  formatPercentChange,
} from "@/utils/trendCalculation";
import { useIsStarred, useToggleStar } from "@/hooks/useBiomarkerStars";
import { BiomarkerDetailModalNotes } from "./BiomarkerDetailModalNotes";
import { aiApi } from "@/lib/api";

// Status colors
const STATUS_COLORS: Record<string, string> = {
  optimal: "#6B8E5A",
  suboptimal: "#D4A84B",
  critical: "#8B4513",
};

interface BiomarkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: BiomarkerReference;
  history: Biomarker[];
  onDataChange?: () => void;
}

export function BiomarkerDetailModal({
  isOpen,
  onClose,
  reference,
  history,
  onDataChange,
}: BiomarkerDetailModalProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const streamingContentRef = useRef("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Data point editing state
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDate, setEditDate] = useState("");

  // Mutations for edit/delete
  const updateBiomarker = useUpdateBiomarker();
  const deleteBiomarker = useDeleteBiomarker();

  // Star functionality
  const { data: isStarred } = useIsStarred(reference.name);
  const toggleStar = useToggleStar();

  // Sort history chronologically
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.date_tested).getTime() - new Date(b.date_tested).getTime()
    );
  }, [history]);

  const latestValue = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  // Suggestion bubbles for Alex
  const suggestionBubbles = useMemo(() => [
    { id: 'trend', label: 'Analyze my trend', icon: TrendingUp, prompt: `Look at my ${reference.name} history and tell me: is it improving, worsening, or stable? What does the pattern suggest?` },
    { id: 'improve', label: 'How to improve?', icon: Target, prompt: `What are the most effective ways to improve my ${reference.name}? Focus on diet, lifestyle, and supplements that actually work.` },
    { id: 'lifestyle', label: 'Lifestyle impact', icon: Beaker, prompt: `How do my daily habits affect ${reference.name}? What lifestyle factors (sleep, stress, exercise, alcohol, diet) have the biggest impact?` },
  ], [reference.name, reference.unit, latestValue?.value]);

  // Calculate trend
  const trendResult = useMemo(() => {
    return calculateTrend(history, reference);
  }, [history, reference]);

  // Get status of a value
  const getValueStatus = (value: number) => {
    const { optimalRange, suboptimalLowRange, suboptimalHighRange } = reference;
    if (value >= optimalRange.low && value <= optimalRange.high) return "optimal";
    if (
      (suboptimalLowRange && value >= suboptimalLowRange.low && value < optimalRange.low) ||
      (suboptimalHighRange && value > optimalRange.high && value <= suboptimalHighRange.high)
    ) return "suboptimal";
    return "critical";
  };

  const currentStatus = latestValue ? getValueStatus(latestValue.value) : "unknown";

  // Auto-scroll chat to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, streamingContent]);

  // Handle streaming chat
  const sendStreamingChat = async (message: string) => {
    if (isStreaming) return;

    setHasStartedChat(true);
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsStreaming(true);
    setStreamingContent("");
    streamingContentRef.current = "";

    await aiApi.chatStream(
      {
        message,
        biomarker_name: reference.name,
        include_user_data: true,
        context: 'biomarker_chat',
        title: `Chat about ${reference.name}`,
      },
      // onChunk - append text as it arrives
      (text) => {
        streamingContentRef.current += text;
        setStreamingContent(streamingContentRef.current);
      },
      // onDone - finalize the message (use ref to avoid double-execution)
      () => {
        const finalContent = streamingContentRef.current;
        if (finalContent) {
          setChatMessages(messages => [...messages, { role: 'assistant', content: finalContent }]);
        }
        streamingContentRef.current = "";
        setStreamingContent("");
        setIsStreaming(false);
      },
      // onError
      (error) => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I had trouble: ${error}` }]);
        streamingContentRef.current = "";
        setStreamingContent("");
        setIsStreaming(false);
      }
    );
  };

  // Handle suggestion bubble click
  const handleBubbleClick = async (prompt: string) => {
    await sendStreamingChat(prompt);
  };

  // Handle chat message send
  const handleSendChat = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    await sendStreamingChat(userMessage);
  };

  // Handle point click - select/deselect
  const handlePointClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPointIndex === index) {
      setSelectedPointIndex(null);
    } else {
      setSelectedPointIndex(index);
      setEditingPointIndex(null);
    }
  };

  // Start editing a point
  const startEditing = (index: number) => {
    const point = sortedHistory[index];
    setEditingPointIndex(index);
    setEditValue(point.value.toString());
    setEditDate(point.date_tested);
    setSelectedPointIndex(null);
  };

  // Save edited point
  const handleSaveEdit = async () => {
    if (editingPointIndex === null) return;
    const point = sortedHistory[editingPointIndex];
    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) return;

    await updateBiomarker.mutateAsync({
      id: point.id,
      data: {
        value: newValue,
        date_tested: editDate,
      },
    });
    setEditingPointIndex(null);
    setEditValue("");
    setEditDate("");
    onDataChange?.();
  };

  // Delete a point
  const handleDelete = async (index: number) => {
    const point = sortedHistory[index];
    if (confirm(`Delete this reading (${point.value} ${reference.unit} on ${formatChartDate(point.date_tested)})?`)) {
      await deleteBiomarker.mutateAsync(point.id);
      setSelectedPointIndex(null);
      onDataChange?.();
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingPointIndex(null);
    setEditValue("");
    setEditDate("");
  };

  // Get trend icon and color
  const TrendIcon = trendResult.direction === "up"
    ? TrendingUp
    : trendResult.direction === "down"
      ? TrendingDown
      : ArrowRight;
  const trendColor = getTrendColor(trendResult.health);

  // Chart dimensions - increased height to show labels
  const chartWidth = 380;
  const chartHeight = 140;
  const padding = { top: 20, right: 20, bottom: 28, left: 35 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate chart scales
  const chartData = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const values = sortedHistory.map(d => d.value);
    const minValue = Math.min(...values, reference.optimalRange.low * 0.8);
    const maxValue = Math.max(...values, reference.optimalRange.high * 1.2);
    const valueRange = maxValue - minValue;

    const scaleY = (v: number) =>
      padding.top + innerHeight - ((v - minValue) / valueRange) * innerHeight;

    const scaleX = (i: number) =>
      padding.left + (i / Math.max(sortedHistory.length - 1, 1)) * innerWidth;

    const points = sortedHistory.map((d, i) => ({
      x: scaleX(i),
      y: scaleY(d.value),
      value: d.value,
      date: d.date_tested,
      status: getValueStatus(d.value),
      index: i,
      id: d.id,
    }));

    const linePath = points.length > 1
      ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
      : '';

    const optimalTop = scaleY(reference.optimalRange.high);
    const optimalBottom = scaleY(reference.optimalRange.low);

    return { points, linePath, minValue, maxValue, scaleY, optimalTop, optimalBottom };
  }, [sortedHistory, reference, innerHeight, innerWidth, padding]);

  const formatChartDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0].slice(-2)}`;
    }
    return dateString;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] lg:max-h-[85vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleStar.toggle(reference.name, isStarred?.is_starred ?? false)}
                className="p-1 hover:bg-muted rounded transition-colors"
                disabled={toggleStar.isLoading}
              >
                <Star
                  className={`w-4 h-4 ${
                    isStarred?.is_starred
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground hover:text-yellow-400"
                  }`}
                />
              </button>
              <span className="text-lg font-semibold">{reference.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {reference.category}
              </span>
            </div>
            {latestValue && (
              <span
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[currentStatus] || "#6B7280" }}
              >
                {latestValue.value} {reference.unit}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Desktop: 2-column layout | Mobile: scrollable single column */}
        <div className="flex flex-col lg:flex-row lg:h-[calc(85vh-80px)] overflow-y-auto lg:overflow-hidden">

          {/* Left Column: Chart & Details */}
          <div className="flex-1 p-4 lg:border-r lg:overflow-y-auto">
            {/* Chart */}
            {chartData && sortedHistory.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                  <span className="text-sm font-medium">
                    {trendResult.direction === "up" ? "Trending Up" :
                     trendResult.direction === "down" ? "Trending Down" : "Stable"}
                  </span>
                  {trendResult.percentChange !== null && (
                    <span className="text-sm text-muted-foreground">
                      {formatPercentChange(trendResult.percentChange)}
                    </span>
                  )}
                </div>

                <svg
                  width="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="overflow-visible"
                  onClick={() => setSelectedPointIndex(null)}
                >
                  {/* Optimal zone background */}
                  <rect
                    x={padding.left}
                    y={chartData.optimalTop}
                    width={innerWidth}
                    height={chartData.optimalBottom - chartData.optimalTop}
                    fill={STATUS_COLORS.optimal}
                    opacity={0.15}
                  />
                  {/* Y-axis labels */}
                  <text x={padding.left - 5} y={chartData.optimalTop} textAnchor="end" dominantBaseline="middle" className="text-[9px] fill-muted-foreground">
                    {reference.optimalRange.high}
                  </text>
                  <text x={padding.left - 5} y={chartData.optimalBottom} textAnchor="end" dominantBaseline="middle" className="text-[9px] fill-muted-foreground">
                    {reference.optimalRange.low}
                  </text>
                  {/* Grid lines */}
                  <line x1={padding.left} y1={chartData.optimalTop} x2={chartWidth - padding.right} y2={chartData.optimalTop} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
                  <line x1={padding.left} y1={chartData.optimalBottom} x2={chartWidth - padding.right} y2={chartData.optimalBottom} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
                  {/* Line path */}
                  {chartData.linePath && (
                    <path d={chartData.linePath} fill="none" stroke={trendColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {/* Data points with labels */}
                  {chartData.points.map((point, i) => {
                    const isSelected = selectedPointIndex === i;
                    const isFirst = i === 0;
                    const isLast = i === chartData.points.length - 1;
                    // Determine label position to avoid overlap
                    const labelAbove = point.y > chartHeight / 2;
                    const labelY = labelAbove ? point.y - 12 : point.y + 16;

                    return (
                      <g key={i} className="cursor-pointer" onClick={(e) => handlePointClick(i, e)}>
                        {/* Larger hit area for clicking */}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={12}
                          fill="transparent"
                          className="hover:fill-current hover:fill-opacity-5"
                        />
                        {/* Actual point circle */}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isSelected ? 6 : 5}
                          fill={STATUS_COLORS[point.status]}
                          stroke={isSelected ? "white" : "white"}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="transition-all"
                        />
                        {/* Value label - show for all points */}
                        <text
                          x={point.x}
                          y={labelAbove ? point.y - 10 : point.y - 10}
                          textAnchor="middle"
                          className={`text-[9px] font-medium fill-foreground ${isSelected ? 'opacity-100' : 'opacity-70'}`}
                        >
                          {point.value}
                        </text>
                        {/* Date label - show for first, last, and selected */}
                        {(isFirst || isLast || isSelected) && (
                          <text
                            x={point.x}
                            y={chartHeight - 4}
                            textAnchor={isFirst && !isLast ? "start" : isLast && !isFirst ? "end" : "middle"}
                            className={`text-[8px] fill-muted-foreground ${isSelected ? 'font-medium' : ''}`}
                          >
                            {formatChartDate(point.date)}
                          </text>
                        )}
                        {/* Selection ring */}
                        {isSelected && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={10}
                            fill="none"
                            stroke={STATUS_COLORS[point.status]}
                            strokeWidth={1.5}
                            strokeDasharray="3,2"
                            className="animate-pulse"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Selected point actions - show below chart */}
                {selectedPointIndex !== null && (
                  <div className="mt-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">
                        {new Date(sortedHistory[selectedPointIndex].date_tested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="font-medium ml-2">{sortedHistory[selectedPointIndex].value} {reference.unit}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => startEditing(selectedPointIndex)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleDelete(selectedPointIndex)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setSelectedPointIndex(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {editingPointIndex !== null && (
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                    <div className="text-xs font-medium mb-2">Edit Reading</div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Value ({reference.unit})</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Date</label>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" className="h-7" onClick={cancelEditing}>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={handleSaveEdit}
                        disabled={updateBiomarker.isPending}
                      >
                        {updateBiomarker.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 font-medium">
                      Optimal: {reference.optimalRange.low}-{reference.optimalRange.high}
                    </span>
                    <span className="text-muted-foreground">
                      {reference.trendPreference === "lower_is_better" && <><span className="text-green-500">Lower is better</span></>}
                      {reference.trendPreference === "higher_is_better" && <><span className="text-green-500">Higher is better</span></>}
                      {reference.trendPreference === "range_is_optimal" && <><span className="text-green-500">In range is ideal</span></>}
                    </span>
                  </div>
                  {(reference.detailedDescription || reference.suboptimalLowRange) && (
                    <button onClick={() => setShowDetails(!showDetails)} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                      {showDetails ? "Hide" : "Details"}
                      {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {showDetails && reference.detailedDescription && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{reference.detailedDescription}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-[10px]">
                        Optimal: {reference.optimalRange.low}-{reference.optimalRange.high}
                      </span>
                      {reference.suboptimalLowRange && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px]">
                          Low: {reference.suboptimalLowRange.low}-{reference.suboptimalLowRange.high}
                        </span>
                      )}
                      {reference.suboptimalHighRange && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px]">
                          High: {reference.suboptimalHighRange.low}-{reference.suboptimalHighRange.high}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-stone-500/20 text-stone-600 dark:text-stone-400 text-[10px]">
                        Ref: {reference.referenceRange.low}-{reference.referenceRange.high}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Notes</span>
              </div>
              <BiomarkerDetailModalNotes biomarkerName={reference.name} />
            </div>
          </div>

          {/* Right Column: Alex AI Chat */}
          <div className="flex-1 p-4 flex flex-col lg:max-w-[50%]">
            <div className="bg-muted/30 rounded-lg p-3 flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium">Alex</div>
                  <div className="text-[10px] text-muted-foreground">AI Health Assistant</div>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto min-h-[200px] max-h-[350px] lg:max-h-none"
              >
                {/* Initial greeting when no messages */}
                {!hasStartedChat && chatMessages.length === 0 && (
                  <div className="space-y-4">
                    {/* Alex greeting message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[90%]">
                        <p className="mb-2">Hi! I'm <span className="font-semibold text-purple-500">Alex</span>, your AI health assistant.</p>
                        <p className="text-muted-foreground text-xs">
                          I can help you understand your <span className="font-medium text-foreground">{reference.name}</span> marker,
                          analyze trends, or even help you update your data. What would you like to know?
                        </p>
                      </div>
                    </div>

                    {/* Suggestion Bubbles */}
                    <div className="pl-8 space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quick actions</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestionBubbles.map((bubble) => (
                          <button
                            key={bubble.id}
                            onClick={() => handleBubbleClick(bubble.prompt)}
                            disabled={isStreaming}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted hover:border-purple-500/50 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <bubble.icon className="w-3 h-3 text-purple-500" />
                            <span>{bubble.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                {(hasStartedChat || chatMessages.length > 0) && (
                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className={`rounded-lg px-3 py-2 text-xs max-w-[85%] ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        </div>
                      </div>
                    ))}

                    {/* Streaming response - shows text in real-time */}
                    {isStreaming && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2 text-xs max-w-[85%]">
                          {streamingContent ? (
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {streamingContent}
                              <span className="inline-block w-1.5 h-3 bg-purple-500 ml-0.5 animate-pulse" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show suggestion bubbles after conversation started */}
                    {chatMessages.length > 0 && !isStreaming && (
                      <div className="pt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {suggestionBubbles.slice(0, 3).map((bubble) => (
                            <button
                              key={bubble.id}
                              onClick={() => handleBubbleClick(bubble.prompt)}
                              className="flex items-center gap-1 px-2 py-1 rounded-full border border-border/50 bg-background/50 hover:bg-muted hover:border-purple-500/30 transition-all text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              <bubble.icon className="w-2.5 h-2.5" />
                              <span>{bubble.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Alex anything..."
                  className="min-h-[36px] max-h-20 text-xs resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                />
                <Button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isStreaming}
                  size="sm"
                  className="h-9 px-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
