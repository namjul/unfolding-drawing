## Why

The "Reset Drawing" button currently exists in the inspector but is disabled. Users need a way to clear all places and start fresh without reloading the application. This enables rapid iteration and experimentation within a session.

## What Changes

- Implement reset drawing functionality to delete all places from local persistence
- Enable the currently disabled "Reset Drawing" button
- Add confirmation dialog to prevent accidental data loss
- Optionally clear transformation history or preserve it as a record

**No breaking changes.** Existing place operations and workflows remain unchanged.

## Capabilities

### New Capabilities

- `reset-drawing`: Clear all places from the drawing while preserving application state (viewport, selection, etc.)

### Modified Capabilities

<!-- No existing capabilities have requirement changes -->

## Impact

**Affected modules:**
- `src/drawing-ops.ts` - new `resetDrawing()` operation to delete all places
- `src/inspector/PlaceInspector.tsx` - enable button and wire to reset operation
- Evolu persistence layer - bulk delete or clear of all place records

**User interaction:**
- Click "Reset Drawing" → confirmation prompt → all places deleted → canvas cleared
- Transformation history may be cleared or preserved (design decision needed)
- Viewport and UI state remain unchanged (user stays at current zoom/pan)

**Data model:**
- All place records marked as deleted (soft delete via `isDeleted: true`)
- OR all place records removed from local database (hard delete)
- Transformation history: either cleared or preserved with "resetDrawing" entry
