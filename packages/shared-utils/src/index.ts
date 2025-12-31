import type { Goal, Supplement, RoutineItem, ChatState, ChatMessage } from '@singularity/shared-types';

// Date formatting
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

// Currency formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Biomarker status calculation
export function getBiomarkerStatus(
  value: number,
  refLow?: number,
  refHigh?: number,
  optLow?: number,
  optHigh?: number
): "low" | "normal" | "high" | "optimal" {
  if (refLow !== undefined && value < refLow) return "low";
  if (refHigh !== undefined && value > refHigh) return "high";
  if (optLow !== undefined && optHigh !== undefined) {
    if (value >= optLow && value <= optHigh) return "optimal";
  }
  return "normal";
}

// Status color helpers
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    low: "text-red-500",
    high: "text-yellow-500",
    normal: "text-green-500",
    optimal: "text-emerald-400",
    active: "text-green-500",
    achieved: "text-emerald-400",
    paused: "text-gray-500",
  };
  return colors[status] || "text-gray-500";
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    low: "bg-red-500/10",
    high: "bg-yellow-500/10",
    normal: "bg-green-500/10",
    optimal: "bg-emerald-400/10",
    active: "bg-green-500/10",
    achieved: "bg-emerald-400/10",
    paused: "bg-gray-500/10",
  };
  return colors[status] || "bg-gray-500/10";
}

// Goal progress calculation
export function calculateGoalProgress(goal: Goal): number {
  if (!goal.current_value || !goal.target_value) return 0;

  const current = goal.current_value;
  const target = goal.target_value;
  const start = goal.direction === "decrease" ? target * 2 : 0;

  if (goal.direction === "decrease") {
    // For decrease goals, progress increases as value decreases
    const total = start - target;
    const progress = start - current;
    return Math.min(100, Math.max(0, (progress / total) * 100));
  } else if (goal.direction === "increase") {
    // For increase goals, progress increases as value increases
    return Math.min(100, Math.max(0, (current / target) * 100));
  } else {
    // For maintain goals, check if within range (assume 5% tolerance)
    const tolerance = target * 0.05;
    if (Math.abs(current - target) <= tolerance) return 100;
    return 50;
  }
}

// Supplement cost calculations
export function calculateSupplementCosts(supplements: Supplement[] | undefined) {
  const activeSupplements = supplements?.filter((s) => s.is_active) || [];

  const dailyCost = activeSupplements.reduce(
    (sum, s) => sum + (s.price_per_serving || 0),
    0
  );

  return {
    daily: dailyCost,
    weekly: dailyCost * 7,
    monthly: dailyCost * 30,
    yearly: dailyCost * 365,
    activeCount: activeSupplements.length,
    totalCount: supplements?.length || 0,
  };
}

// Routine helpers
export function filterRoutineItemsByDay(
  items: RoutineItem[],
  dayOfWeek: string // "mon", "tue", "wed", "thu", "fri", "sat", "sun"
): RoutineItem[] {
  return items.filter((item) => {
    if (!item.days || item.days.length === 0) return true; // Show if no days specified
    return item.days.includes(dayOfWeek.toLowerCase());
  });
}

export function getCurrentDayAbbrev(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
}

// Chat state helpers
export function createInitialChatState(): ChatState {
  return {
    messages: [],
    isLoading: false,
  };
}

export function addMessage(state: ChatState, message: ChatMessage): ChatState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

export function setLoading(state: ChatState, isLoading: boolean): ChatState {
  return {
    ...state,
    isLoading,
  };
}
