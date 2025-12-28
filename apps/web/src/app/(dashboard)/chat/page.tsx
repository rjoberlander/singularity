"use client";

import { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/useAI";
import { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, User, Send, Loader2, Sparkles, RefreshCw } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What supplements should I consider based on my biomarkers?",
  "How can I improve my vitamin D levels?",
  "Analyze my recent lab results and suggest improvements",
  "What's the optimal timing for my supplement stack?",
  "Suggest a morning routine for better energy",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [includeUserData, setIncludeUserData] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useAIChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content,
        include_user_data: includeUserData,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
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

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Health Assistant
          </h1>
          <p className="text-muted-foreground">
            Get personalized health insights powered by AI
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearChat}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        )}
      </div>

      {/* Settings */}
      <Card className="p-4 mb-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="include-data"
            checked={includeUserData}
            onCheckedChange={setIncludeUserData}
          />
          <Label htmlFor="include-data">
            Include my biomarkers and supplements for personalized advice
          </Label>
        </div>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Ask me anything about your health data, supplement recommendations,
              or optimization strategies.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="text-left"
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

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your health..."
          className="min-h-[60px] max-h-[120px]"
          disabled={chatMutation.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className="h-auto"
        >
          {chatMutation.isPending ? (
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
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
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
