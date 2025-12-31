"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAIChat } from "@/hooks/useAI";
import { ChatMessage } from "@/types";
import { Bot, User, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BiomarkerDetailModalChatProps {
  biomarkerName: string;
  currentValue?: number;
  unit?: string;
  status?: string;
}

const SUGGESTED_PROMPTS = [
  "What does this level mean for my health?",
  "How can I improve this biomarker?",
  "What supplements might help?",
  "Is this a concerning trend?",
];

export function BiomarkerDetailModalChat({
  biomarkerName,
  currentValue,
  unit,
  status,
}: BiomarkerDetailModalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useAIChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Build context about the biomarker
    let biomarkerContext = `The user is asking about their ${biomarkerName} biomarker.`;
    if (currentValue !== undefined && unit) {
      biomarkerContext += ` Current value: ${currentValue} ${unit}.`;
    }
    if (status) {
      biomarkerContext += ` Current status: ${status}.`;
    }

    try {
      const response = await chatMutation.mutateAsync({
        message: text,
        context: biomarkerContext,
        include_user_data: true,
        biomarker_name: biomarkerName,
        title: `${biomarkerName} Discussion`,
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[300px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Ask me anything about your {biomarkerName} levels
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(prompt)}
                  className="text-[10px] h-6 px-2"
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

        {chatMutation.isPending && (
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-full">
              <Bot className="w-3 h-3 text-purple-500" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${biomarkerName}...`}
          className="min-h-[40px] max-h-[80px] text-sm resize-none"
          disabled={chatMutation.isPending}
        />
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || chatMutation.isPending}
          size="sm"
          className="h-auto px-3"
        >
          {chatMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
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
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`p-1.5 rounded-full flex-shrink-0 ${
          isUser ? "bg-primary" : "bg-purple-500/10"
        }`}
      >
        {isUser ? (
          <User className="w-3 h-3 text-primary-foreground" />
        ) : (
          <Bot className="w-3 h-3 text-purple-500" />
        )}
      </div>
      <div
        className={`flex-1 max-w-[85%] rounded-lg p-2 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
