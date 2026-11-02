import { createContext, useContext } from "react";

/** True while a drag move is being committed: cards cannot be picked up (FR-016). */
export const DragDisabledContext = createContext(false);

export function useDragDisabled(): boolean {
  return useContext(DragDisabledContext);
}
