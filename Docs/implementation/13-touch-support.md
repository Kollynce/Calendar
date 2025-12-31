# Touch & Tablet Support Implementation

This document describes the touch support system implemented for iPad, Android tablets, and stylus/pencil input.

## Overview

The calendar editor now supports professional-grade touch interactions, allowing users to work efficiently on tablets without a keyboard.

## Components Created

### 1. Composables

#### `useTouchGestures.ts`
Handles all touch gesture recognition:
- **Pinch-to-zoom**: Two-finger pinch gesture for zooming the canvas (now feeds smooth inertia handoff)
- **Two-finger pan**: Drag with two fingers to pan the canvas, with friction-based inertia applied when fingers lift
- **Long-press**: Hold for 500ms to trigger context menu
- **Double-tap**: Quick double tap to enter text editing mode
- **Stylus detection**: Detects Apple Pencil and Android stylus input and exposes `isStylus` so Canvas can prioritize stylus edits

#### `useDeviceDetection.ts`
Detects device capabilities:
- `isTouchDevice`: Whether device supports touch
- `isTablet`: Whether device is a tablet (iPad, Android tablet)
- `isMobile`: Whether device is a phone
- `hasStylus`: Whether stylus/pencil has been detected
- `needsTouchUI`: Computed flag for showing touch-specific UI

### 2. UI Components

#### `TouchActionBar.vue`
A bottom action bar that replaces keyboard shortcuts:
- Undo/Redo buttons
- Copy/Paste/Duplicate
- Layer ordering (forward/backward)
- Group/Ungroup
- Lock/Unlock
- Delete

#### `FloatingSelectionToolbar.vue`
A floating toolbar that appears above selected objects:
- Quick duplicate / delete
- More actions button (opens context menu)
- Contextual quick actions (bold, italic, align left/center/right) whenever a text box is selected
- Automatically positions above/below selection and follows moving objects

#### `TouchNudgeControls.vue`
D-pad style controls for precise object positioning:
- Arrow buttons for up/down/left/right movement
- Configurable step size (1px, 5px, 10px, 25px)
- Hold-to-repeat for continuous movement

#### `TouchNumberInput.vue`
Touch-friendly number input with stepper buttons:
- Large +/- buttons for increment/decrement
- Hold-to-repeat for fast value changes
- Direct input with on-screen keyboard
- Unit display support

## Touch Gestures

| Gesture | Action |
|---------|--------|
| Single tap | Select object |
| Double tap | Enter text editing mode |
| Long press (500ms) | Show context menu |
| Two-finger pinch | Zoom in/out |
| Two-finger drag | Pan canvas (releases into inertial glide) |
| Single finger drag on object | Move object |
| Single finger drag on handle | Resize/rotate object |

## CSS Utilities

Added to `main.css`:

```css
.touch-no-select      /* Disable text selection */
.touch-action-manipulation  /* Prevent double-tap zoom */
.touch-no-highlight   /* Remove tap highlight */
.touch-btn            /* Touch-friendly button (44px min) */
.touch-ripple         /* Ripple effect on tap */
.safe-area-*          /* Safe area insets for notched devices */
.touch-scroll         /* Smooth touch scrolling */
.touch-slider         /* Large slider thumb for touch */
.fab                  /* Floating action button style */
```

## Device-Specific Behavior

### iPad with Apple Pencil
- Pencil input is detected via `touchType === 'stylus'`
- Smaller touch targets available when stylus detected
- Palm rejection handled by browser/OS
- **Finger-pan preference**: When the Pencil is active, single-finger touch continues object manipulation; users can enable finger-pan priority to allow finger-only panning while Pencil handles edits.

### Android Tablets
- Standard touch gestures work identically
- Stylus detected via pointer events

### Desktop (fallback)
- Touch UI components hidden
- Standard mouse/keyboard interactions preserved

## Integration Points

### Canvas.vue
The main canvas component integrates touch support:
1. Imports device detection and touch gesture composables
2. Sets up pinch-zoom and pan handlers, including friction-based inertia for touch pans
3. Tracks stylus/finger state and respects the editor’s touch preference (`fingerPanPriority`)
4. Conditionally renders touch UI components (action bar, selection toolbar, nudge controls)
5. Adjusts bottom toolbar for touch hints

### Context Menu
- Triggered by long-press on touch devices
- Triggered by right-click on desktop
- Same menu items available in both modes

## Testing on Tablet

To test touch functionality:
1. Open the editor on an iPad or Android tablet
2. Verify pinch-to-zoom works smoothly
3. Test two-finger panning
4. Long-press on canvas to see context menu
5. Select an object and verify floating toolbar appears with contextual shortcuts for text objects
6. Use nudge controls to move objects precisely
7. Test the bottom action bar for all operations

## Browser Support

- Safari (iOS/iPadOS): Full support
- Chrome (Android): Full support
- Firefox (Android): Full support
- Desktop browsers: Touch UI hidden, mouse events used

## Future Enhancements

Potential improvements:
- Pressure-sensitive drawing with Apple Pencil
- Gesture customization settings
- Persisted zoom/pan restore
- Haptic feedback on supported devices
- Haptic feedback on supported devices
- Split-screen multitasking support
- External keyboard detection to hide touch UI
