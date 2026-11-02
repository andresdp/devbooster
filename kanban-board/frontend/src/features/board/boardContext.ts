import { useOutletContext } from "react-router";
import type { BoardDetail } from "../../api/types";

export interface BoardOutletContext {
  board: BoardDetail;
  reload: () => void;
  /** True while a drag move is being committed to the server (FR-016). */
  moving: boolean;
  /** Clears the board notice after a successful action (FR-014). */
  clearNotice: () => void;
}

export function useBoardContext(): BoardOutletContext {
  return useOutletContext<BoardOutletContext>();
}
