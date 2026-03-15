## Why

Stage 1 established persistent place editing with commit/reject workflow. Users can add, move, and delete isolated places. Stage 2 extends this to enable **structured growth** through parent/child relationships. Without hierarchy, places remain disconnected marks. Hierarchy transforms the system from isolated centers to structured composition.

## What Changes

- Add `addRelatedPlace` operation to create places with explicit parent reference
- Visual rendering of parent-child relationships (connecting lines or highlights)
- Inspector tree/list view showing place hierarchy
- Extend commit/reject workflow to handle related place creation
- Relationship highlighting when parent or child is selected

**No breaking changes.** Existing free place operations remain unchanged.

## Capabilities

### New Capabilities

- `add-related-place`: Create a place with explicit parent relationship
- `hierarchy-visualization`: Visual rendering of parent-child relationships on canvas
- `structure-inspector`: Inspector view showing place hierarchy as tree or list

### Modified Capabilities

<!-- No existing capabilities have requirement changes - hierarchy extends without modifying current place operations -->

## Impact

**Affected modules:**
- `src/lib/drawing-ops.ts` - new `addRelatedPlace` operation
- `src/components/PlaceCanvas.tsx` - render parent-child relationship lines/highlights
- `src/components/PlaceInspector.tsx` - add "Add Related Place" UI, show hierarchy structure
- `src/lib/interaction-state.ts` - new tool mode for adding related places

**Data model:**
- `parentPlaceId` field already exists in schema but is currently unused - will now be populated by `addRelatedPlace`
- New transformation kind: `addRelatedPlace`

**User interaction flow:**
- Select a parent place → enter "add related place" mode → click to place child → commit or reject
