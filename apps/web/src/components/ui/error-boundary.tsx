"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the fallback UI (e.g. the activity name). */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors in children so one broken card doesn't nuke the page.
 * Use around individual activity cards, segment sections, etc.
 */
export class CardErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[CardErrorBoundary] ${this.props.label ?? "component"} crashed:`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              {this.props.label
                ? `Failed to render "${this.props.label}"`
                : "Something went wrong"}
            </span>
          </div>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
