# Header Customization Feature for Planner Blocks

## Summary

I've successfully implemented the ability to hide headers and resize header height for all three planner block elements:

- **Notes Panel** (planner-note)
- **Schedule**
- **Checklist**

## Changes Made

### 1. Type Definitions (`src/types/editor.types.ts`)

Added two new optional properties to each planner block metadata interface:

- `showHeader?: boolean` - Controls header visibility (default: true)
- `headerHeight?: number` - Controls header height in pixels (default: 50px, range: 30-100px)

### 2. Properties Panel UI (`src/components/editor/panels/ObjectPropertiesPanel.vue`)

Added user-friendly controls for each planner block type:

- **Show header checkbox** - Toggle to hide/show the header
- **Header height slider** - Adjustable slider (30-100px) that appears only when header is visible
- Controls are positioned after the "Title alignment" field for consistency

### 3. Graphics Rendering (`src/stores/editor/graphics-builders.ts`)

Updated the rendering logic for all three planner blocks:

- `buildPlannerNoteGraphics()` - Notes Panel rendering
- `buildScheduleGraphics()` - Schedule rendering
- `buildChecklistGraphics()` - Checklist rendering

**Key improvements:**

- Headers only render when `showHeader !== false`
- Header height is now customizable via `headerHeight` property
- Body content automatically adjusts position based on header visibility and height
- Header background rectangles only render when header is visible

## How to Use

1. **Select a planner block** (Notes Panel, Schedule, or Checklist) on the canvas
2. **In the Properties Panel**, you'll see new controls:
   - **Show header checkbox** - Uncheck to hide the header completely
   - **Header height slider** - Adjust the slider to resize the header (only visible when header is shown)

## Benefits

- **More space for content** - Users can hide headers to maximize space for dots grid, ruled lines, or plain content
- **Flexible layouts** - Customizable header heights allow for better visual hierarchy
- **Consistent UX** - Same controls available for all three planner block types
- **Non-destructive** - Header title and settings are preserved even when hidden

## Technical Details

- Default header height: 50px (previously hardcoded at 48px)
- Header height range: 30-100px (adjustable in 5px increments)
- When header is hidden, body content starts 18px from the top (same as when headerStyle is 'none')
- All header-related elements (background, title, minimal line) respect the `showHeader` property
