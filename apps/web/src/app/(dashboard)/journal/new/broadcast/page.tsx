"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBroadcast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  FileText,
  Vote,
  Users,
  MessageSquare,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ContactSelector,
  SelectedRecipient,
} from "@/components/journal/ContactSelector";
import { VoteOptionsEditor } from "@/components/journal/VoteOptionsEditor";
import { BroadcastVotingType } from "@singularity/shared-types";

type Step = "content" | "voting" | "recipients" | "preview";

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "content", label: "Content", icon: <FileText className="h-4 w-4" /> },
  { key: "voting", label: "Voting", icon: <Vote className="h-4 w-4" /> },
  { key: "recipients", label: "Recipients", icon: <Users className="h-4 w-4" /> },
  { key: "preview", label: "Preview & Send", icon: <Eye className="h-4 w-4" /> },
];

export default function NewBroadcastPage() {
  const router = useRouter();
  const createBroadcast = useCreateBroadcast();

  const [step, setStep] = useState<Step>("content");

  // Content
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Voting
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [votingType, setVotingType] = useState<BroadcastVotingType>("single");
  const [voteOptions, setVoteOptions] = useState<string[]>(["", ""]);
  const [votingDeadline, setVotingDeadline] = useState("");

  // Comments
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  // Recipients
  const [recipients, setRecipients] = useState<SelectedRecipient[]>([]);

  // SMS message
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const canProceed = () => {
    switch (step) {
      case "content":
        return title.trim() && content.trim();
      case "voting":
        if (!votingEnabled) return true;
        return voteOptions.filter((o) => o.trim()).length >= 2;
      case "recipients":
        return recipients.length > 0;
      case "preview":
        return broadcastMessage.trim();
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      const next = STEPS[currentStepIndex + 1].key;
      if (next === "preview" && !broadcastMessage) {
        // Auto-generate SMS message from title
        setBroadcastMessage(
          `${title}${votingEnabled ? " - Please vote!" : ""}`
        );
      }
      setStep(next);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1].key);
    }
  };

  const handleSend = async () => {
    try {
      const result = await createBroadcast.mutateAsync({
        title,
        content,
        broadcast_message: broadcastMessage,
        voting_enabled: votingEnabled,
        voting_type: votingEnabled ? votingType : "single",
        voting_deadline: votingDeadline || undefined,
        comments_enabled: commentsEnabled,
        vote_options: votingEnabled
          ? voteOptions.filter((o) => o.trim())
          : [],
        recipients: recipients.map((r) => ({
          contact_name: r.contact_name,
          contact_phone: r.contact_phone,
          contact_email: r.contact_email,
          google_contact_id: r.google_contact_id,
        })),
      });

      toast.success("Broadcast sent!");
      router.push(`/journal/${result.entry.id}`);
    } catch (error) {
      toast.error("Failed to send broadcast");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/journal/new">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">New Broadcast</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  i <= currentStepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
            <button
              onClick={() => i <= currentStepIndex && setStep(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : i < currentStepIndex
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === "content" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly Update - March 18"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your broadcast content here..."
                rows={12}
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="comments"
                checked={commentsEnabled}
                onCheckedChange={setCommentsEnabled}
              />
              <Label htmlFor="comments">Allow comments</Label>
            </div>
          </div>
        )}

        {step === "voting" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="voting"
                checked={votingEnabled}
                onCheckedChange={setVotingEnabled}
              />
              <Label htmlFor="voting">Enable voting</Label>
            </div>

            {votingEnabled && (
              <>
                <div>
                  <Label>Voting type</Label>
                  <Select
                    value={votingType}
                    onValueChange={(v) =>
                      setVotingType(v as BroadcastVotingType)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        Single choice (radio)
                      </SelectItem>
                      <SelectItem value="multi">
                        Multiple choice (checkboxes)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Options</Label>
                  <div className="mt-1">
                    <VoteOptionsEditor
                      options={voteOptions}
                      onChange={setVoteOptions}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="deadline">
                    Voting deadline (optional)
                  </Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={votingDeadline}
                    onChange={(e) => setVotingDeadline(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {step === "recipients" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select recipients from your Google Contacts or add them manually.
              SMS will be sent to recipients with phone numbers.
            </p>
            <ContactSelector
              selected={recipients}
              onChange={setRecipients}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms">SMS Message</Label>
              <p className="text-xs text-muted-foreground mb-1">
                This is the text message recipients will receive. A personalized
                link will be appended automatically.
              </p>
              <Textarea
                id="sms"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Preview card */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>{" "}
                  {title}
                </div>
                <div>
                  <span className="text-muted-foreground">Recipients:</span>{" "}
                  {recipients.length}
                </div>
                <div>
                  <span className="text-muted-foreground">Voting:</span>{" "}
                  {votingEnabled ? `${votingType} choice` : "Disabled"}
                </div>
                <div>
                  <span className="text-muted-foreground">Comments:</span>{" "}
                  {commentsEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>

              {recipients.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Sending to:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipients.map((r, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {r.contact_name}
                        {r.contact_phone ? "" : " (no phone)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {votingEnabled &&
                voteOptions.filter((o) => o.trim()).length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Vote options:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {voteOptions
                        .filter((o) => o.trim())
                        .map((o, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {o}
                          </Badge>
                        ))}
                      <Badge variant="outline" className="text-xs">
                        Other (free text)
                      </Badge>
                    </div>
                  </div>
                )}
            </div>

            {/* SMS preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">
                SMS Preview:
              </p>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 max-w-xs text-sm">
                {broadcastMessage}
                <br />
                <span className="text-blue-600 underline">
                  yourapp.com/broadcast/abc123...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {step === "preview" ? (
          <Button
            onClick={handleSend}
            disabled={!canProceed() || createBroadcast.isPending}
          >
            {createBroadcast.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Broadcast
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
