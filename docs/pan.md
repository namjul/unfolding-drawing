# Pan

## Status

**Planned** — not yet implemented.

## Relationship to the Whole

Pan shifts the **field** without modifying **centers** or their scale. It changes which region of the field is visible, allowing the user to navigate a drawing that extends beyond the viewport.

Pan is a gesture of navigation. Combined with zoom, it forms the complete vocabulary for field exploration.

## Field Transformation

Pan adjusts the translate component of the view transform:

```
translate(x, y) scale(s)
```

Where `x` and `y` are updated by drag delta during pan gestures.

## Mode

Pan introduces the concept of **interaction mode**. The system can be in:

| Mode      | Drag behavior                     |
|-----------|-----------------------------------|
| `default` | Reserved for future drawing       |
| `pan`     | Translates the field              |

Mode is a temporary lens through which gestures are interpreted. It does not alter centers or persist beyond the session.

## Activation

### Button toggle

A button in View Controls toggles pan mode on/off. When active, all drag gestures pan the field.

### Spacebar hold

Holding spacebar temporarily enters pan mode, preserving the previous mode. Releasing spacebar restores the previous mode.

This allows fluid navigation without leaving the current working mode.

## Gestures

| Input                | Effect                              |
|----------------------|-------------------------------------|
| drag (in pan mode)   | translate += drag delta             |
| spacebar down        | enter pan mode (temporary)          |
| spacebar up          | restore previous mode               |
| pan button click     | toggle pan mode                     |

## Feedback

- Cursor changes to `grab` when pan mode is active
- Cursor changes to `grabbing` while dragging
- Pan button shows active state when mode is `pan`

## Reversibility

Pan is fully reversible. The user can drag in any direction. Reset zoom (scale = 1, translate = 0, 0) also resets pan.

## Implementation Plan

### State additions (App.tsx)

```typescript
const [mode, setMode] = createSignal<'default' | 'pan'>('default');
const [prevMode, setPrevMode] = createSignal<'default' | 'pan'>('default');
```

### Pointer handling changes

When `mode() === 'pan'`, drag gestures update translate:

```typescript
onMove((e) => {
  if (mode() === 'pan') {
    setTranslateX(translateX() + e.movementX);
    setTranslateY(translateY() + e.movementY);
  }
});
```

### Spacebar handling

```typescript
createShortcut([' '], () => {
  setPrevMode(mode());
  setMode('pan');
}, { preventDefault: true });

// On keyup, restore previous mode
```

Note: `createShortcut` handles keydown. Keyup requires separate handling via `createEventListener` on document.

### Component rename

- `ZoomControls.tsx` → `ViewControls.tsx`
- Add pan toggle button
- Receives `mode`, `onTogglePan` props

### Cursor styles

```typescript
<svg class={mode() === 'pan' ? 'cursor-grab' : ''}>
```

While dragging in pan mode:
```typescript
<svg class={isPanning() ? 'cursor-grabbing' : mode() === 'pan' ? 'cursor-grab' : ''}>
```

## Future Considerations

- Middle mouse button pan (always available, regardless of mode)
- Momentum/inertia after releasing drag
- Edge panning when dragging near viewport edges
- Minimap showing current viewport position

## Files

- `src/App.tsx` — mode state, pan logic
- `src/components/ViewControls.tsx` — pan toggle button (renamed from ZoomControls)
- `docs/view.md` — unified view transformation docs (future consolidation)
