# Editor Refactoring Plan

## Overview

The `/src/pages/editor/index.vue` file has grown to ~2765 lines and needs to be broken into manageable, maintainable chunks. This document outlines the refactoring strategy.

## Current Issues

1. **index.vue is too large** (~2765 lines) - difficult to maintain and debug
2. **Arrow rendering** - not using Figma-style controls properly
3. **AdobeCanvas.vue naming** - should be renamed to `Canvas.vue`
4. **Mixed concerns** - properties, uploads, templates, curated assets all in one file

## Proposed Structure

```
src/
├── components/editor/
│   ├── Canvas.vue                    # Renamed from AdobeCanvas.vue
│   ├── panels/
│   │   ├── ElementsPanel.vue         # ✓ Already exists
│   │   ├── TextPanel.vue             # ✓ Already exists
│   │   ├── UploadsPanel.vue          # ✓ Already exists (needs enhancement)
│   │   ├── TemplatesPanel.vue        # NEW - Extract from index.vue
│   │   └── CalendarPanel.vue         # NEW - Extract from index.vue
│   ├── properties/
│   │   ├── LayoutProperties.vue      # NEW - Position, size, alignment
│   │   ├── ShapeProperties.vue       # NEW - Fill, stroke, corner radius
│   │   ├── LineProperties.vue        # NEW - Line/arrow specific props
│   │   ├── TextProperties.vue        # NEW - Wrapper for typography
│   │   ├── CommonProperties.vue      # NEW - Opacity, layer order
│   │   └── PropertiesPanel.vue       # NEW - Main orchestrator
│   └── sidebars/
│       ├── LeftSidebar.vue           # NEW - Tool selection + panels
│       └── RightSidebar.vue          # NEW - Properties + layers
├── pages/editor/
│   ├── index.vue                     # Simplified orchestrator
│   └── composables/
│       ├── useElements.ts            # ✓ Already exists
│       ├── useUploads.ts             # NEW - Upload logic
│       ├── useTemplates.ts           # NEW - Template logic
│       ├── useProperties.ts          # NEW - Property bindings
│       └── useSidebars.ts            # NEW - Sidebar state
└── data/
    └── curated-assets.ts             # NEW - Move curated assets data
```

## Phase 1: Fix Arrow Rendering & Rename Canvas

1. Fix arrow Figma-style controls in `objects.ts`
2. Rename `AdobeCanvas.vue` → `Canvas.vue`
3. Update all imports

## Phase 2: Extract Composables

1. Create `useUploads.ts` - upload state and handlers
2. Create `useTemplates.ts` - template state and handlers  
3. Create `useProperties.ts` - property computed bindings
4. Create `useSidebars.ts` - sidebar visibility state

## Phase 3: Extract Property Components

1. Create `LayoutProperties.vue` - X, Y, W, H, alignment
2. Create `ShapeProperties.vue` - fill, stroke, corner radius
3. Create `LineProperties.vue` - line/arrow properties
4. Create `CommonProperties.vue` - opacity, layer order
5. Create `PropertiesPanel.vue` - orchestrates all property components

## Phase 4: Extract Sidebar Components

1. Create `LeftSidebar.vue` - tool buttons + panel content
2. Create `RightSidebar.vue` - properties + layers
3. Move curated assets to `data/curated-assets.ts`

## Phase 5: Simplify index.vue

1. Import and use extracted components
2. Remove duplicated code
3. Keep only page-level orchestration

## Implementation Priority

1. **High**: Fix arrow rendering (user-facing bug)
2. **High**: Rename AdobeCanvas → Canvas
3. **Medium**: Extract properties composable and components
4. **Medium**: Extract sidebar components
5. **Low**: Extract remaining panels and data
