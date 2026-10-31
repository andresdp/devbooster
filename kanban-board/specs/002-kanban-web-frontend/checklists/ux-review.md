# UX Checklist Review: Kanban Web Frontend

**Checklist**: [ux.md](./ux.md) · **Reviewed**: 2026-10-25 · **Against**: spec.md (incl. Clarifications, Assumptions), plan.md, research.md, data-model.md, quickstart.md, contracts/, design/ (design-system.md, README.md, board-view, ticket-detail-drawer), .specify/memory/constitution.md

**Tally**: 10 pass / 43 gap / 5 conflict / 1 n/a (59 items). Marked `[x]` in ux.md: the 10 PASS items and the 1 N/A item.

Verdict rules applied: PASS = the artifacts already state it clearly; GAP = missing or ambiguous, proposed text given ready to paste; CONFLICT = two artifacts disagree, with the recommended winner; N/A = out of scope per AS-003 or the constitution.

---

## 1. CONFLICT items (resolve first)

### CHK006 — Design-source precedence
- **Position A** (Spec Clarifications Q1, §AS-002): "Nothing is committed; the live Stitch project … is the source of truth"; planning and SC-006 review "read the screens from that project".
- **Position B** (design/README.md, Research §1, plan.md §Summary): a snapshot *is* committed under `design/` and is "the fixed reference for SC-006 … even if the live project changes later"; design-system.md adds "where the prose contradicts the exported screens, the exported screens win"; Research §1.4 adds "spec/contract wins over the design".
- **Recommendation**: B wins. A reviewer cannot apply SC-006 against a moving target that needs `STITCH_API_KEY`. Rewrite §AS-002 and Clarification Q1 to state the chain explicitly: (1) spec.md and contracts/ ; (2) the committed snapshot `design/*.png|html` ; (3) `design/design-system.md` tokens and prose ; (4) the live Stitch project, which is only the upstream refreshed through the README procedure. Proposed §AS-002 sentence: "The frozen snapshot under `specs/002-kanban-web-frontend/design/` is the reference for FR-020 and SC-006; the live Stitch project `13486008395924154472` is its upstream and is consulted only when refreshing the snapshot. When sources disagree, spec and contracts win over the snapshot screens, which win over the design-system prose."

### CHK010 — "New board" availability and success navigation
- **Position A** (Spec §FR-002, §US-2 AS1): on success the new board is "shown in the list"; the user "can open it".
- **Position B** (Views §BoardCreateDialog "On success: close, go to the new board"; Views §Routes Navigation rules "creating a board navigates to its address"; Quickstart US2 step 3; Research §1.3 puts "New board" in the `AppHeader` of *both* screens).
- **Recommendation**: B wins. SC-001 (board + first ticket in under a minute) is served by landing on the new board, and the header button exists on the board page where no list is visible. Rewrite FR-002: "The app MUST let the user create a board by entering a name from any page (header button) and, on success, open the new board; the board is listed on the board list thereafter." Rewrite US-2 AS1 to match. Also state in FR-002 that validation and conflict errors appear inside the dialog regardless of the page it was opened from.

### CHK020 — Enumeration of client-authored texts
- **Position A** (Views §Error placement contract): "the only client-authored texts are 'Required', 'Could not reach the server.' and the not-found/empty-state copy".
- **Position B** (api-client §Error mapping): adds "Unexpected response from the server (<status>)." for non-JSON error bodies and invalid 2xx JSON. Spec §AS-008 ("does not maintain its own catalogue of error texts") is silent on client-side failures, so both contracts appear to breach it.
- **Recommendation**: B wins (the case exists and needs a text). Update the Views sentence to list all four texts, and reword §AS-008: "The app shows the server's error messages as given and adds no wording to them. The only client-authored messages are 'Required' (FR-023), 'Could not reach the server.' (no response), 'Unexpected response from the server (<status>).' (unparseable response) and the not-found/empty-state copy in FR-017 and FR-001."

### CHK024 — Card appearance while committing / rolling back
- **Position A** (Views §TicketCard, Research §1.3): `reverting` = "rollback in progress", the design's "Reverting move…" ghost "shown while rollback + refetch run".
- **Position B** (Model §3 Drag lifecycle): on error the state goes to `idle` and `board = snapshot` synchronously, so there is no rollback phase to show; the `reverting`/`saving` modifier applies *while committing* and only after 300 ms.
- **Recommendation**: B wins; rollback is an instant snapshot restore with no observable duration, and Model §3 is the only artifact that defines the state machine. Rename the modifier `saving`, describe it once in FR-016 (see CHK009 text) and in Views §TicketCard ("`saving`: muted ghost style from the design's 'Reverting move…' card, label 'Saving move…', shown at the card's new position when the move request exceeds 300 ms"), and state in FR-010 that the card returns to its previous place with no intermediate style and that the reload after `invalid_move` keeps the previous board visible (Model §3 Resource state).

### CHK051 — Save with nothing changed
- **Position A** (Spec §FR-007): "Save MUST send one request for all changed fields" (read literally: always one request).
- **Position B** (Model §2 Edit form diff): "an empty diff means Save behaves like Cancel (no request)". `TicketUpdate` requires at least one field (Model §1), so an empty PATCH would be rejected with 422.
- **Recommendation**: B wins because the contract forbids an empty update. Rewrite the FR-007 sentence: "Save MUST send one request containing only the changed fields; when no field changed, Save MUST send no request and MUST behave like Cancel."

---

## 2. GAP items, grouped by spec.md section (text ready to paste)

### §Requirements → FR-002 / FR-016 (pending states)
- **CHK009** — Only `BoardCreateDialog` says "disabled while pending" (Views). Add to FR-016: "The in-flight indication is: the submitting button is disabled and its label changes to 'Creating…', 'Saving…', 'Moving…' or 'Adding…'; a dragged card whose move request exceeds 300 ms shows the `saving` style at its new position."
- **CHK026** — Model §3 only says a second drag is ignored. Add to FR-016: "While a move is committing, opening a ticket, creating a ticket and commenting remain available; a second drag and the move-from-detail control are ignored until the move completes; navigating away does not cancel the request and its result is dropped (EC-008)."

### §Requirements → FR-006 / FR-007 (drawer)
- **CHK011** — Views adds a view/edit split and an "Edit" button that FR-007 and the design (always-editable properties group) do not have. Add to FR-007: "The drawer opens in view mode. An 'Edit' button switches to the edit form pre-filled with the current values; a successful Save and Cancel both return to view mode. Closing the drawer by any means (close button, Escape, backdrop, browser back) while editing discards unsaved changes without confirmation." Record the deviation from the design in Research §1.4.
- **CHK027** — Add to FR-006: "While the drawer or a dialog is open, the board behind it is inert: cards cannot be dragged or opened, and clicking the backdrop closes the drawer."
- **CHK040** — Add to FR-006: "While the drawer or a dialog is open the page behind it does not scroll. The drawer's close button stays visible at the top of the drawer at every width. Because the drawer has its own address, the browser's back action also closes it."
- **CHK033** — Add to FR-011: "The control is a select listing the other three columns in board order, defaulting to the first of them, and a 'Move' button. While the move is in flight the button is disabled and labelled 'Moving…'. On success the column chip, the board behind the drawer and the history list update without closing the drawer; the button is disabled while another move is committing."
- **CHK017** — Add to FR-011 (and a row to Views §Error placement contract): "A rejected or failed move from the ticket detail shows the server's message inline beneath the Move control; the board notice is used only for drag-and-drop moves."
- **CHK034** — Add to FR-013: "After a move made from the ticket detail, the history list and the 'History (n)' count refresh while the drawer stays open." (Research §5 refetches the board but not history.)

### §Requirements → FR-008 / FR-009 / FR-010 (drag and drop)
- **CHK022** — Views "original slot" vs Research §1.3 "original/target slot" vs Research §7 "siblings shift … original node becomes the placeholder". Add to FR-008: "During a drag exactly one placeholder, labelled 'Drop ticket here' without a position number, occupies the slot where the card would land if released; surrounding cards shift to make room; the original slot shows no separate marker."
- **CHK023 / CHK059** — Add to FR-008 (and extend US-1 AS5): "An empty column shows the inbox icon, 'No tickets in {column}' and the hint 'Drag a card here'; while a dragged card hovers over it, the placeholder replaces that message. Column count chips reflect the new arrangement once the card is dropped, not during the drag."
- **CHK025** — Add to FR-010: "The card returns to its previous place instantly, without an animated return." Add to FR-016: "The in-flight indication for a move appears only when the request exceeds 300 ms" (makes the Model §3 threshold a testable requirement).
- **CHK028** — Research §7 fixes 6 px / 200 ms but the spec does not. Add to FR-008: "A press that moves less than 6 px (mouse) or lasts less than 200 ms before moving (touch) opens the ticket; once a drag has started, releasing it never opens the ticket, even when dropped back in place."
- **CHK029** — Nothing in any artifact. Add EC-012: "While dragging, holding the card near the top or bottom edge of a column scrolls that column; near the left or right edge of the viewport scrolls the columns row; releasing the pointer outside the viewport cancels the drag as in EC-010."
- **CHK019** — Position is fixed in Views §BoardPage / Research §1.4 (top of the board area) but not in the spec, and phone-width behaviour is missing. Add to FR-010: "The message appears in a notice panel between the board header and the columns, pushing the columns down, on every width; it is not sticky and is removed by its close button, by the next successful move or by leaving the board."
- **CHK031** — Spec §US-4 AS6 sends keyboard users to move-from-detail; Research §7/§9 and Views §Accessibility baseline ship keyboard dragging with dnd-kit's live region. Add to FR-008: "Keyboard dragging (focus a card, Space to pick up, arrow keys to move, Space to drop, Escape to cancel) MUST give the same results as pointer dragging; the move-from-detail control remains the required path on touch devices." (Or, if not wanted, state in Research §9 that the keyboard sensor is a test-only convenience and remove the live-region sentence from Views.)
- **CHK032** — Add to EC-007: "In-column reorder by touch (press and hold 200 ms, then drag) MUST work on phone width; cross-column drag by touch is not required; while a card is held, the browser's long-press menu and text selection are suppressed."

### §Requirements → FR-014 / FR-015 (errors)
- **CHK016** — Only `BoardNotice` has a clearing rule (Views §BoardPage). Add to FR-014: "A field error disappears when the user changes that field or resubmits; a form-level error disappears on the next submission; closing a dialog or leaving edit mode discards its errors and entered values; the board notice persists until closed, until the next successful move, or until the user leaves the board."
- **CHK021** — Field error (Design §Inputs), `FormError` and `BoardNotice` (Research §1.3) are specified; `ErrorState` is not. Covered by the CHK001 text below.

### §Requirements → FR-017 (addresses, not found, errors)
- **CHK004 / CHK057** — Add to FR-017: "The not-found view shows the heading 'Board not found' (board address) or 'Page not found' (any other address) with a link 'Back to boards'. The drawer's not-found state shows 'Ticket not found' with a 'Back to board' link that closes the drawer; a malformed key and a key not on the board use the same state. The page-level error state shows the heading 'Something went wrong', the server's or client's message beneath it, and a 'Retry' button that reloads the same data." (Copy is a proposal; the requirement is that it be fixed.)
- **CHK050** — Add to FR-017: "Each route sets the document title: 'Boards'; '{board name} · Boards'; '{key} {title} · {board name}'. Every page has one header landmark, one main landmark and one `<h1>` ('Boards' or the board name); column names are `<h2>`."

### §Requirements → FR-019 (responsive)
- **CHK035** — Add to FR-019: "'Phone width' means a viewport narrower than 640 px; SC-005 is verified at 375 px."
- **CHK036** — Add to FR-019: "Above phone width, columns keep a minimum width of 280 px and the columns row scrolls horizontally when four columns do not fit; the drawer is 560 px wide and overlays the board at every width above phone width."
- **CHK037** — Add to FR-019: "Every tappable control has a hit area of at least 32 × 32 px (the design's control height); badges are not interactive."
- **CHK038** — Research §1.4 ("the column header shows n / 4") and plan `ColumnsPager` disagree on placement. Add to FR-019: "The column indicator reads 'n / 4' with four dots, sits between the board header (and the notice, when shown) and the columns row, and each dot scrolls to its column when tapped; the visible column's own header shows its name."
- **CHK039** — Add to FR-019 (or EC-006): "On desktop the header stays fixed, the columns row fills the remaining viewport height, and each column scrolls vertically on its own; the page itself does not scroll."
- **CHK012** — Add to FR-019: "On phone width dialogs stay centred with 16 px side margins, their content scrolls within the viewport, and the action buttons remain reachable when the on-screen keyboard is open."
- **CHK041** — Model §4 covers card title, card assignee and drawer; add to EC-005: "Board names in the list and comment authors are truncated with an ellipsis on one line; comment text and descriptions wrap without horizontal scrolling at 375 px."

### §Requirements → FR-020 / SC-006 (design consistency)
- **CHK001 / CHK021** — Add to FR-020: "Page-level loading, error, not-found and empty states use the design's state pattern: centred icon in a `surface-container` circle, `headline-sm` title, `body-sm` helper text, one primary or ghost action button, as shown by the 'No boards yet' and 'No tickets in Review' states; the drawer's not-found state uses the same pattern inside the drawer body."
- **CHK007** — Add to FR-020: "All colours, type styles, radii, spacing and shadows MUST come from the token set in `design/design-system.md`; SC-006 is judged element by element against the component inventory (research.md §1.3) and the recorded deviations (research.md §1.4)."
- **CHK008** — Add to FR-020: "Every interactive element has a hover state (`surface-container` background for ghost controls, links and tabs; `shadow-md` for cards), the global keyboard focus ring, and a disabled/pending state at 50 % opacity with hover suppressed. Badges and column dots on desktop are not interactive."
- **CHK058** — Add to §AS-002: "Design elements that contradict the spec or contract are not built: board switcher, 'Backlog'/'Settings' links, filter bar, avatar stack, 'Board settings', the fifth 'Backlog' column, the drag-and-drop lock note, the separate 'Save description' button, relative times, the 'Markdown supported' hint, the copy and open-full icons, assignee/actor history entries and the 'dragging' corner tag. The list is maintained in research.md §1.4 and SC-006 reviewers treat their absence as intended."

### §Requirements → new FR-024 (accessibility) — nothing in the spec today
- **CHK042** — Add FR-024: "The app MUST meet the following accessibility baseline, which is a quality gate for every story:" followed by the bullets from the items below (Views §Accessibility baseline then cites FR-024).
- **CHK043** — "When a dialog opens, focus moves to its first field; when the drawer opens, by card click or by direct address load, focus moves to its close button."
- **CHK044** — "Closing the drawer returns focus to the card that opened it, or to the board heading after a direct load; closing a dialog returns focus to the button that opened it; after Save or Cancel focus moves to the 'Edit' button; after a comment is added focus stays in the cleared author field."
- **CHK045** — "Form-level errors, the board notice and the inline comments/history errors are announced as alerts; 'Required' and server field messages are announced through their field; pending controls are marked busy; a successful move from the detail is announced with the new column name."
- **CHK046** — "A ticket card is one focusable element: a link to the ticket address whose accessible name is its key followed by its title; the same element carries the drag attributes."
- **CHK047** — "Tabs use the tablist pattern with arrow-key navigation; the type and priority segmented controls are radio groups; icon-only buttons have text labels ('Close', 'Clear assignee'); the phone-width column dots are buttons labelled with the column name."
- **CHK048** — "Keyboard focus is shown by a 2 px `primary` outline with 2 px offset on every focusable element, including cards and `surface-container-low` inputs; every text/background pair, including badge pairs, meets a 4.5:1 contrast ratio."
- **CHK049** — "When the user prefers reduced motion, the drawer slide-in, the skeleton pulse and the dragged card's tilt and scale are disabled; shadows and colours are unchanged."

### §TicketDrawer states (Views) — comments/history
- **CHK005** — Add to FR-012/FR-013: "The comments and history lists each show a skeleton while loading, and on failure an inline error line (error icon, the message, a 'Retry' link) in place of the list, above the comment form; history has no empty state because the creation entry always exists."

### §User Scenarios → US-2
- **CHK056** — Reorder the two scenarios so that "6. in flight" precedes "7. empty or whitespace" (keep the numbers; msw-handlers.md already cites US2-AS6 for the pending case).

---

## 3. PASS and N/A items

| Item | Verdict | Where it is satisfied |
|------|---------|-----------------------|
| CHK002 | PASS | Research §1.4 row 1 fixes rows (`surface-container-lowest`, `headline-sm` name, `body-sm` created date); Views §BoardListPage puts "New board" in the header. Minor: change Views "row/card" to "row". |
| CHK003 | PASS | Research §1.3 "Loading skeleton (grey bars, pulse)" is mapped to `Skeleton` for both list and board; Views gives "list skeleton" and "four column skeletons". |
| CHK013 | PASS | Spec §FR-014 is exhaustive by construction ("every server error … all other errors at the level of the form, board or page"); Views' last two rows name the surface per situation. Suggest a catch-all row "any other code, incl. `unexpected_response`, on an action → same as above". |
| CHK014 | PASS | api-client §fieldErrors: a detail maps when `field` is in `visible` (exact match); msw-handlers shows bare field names (`name`, `title`, `author`), so no prefix rule is needed. |
| CHK015 | PASS | api-client §fieldErrors: first message per field beside the field; `e.message` plus `rest` at form level when `rest` is non-empty or nothing mapped. |
| CHK018 | N/A | Deleting boards/tickets/comments is out of scope (§AS-003), so an action-level `not_found` is unreachable from the app; `conflict` only occurs on board create (§US-2 AS2). FR-014/FR-015 already cover display and value retention. |
| CHK030 | PASS | Research §1.3 dragged-card row (rotate 2°, scale 1.02, `shadow-drag`, key primary, rendered in `DragOverlay`); Views §TicketCard `dragging` = overlay copy. The "dragging" tag is listed as dropped in the CHK058 text. |
| CHK052 | PASS | Research §1.3 Segmented control row records the decision (segmented in the edit form, native `<select>` in the create dialog "as in the design"); keyboard behaviour is covered by CHK047. |
| CHK053 | PASS | §FR-008 / US-4 AS1 (drag → chosen position), §FR-011 / §AS-007 / US-4 AS6 (non-drag → bottom), §EC-009 (top/end) are consistent and each stated once. |
| CHK054 | PASS | §FR-022 + Model §4 (`Intl.DateTimeFormat` medium date, short time, ISO in `title`/`dateTime`) + Research §1.4 "Relative times" row applies the same format to every surface. |
| CHK055 | PASS | §EC-011, §FR-004, Model §4 (literal "Unassigned", italic, outline colour) for cards and detail; US-3 AS3 defines the post-save result. |

---

## 4. Five changes that most reduce implementation ambiguity (by impact)

1. **Fix the design-source precedence (CHK006)** in §AS-002 and Clarification Q1: spec/contracts → `design/` snapshot → design-system prose → live Stitch. Without it SC-006 has no stable reference.
2. **Rewrite FR-007 for the drawer's modes and the no-change Save (CHK011, CHK051)**: open in view mode, "Edit" toggles the form, Save/Cancel return to view, closing discards edits, empty diff sends no request.
3. **Define in-flight and rollback appearance once (CHK009, CHK024, CHK025, CHK026)** in FR-016/FR-010: button labels while pending, the `saving` card style after 300 ms, instant snap-back, what stays interactive.
4. **Decide board-create navigation and header button (CHK010)** in FR-002: "New board" everywhere, success opens the new board, and US-2 AS1 updated to match.
5. **Close the error-surface holes (CHK017, CHK016, CHK020)** in FR-014/FR-011/AS-008: inline surface for move-from-detail, when each error clears, and the four client-authored texts.

---

## Implementation validation notes (2026-10-31)

Automated: 195 Vitest tests green; typecheck, lint, format:check and build clean; `schema.d.ts` unchanged after `api:generate`; `backend/` and `specs/001-kanban-ticketing/` untouched.

Checked in Chrome against the real backend (localhost:8000 / 5173):
- PASS US1: board renders four columns with cards, badges, assignee/"Unassigned".
- PASS US3: `/boards/1/tickets/TKT-3` opens the drawer (key, title, description, badges, assignee, column chip, created/updated, Move to, tabs "Comments (1)" / "History (2)").
- PASS US4 (keyboard): Space, ArrowRight x2, Space moved TKT-8 from To Do into In Progress; the backend persisted the order and wrote a history entry "To Do → In Progress". A same-column keyboard reorder of TKT-6 also persisted. The first ArrowRight steps to the neighbouring card before crossing columns (dnd-kit behaviour).
- NOT VERIFIED manually: pointer drag (the browser tool's scripted drag did not trigger the 6px mouse activation), the two-tab stale-move case, quickstart US2 steps against the real backend (covered by MSW tests only), US5 against the real backend, offline/Retry steps, phone width at 375px (the browser window could not be resized below its minimum width), and the visual comparison with `design/*.png` beyond a glance at the board and drawer.

Intentional deviations:
- Text that used `--color-outline` now uses `--color-on-surface-variant` (outline measured 4.05–4.49:1; FR-024 needs 4.5:1). Badge pairs measured 4.54–7.24:1.
- Collision detection is pointer → rect overlap (cards preferred over columns) → `closestCorners`, because `closestCorners` alone prefers a neighbouring column's cards over the hovered tall column.
- `BoardPage.perf.test.tsx` asserts keyboard pick-up/cancel on the last of 200 cards rather than a full arrow-key move, because jsdom has no layout; cross-column arrow moves are covered in `BoardDnd.test.tsx`.
