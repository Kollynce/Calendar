# Table Elements in the Design Editor

## 1. Executive Summary

Tables are first-class Fabric.js elements that allow calendar creators to embed complex grids (meal plans, budget trackers, weekly planners, etc.) directly on the canvas. The implementation couples a rich metadata model with a Fabric graphics builder, Pinia store helpers, dedicated inspector controls, and an on-canvas resize overlay so designers can edit structure, styling, and cell content without leaving the editor.

---

## 2. Table of Contents

1. [Use Cases & Goals](#3-use-cases--goals)
2. [Data Model](#4-data-model)
3. [Creation & Rendering Pipeline](#5-creation--rendering-pipeline)
4. [Inspector & Cell Editing UX](#6-inspector--cell-editing-ux)
5. [Canvas Integration & Selection](#7-canvas-integration--selection)
6. [Resize Overlay Architecture](#8-resize-overlay-architecture)
7. [Store APIs & Metadata Updates](#9-store-apis--metadata-updates)
8. [Validation, Constraints & Edge Cases](#10-validation-constraints--edge-cases)
9. [Testing & Future Enhancements](#11-testing--future-enhancements)

---

## 3. Use Cases & Goals

Tables target planner-specific layouts where structured grids are preferred over free-form text:

- Weekly schedules, meal plans, or workout trackers.
- Budget trackers and comparison matrices.
- Habit grids or checklist blocks with zebra striping and headers.

Key goals:

- **Visual fidelity**: Round-trip accurate Fabric rendering with custom fills, zebra striping, headers, and footers.
- **Rich metadata**: Persist column/row structure, merges, and per-cell overrides for text and colors.
- **Inline editing**: Inspector controls + dedicated modal for bulk cell editing.
- **Direct manipulation**: Overlay handles let users drag-resize columns/rows with minimum constraints.

---

## 4. Data Model

All table-specific state lives in `TableMetadata` (`src/types/editor.types.ts`). Highlights:

- Structural fields: `rows`, `columns`, `size.{width,height}`.
- Layout enhancements: `headerRows`, `footerRows`, `stripeEvenRows`, `stripeColor`, `cornerRadius`.
- Styling tokens: `backgroundColor`, `cellBackgroundColor`, header/footer colors, grid/border settings.
- Typography defaults: `cellFontFamily`, `cellFontSize`, `cellFontWeight`, `cellTextColor`, `cellTextAlign`.
- Overrides:
  - `columnWidths` / `rowHeights`: sparse arrays storing explicit sizes in canvas units.
  - `cellContents`: array of `{ row, column, text, textAlign, … }` objects for per-cell values.
  - `merges`: array of `{ row, column, rowSpan, colSpan }` definitions.

`getDefaultTableMetadata` (`src/stores/editor/metadata-defaults.ts`) centralizes sane defaults (440×360 size, 4×4 grid, 12px padding, 1 header row, etc.) and merges caller overrides.

---

## 5. Creation & Rendering Pipeline

1. **Element factories** (`src/stores/editor/objects.ts`): `createTableObject` composes metadata via `getDefaultTableMetadata`, builds Fabric graphics, and attaches metadata to the `Group` via `attachElementMetadata`.
2. **Graphics builder** (`buildTableGraphics` in `src/stores/editor/graphics-builders.ts`):
   - Derives per-column widths / row heights from overrides or evenly distributes size.
   - Renders background rect, then iterates rows × columns, respecting merges.
   - Applies section-aware fills (header/body/footer) and zebra striping.
   - Draws Textbox objects for cells with content, honoring per-cell typography and padding.
3. **Store rebuilds**: `updateSelectedElementMetadata` triggers `buildTableGraphics` when metadata changes, ensuring the Fabric object stays in sync.

---

## 6. Inspector & Cell Editing UX

- **`TableProperties.vue`** (`src/components/editor/properties/TableProperties.vue`): exposes controls for structure, colors, borders, grid lines, typography, column widths, row heights, cell content, and merges. Helper utilities:
  - `sanitizeTableMetadata` clamps indices/spans and trims trailing zeroes from size arrays.
  - `commitColumnWidth` / `commitRowHeight` provide "Auto" resets by removing explicit overrides.
- **`TableCellEditor.vue`**: fullscreen modal for bulk editing every cell. Hydrates cell state from metadata, supports per-cell alignment cycling, clearing, and synchronized save back to metadata.

These components interact with the Pinia store via `updateTableMetadata` (see `useObjectProperties.ts`) so all inspector edits go through a single mutation path.

---

## 7. Canvas Integration & Selection

`Canvas.vue` orchestrates Fabric canvas state and exposes editor overlays. Relevant pieces:

- `tableResizeState`: reactive struct storing overlay rect + cloned metadata of the active table.
- Watchers on `fabricCanvasRef`, `selectedObjectIds`, `panOffset`, `zoom`, and viewport size ensure overlay coordinates stay aligned as the user pans/zooms.
- Canvas event listeners (selection/move/scale/rotate/modify) enqueue overlay refreshes so drag handles track the table during interactions.

---

## 8. Resize Overlay Architecture

**Component**: `TableResizeOverlay.vue`

- Props: `state` (rect + metadata snapshot).
- Renders vertical and horizontal handle buttons positioned by percentage offsets computed from resolved column widths / row heights.
- Pointer handling:
  - Captures pointer events per handle, tracks axis (`x` for columns, `y` for rows), and emits incremental deltas via `adjust-column` / `adjust-row`.
  - Maintains active state styling (`resize-handle--active`) for feedback.

**Canvas glue** (`Canvas.vue`):

- `resolveColumnWidths` / `resolveRowHeights`: mirror builder logic so overlay aligns with rendered table.
- `applyColumnDelta` / `applyRowDelta`:
  - Convert deltas to canvas units (divide by `zoom`).
  - Clamp so adjacent segments never shrink below `MIN_RESIZE_CELL` (24px) using available width/height.
  - Return updated arrays that preserve untouched columns/rows.
- `handleTableColumnAdjust` / `handleTableRowAdjust`: invoke store `updateSelectedElementMetadata`, persist new widths/heights, then queue overlay refresh for visual continuity.
- Overlay rectangle calculation factors in canvas pan, zoom, and ruler offsets so positions remain pixel-perfect atop the Fabric canvas.

---

## 9. Store APIs & Metadata Updates

- **`updateSelectedElementMetadata`** (`src/stores/editor.store.ts`): core mutation helper. Takes a callback, clones active metadata, applies updates, and rebuilds the Fabric object.
- **`getActiveElementMetadata`**: used by properties composables to fetch current metadata for binding.
- **`updateTableMetadata`** (`useObjectProperties.ts` & `PropertiesPanelContent.vue`): thin wrappers around the store helper to ensure type-safe updates from Vue components.

Key considerations when mutating tables:

1. Always guard against non-table selections to prevent null updates.
2. Clone/normalize arrays before writing back so Pinia change detection fires.
3. Keep metadata serializable—avoid storing refs or functions.

---

## 10. Validation, Constraints & Edge Cases

- **Minimum sizes**: overlay enforces `MIN_RESIZE_CELL = 24` to keep handles usable; inspector inputs clamp numeric ranges (rows ≤ 30, columns ≤ 12, padding ≤ 60, etc.).
- **Sparse arrays**: `columnWidths` / `rowHeights` are trimmed to drop trailing zeros, reducing payload size.
- **Merges**: `sanitizeTableMetadata` clamps spans to fit within current row/column counts; merges referencing pruned rows/columns are dropped.
- **Canvas transforms**: overlay recomputes whenever pan/zoom/rulers change to avoid drift. All coordinates are derived from Fabric bounding boxes plus the same viewport offsets used by rulers.
- **Selection changes**: overlay hides when no table is active, preventing stray handles for other object types.

---

## 11. Testing & Future Enhancements

Manual verification checklist:

1. Insert table presets (e.g., weekly planner) and confirm metadata defaults render correctly.
2. Use inspector controls to tweak colors, typography, and structure; check Fabric rebuild latency.
3. Drag overlay handles at different zoom levels—columns/rows should resize smoothly and respect minimums.
4. Modify pan/zoom and ensure overlay tracks the table with no lag.
5. Edit cells via the modal, including merges and zebra striping, to validate persistence.

Planned follow-ups (see roadmap):

- Bulk actions inside `TableCellEditor` (row copy/import).
- Saved table presets accessible from the inspector.
- Additional overlay affordances (drag-to-insert rows/columns) and ruler snapping.

---

## 12. File Index

| Area | File |
| ---- | ---- |
| Types & defaults | `src/types/editor.types.ts`, `src/stores/editor/metadata-defaults.ts` |
| Fabric builders | `src/stores/editor/graphics-builders.ts`, `src/stores/editor/objects.ts` |
| Store helpers | `src/stores/editor.store.ts`, `src/pages/editor/composables/useObjectProperties.ts` |
| Inspector UI | `src/components/editor/properties/TableProperties.vue`, `TableCellEditor.vue` |
| Canvas overlay | `src/components/editor/Canvas.vue`, `TableResizeOverlay.vue` |
| Docs | `Docs/implementation/14-table-elements.md` (this file) |
