import type { PatchOp, TimelineEventItem, TimelineLane } from "@/types/timeline";

export type DraftState = {
  baseVersion: number;
  patchOps: PatchOp[];
  isDirty: boolean;
};

/**
 * Create initial draft state
 */
export function createDraftState(baseVersion: number): DraftState {
  return {
    baseVersion,
    patchOps: [],
    isDirty: false,
  };
}

/**
 * Add a patch operation to the draft
 */
export function addPatchOp(draft: DraftState, op: PatchOp): DraftState {
  return {
    ...draft,
    patchOps: [...draft.patchOps, op],
    isDirty: true,
  };
}

/**
 * Clear all patch operations (discard changes)
 */
export function clearDraft(draft: DraftState): DraftState {
  return {
    ...draft,
    patchOps: [],
    isDirty: false,
  };
}

/**
 * Reset draft with new base version (after successful publish)
 */
export function resetDraft(newBaseVersion: number): DraftState {
  return createDraftState(newBaseVersion);
}

/**
 * Apply draft patches to local state for preview
 */
export function applyDraftToEvents(
  events: TimelineEventItem[],
  patchOps: PatchOp[]
): TimelineEventItem[] {
  let result = [...events];

  for (const op of patchOps) {
    switch (op.op) {
      case "create_event":
        result.push(op.event);
        break;

      case "update_event_time":
        result = result.map((e) =>
          e.id === op.eventId
            ? { ...e, startUtc: op.startUtc, endUtc: op.endUtc }
            : e
        );
        break;

      case "update_event_lane":
        result = result.map((e) =>
          e.id === op.eventId ? { ...e, laneId: op.laneId } : e
        );
        break;

      case "update_event_title":
        result = result.map((e) =>
          e.id === op.eventId ? { ...e, title: op.title } : e
        );
        break;

      case "update_event_owner":
        result = result.map((e) =>
          e.id === op.eventId ? { ...e, assignedOwner: op.owner } : e
        );
        break;

      case "delete_event":
        result = result.filter((e) => e.id !== op.eventId);
        break;
    }
  }

  return result;
}

/**
 * Apply draft patches to lanes for preview
 */
export function applyDraftToLanes(
  lanes: TimelineLane[],
  patchOps: PatchOp[]
): TimelineLane[] {
  let result = [...lanes];

  for (const op of patchOps) {
    switch (op.op) {
      case "create_lane":
        result.push(op.lane);
        break;

      case "update_lane":
        result = result.map((l) => {
          if (l.id !== op.laneId) return l;
          return {
            ...l,
            ...(op.name !== undefined && { name: op.name }),
            ...(op.sortOrder !== undefined && { sortOrder: op.sortOrder }),
            ...(op.owner !== undefined && { owner: op.owner }),
          };
        });
        break;

      case "delete_lane":
        result = result.filter((l) => l.id !== op.laneId);
        break;
    }
  }

  return result;
}
