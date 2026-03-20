"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { BroadcastComment } from "@singularity/shared-types";

interface CommentFeedProps {
  comments: BroadcastComment[];
  onComment: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  recipientName?: string;
}

export function CommentFeed({
  comments,
  onComment,
  isSubmitting,
  recipientName,
}: CommentFeedProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onComment(content.trim());
    setContent("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comments ({comments.length})</h3>
      </div>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="p-3 border rounded-lg bg-muted/30">
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm">
                  {(comment.recipient as any)?.contact_name || recipientName || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* New comment */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          size="icon"
          className="shrink-0 self-end"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
