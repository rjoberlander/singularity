"use client";

import { useState, useRef, useEffect } from "react";
import { useAIChat, useExtractBiomarkers } from "@/hooks/useAI";
import { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, User, Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const SUGGESTED_PROMPTS = [
  "What supplements should I consider?",
  "Analyze my lab results",
  "How can I improve my sleep?",
  "Create a morning routine",
];

export default function DashboardPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useAIChat();
  const extractMutation = useExtractBiomarkers();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus textarea on mount
    textareaRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);

      // Create preview for images
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
        // Remove data URL prefix to get base64
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

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: userMessageContent || (hasFile ? `Uploaded: ${fileName}` : ""),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Process file if attached
    if (hasFile && attachedFile) {
      const fileToProcess = attachedFile;
      handleRemoveFile();

      try {
        if (isImage) {
          // Extract biomarkers from image
          const base64 = await processFileForAI(fileToProcess);
          if (base64) {
            const extractResult = await extractMutation.mutateAsync({
              image_base64: base64,
              source_type: "image",
            });

            // Send results to chat for analysis
            const analysisPrompt = userMessageContent
              ? userMessageContent
              : "Please analyze these extracted biomarkers and provide insights.";

            const response = await chatMutation.mutateAsync({
              message: `${analysisPrompt}\n\nExtracted data from uploaded image:\n${JSON.stringify(extractResult, null, 2)}`,
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
          // Read text file content
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
      } catch (error) {
        console.error("Processing error:", error);
        toast.error("Failed to process file. Please try again.");
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, I had trouble processing that file. Please try again or paste the content directly.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } else {
      // Regular chat message
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
      } catch (error) {
        console.error("Chat error:", error);
        toast.error("Failed to get response. Please try again.");
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
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

  const isLoading = chatMutation.isPending || extractMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]" data-testid="ai-chat-dashboard">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">How can I help you today?</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Ask questions, upload lab results, or import health data. I can analyze your biomarkers and provide personalized insights.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedPrompt(prompt)}
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
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {attachedFile && (
        <div className="mb-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
          {filePreview ? (
            <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
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
          className="shrink-0"
          data-testid="attach-file-button"
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your health..."
          className="min-h-[60px] max-h-[120px]"
          disabled={isLoading}
          data-testid="chat-input"
        />
        <Button
          onClick={handleSend}
          disabled={(!input.trim() && !attachedFile) || isLoading}
          className="h-auto shrink-0"
          data-testid="send-button"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
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
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`p-2 rounded-full ${
          isUser ? "bg-primary" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Bot className="w-5 h-5 text-primary" />
        )}
      </div>
      <div
        className={`flex-1 max-w-[80%] rounded-lg p-4 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.timestamp && (
          <p
            className={`text-xs mt-2 ${
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
