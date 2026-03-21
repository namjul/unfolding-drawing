# Delta Spec: contextual-relation-display

## What behavior is being added?

**Contextual visibility of parent-child relations:** When a place is selected, the system will display relationship lines connecting that place to its immediate family — both its parent (if it has one) and its children (if it has any). These lines are hidden by default and only appear when relevant to the user's current focus.

**Selection-triggered revelation:** The act of selecting a place becomes the signal that the user wants to see the structural context for that place. This is a deliberate choice to make structure visible on demand rather than always-on.

## What behavior is changing?

**Current behavior:** All parent-child relationship lines are visible at all times, regardless of selection state. Every place with a parent shows a connecting line.

**New behavior:** Relationship lines are contextually filtered. Only lines connected to the selected place are visible. All other relationship lines are hidden from view.

**Visual priority shift:** The canvas shifts from showing "all structure all the time" to showing "relevant structure when needed." This reduces visual competition between the drawing objects (places) and the structural scaffolding (relation lines).

## What behavior is being removed?

**Always-visible relation lines:** The system will no longer display relationship lines for places that are not selected or not directly connected to a selected place.

**Global structural view:** Users can no longer see the entire hierarchy at a glance by looking at the canvas. They must select places to see their local relationships. (The inspector still shows the full hierarchy.)

## What stays the same?

- **Relationship data model:** The `parentPlaceId` field and parent-child relationships in the database remain unchanged
- **Inspector hierarchy display:** The inspector panel continues to show the full place hierarchy with indentation and parent-child relationships
- **Grouped movement behavior:** Moving a parent still moves children; this functional behavior is not affected by visual changes
- **Relation line style (when visible):** Lines connecting parent and child places maintain their basic visual appearance — the change is in *when* they appear, not *how* they look (animation handled separately)
- **Root places:** Places without parents continue to have no relationship lines (since they have no parent to connect to)
