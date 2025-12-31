// Import API to ensure it's initialized before hooks are used
import "@/lib/api";

// Re-export all hooks from shared package
export * from "@singularity/shared-api/hooks";

// Re-export utility functions that were previously in hook files
export { calculateSupplementCosts as useSupplementCosts } from "@singularity/shared-utils";
export { calculateGoalProgress } from "@singularity/shared-utils";
export { filterRoutineItemsByDay, getCurrentDayAbbrev } from "@singularity/shared-utils";
export { createInitialChatState, addMessage, setLoading } from "@singularity/shared-utils";
