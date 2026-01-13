"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  Download,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface TemplateData {
  template_key: string;
  display_name: string;
  filename: string;
  content_type: "json" | "markdown";
  is_input: boolean;
  description?: string;
  content: string;
  is_customized: boolean;
  customized_at?: string;
}

interface TemplateEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseNumber: number;
  phaseName: string;
  templateKey: string;
  onSaved?: () => void;
}

export function TemplateEditorSheet({
  open,
  onOpenChange,
  phaseNumber,
  phaseName,
  templateKey,
  onSaved,
}: TemplateEditorSheetProps) {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Helper to get auth headers for API calls
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    };
  };

  // Load template when sheet opens
  useEffect(() => {
    if (open && templateKey) {
      loadTemplate();
    }
  }, [open, phaseNumber, templateKey]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/travel/guide/templates/${phaseNumber}/${templateKey}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error("Failed to load template");
      }
      const result = await response.json();
      if (result.success && result.data) {
        setTemplate(result.data);
        // Format JSON for display
        if (result.data.content_type === "json") {
          try {
            const formatted = JSON.stringify(JSON.parse(result.data.content), null, 2);
            setEditedContent(formatted);
          } catch {
            setEditedContent(result.data.content);
          }
        } else {
          setEditedContent(result.data.content);
        }
        setHasChanges(false);
        setJsonError(null);
      }
    } catch (error) {
      toast.error("Failed to load template");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate JSON when content changes
  const handleContentChange = useCallback((value: string) => {
    setEditedContent(value);
    setHasChanges(value !== template?.content);

    if (template?.content_type === "json") {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      }
    }
  }, [template]);

  // Save template
  const handleSave = async () => {
    if (!template) return;

    // Validate JSON before saving
    if (template.content_type === "json") {
      try {
        JSON.parse(editedContent);
      } catch (e) {
        toast.error("Cannot save invalid JSON");
        return;
      }
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/travel/guide/templates/${phaseNumber}/${templateKey}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ content: editedContent }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save template");
      }

      toast.success("Template saved");
      setHasChanges(false);
      setTemplate((prev) =>
        prev ? { ...prev, is_customized: true, content: editedContent } : null
      );
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = async () => {
    if (!template?.is_customized) {
      toast.info("Already using default template");
      return;
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/travel/guide/templates/${phaseNumber}/${templateKey}`,
        { method: "DELETE", headers }
      );

      if (!response.ok) {
        throw new Error("Failed to reset template");
      }

      toast.success("Reset to default template");
      // Reload to get default content
      await loadTemplate();
      onSaved?.();
    } catch (error) {
      toast.error("Failed to reset template");
    } finally {
      setIsSaving(false);
    }
  };

  // Download template
  const handleDownload = () => {
    if (!template) return;

    const blob = new Blob([editedContent], {
      type: template.content_type === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = template.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${template.filename}`);
  };

  // Format JSON
  const handleFormatJson = () => {
    if (template?.content_type !== "json") return;

    try {
      const formatted = JSON.stringify(JSON.parse(editedContent), null, 2);
      setEditedContent(formatted);
      setJsonError(null);
      toast.success("JSON formatted");
    } catch (e) {
      toast.error("Cannot format invalid JSON");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <div className="p-6 border-b">
          <SheetHeader>
            <div className="flex items-center gap-2">
              {template?.content_type === "json" ? (
                <FileJson className="h-5 w-5 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 text-purple-500" />
              )}
              <SheetTitle>{template?.display_name || "Loading..."}</SheetTitle>
            </div>
            <SheetDescription>
              {phaseName} - {template?.filename}
            </SheetDescription>
          </SheetHeader>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-4">
            {template?.is_customized ? (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                Customized
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Default
              </Badge>
            )}
            <Badge variant="outline">
              {template?.is_input ? "Input" : "Output Template"}
            </Badge>
            {hasChanges && (
              <Badge variant="outline" className="text-blue-600 border-blue-500">
                Unsaved changes
              </Badge>
            )}
          </div>

          {template?.description && (
            <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-[500px] font-mono text-sm resize-none"
                  placeholder="Template content..."
                />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* JSON validation error */}
        {jsonError && (
          <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{jsonError}</span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 border-t bg-muted/30 flex items-center gap-2">
          {template?.content_type === "json" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFormatJson}
              disabled={!!jsonError}
            >
              Format JSON
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={!template?.is_customized || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !!jsonError}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
