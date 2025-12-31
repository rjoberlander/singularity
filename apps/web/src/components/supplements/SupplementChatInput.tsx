"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useHasActiveAIKey } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Paperclip, Send, X, FileText, Image as ImageIcon, Upload, AlertTriangle } from "lucide-react";

// ~50K chars is safe for Claude's context (leaves room for system prompt + response)
const MAX_TEXT_LENGTH = 50000;
const WARNING_THRESHOLD = 40000;

interface SupplementChatInputProps {
  onSubmit: (data: { text?: string; file?: File; url?: string }) => void;
  isProcessing?: boolean;
}

export function SupplementChatInput({ onSubmit, isProcessing }: SupplementChatInputProps) {
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check for AI API key
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();

  const handleSubmit = useCallback(() => {
    if (!text.trim() && !attachedFile) return;

    onSubmit({
      text: text.trim() || undefined,
      file: attachedFile || undefined,
    });

    setText("");
    setAttachedFile(null);
  }, [text, attachedFile, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setAttachedFile(file);
          return;
        }
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setAttachedFile(file);
      }
    }
  };

  const getFileIcon = () => {
    if (!attachedFile) return null;
    if (attachedFile.type.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div
      ref={dropZoneRef}
      className={`border rounded-lg bg-card px-1.5 py-2 shadow-sm transition-colors ${
        isDragging ? "border-primary border-2 bg-primary/5" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {isDragging ? (
        <div className="flex flex-col items-center justify-center py-8 text-primary">
          <Upload className="w-8 h-8 mb-2" />
          <p className="text-sm font-medium">Drop file here</p>
        </div>
      ) : (
        <>
          {/* API Key Warning */}
          {!isCheckingKey && !hasAIKey && (
            <Alert variant="destructive" className="mb-2 py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                No API key configured.{" "}
                <Link href="/settings" className="underline font-medium hover:no-underline">
                  Add API Key
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-1.5 py-1.5 bg-muted rounded text-xs">
              {getFileIcon()}
              <span className="truncate flex-1">{attachedFile.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => setAttachedFile(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Textarea
              data-testid="supplement-chat-input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Drag & drop file or copy/paste text or URL for AI extraction."
              className="min-h-[80px] max-h-[120px] resize-none text-sm px-2"
              rows={3}
              disabled={isProcessing}
            />
            {text.length > 0 && (
              <div className={`text-[10px] text-right px-1 ${
                text.length > MAX_TEXT_LENGTH ? "text-destructive font-medium" :
                text.length > WARNING_THRESHOLD ? "text-amber-500" :
                "text-muted-foreground"
              }`}>
                {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                {text.length > WARNING_THRESHOLD && text.length <= MAX_TEXT_LENGTH && " (approaching limit)"}
                {text.length > MAX_TEXT_LENGTH && " (over limit)"}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Paperclip className="w-3 h-3 mr-1.5" />
              Attach Image/PDF
            </Button>

            <Button
              data-testid="supplement-send-button"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleSubmit}
              disabled={isProcessing || (!text.trim() && !attachedFile) || !hasAIKey || text.length > MAX_TEXT_LENGTH}
            >
              <Send className="w-3 h-3 mr-1.5" />
              Extract Supplements
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
