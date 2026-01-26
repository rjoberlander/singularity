"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanningStepId } from "@/lib/travel-planning";
import type { StepCompletionStatus } from "@/lib/travel-planning";

interface PlanStepperProps {
  steps: Array<{
    id: PlanningStepId;
    title: string;
    description: string;
  }>;
  currentStepIndex: number;
  stepStatuses: Record<PlanningStepId, StepCompletionStatus>;
  onStepClick: (stepIndex: number) => void;
}

export function PlanStepper({
  steps,
  currentStepIndex,
  stepStatuses,
  onStepClick,
}: PlanStepperProps) {
  return (
    <div className="flex flex-col space-y-2">
      {steps.map((step, index) => {
        const status = stepStatuses[step.id];
        const isActive = index === currentStepIndex;
        const isCompleted = status.completed;
        const isPast = index < currentStepIndex && !isCompleted;

        // Determine the step number indicator state
        let indicatorState: "completed" | "active" | "pending" = "pending";
        if (isCompleted) {
          indicatorState = "completed";
        } else if (isActive) {
          indicatorState = "active";
        }

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(index)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
              "hover:bg-muted/50",
              isActive && "bg-muted"
            )}
          >
            {/* Step Number Indicator */}
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                indicatorState === "completed" &&
                  "bg-green-500 text-white",
                indicatorState === "active" &&
                  "bg-primary text-primary-foreground animate-pulse",
                indicatorState === "pending" &&
                  "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* Step Title */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium text-sm truncate",
                  isCompleted && "text-muted-foreground",
                  isActive && "text-foreground",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              {/* Show suggestion badge if auto-suggested but not completed */}
              {status.auto_suggested && !status.completed && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Ready to complete
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
