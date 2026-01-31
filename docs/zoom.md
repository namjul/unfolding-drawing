# Zoom

## Relationship to the Whole

Zoom transforms the **field** without modifying **centers**. It changes the scale at which centers are perceived, allowing the user to shift attention between detail and context.

A center that reads as texture at one scale may become a focal point at another. Zoom supports this perceptual movement—it is a gesture of inquiry, not of construction.

## Field Transformation

Zoom operates on the view, not the data. The transformation is applied to the containing group of all drawn elements:

```
translate(x, y) scale(s)
```

Where:
- `s` is the scale factor (1 = no magnification)
- `x, y` is the pan offset, adjusted during zoom to keep the focal point stable

### Focal Point

When zooming via buttons, the focal point is the **center of the canvas element**—not the window center. This respects the actual field boundary in a multi-region layout.

### Bounds

| Limit     | Value | Rationale                                      |
|-----------|-------|------------------------------------------------|
| Min scale | 0.1   | Prevents centers from becoming imperceptible   |
| Max scale | 5     | Prevents loss of field context                 |
| Step      | 0.25  | Perceptible change without jarring transition  |

## Feedback

- Current scale displayed as percentage
- Buttons disable at bounds (legible constraint)
- Reset available when scale ≠ 1

## Reversibility

Zoom is fully reversible. Reset returns to the initial field state (scale 1, no offset). No centers are created, modified, or destroyed by zooming.

## Controls

### Buttons (View Controls sidebar)

| Element     | Gesture       | Effect                     |
|-------------|---------------|----------------------------|
| `+` button  | click         | scale += step              |
| `−` button  | click         | scale -= step              |
| `%` display | click         | reset to scale 1           |

### Wheel

Scroll wheel zooms toward cursor position.

| Input          | Effect                              |
|----------------|-------------------------------------|
| scroll up      | zoom in toward cursor               |
| scroll down    | zoom out from cursor                |

### Keyboard

| Key | Effect      |
|-----|-------------|
| `+` / `=` | zoom in     |
| `-`       | zoom out    |
| `0`       | reset zoom  |

### Pinch (touch)

Two-finger pinch gesture zooms toward the midpoint between fingers.

## Files

- `src/App.tsx` — field transformation state
- `src/components/ZoomControls.tsx` — control surface
