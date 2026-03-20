"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Vote } from "lucide-react";
import {
  BroadcastVoteOption,
  BroadcastVote,
  BroadcastVotingType,
} from "@singularity/shared-types";

interface VotingWidgetProps {
  options: BroadcastVoteOption[];
  votingType: BroadcastVotingType;
  votingDeadline?: string;
  myVotes: BroadcastVote[];
  onVote: (optionIds: string[], otherText?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function VotingWidget({
  options,
  votingType,
  votingDeadline,
  myVotes,
  onVote,
  isSubmitting,
}: VotingWidgetProps) {
  const hasVoted = myVotes.length > 0;
  const isExpired = votingDeadline && new Date(votingDeadline) < new Date();

  const [selectedSingle, setSelectedSingle] = useState<string>(
    myVotes[0]?.option_id || ""
  );
  const [selectedMulti, setSelectedMulti] = useState<Set<string>>(
    new Set(myVotes.map((v) => v.option_id))
  );
  const [otherText, setOtherText] = useState(
    myVotes.find((v) => v.other_text)?.other_text || ""
  );

  const otherOption = options.find((o) => o.is_other);
  const hasOtherSelected =
    votingType === "single"
      ? selectedSingle === otherOption?.id
      : selectedMulti.has(otherOption?.id || "");

  const handleSubmit = async () => {
    const optionIds =
      votingType === "single"
        ? [selectedSingle]
        : Array.from(selectedMulti);

    if (optionIds.length === 0 || (optionIds.length === 1 && !optionIds[0])) return;
    await onVote(optionIds, hasOtherSelected ? otherText : undefined);
  };

  const toggleMulti = (id: string) => {
    const next = new Set(selectedMulti);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMulti(next);
  };

  if (isExpired) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Voting closed on{" "}
          {new Date(votingDeadline!).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {hasVoted && (
          <p className="text-sm mt-1">
            Your vote: {myVotes.map((v) => v.option?.label || v.other_text).join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="h-5 w-5" />
        <h3 className="font-semibold">
          {hasVoted ? "Update your vote" : "Cast your vote"}
        </h3>
      </div>

      {votingDeadline && (
        <p className="text-xs text-muted-foreground">
          Deadline:{" "}
          {new Date(votingDeadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}

      {votingType === "single" ? (
        <RadioGroup value={selectedSingle} onValueChange={setSelectedSingle}>
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.id} id={`vote-${option.id}`} />
              <Label htmlFor={`vote-${option.id}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`vote-${option.id}`}
                checked={selectedMulti.has(option.id)}
                onCheckedChange={() => toggleMulti(option.id)}
              />
              <Label htmlFor={`vote-${option.id}`}>{option.label}</Label>
            </div>
          ))}
        </div>
      )}

      {hasOtherSelected && (
        <Input
          placeholder="Please specify..."
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
        />
      )}

      <Button
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          (votingType === "single" && !selectedSingle) ||
          (votingType === "multi" && selectedMulti.size === 0)
        }
        className="w-full"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {hasVoted ? "Update Vote" : "Submit Vote"}
      </Button>
    </div>
  );
}
