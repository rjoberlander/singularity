"use client";

import { useBroadcastStatus, useResendBroadcastSMS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  EyeOff,
  Vote,
  MessageSquare,
  RefreshCw,
  Send,
  Check,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { BroadcastRecipient, BroadcastVoteOption, BroadcastVote, BroadcastComment } from "@singularity/shared-types";

interface BroadcastStatusPanelProps {
  entryId: string;
}

export function BroadcastStatusPanel({ entryId }: BroadcastStatusPanelProps) {
  const { data: status, isLoading } = useBroadcastStatus(entryId);
  const resendSMS = useResendBroadcastSMS(entryId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!status) return null;

  const { summary, recipients, vote_options, votes, comments } = status;

  const handleResend = async (recipientId: string) => {
    try {
      await resendSMS.mutateAsync([recipientId]);
      toast.success("SMS resent");
    } catch {
      toast.error("Failed to resend SMS");
    }
  };

  // Calculate vote tallies
  const voteTallies = vote_options.map((option: BroadcastVoteOption) => {
    const count = votes.filter((v: BroadcastVote) => v.option_id === option.id).length;
    return { option, count };
  });

  const totalVotes = new Set(votes.map((v: BroadcastVote) => v.recipient_id)).size;
  const readPct = summary.total_recipients > 0
    ? Math.round((summary.read_count / summary.total_recipients) * 100)
    : 0;

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <h3 className="font-semibold text-lg">Broadcast Status</h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold">{summary.total_recipients}</div>
          <div className="text-xs text-muted-foreground">Recipients</div>
        </div>
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{summary.read_count}</div>
          <div className="text-xs text-muted-foreground">Read</div>
        </div>
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.voted_count}</div>
          <div className="text-xs text-muted-foreground">Voted</div>
        </div>
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.comment_count}</div>
          <div className="text-xs text-muted-foreground">Comments</div>
        </div>
      </div>

      {/* Read progress */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Read rate</span>
          <span>{readPct}%</span>
        </div>
        <Progress value={readPct} />
      </div>

      {/* Vote results */}
      {vote_options.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Vote className="h-4 w-4" />
            Vote Results ({totalVotes} votes)
          </h4>
          {voteTallies.map(({ option, count }: { option: BroadcastVoteOption; count: number }) => {
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={option.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{option.label}</span>
                  <span className="text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
          {/* Show "Other" text responses */}
          {votes
            .filter((v: BroadcastVote) => v.other_text)
            .map((v: BroadcastVote) => (
              <div key={v.id} className="text-sm text-muted-foreground pl-2 border-l-2">
                &quot;{v.other_text}&quot;
              </div>
            ))}
        </div>
      )}

      {/* Recipients table */}
      <div>
        <h4 className="font-medium mb-2">Recipients</h4>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Voted</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r: BroadcastRecipient) => {
                const recipientVotes = votes.filter(
                  (v: BroadcastVote) => v.recipient_id === r.id
                );
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.contact_name}
                      {r.contact_phone && (
                        <div className="text-xs text-muted-foreground">
                          {r.contact_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.first_read_at ? (
                        <Badge variant="secondary" className="gap-1">
                          <Eye className="h-3 w-3" />
                          {r.read_count}x
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          <EyeOff className="h-4 w-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipientVotes.length > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.sms_sent_at ? (
                        <Badge variant="outline" className="gap-1">
                          <Send className="h-3 w-3" />
                          {r.followup_count > 0 && `+${r.followup_count}`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          <Clock className="h-4 w-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.contact_phone && !r.first_read_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResend(r.id)}
                          disabled={resendSMS.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Comments feed */}
      {comments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments.length})
          </h4>
          <div className="space-y-2">
            {comments.map((c: BroadcastComment) => (
              <div key={c.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">
                    {(c.recipient as any)?.contact_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm mt-1">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}
