"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Users,
  Eye,
  Vote,
  MessageSquare,
} from "lucide-react";
import { JournalEntry } from "@singularity/shared-types";
import { cn } from "@/lib/utils";

interface BroadcastCardProps {
  entry: JournalEntry;
  className?: string;
}

export function BroadcastCard({ entry, className }: BroadcastCardProps) {
  const recipientCount = entry.broadcast_recipients?.length || 0;
  const readCount = entry.broadcast_recipients?.filter(r => r.first_read_at).length || 0;

  return (
    <Link
      href={`/journal/${entry.id}`}
      className={cn(
        "block p-4 border rounded-lg hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="gap-1 text-xs shrink-0">
              <Radio className="h-3 w-3" />
              Broadcast
            </Badge>
            {entry.voting_enabled && (
              <Badge variant="secondary" className="text-xs">
                <Vote className="h-3 w-3 mr-1" />
                Voting
              </Badge>
            )}
          </div>
          <h3 className="font-medium truncate">
            {entry.title || "Untitled Broadcast"}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {entry.content}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {recipientCount} recipients
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {readCount}/{recipientCount} read
        </span>
        {entry.comments_enabled && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="ml-auto">
          {new Date(entry.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </Link>
  );
}
