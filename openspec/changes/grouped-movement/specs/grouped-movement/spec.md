## ADDED Requirements

### Requirement: Moving a parent place moves all descendants
The system SHALL automatically move all descendant places when their parent or ancestor is moved, preserving relative spatial relationships.

#### Scenario: Move parent with single child
- **WHEN** user moves a parent place from position A to position B
- **WHEN** parent has one child at relative offset C
- **THEN** child moves by the same delta as parent
- **THEN** child maintains offset C relative to parent's new position

#### Scenario: Move parent with multiple children
- **WHEN** user moves a parent place
- **WHEN** parent has multiple children at various offsets
- **THEN** all children move by the same delta as parent
- **THEN** all children maintain their original offsets relative to parent

#### Scenario: Move parent with nested descendants
- **WHEN** user moves a root place (grandparent)
- **WHEN** root has children, and children have their own children (grandchildren)
- **THEN** entire subtree moves together
- **THEN** all relative offsets are preserved at every level

#### Scenario: Draft preview shows grouped movement
- **WHEN** user begins dragging a parent place (staged, not yet committed)
- **THEN** draft overlay shows parent at new position
- **THEN** draft overlay shows all descendants at their new computed positions
- **THEN** relationship lines connect to draft positions

#### Scenario: Commit grouped movement
- **WHEN** user commits a staged parent move
- **THEN** only parent's coordinates update in database
- **THEN** children's offsets remain unchanged
- **THEN** all places render at new computed world positions

### Requirement: Moving a child place independently updates its offset
The system SHALL allow users to move child places independently, updating the offset while preserving the parent relationship.

#### Scenario: Move child to new position
- **WHEN** parent is at world position (100, 100)
- **WHEN** child has offset (+50, +50) rendering at world (150, 150)
- **WHEN** user moves child to world position (200, 200)
- **THEN** child's stored offset updates to (+100, +100)
- **THEN** parent-child relationship is preserved

#### Scenario: Subsequent parent move respects new offset
- **WHEN** child's offset was updated via independent movement
- **WHEN** parent subsequently moves to new position
- **THEN** child moves with parent
- **THEN** child maintains the updated offset from parent

#### Scenario: Move grandchild independently
- **WHEN** grandchild has parent and grandparent
- **WHEN** user moves grandchild independently
- **THEN** grandchild's offset relative to its parent updates
- **THEN** grandchild does NOT detach from parent
- **THEN** moving the parent still moves the grandchild

### Requirement: Root places continue using absolute coordinates
The system SHALL continue to use absolute world coordinates for places with no parent.

#### Scenario: Move root place
- **WHEN** place has no parent (parentPlaceId is null)
- **WHEN** user moves place to position (X, Y)
- **THEN** place's stored coordinates are (X, Y)
- **THEN** place renders at exact world position (X, Y)

#### Scenario: Free place movement unchanged
- **WHEN** user creates a free place (no parent)
- **WHEN** user moves the free place
- **THEN** behavior is identical to Stage 1 (absolute positioning)
- **THEN** no coordinate conversion or offset calculation occurs
