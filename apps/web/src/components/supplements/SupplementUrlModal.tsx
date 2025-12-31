"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useExtractSupplements, useAIChat } from "@/hooks/useAI";
import { useCreateSupplement } from "@/hooks/useSupplements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Link2,
  Sparkles,
  Send,
  MessageSquare,
  Bot,
  User,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { CreateSupplementRequest } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedSupplement {
  name: string;
  brand?: string;
  intake_quantity?: number;
  intake_form?: string;
  dose_per_serving?: number;
  dose_unit?: string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: string;
  frequency?: string;
  reason?: string;
  mechanism?: string;
  confidence: number;
}

interface SupplementUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialUrl?: string;
}

const INTAKE_FORM_OPTIONS = [
  { value: "capsule", label: "Capsule" },
  { value: "powder", label: "Powder" },
  { value: "liquid", label: "Liquid" },
  { value: "spray", label: "Spray" },
  { value: "gummy", label: "Gummy" },
  { value: "patch", label: "Patch" },
];

const DOSE_UNIT_OPTIONS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "IU", label: "IU" },
  { value: "ml", label: "ml" },
  { value: "CFU", label: "CFU" },
  { value: "%", label: "%" },
];

const TIMING_OPTIONS = [
  { value: "wake_up", label: "Wake Up" },
  { value: "am", label: "AM (Morning)" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM (Afternoon)" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Before Bed" },
];

const CATEGORY_OPTIONS = [
  "vitamin",
  "mineral",
  "amino_acid",
  "herb",
  "probiotic",
  "omega",
  "antioxidant",
  "hormone",
  "enzyme",
  "other",
];

export function SupplementUrlModal({
  open,
  onOpenChange,
  onSuccess,
  initialUrl,
}: SupplementUrlModalProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [step, setStep] = useState<"input" | "extracting" | "review">("input");
  const [extractedData, setExtractedData] = useState<ExtractedSupplement | null>(null);
  const [editedData, setEditedData] = useState<Partial<ExtractedSupplement>>({});

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const extractSupplements = useExtractSupplements();
  const aiChat = useAIChat();
  const createSupplement = useCreateSupplement();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setUrl(initialUrl || "");
      setStep("input");
      setExtractedData(null);
      setEditedData({});
      setChatMessages([]);
      setChatInput("");
      setShowChat(false);
    }
  }, [open, initialUrl]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-start extraction if initialUrl is provided
  useEffect(() => {
    if (open && initialUrl && step === "input") {
      setUrl(initialUrl);
      handleExtract(initialUrl);
    }
  }, [open, initialUrl]);

  const handleExtract = async (urlToExtract?: string) => {
    const targetUrl = urlToExtract || url;
    if (!targetUrl.trim()) return;

    setStep("extracting");

    try {
      const result = await extractSupplements.mutateAsync({
        text_content: `[URL]: ${targetUrl}`,
        source_type: "text",
      });

      if (result.supplements && result.supplements.length > 0) {
        const supplement = {
          ...result.supplements[0],
          purchase_url: targetUrl,
        };
        setExtractedData(supplement);
        setEditedData(supplement);
        setStep("review");

        // Add initial AI message
        setChatMessages([{
          role: "assistant",
          content: `I've extracted information for **${supplement.name}**${supplement.brand ? ` by ${supplement.brand}` : ''}. Please review the details and let me know if anything needs to be corrected or if you have questions!`
        }]);

        toast.success("Supplement info extracted!");
      } else {
        toast.error("Could not extract supplement info from this URL");
        setStep("input");
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      toast.error(error?.response?.data?.error || "Failed to extract supplement info");
      setStep("input");
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || aiChat.isPending) return;

    const userMessage = chatInput.trim();
    setChatInput("");

    // Add user message
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      // Build context with current extracted data
      const context = `User is reviewing an extracted supplement from URL: ${url}
Current extracted data: ${JSON.stringify(editedData, null, 2)}
User question/request: ${userMessage}

If the user wants to change any values, respond with the corrected information clearly. If they're asking a question, answer helpfully.`;

      const response = await aiChat.mutateAsync({
        message: userMessage,
        context: context,
      });

      setChatMessages(prev => [...prev, { role: "assistant", content: response.response }]);

      // Try to detect if AI suggested changes and parse them
      // This is a simple heuristic - could be more sophisticated
      const responseText = response.response.toLowerCase();
      if (responseText.includes("updated") || responseText.includes("changed") || responseText.includes("corrected")) {
        // Prompt user to manually update or implement auto-update logic
      }
    } catch (error) {
      console.error("Chat failed:", error);
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    }
  };

  const handleSave = async () => {
    if (!editedData.name) {
      toast.error("Name is required");
      return;
    }

    try {
      const supplementData: CreateSupplementRequest = {
        name: editedData.name,
        brand: editedData.brand,
        intake_quantity: editedData.intake_quantity || 1,
        intake_form: editedData.intake_form,
        dose_per_serving: editedData.dose_per_serving,
        dose_unit: editedData.dose_unit,
        servings_per_container: editedData.servings_per_container,
        price: editedData.price,
        purchase_url: editedData.purchase_url || url,
        category: editedData.category,
        timing: editedData.timing,
        frequency: editedData.frequency || "daily",
        reason: editedData.reason,
        mechanism: editedData.mechanism,
      };

      await createSupplement.mutateAsync(supplementData);
      toast.success("Supplement saved!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save supplement:", error);
      toast.error("Failed to save supplement");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {step === "input" && "Add Supplement from URL"}
            {step === "extracting" && "Extracting Supplement Info..."}
            {step === "review" && "Review Supplement"}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Paste a product URL to extract supplement information"}
            {step === "extracting" && "AI is analyzing the product page"}
            {step === "review" && "Review and edit the extracted information"}
          </DialogDescription>
        </DialogHeader>

        {/* URL Input Step */}
        {step === "input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Product URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://amazon.com/dp/..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleExtract()}
                />
                <Button onClick={() => handleExtract()} disabled={!url.trim()}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Works with Amazon, iHerb, and most supplement store URLs
              </p>
            </div>
          </div>
        )}

        {/* Extracting Step */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing product page...</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md text-center truncate">
              {url}
            </p>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && extractedData && (
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* Left side - Form */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {/* Header with confidence */}
                <div className="flex items-center justify-between">
                  <Badge variant={extractedData.confidence >= 0.8 ? "default" : "secondary"}>
                    {Math.round(extractedData.confidence * 100)}% confidence
                  </Badge>
                  {editedData.purchase_url && (
                    <a
                      href={editedData.purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Product
                    </a>
                  )}
                </div>

                {/* Name & Brand */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={editedData.name || ""}
                      onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Brand</Label>
                    <Input
                      value={editedData.brand || ""}
                      onChange={(e) => setEditedData({ ...editedData, brand: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Intake */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Select
                      value={(editedData.intake_quantity || 1).toString()}
                      onValueChange={(v) => setEditedData({ ...editedData, intake_quantity: parseInt(v) })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Form</Label>
                    <Select
                      value={editedData.intake_form || ""}
                      onValueChange={(v) => setEditedData({ ...editedData, intake_form: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTAKE_FORM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Per Serving</Label>
                    <Input
                      type="number"
                      value={editedData.dose_per_serving || ""}
                      onChange={(e) => setEditedData({ ...editedData, dose_per_serving: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={editedData.dose_unit || ""}
                      onValueChange={(v) => setEditedData({ ...editedData, dose_unit: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOSE_UNIT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Category & Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={editedData.category || ""}
                      onValueChange={(v) => setEditedData({ ...editedData, category: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Timing</Label>
                    <Select
                      value={editedData.timing || ""}
                      onValueChange={(v) => setEditedData({ ...editedData, timing: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Servings & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Servings Per Container</Label>
                    <Input
                      type="number"
                      value={editedData.servings_per_container || ""}
                      onChange={(e) => setEditedData({ ...editedData, servings_per_container: parseInt(e.target.value) || undefined })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.price || ""}
                      onChange={(e) => setEditedData({ ...editedData, price: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Why taking (reason) */}
                {editedData.reason && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Why Take This</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {editedData.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Chat */}
            <div className="w-72 flex flex-col border-l pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  AI Assistant
                </h4>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto pr-2" ref={chatScrollRef}>
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {aiChat.isPending && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat input */}
              <div className="mt-3 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about this supplement..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  disabled={aiChat.isPending}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || aiChat.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Ask questions or request changes
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {step === "review" && (
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createSupplement.isPending}>
              {createSupplement.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Supplement
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
