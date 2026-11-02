import {
  closestCorners,
  pointerWithin,
  rectIntersection,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, type ReactNode } from "react";
import type { BoardDetail } from "../../api/types";
import { findTicket } from "../../model/board";
import { DragDisabledContext } from "./dragDisabled";
import { TicketCard } from "./TicketCard";

interface Props {
  board: BoardDetail;
  disabled: boolean;
  onDragStart: (key: string) => void;
  onDragOver: (key: string, columnId: number, index: number) => void;
  /** `columnId` is null when the drag ended outside every column. */
  onDragEnd: (key: string, columnId: number | null) => void;
  onDragCancel: () => void;
  children: ReactNode;
}

const COLUMN_PREFIX = "column-";

/**
 * Columns are much taller than cards, so corner distance alone favours a neighbouring column's
 * cards over the column actually being hovered. Prefer the pointer, then rect overlap (keyboard),
 * and within either prefer a card over its column; closestCorners is the last resort.
 */
const collisionDetection: CollisionDetection = (args) => {
  for (const detect of [pointerWithin, rectIntersection]) {
    const hits = detect(args);
    if (hits.length === 0) continue;
    const cards = hits.filter((hit) => !String(hit.id).startsWith(COLUMN_PREFIX));
    return cards.length > 0 ? cards : hits;
  }
  return closestCorners(args);
};

/**
 * Sortable keyboard navigation cannot reach columns that have no cards, so fall back to
 * jumping to the nearest column in the arrow direction.
 */
const coordinateGetter: KeyboardCoordinateGetter = (event, args) => {
  const result = sortableKeyboardCoordinates(event, args);
  if (result) return result;
  const step = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  const { collisionRect, droppableContainers, droppableRects } = args.context;
  if (step === 0 || !collisionRect) return undefined;
  const columns = droppableContainers
    .getEnabled()
    .filter((c) => String(c.id).startsWith(COLUMN_PREFIX))
    .flatMap((c) => {
      const rect = droppableRects.get(c.id);
      return rect ? [rect] : [];
    })
    .filter((rect) =>
      step === 1 ? rect.left > collisionRect.left : rect.left < collisionRect.left,
    )
    .sort((a, b) => (step === 1 ? a.left - b.left : b.left - a.left));
  const target = columns[0];
  return target ? { x: target.left, y: target.top } : undefined;
};

/** Resolves where the pointer is hovering: the column and the index within it. */
function resolveTarget(
  board: BoardDetail,
  overId: string,
  activeKey: string,
  below: boolean,
): { columnId: number; index: number } | null {
  if (overId.startsWith(COLUMN_PREFIX)) {
    const column = board.columns.find((c) => `${COLUMN_PREFIX}${c.id}` === overId);
    if (!column) return null;
    const count = column.tickets.filter((t) => t.key !== activeKey).length;
    return { columnId: column.id, index: count };
  }
  const found = findTicket(board, overId);
  if (!found) return null;
  const index = found.column.tickets.findIndex((t) => t.key === overId);
  const active = findTicket(board, activeKey);
  const sameColumn = active?.column.id === found.column.id;
  return { columnId: found.column.id, index: index + (!sameColumn && below ? 1 : 0) };
}

export function BoardDnd({
  board,
  disabled,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  children,
}: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  function handleStart(event: DragStartEvent) {
    const key = String(event.active.id);
    setActiveKey(key);
    onDragStart(key);
  }

  function handleOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const translated = active.rect.current.translated;
    const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
    const target = resolveTarget(board, String(over.id), String(active.id), below);
    if (target) onDragOver(String(active.id), target.columnId, target.index);
  }

  function handleEnd(event: DragEndEvent) {
    setActiveKey(null);
    const { active, over } = event;
    if (!over) {
      onDragCancel();
      return;
    }
    const found = findTicket(board, String(active.id));
    onDragEnd(String(active.id), found?.column.id ?? null);
  }

  function handleCancel() {
    setActiveKey(null);
    onDragCancel();
  }

  const active = activeKey ? findTicket(board, activeKey)?.ticket : undefined;

  return (
    <DragDisabledContext.Provider value={disabled}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleStart}
        onDragOver={handleOver}
        onDragEnd={handleEnd}
        onDragCancel={handleCancel}
      >
        {children}
        <DragOverlay>{active ? <TicketCard ticket={active} dragging /> : null}</DragOverlay>
      </DndContext>
    </DragDisabledContext.Provider>
  );
}
