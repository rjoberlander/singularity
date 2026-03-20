"use client";

import { use, useEffect } from "react";
import {
  useBroadcastView,
  useMarkBroadcastRead,
  useSubmitBroadcastVote,
  useSubmitBroadcastComment,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { VotingWidget } from "@/components/journal/VotingWidget";
import { CommentFeed } from "@/components/journal/CommentFeed";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "lucide-react";

export default function BroadcastViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading, error } = useBroadcastView(token);
  const markRead = useMarkBroadcastRead();
  const submitVote = useSubmitBroadcastVote(token);
  const submitComment = useSubmitBroadcastComment(token);

  // Mark as read on page load
  useEffect(() => {
    if (data && token) {
      markRead.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, !!data]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-20">
        <h1 className="text-xl font-bold mb-2">Broadcast Not Found</h1>
        <p className="text-muted-foreground">
          This link may be invalid or expired.
        </p>
      </div>
    );
  }

  const { entry, recipient, voting_enabled, voting_type, voting_deadline, comments_enabled, vote_options, my_votes, comments } = data;

  const handleVote = async (optionIds: string[], otherText?: string) => {
    try {
      await submitVote.mutateAsync({ option_ids: optionIds, other_text: otherText });
      toast.success("Vote submitted!");
    } catch {
      toast.error("Failed to submit vote");
    }
  };

  const handleComment = async (content: string) => {
    try {
      await submitComment.mutateAsync({ content });
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Hi {recipient.contact_name}!
          </p>
          <h1 className="text-2xl font-bold">{entry.title || "Broadcast"}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            {new Date(entry.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {entry.content_html ? (
            <div dangerouslySetInnerHTML={{ __html: entry.content_html }} />
          ) : (
            <div className="whitespace-pre-wrap">{entry.content}</div>
          )}
        </div>

        {/* Media */}
        {entry.media && entry.media.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {entry.media.map((m: any) => (
              <div key={m.id} className="rounded-lg overflow-hidden">
                {m.media_type === "image" ? (
                  <img
                    src={m.file_url}
                    alt=""
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <video src={m.file_url} controls className="w-full" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voting */}
        {voting_enabled && vote_options.length > 0 && (
          <>
            <Separator />
            <VotingWidget
              options={vote_options}
              votingType={voting_type}
              votingDeadline={voting_deadline}
              myVotes={my_votes}
              onVote={handleVote}
              isSubmitting={submitVote.isPending}
            />
          </>
        )}

        {/* Comments */}
        {comments_enabled && (
          <>
            <Separator />
            <CommentFeed
              comments={comments}
              onComment={handleComment}
              isSubmitting={submitComment.isPending}
              recipientName={recipient.contact_name}
            />
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-8 pb-4">
          Powered by Singularity
        </div>
      </div>
    </div>
  );
}
