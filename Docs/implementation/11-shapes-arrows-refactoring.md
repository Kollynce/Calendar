# Refactoring Basic Shapes & Lines/Arrows - Figma-Style Architecture

## Executive Summary

This document outlines a comprehensive refactoring strategy for the Calendar Editor's **Basic Shapes** and **Lines & Arrows** implementation. The goal is to adopt a **Figma-style modular architecture** with small, focused files for better code management, maintainability, and extensibility.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Best Practices from Fabric.js Documentation](#2-best-practices-from-fabricjs-documentation)
3. [Figma-Style Architecture Overview](#3-figma-style-architecture-overview)
4. [Proposed File Structure](#4-proposed-file-structure)
5. [Refactoring Plan: Basic Shapes](#5-refactoring-plan-basic-shapes)
6. [Refactoring Plan: Lines & Arrows](#6-refactoring-plan-lines--arrows)
7. [Selection Box & Controls Customization](#7-selection-box--controls-customization)
8. [Properties Panel Architecture](#8-properties-panel-architecture)
9. [Implementation Phases](#9-implementation-phases)
10. [Code Examples](#10-code-examples)

---

## 1. Current State Analysis

### Current Implementation Location
- **Primary file**: `src/stores/editor/objects.ts` (52KB, 1662 lines)
- **Shape creation**: `createShapeObject()` function handles all shapes in a single switch statement
- **Arrow creation**: `createArrowObject()` and `createArrowHeadPolygon()` embedded in same file
- **Properties panels**: Missing dedicated `ShapeProperties.vue` and `LineProperties.vue` components

### Current Issues

| Issue | Impact |
|-------|--------|
| **Monolithic file** | `objects.ts` is 52KB with mixed concerns |
| **Tight coupling** | Shape creation logic mixed with object management |
| **Limited extensibility** | Adding new shapes requires modifying core file |
| **No custom controls** | Using default Fabric.js selection controls |
| **Missing property panels** | `ShapeProperties.vue` and `LineProperties.vue` imported but don't exist |

### Current Shape Types
```typescript
// From createShapeObject() switch statement
case 'circle':    // fabric.Circle
case 'arrow':     // Custom Group with Line + Polygon heads
case 'line':      // fabric.Line
default:          // fabric.Rect (rectangle)
```

---

## 2. Best Practices from Fabric.js Documentation

### 2.1 Custom Object Classes (Subclassing)

From Fabric.js v6+ documentation, the recommended approach for custom objects:

```typescript
import { classRegistry, Rect, SerializedRectProps } from 'fabric';

interface UniqueRectPlusProps {
  id?: string;
  name?: string;
  shapeKind?: string;
}

export interface SerializedRectPlusProps extends SerializedRectProps, UniqueRectPlusProps {}

export class RectPlus extends Rect<SerializedRectPlusProps> {
  static type = 'rectplus';
  
  declare id?: string;
  declare name?: string;
  declare shapeKind?: string;

  toObject(propertiesToInclude: string[] = []): SerializedRectPlusProps {
    return super.toObject([...propertiesToInclude, 'id', 'name', 'shapeKind']);
  }
}

// Register for serialization
classRegistry.setClass(RectPlus, 'rectplus');
```

### 2.2 Custom Controls

Fabric.js v6+ provides a powerful custom controls API:

```typescript
import { Control, FabricObject } from 'fabric';

// Create custom control
const deleteControl = new Control({
  x: 0.5,
  y: -0.5,
  offsetY: -16,
  offsetX: 16,
  cursorStyle: 'pointer',
  mouseUpHandler: (eventData, transform) => {
    const target = transform.target;
    const canvas = target.canvas;
    canvas?.remove(target);
    canvas?.requestRenderAll();
    return true;
  },
  render: (ctx, left, top, styleOverride, fabricObject) => {
    // Custom render logic for control icon
    const size = 24;
    ctx.save();
    ctx.translate(left, top);
    // Draw delete icon...
    ctx.restore();
  }
});

// Apply to object prototype or instance
FabricObject.prototype.controls.deleteControl = deleteControl;
```

### 2.3 Custom Properties with TypeScript

```typescript
import { FabricObject } from 'fabric';

declare module "fabric" {
  interface FabricObject {
    id?: string;
    name?: string;
  }
  interface SerializedObjectProps {
    id?: string;
    name?: string;
  }
}

FabricObject.customProperties = ['name', 'id'];
```

### 2.4 Control Configuration

```typescript
// Configure control appearance globally
FabricObject.ownDefaults = {
  ...FabricObject.ownDefaults,
  cornerStyle: 'circle',
  cornerColor: '#ffffff',
  cornerStrokeColor: '#2563eb',
  borderColor: '#2563eb',
  transparentCorners: false,
  cornerSize: 8,
  borderScaleFactor: 1,
};
```

---

## 3. Figma-Style Architecture Overview

### Architectural Layers

Based on Figma-like canvas editor patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI & Tooling Layer                        │
│  (Toolbars, Property Panels, Context Menus, Dialogs)        │
├─────────────────────────────────────────────────────────────┤
│                  Command & History Layer                     │
│  (Action Dispatcher, Undo/Redo, Keyboard Shortcuts)         │
├─────────────────────────────────────────────────────────────┤
│                 Application State Layer                      │
│  (Pinia Store, Object Data, Viewport, Selection)            │
├─────────────────────────────────────────────────────────────┤
│                   Interaction Layer                          │
│  (Mouse/Touch Events, Zoom/Pan, Selection, Snapping)        │
├─────────────────────────────────────────────────────────────┤
│                 Canvas Rendering Layer                       │
│  (Fabric.js Objects, Custom Controls, Transformations)      │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Responsibility**: Each file handles one concern
2. **Factory Pattern**: Object creation through dedicated factories
3. **Registry Pattern**: Central registration of object types
4. **Composition over Inheritance**: Use mixins and composables
5. **Separation of Concerns**: Rendering, state, and UI are independent

---

## 4. Proposed File Structure

### New Directory Structure

```
src/
├── fabric-objects/                    # Custom Fabric.js object classes
│   ├── index.ts                       # Barrel export + registry
│   ├── base/
│   │   ├── BaseShape.ts               # Abstract base for all shapes
│   │   ├── BaseConnector.ts           # Abstract base for lines/arrows
│   │   └── types.ts                   # Shared type definitions
│   ├── shapes/
│   │   ├── index.ts                   # Shape exports
│   │   ├── RectangleShape.ts          # Custom Rect class
│   │   ├── CircleShape.ts             # Custom Circle class
│   │   ├── EllipseShape.ts            # Custom Ellipse class
│   │   ├── TriangleShape.ts           # Custom Triangle class
│   │   ├── PolygonShape.ts            # Custom Polygon class
│   │   └── StarShape.ts               # Custom star/path shape
│   ├── connectors/
│   │   ├── index.ts                   # Connector exports
│   │   ├── LineConnector.ts           # Simple line
│   │   ├── ArrowConnector.ts          # Line with arrowheads
│   │   ├── CurvedConnector.ts         # Bezier curve connector
│   │   └── arrowheads/
│   │       ├── index.ts
│   │       ├── TriangleHead.ts        # Triangle arrowhead
│   │       ├── DiamondHead.ts         # Diamond arrowhead
│   │       ├── CircleHead.ts          # Circle endpoint
│   │       └── OpenHead.ts            # Open arrow style
│   └── controls/
│       ├── index.ts                   # Control exports
│       ├── ShapeControls.ts           # Controls for shapes
│       ├── ConnectorControls.ts       # Controls for lines/arrows
│       ├── ResizeControl.ts           # Custom resize handle
│       ├── RotateControl.ts           # Custom rotation handle
│       └── EndpointControl.ts         # Draggable line endpoints
│
├── factories/                          # Object creation factories
│   ├── index.ts
│   ├── ShapeFactory.ts                # Creates shape objects
│   ├── ConnectorFactory.ts            # Creates line/arrow objects
│   └── ObjectRegistry.ts              # Central type registry
│
├── stores/
│   └── editor/
│       ├── objects.ts                 # Simplified - delegates to factories
│       ├── objects/                   # Split object operations
│       │   ├── index.ts
│       │   ├── creation.ts            # Object creation logic
│       │   ├── selection.ts           # Selection management
│       │   ├── manipulation.ts        # Transform, copy, delete
│       │   └── serialization.ts       # Save/load object state
│       └── ...existing files
│
├── components/
│   └── editor/
│       └── properties/
│           ├── index.ts
│           ├── CommonProperties.vue    # Position, size, opacity
│           ├── ShapeProperties.vue     # Fill, stroke, corner radius
│           ├── LineProperties.vue      # Stroke, dash, endpoints
│           ├── ArrowProperties.vue     # Arrow-specific (heads, style)
│           ├── TextProperties.vue      # (existing)
│           └── ArrangementControls.vue # Align, distribute, layer
│
└── composables/
    └── editor/
        ├── useShapeCreation.ts        # Shape creation composable
        ├── useConnectorCreation.ts    # Connector creation composable
        └── useObjectControls.ts       # Control customization
```

---

## 5. Refactoring Plan: Basic Shapes

### 5.1 Create Base Shape Class

**File**: `src/fabric-objects/base/BaseShape.ts`

```typescript
import { FabricObject, classRegistry } from 'fabric';
import type { TClassProperties, ObjectEvents } from 'fabric';

export interface BaseShapeProps {
  id?: string;
  name?: string;
  shapeKind?: string;
  locked?: boolean;
}

export abstract class BaseShape<
  Props extends BaseShapeProps = BaseShapeProps,
  SProps extends BaseShapeProps = BaseShapeProps,
  EventSpec extends ObjectEvents = ObjectEvents
> extends FabricObject<Props, SProps, EventSpec> {
  
  declare id: string;
  declare name: string;
  declare shapeKind: string;
  declare locked: boolean;

  static ownDefaults: Partial<BaseShapeProps> = {
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    borderColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 8,
  };

  static customProperties = ['id', 'name', 'shapeKind', 'locked'];

  constructor(options: Props) {
    super(options);
    this.id = options.id || this.generateId();
    this.name = options.name || this.getDefaultName();
    this.shapeKind = options.shapeKind || 'shape';
    this.locked = options.locked || false;
  }

  protected abstract getDefaultName(): string;

  protected generateId(): string {
    return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  toObject<T extends Omit<Props & TClassProperties<this>, keyof SProps>>(
    propertiesToInclude: (keyof T)[] = []
  ): SProps {
    return super.toObject([
      ...propertiesToInclude,
      'id',
      'name', 
      'shapeKind',
      'locked'
    ] as any);
  }
}
```

### 5.2 Rectangle Shape

**File**: `src/fabric-objects/shapes/RectangleShape.ts`

```typescript
import { Rect, classRegistry, SerializedRectProps } from 'fabric';
import type { RectProps } from 'fabric';

export interface RectangleShapeProps extends RectProps {
  id?: string;
  name?: string;
  shapeKind?: 'rectangle';
}

export interface SerializedRectangleProps extends SerializedRectProps {
  id?: string;
  name?: string;
  shapeKind?: string;
}

export class RectangleShape extends Rect<RectangleShapeProps, SerializedRectangleProps> {
  static type = 'RectangleShape';
  
  declare id: string;
  declare name: string;
  declare shapeKind: string;

  static ownDefaults: Partial<RectangleShapeProps> = {
    ...Rect.ownDefaults,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    borderColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 8,
    fill: '#3b82f6',
    stroke: '',
    strokeWidth: 0,
    rx: 0,
    ry: 0,
  };

  constructor(options: Partial<RectangleShapeProps> = {}) {
    super(options);
    this.id = options.id || this.generateId();
    this.name = options.name || 'Rectangle';
    this.shapeKind = 'rectangle';
  }

  private generateId(): string {
    return `rect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  toObject(propertiesToInclude: string[] = []): SerializedRectangleProps {
    return {
      ...super.toObject(propertiesToInclude),
      id: this.id,
      name: this.name,
      shapeKind: this.shapeKind,
    };
  }

  static fromObject(object: SerializedRectangleProps): Promise<RectangleShape> {
    return Promise.resolve(new RectangleShape(object));
  }
}

// Register the class
classRegistry.setClass(RectangleShape);
```

### 5.3 Circle Shape

**File**: `src/fabric-objects/shapes/CircleShape.ts`

```typescript
import { Circle, classRegistry, SerializedCircleProps } from 'fabric';
import type { CircleProps } from 'fabric';

export interface CircleShapeProps extends CircleProps {
  id?: string;
  name?: string;
  shapeKind?: 'circle';
}

export interface SerializedCircleShapeProps extends SerializedCircleProps {
  id?: string;
  name?: string;
  shapeKind?: string;
}

export class CircleShape extends Circle<CircleShapeProps, SerializedCircleShapeProps> {
  static type = 'CircleShape';
  
  declare id: string;
  declare name: string;
  declare shapeKind: string;

  static ownDefaults: Partial<CircleShapeProps> = {
    ...Circle.ownDefaults,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    borderColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 8,
    fill: '#3b82f6',
    stroke: '',
    strokeWidth: 0,
  };

  constructor(options: Partial<CircleShapeProps> = {}) {
    super(options);
    this.id = options.id || this.generateId();
    this.name = options.name || 'Circle';
    this.shapeKind = 'circle';
  }

  private generateId(): string {
    return `circle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  toObject(propertiesToInclude: string[] = []): SerializedCircleShapeProps {
    return {
      ...super.toObject(propertiesToInclude),
      id: this.id,
      name: this.name,
      shapeKind: this.shapeKind,
    };
  }

  static fromObject(object: SerializedCircleShapeProps): Promise<CircleShape> {
    return Promise.resolve(new CircleShape(object));
  }
}

classRegistry.setClass(CircleShape);
```

### 5.4 Shape Factory

**File**: `src/factories/ShapeFactory.ts`

```typescript
import { RectangleShape } from '@/fabric-objects/shapes/RectangleShape';
import { CircleShape } from '@/fabric-objects/shapes/CircleShape';
import { EllipseShape } from '@/fabric-objects/shapes/EllipseShape';
import { TriangleShape } from '@/fabric-objects/shapes/TriangleShape';
import type { FabricObject } from 'fabric';

export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'star';

export interface ShapeCreationOptions {
  id?: string;
  name?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
  angle?: number;
}

const DEFAULT_SHAPE_OPTIONS: ShapeCreationOptions = {
  left: 100,
  top: 100,
  width: 100,
  height: 100,
  fill: '#3b82f6',
  stroke: '',
  strokeWidth: 0,
  cornerRadius: 0,
  opacity: 1,
  angle: 0,
};

export class ShapeFactory {
  static create(type: ShapeType, options: ShapeCreationOptions = {}): FabricObject {
    const mergedOptions = { ...DEFAULT_SHAPE_OPTIONS, ...options };

    switch (type) {
      case 'rectangle':
        return new RectangleShape({
          id: mergedOptions.id,
          name: mergedOptions.name || 'Rectangle',
          left: mergedOptions.left,
          top: mergedOptions.top,
          width: mergedOptions.width,
          height: mergedOptions.height,
          fill: mergedOptions.fill,
          stroke: mergedOptions.stroke,
          strokeWidth: mergedOptions.strokeWidth,
          rx: mergedOptions.cornerRadius,
          ry: mergedOptions.cornerRadius,
          opacity: mergedOptions.opacity,
          angle: mergedOptions.angle,
        });

      case 'circle':
        return new CircleShape({
          id: mergedOptions.id,
          name: mergedOptions.name || 'Circle',
          left: mergedOptions.left,
          top: mergedOptions.top,
          radius: mergedOptions.radius || (mergedOptions.width ? mergedOptions.width / 2 : 50),
          fill: mergedOptions.fill,
          stroke: mergedOptions.stroke,
          strokeWidth: mergedOptions.strokeWidth,
          opacity: mergedOptions.opacity,
          angle: mergedOptions.angle,
        });

      case 'ellipse':
        return new EllipseShape({
          id: mergedOptions.id,
          name: mergedOptions.name || 'Ellipse',
          left: mergedOptions.left,
          top: mergedOptions.top,
          rx: mergedOptions.width ? mergedOptions.width / 2 : 60,
          ry: mergedOptions.height ? mergedOptions.height / 2 : 40,
          fill: mergedOptions.fill,
          stroke: mergedOptions.stroke,
          strokeWidth: mergedOptions.strokeWidth,
          opacity: mergedOptions.opacity,
          angle: mergedOptions.angle,
        });

      case 'triangle':
        return new TriangleShape({
          id: mergedOptions.id,
          name: mergedOptions.name || 'Triangle',
          left: mergedOptions.left,
          top: mergedOptions.top,
          width: mergedOptions.width,
          height: mergedOptions.height,
          fill: mergedOptions.fill,
          stroke: mergedOptions.stroke,
          strokeWidth: mergedOptions.strokeWidth,
          opacity: mergedOptions.opacity,
          angle: mergedOptions.angle,
        });

      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }

  static getDefaultOptions(type: ShapeType): ShapeCreationOptions {
    const base = { ...DEFAULT_SHAPE_OPTIONS };
    
    switch (type) {
      case 'circle':
        return { ...base, radius: 50 };
      case 'ellipse':
        return { ...base, width: 120, height: 80 };
      case 'triangle':
        return { ...base, width: 100, height: 87 };
      default:
        return base;
    }
  }
}
```

---

## 6. Refactoring Plan: Lines & Arrows

### 6.1 Line Connector Base

**File**: `src/fabric-objects/connectors/LineConnector.ts`

```typescript
import { Line, classRegistry, SerializedLineProps } from 'fabric';
import type { LineProps, Point } from 'fabric';

export interface LineConnectorProps extends LineProps {
  id?: string;
  name?: string;
  connectorKind?: 'line';
}

export interface SerializedLineConnectorProps extends SerializedLineProps {
  id?: string;
  name?: string;
  connectorKind?: string;
}

export class LineConnector extends Line<LineConnectorProps, SerializedLineConnectorProps> {
  static type = 'LineConnector';
  
  declare id: string;
  declare name: string;
  declare connectorKind: string;

  static ownDefaults: Partial<LineConnectorProps> = {
    ...Line.ownDefaults,
    stroke: '#000000',
    strokeWidth: 2,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    borderColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 8,
  };

  constructor(points?: [number, number, number, number], options: Partial<LineConnectorProps> = {}) {
    super(points || [0, 0, 100, 0], options);
    this.id = options.id || this.generateId();
    this.name = options.name || 'Line';
    this.connectorKind = 'line';
  }

  private generateId(): string {
    return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  getStartPoint(): Point {
    return { x: this.x1 || 0, y: this.y1 || 0 } as Point;
  }

  getEndPoint(): Point {
    return { x: this.x2 || 0, y: this.y2 || 0 } as Point;
  }

  setStartPoint(x: number, y: number): void {
    this.set({ x1: x, y1: y });
    this.setCoords();
  }

  setEndPoint(x: number, y: number): void {
    this.set({ x2: x, y2: y });
    this.setCoords();
  }

  toObject(propertiesToInclude: string[] = []): SerializedLineConnectorProps {
    return {
      ...super.toObject(propertiesToInclude),
      id: this.id,
      name: this.name,
      connectorKind: this.connectorKind,
    };
  }

  static fromObject(object: SerializedLineConnectorProps): Promise<LineConnector> {
    const points: [number, number, number, number] = [
      object.x1 || 0,
      object.y1 || 0,
      object.x2 || 100,
      object.y2 || 0,
    ];
    return Promise.resolve(new LineConnector(points, object));
  }
}

classRegistry.setClass(LineConnector);
```

### 6.2 Arrow Connector

**File**: `src/fabric-objects/connectors/ArrowConnector.ts`

```typescript
import { Group, Line, Polygon, classRegistry, Point } from 'fabric';
import type { GroupProps, FabricObject } from 'fabric';

export type ArrowEndStyle = 'none' | 'triangle' | 'diamond' | 'circle' | 'open';
export type ArrowEnds = 'none' | 'start' | 'end' | 'both';

export interface ArrowConnectorProps extends Partial<GroupProps> {
  id?: string;
  name?: string;
  connectorKind?: 'arrow';
  // Arrow-specific
  arrowLength?: number;
  arrowStroke?: string;
  arrowStrokeWidth?: number;
  arrowEnds?: ArrowEnds;
  startHeadStyle?: ArrowEndStyle;
  endHeadStyle?: ArrowEndStyle;
  headLength?: number;
  headWidth?: number;
  strokeDashArray?: number[];
}

export interface ArrowOptions {
  length: number;
  stroke: string;
  strokeWidth: number;
  arrowEnds: ArrowEnds;
  startHeadStyle: ArrowEndStyle;
  endHeadStyle: ArrowEndStyle;
  headLength: number;
  headWidth: number;
  strokeDashArray?: number[];
}

const DEFAULT_ARROW_OPTIONS: ArrowOptions = {
  length: 140,
  stroke: '#000000',
  strokeWidth: 2,
  arrowEnds: 'end',
  startHeadStyle: 'triangle',
  endHeadStyle: 'triangle',
  headLength: 14,
  headWidth: 10,
};

export class ArrowConnector extends Group {
  static type = 'ArrowConnector';

  declare id: string;
  declare name: string;
  declare connectorKind: string;
  
  private arrowOptions: ArrowOptions;

  constructor(options: ArrowConnectorProps = {}) {
    const arrowOpts: ArrowOptions = {
      length: options.arrowLength ?? DEFAULT_ARROW_OPTIONS.length,
      stroke: options.arrowStroke ?? DEFAULT_ARROW_OPTIONS.stroke,
      strokeWidth: options.arrowStrokeWidth ?? DEFAULT_ARROW_OPTIONS.strokeWidth,
      arrowEnds: options.arrowEnds ?? DEFAULT_ARROW_OPTIONS.arrowEnds,
      startHeadStyle: options.startHeadStyle ?? DEFAULT_ARROW_OPTIONS.startHeadStyle,
      endHeadStyle: options.endHeadStyle ?? DEFAULT_ARROW_OPTIONS.endHeadStyle,
      headLength: options.headLength ?? DEFAULT_ARROW_OPTIONS.headLength,
      headWidth: options.headWidth ?? DEFAULT_ARROW_OPTIONS.headWidth,
      strokeDashArray: options.strokeDashArray,
    };

    const objects = ArrowConnector.buildArrowParts(arrowOpts);
    
    super(objects, {
      ...options,
      subTargetCheck: false,
      objectCaching: false,
    });

    this.id = options.id || this.generateId();
    this.name = options.name || 'Arrow';
    this.connectorKind = 'arrow';
    this.arrowOptions = arrowOpts;
  }

  private generateId(): string {
    return `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private static buildArrowParts(opts: ArrowOptions): FabricObject[] {
    const { length, stroke, strokeWidth, arrowEnds, headLength, headWidth, strokeDashArray } = opts;
    const objects: FabricObject[] = [];

    const hasStart = arrowEnds === 'start' || arrowEnds === 'both';
    const hasEnd = arrowEnds === 'end' || arrowEnds === 'both';

    const offsetX = -length / 2;
    const x1 = hasStart ? headLength : 0;
    const x2 = Math.max(x1, length - (hasEnd ? headLength : 0));
    const lineLength = Math.max(0, x2 - x1);

    // Create line
    const line = new Line([0, 0, lineLength, 0], {
      stroke,
      strokeWidth,
      strokeDashArray,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'left',
      originY: 'center',
      left: offsetX + x1,
      top: 0,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    (line as any).data = { arrowPart: 'line' };
    objects.push(line);

    // Create start head
    if (hasStart) {
      const startHead = ArrowConnector.createArrowHead('start', headLength, headWidth, stroke, strokeWidth);
      startHead.set({ originX: 'left', originY: 'center', left: offsetX, top: 0 });
      objects.push(startHead);
    }

    // Create end head
    if (hasEnd) {
      const endHead = ArrowConnector.createArrowHead('end', headLength, headWidth, stroke, strokeWidth);
      endHead.set({ originX: 'left', originY: 'center', left: offsetX + length - headLength, top: 0 });
      objects.push(endHead);
    }

    return objects;
  }

  private static createArrowHead(
    position: 'start' | 'end',
    headLength: number,
    headWidth: number,
    stroke: string,
    strokeWidth: number
  ): Polygon {
    const points = position === 'end'
      ? [
          { x: 0, y: 0 },
          { x: 0, y: headWidth },
          { x: headLength, y: headWidth / 2 },
        ]
      : [
          { x: headLength, y: 0 },
          { x: headLength, y: headWidth },
          { x: 0, y: headWidth / 2 },
        ];

    const polygon = new Polygon(points as any, {
      fill: stroke,
      stroke,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      objectCaching: false,
    });

    (polygon as any).data = { arrowPart: position === 'start' ? 'startHead' : 'endHead' };
    return polygon;
  }

  // Getters for arrow properties
  getArrowOptions(): ArrowOptions {
    return { ...this.arrowOptions };
  }

  // Update arrow properties and rebuild
  updateArrowOptions(newOptions: Partial<ArrowOptions>): void {
    this.arrowOptions = { ...this.arrowOptions, ...newOptions };
    this.rebuildArrow();
  }

  private rebuildArrow(): void {
    // Remove existing objects
    this.removeAll();
    
    // Build new parts
    const newParts = ArrowConnector.buildArrowParts(this.arrowOptions);
    newParts.forEach(part => this.add(part));
    
    this.setCoords();
  }

  // Get individual parts
  getLinePart(): Line | null {
    const objects = this.getObjects() as any[];
    return objects.find(o => o.data?.arrowPart === 'line') || null;
  }

  getStartHead(): Polygon | null {
    const objects = this.getObjects() as any[];
    return objects.find(o => o.data?.arrowPart === 'startHead') || null;
  }

  getEndHead(): Polygon | null {
    const objects = this.getObjects() as any[];
    return objects.find(o => o.data?.arrowPart === 'endHead') || null;
  }

  toObject(propertiesToInclude: string[] = []): any {
    return {
      ...super.toObject(propertiesToInclude),
      id: this.id,
      name: this.name,
      connectorKind: this.connectorKind,
      arrowOptions: this.arrowOptions,
    };
  }

  static fromObject(object: any): Promise<ArrowConnector> {
    return Promise.resolve(new ArrowConnector({
      ...object,
      arrowLength: object.arrowOptions?.length,
      arrowStroke: object.arrowOptions?.stroke,
      arrowStrokeWidth: object.arrowOptions?.strokeWidth,
      arrowEnds: object.arrowOptions?.arrowEnds,
      headLength: object.arrowOptions?.headLength,
      headWidth: object.arrowOptions?.headWidth,
    }));
  }
}

classRegistry.setClass(ArrowConnector);
```

### 6.3 Connector Factory

**File**: `src/factories/ConnectorFactory.ts`

```typescript
import { LineConnector } from '@/fabric-objects/connectors/LineConnector';
import { ArrowConnector, type ArrowEnds, type ArrowEndStyle } from '@/fabric-objects/connectors/ArrowConnector';
import type { FabricObject } from 'fabric';

export type ConnectorType = 'line' | 'arrow' | 'curved-arrow';

export interface ConnectorCreationOptions {
  id?: string;
  name?: string;
  left?: number;
  top?: number;
  length?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  // Arrow-specific
  arrowEnds?: ArrowEnds;
  startHeadStyle?: ArrowEndStyle;
  endHeadStyle?: ArrowEndStyle;
  headLength?: number;
  headWidth?: number;
}

const DEFAULT_CONNECTOR_OPTIONS: ConnectorCreationOptions = {
  left: 100,
  top: 100,
  length: 140,
  stroke: '#000000',
  strokeWidth: 2,
};

export class ConnectorFactory {
  static create(type: ConnectorType, options: ConnectorCreationOptions = {}): FabricObject {
    const mergedOptions = { ...DEFAULT_CONNECTOR_OPTIONS, ...options };

    switch (type) {
      case 'line':
        return new LineConnector(
          [0, 0, mergedOptions.length || 100, 0],
          {
            id: mergedOptions.id,
            name: mergedOptions.name || 'Line',
            left: mergedOptions.left,
            top: mergedOptions.top,
            stroke: mergedOptions.stroke,
            strokeWidth: mergedOptions.strokeWidth,
            strokeDashArray: mergedOptions.strokeDashArray,
          }
        );

      case 'arrow':
        return new ArrowConnector({
          id: mergedOptions.id,
          name: mergedOptions.name || 'Arrow',
          left: mergedOptions.left,
          top: mergedOptions.top,
          arrowLength: mergedOptions.length,
          arrowStroke: mergedOptions.stroke,
          arrowStrokeWidth: mergedOptions.strokeWidth,
          arrowEnds: mergedOptions.arrowEnds || 'end',
          startHeadStyle: mergedOptions.startHeadStyle || 'triangle',
          endHeadStyle: mergedOptions.endHeadStyle || 'triangle',
          headLength: mergedOptions.headLength,
          headWidth: mergedOptions.headWidth,
          strokeDashArray: mergedOptions.strokeDashArray,
        });

      default:
        throw new Error(`Unknown connector type: ${type}`);
    }
  }

  static getDefaultOptions(type: ConnectorType): ConnectorCreationOptions {
    const base = { ...DEFAULT_CONNECTOR_OPTIONS };
    
    switch (type) {
      case 'arrow':
        return { ...base, arrowEnds: 'end', headLength: 14, headWidth: 10 };
      default:
        return base;
    }
  }
}
```

---

## 7. Selection Box & Controls Customization

### 7.1 Custom Control Definitions

**File**: `src/fabric-objects/controls/ShapeControls.ts`

```typescript
import { Control, FabricObject, controlsUtils } from 'fabric';

// Custom corner render function for Figma-style controls
function renderCircleControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: any,
  fabricObject: FabricObject
) {
  const size = fabricObject.cornerSize || 8;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(left, top, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Custom rotation control with icon
function renderRotationControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: any,
  fabricObject: FabricObject
) {
  const size = 20;
  ctx.save();
  ctx.translate(left, top);
  
  // Draw circular background
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Draw rotation arrow icon
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 5, -Math.PI * 0.7, Math.PI * 0.5);
  ctx.stroke();
  
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(4, 3);
  ctx.lineTo(6, 6);
  ctx.lineTo(2, 6);
  ctx.closePath();
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  
  ctx.restore();
}

export function createShapeControls(): Record<string, Control> {
  return {
    tl: new Control({
      x: -0.5,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: controlsUtils.scalingEqually,
      render: renderCircleControl,
    }),
    tr: new Control({
      x: 0.5,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: controlsUtils.scalingEqually,
      render: renderCircleControl,
    }),
    bl: new Control({
      x: -0.5,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: controlsUtils.scalingEqually,
      render: renderCircleControl,
    }),
    br: new Control({
      x: 0.5,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: controlsUtils.scalingEqually,
      render: renderCircleControl,
    }),
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.scalingXOrSkewingY,
      render: renderCircleControl,
    }),
    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.scalingXOrSkewingY,
      render: renderCircleControl,
    }),
    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.scalingYOrSkewingX,
      render: renderCircleControl,
    }),
    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.scalingYOrSkewingX,
      render: renderCircleControl,
    }),
    mtr: new Control({
      x: 0,
      y: -0.5,
      offsetY: -30,
      cursorStyle: 'crosshair',
      actionHandler: controlsUtils.rotationWithSnapping,
      render: renderRotationControl,
      withConnection: true,
    }),
  };
}

// Apply controls globally to shapes
export function applyShapeControlsGlobally(): void {
  const controls = createShapeControls();
  
  // Apply to Rect, Circle, etc.
  ['Rect', 'Circle', 'Ellipse', 'Triangle', 'Polygon'].forEach(className => {
    const fabricClass = (fabric as any)[className];
    if (fabricClass) {
      fabricClass.prototype.controls = controls;
    }
  });
}
```

### 7.2 Connector Controls (Endpoint Dragging)

**File**: `src/fabric-objects/controls/ConnectorControls.ts`

```typescript
import { Control, Point } from 'fabric';
import type { ArrowConnector } from '../connectors/ArrowConnector';

function renderEndpointControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: any,
  fabricObject: any
) {
  const size = 10;
  ctx.save();
  ctx.fillStyle = '#2563eb';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth: 2;
  ctx.beginPath();
  ctx.arc(left, top, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Custom action handler for dragging line endpoints
function createEndpointActionHandler(endpoint: 'start' | 'end') {
  return function(eventData: any, transform: any, x: number, y: number) {
    const target = transform.target as ArrowConnector;
    const canvas = target.canvas;
    
    if (!canvas) return false;

    // Get local coordinates
    const localPoint = target.toLocalPoint(new Point(x, y), 'center', 'center');
    
    // Update the arrow endpoint
    const opts = target.getArrowOptions();
    // ... update logic based on endpoint
    
    target.setCoords();
    canvas.requestRenderAll();
    return true;
  };
}

export function createConnectorControls(): Record<string, Control> {
  return {
    startPoint: new Control({
      x: -0.5,
      y: 0,
      cursorStyle: 'move',
      actionHandler: createEndpointActionHandler('start'),
      render: renderEndpointControl,
    }),
    endPoint: new Control({
      x: 0.5,
      y: 0,
      cursorStyle: 'move',
      actionHandler: createEndpointActionHandler('end'),
      render: renderEndpointControl,
    }),
  };
}
```

---

## 8. Properties Panel Architecture

### 8.1 Shape Properties Component

**File**: `src/components/editor/properties/ShapeProperties.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { FabricObject } from 'fabric';
import ColorPicker from '../ColorPicker.vue';

interface Props {
  selectedObject: FabricObject | null;
  updateObjectProperty: (property: string, value: any) => void;
}

const props = defineProps<Props>();

const fill = computed(() => (props.selectedObject as any)?.fill || '#3b82f6');
const stroke = computed(() => (props.selectedObject as any)?.stroke || '');
const strokeWidth = computed(() => (props.selectedObject as any)?.strokeWidth || 0);
const cornerRadius = computed(() => {
  const obj = props.selectedObject as any;
  return obj?.rx || obj?.ry || 0;
});
const opacity = computed(() => ((props.selectedObject as any)?.opacity || 1) * 100);

function updateFill(color: string) {
  props.updateObjectProperty('fill', color);
}

function updateStroke(color: string) {
  props.updateObjectProperty('stroke', color);
}

function updateStrokeWidth(width: number) {
  props.updateObjectProperty('strokeWidth', width);
}

function updateCornerRadius(radius: number) {
  props.updateObjectProperty('rx', radius);
  props.updateObjectProperty('ry', radius);
}

function updateOpacity(value: number) {
  props.updateObjectProperty('opacity', value / 100);
}
</script>

<template>
  <div class="shape-properties space-y-4">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Shape</h4>
    
    <!-- Fill Color -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Fill</label>
      <ColorPicker :value="fill" @update:value="updateFill" />
    </div>

    <!-- Stroke Color -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Stroke</label>
      <ColorPicker :value="stroke" @update:value="updateStroke" />
    </div>

    <!-- Stroke Width -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Stroke Width</label>
      <input
        type="number"
        :value="strokeWidth"
        @input="updateStrokeWidth(Number(($event.target as HTMLInputElement).value))"
        min="0"
        max="50"
        class="w-16 px-2 py-1 text-sm border rounded"
      />
    </div>

    <!-- Corner Radius (for rectangles) -->
    <div v-if="selectedObject?.type === 'rect'" class="property-row">
      <label class="text-xs text-gray-500">Corner Radius</label>
      <input
        type="number"
        :value="cornerRadius"
        @input="updateCornerRadius(Number(($event.target as HTMLInputElement).value))"
        min="0"
        max="100"
        class="w-16 px-2 py-1 text-sm border rounded"
      />
    </div>

    <!-- Opacity -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Opacity</label>
      <input
        type="range"
        :value="opacity"
        @input="updateOpacity(Number(($event.target as HTMLInputElement).value))"
        min="0"
        max="100"
        class="flex-1"
      />
      <span class="text-xs w-8 text-right">{{ Math.round(opacity) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.property-row {
  @apply flex items-center gap-2;
}
</style>
```

### 8.2 Arrow Properties Component

**File**: `src/components/editor/properties/ArrowProperties.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { FabricObject } from 'fabric';
import ColorPicker from '../ColorPicker.vue';

interface Props {
  selectedObject: FabricObject | null;
  updateObjectProperty: (property: string, value: any) => void;
}

const props = defineProps<Props>();

const arrowData = computed(() => (props.selectedObject as any)?.data?.arrowOptions || {});

const stroke = computed(() => arrowData.value.stroke || '#000000');
const strokeWidth = computed(() => arrowData.value.strokeWidth || 2);
const arrowEnds = computed(() => arrowData.value.arrowEnds || 'end');
const headLength = computed(() => arrowData.value.arrowHeadLength || 14);
const headWidth = computed(() => arrowData.value.arrowHeadWidth || 10);

const arrowEndOptions = [
  { value: 'none', label: 'None' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'both', label: 'Both' },
];

function updateArrowProperty(property: string, value: any) {
  // Update through store which handles arrow group rebuilding
  props.updateObjectProperty(`arrowOptions.${property}`, value);
}
</script>

<template>
  <div class="arrow-properties space-y-4">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Arrow</h4>
    
    <!-- Stroke Color -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Color</label>
      <ColorPicker :value="stroke" @update:value="(v) => updateArrowProperty('stroke', v)" />
    </div>

    <!-- Stroke Width -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Thickness</label>
      <input
        type="number"
        :value="strokeWidth"
        @input="updateArrowProperty('strokeWidth', Number(($event.target as HTMLInputElement).value))"
        min="1"
        max="20"
        class="w-16 px-2 py-1 text-sm border rounded"
      />
    </div>

    <!-- Arrow Ends -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Arrow Heads</label>
      <select
        :value="arrowEnds"
        @change="updateArrowProperty('arrowEnds', ($event.target as HTMLSelectElement).value)"
        class="flex-1 px-2 py-1 text-sm border rounded"
      >
        <option v-for="opt in arrowEndOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Head Size -->
    <div class="property-row">
      <label class="text-xs text-gray-500">Head Size</label>
      <input
        type="number"
        :value="headLength"
        @input="updateArrowProperty('arrowHeadLength', Number(($event.target as HTMLInputElement).value))"
        min="4"
        max="40"
        class="w-16 px-2 py-1 text-sm border rounded"
        placeholder="Length"
      />
      <input
        type="number"
        :value="headWidth"
        @input="updateArrowProperty('arrowHeadWidth', Number(($event.target as HTMLInputElement).value))"
        min="4"
        max="30"
        class="w-16 px-2 py-1 text-sm border rounded"
        placeholder="Width"
      />
    </div>
  </div>
</template>

<style scoped>
.property-row {
  @apply flex items-center gap-2;
}
</style>
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
1. Create `src/fabric-objects/` directory structure
2. Implement base types and interfaces
3. Create `RectangleShape` and `CircleShape` classes
4. Create `ShapeFactory` with basic functionality
5. Update imports in `objects.ts` to use new factory

### Phase 2: Connectors (Week 2)
1. Implement `LineConnector` class
2. Implement `ArrowConnector` class with arrowhead management
3. Create `ConnectorFactory`
4. Migrate arrow creation from `objects.ts`
5. Test serialization/deserialization

### Phase 3: Controls (Week 3)
1. Implement custom `ShapeControls` with Figma-style appearance
2. Implement `ConnectorControls` with endpoint dragging
3. Apply controls globally to shape classes
4. Test interaction behavior

### Phase 4: Properties Panels (Week 4)
1. Create `ShapeProperties.vue` component
2. Create `LineProperties.vue` component  
3. Create `ArrowProperties.vue` component
4. Update `EditorProperties.vue` to use new components
5. Wire up property updates to store

### Phase 5: Cleanup & Polish (Week 5)
1. Remove deprecated code from `objects.ts`
2. Add additional shape types (Ellipse, Triangle, Polygon)
3. Add additional arrowhead styles
4. Performance optimization
5. Documentation and tests

---

## 10. Code Examples

### 10.1 Simplified objects.ts After Refactoring

```typescript
// src/stores/editor/objects.ts (simplified)
import { ShapeFactory, type ShapeType } from '@/factories/ShapeFactory';
import { ConnectorFactory, type ConnectorType } from '@/factories/ConnectorFactory';

export function createObjectsModule(params: { /* ... */ }) {
  // ... existing params

  function addObject(type: ObjectType, options: Partial<any> = {}): void {
    if (!canvas.value) return;

    const id = generateObjectId(type);
    let fabricObject: FabricObject | null = null;

    switch (type) {
      case 'text':
        fabricObject = createTextObject(id, options);
        break;
      
      case 'shape':
        fabricObject = ShapeFactory.create(
          options.shapeType as ShapeType || 'rectangle',
          { id, ...options }
        );
        break;
      
      case 'line':
        fabricObject = ConnectorFactory.create('line', { id, ...options });
        break;
      
      case 'arrow':
        fabricObject = ConnectorFactory.create('arrow', { id, ...options });
        break;

      // ... calendar elements remain unchanged
    }

    if (fabricObject) {
      ensureObjectIdentity(fabricObject as any);
      canvas.value.add(fabricObject);
      canvas.value.setActiveObject(fabricObject);
      canvas.value.renderAll();
      snapshotCanvasState();
    }
  }

  // ... rest of module
}
```

### 10.2 Object Registry

```typescript
// src/factories/ObjectRegistry.ts
import { classRegistry } from 'fabric';
import { RectangleShape } from '@/fabric-objects/shapes/RectangleShape';
import { CircleShape } from '@/fabric-objects/shapes/CircleShape';
import { LineConnector } from '@/fabric-objects/connectors/LineConnector';
import { ArrowConnector } from '@/fabric-objects/connectors/ArrowConnector';

export function registerAllCustomObjects(): void {
  // Shapes
  classRegistry.setClass(RectangleShape);
  classRegistry.setClass(CircleShape);
  
  // Connectors
  classRegistry.setClass(LineConnector);
  classRegistry.setClass(ArrowConnector);
  
  console.log('[ObjectRegistry] All custom Fabric.js objects registered');
}

export function getRegisteredTypes(): string[] {
  return [
    'RectangleShape',
    'CircleShape', 
    'LineConnector',
    'ArrowConnector',
  ];
}
```

---

## Summary

This refactoring plan transforms the monolithic shape/arrow implementation into a **modular, Figma-style architecture** with:

- **Small, focused files** (~100-300 lines each)
- **Factory pattern** for object creation
- **Custom Fabric.js classes** with proper TypeScript typing
- **Figma-style selection controls** with custom rendering
- **Dedicated property panels** for each object type
- **Clear separation of concerns** between rendering, state, and UI

The phased implementation approach allows for incremental migration without breaking existing functionality.
