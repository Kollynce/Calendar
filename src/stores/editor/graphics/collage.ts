import { Group, Rect, Textbox, FabricImage, type Object as FabricObject } from 'fabric'
import type { CollageMetadata } from '@/types'

// Image cache to prevent flickering and repeated loads
const imageCache = new Map<string, HTMLImageElement>()

export function buildCollageGraphics(metadata: CollageMetadata): Group {
  const { size, slots } = metadata
  const width = size.width
  const height = size.height
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 16)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'

  const slotCornerRadius = Math.max(0, metadata.slotCornerRadius ?? 8)
  const slotBorderColor = metadata.slotBorderColor ?? '#e5e7eb'
  const slotBorderWidth = Math.max(0, metadata.slotBorderWidth ?? 1)
  const slotBackgroundColor = metadata.slotBackgroundColor ?? '#f3f4f6'

  // Background rectangle (Frame)
  if (metadata.showFrame !== false) {
    objects.push(
      new Rect({
        left: 0,
        top: 0,
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
        selectable: false,
      }),
    )
  }

  for (const slot of slots) {
    if (!slot) continue

    // Slot background/border
    const slotRect = new Rect({
      left: slot.x,
      top: slot.y,
      width: slot.width,
      height: slot.height,
      rx: slotCornerRadius,
      ry: slotCornerRadius,
      fill: slotBackgroundColor,
      stroke: slotBorderColor,
      strokeWidth: slotBorderWidth,
      angle: slot.rotation ?? 0,
      selectable: false,
    })

    objects.push(slotRect)

    if (slot.imageUrl) {
      const cachedImg = imageCache.get(slot.imageUrl)

      if (cachedImg && cachedImg.complete) {
        // Image is already loaded and cached, add it immediately
        const fabricImg = new FabricImage(cachedImg, {
          left: slot.x + slot.width / 2,
          top: slot.y + slot.height / 2,
          originX: 'center',
          originY: 'center',
          angle: slot.rotation ?? 0,
          selectable: false,
        })

        const scaleX = slot.width / fabricImg.width!
        const scaleY = slot.height / fabricImg.height!
        const scale = (slot.imageFit || 'cover') === 'cover'
          ? Math.max(scaleX, scaleY)
          : Math.min(scaleX, scaleY)

        fabricImg.set({ scaleX: scale, scaleY: scale })

        // clipPath is relative to the object's center when origin is center/center
        const clipPath = new Rect({
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          width: slot.width / scale,
          height: slot.height / scale,
          rx: slotCornerRadius / scale,
          ry: slotCornerRadius / scale,
        })
        fabricImg.set('clipPath', clipPath)
        objects.push(fabricImg)
      } else {
        // Image not loaded yet, show placeholder and trigger load
        if (!cachedImg) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = slot.imageUrl
          imageCache.set(slot.imageUrl, img)

          img.onload = () => {
            // Find the canvas and trigger re-render
            // This is a bit of a hack but necessary since graphics builders are sync
            // and don't have direct access to the canvas instance easily.
            // Most Fabric.js apps handle this via a global re-render event or store update.
            window.dispatchEvent(new CustomEvent('editor:request-render'))
          }
        }

        const iconSize = Math.min(slot.width, slot.height) * 0.25
        objects.push(
          new Textbox('⌛', {
            left: slot.x + slot.width / 2,
            top: slot.y + slot.height / 2,
            originX: 'center',
            originY: 'center',
            fontSize: Math.max(16, Math.min(32, iconSize)),
            fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
            fill: '#9ca3af',
            textAlign: 'center',
            selectable: false,
            angle: slot.rotation ?? 0,
          }),
        )
      }
    } else {
      // Placeholder icon if no image
      const iconSize = Math.min(slot.width, slot.height) * 0.25
      objects.push(
        new Textbox('🖼️', {
          left: slot.x + slot.width / 2,
          top: slot.y + slot.height / 2,
          originX: 'center',
          originY: 'center',
          fontSize: Math.max(16, Math.min(32, iconSize)),
          fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
          fill: '#9ca3af',
          textAlign: 'center',
          selectable: false,
          angle: slot.rotation ?? 0,
        }),
      )
    }
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}
