# Design reference (fixed snapshot for SC-006)

Source of truth: live Stitch project `13486008395924154472` ("Kanban Ticketing UI Design System"),
read through the Stitch MCP (`.mcp.json`, needs `STITCH_API_KEY`). This folder is the frozen
copy taken during planning so the visual-consistency review (SC-006) has a stable reference even
if the live project changes later.

Snapshot taken: 2026-10-25 (project `updateTime` 2026-10-25T19:07:53Z).

| File | Stitch screen | Screen id | Size |
|------|---------------|-----------|------|
| `board-view.png`, `board-view.html` | Board View (API Compliant) | `b24313442a0d41d081936182be99ccf7` | 2560 x 2104 |
| `ticket-detail-drawer.png`, `ticket-detail-drawer.html` | Ticket Detail Drawer & Modals (API Compliant) | `0da771a50c6c410b9afe8f2f8628ea97` | 2560 x 2048 |
| `design-system.md` | Design system "Precision Engineering Workspace" (asset `0b4afef3c56c492cba89da3dcb85475a`, v1) | | |

The project also lists three hidden/superseded screen instances (`2cc83db1…`, `73524ca5…`,
`ada136d5…`); `list_screens` does not return them, so they are not part of the reference.

The HTML files are Stitch's Tailwind-CDN exports. They are reference only: the app does not use
Tailwind and does not copy this markup. `design-system.md` holds the tokens the app implements as
CSS custom properties (see `../research.md`, section "Design tokens").

## Refreshing the snapshot

```text
mcp__stitch__list_screens      projectId: 13486008395924154472
mcp__stitch__download_file     name: projects/13486008395924154472/screens/<id>/fileEntries/html
mcp__stitch__download_file     name: projects/13486008395924154472/screens/<id>/fileEntries/screenshot
mcp__stitch__get_project       name: projects/13486008395924154472   (designTheme.designMd → design-system.md)
```

Screenshot URLs returned by `list_screens` are Google-hosted thumbnails; append `=s2560` to get
the full-size image. Update the table above when the snapshot changes.
