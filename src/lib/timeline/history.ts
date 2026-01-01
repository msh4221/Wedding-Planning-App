import type { PatchOp } from "@/types/timeline";

export type HistoryState = {
  past: PatchOp[][];
  future: PatchOp[][];
  maxSize: number;
};

/**
 * Create initial history state
 */
export function createHistory(maxSize: number = 50): HistoryState {
  return {
    past: [],
    future: [],
    maxSize,
  };
}

/**
 * Record a new action (clears redo stack)
 */
export function recordAction(
  history: HistoryState,
  patchOps: PatchOp[]
): HistoryState {
  const newPast = [...history.past, patchOps];

  // Trim to max size
  while (newPast.length > history.maxSize) {
    newPast.shift();
  }

  return {
    ...history,
    past: newPast,
    future: [], // Clear redo stack on new action
  };
}

/**
 * Undo the last action
 * Returns the inverse patch ops that should be applied to reverse the action
 */
export function undo(
  history: HistoryState
): { newHistory: HistoryState; patchOps: PatchOp[] | null } {
  if (history.past.length === 0) {
    return { newHistory: history, patchOps: null };
  }

  const lastAction = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  const newFuture = [lastAction, ...history.future];

  return {
    newHistory: {
      ...history,
      past: newPast,
      future: newFuture,
    },
    patchOps: lastAction,
  };
}

/**
 * Redo the last undone action
 */
export function redo(
  history: HistoryState
): { newHistory: HistoryState; patchOps: PatchOp[] | null } {
  if (history.future.length === 0) {
    return { newHistory: history, patchOps: null };
  }

  const nextAction = history.future[0];
  const newFuture = history.future.slice(1);
  const newPast = [...history.past, nextAction];

  return {
    newHistory: {
      ...history,
      past: newPast,
      future: newFuture,
    },
    patchOps: nextAction,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

/**
 * Clear all history
 */
export function clearHistory(history: HistoryState): HistoryState {
  return {
    ...history,
    past: [],
    future: [],
  };
}
