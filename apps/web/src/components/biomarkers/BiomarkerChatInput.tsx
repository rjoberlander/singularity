"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X, FileText, Image as ImageIcon, Upload } from "lucide-react";

interface BiomarkerChatInputProps {
  onSubmit: (data: { text?: string; files?: File[] }) => void;
  isProcessing?: boolean;
}

export function BiomarkerChatInput({ onSubmit, isProcessing }: BiomarkerChatInputProps) {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() && attachedFiles.length === 0) return;

    onSubmit({
      text: text.trim() || undefined,
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    });

    setText("");
    setAttachedFiles([]);
  }, [text, attachedFiles, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(
        file => file.type.startsWith("image/") || file.type === "application/pdf"
      );
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      setAttachedFiles(prev => [...prev, ...pastedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
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
      const newFiles = Array.from(files).filter(
        file => file.type.startsWith("image/") || file.type === "application/pdf"
      );
      if (newFiles.length > 0) {
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="w-3 h-3" />;
    }
    return <FileText className="w-3 h-3" />;
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
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {isDragging ? (
        <div className="flex flex-col items-center justify-center py-8 text-primary">
          <Upload className="w-8 h-8 mb-2" />
          <p className="text-sm font-medium">Drop files here</p>
          <p className="text-xs text-muted-foreground">Images & PDFs supported</p>
        </div>
      ) : (
        <>
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs max-w-[150px]"
                >
                  {getFileIcon(file)}
                  <span className="truncate flex-1">{file.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            data-testid="biomarker-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Drag & drop lab file or copy/paste text for AI extraction."
            className="min-h-[100px] max-h-[150px] resize-none text-sm mb-2 px-2"
            rows={4}
            disabled={isProcessing}
          />

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Paperclip className="w-3 h-3 mr-1.5" />
              {attachedFiles.length > 0 ? `Add More Files (${attachedFiles.length})` : "Attach Images/PDFs"}
            </Button>

            <Button
              data-testid="biomarker-send-button"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleSubmit}
              disabled={isProcessing || (!text.trim() && attachedFiles.length === 0)}
            >
              <Send className="w-3 h-3 mr-1.5" />
              {attachedFiles.length > 0 && text.trim()
                ? `Extract from ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} + text`
                : attachedFiles.length > 0
                ? `Extract from ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""}`
                : "Extract Biomarkers"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
