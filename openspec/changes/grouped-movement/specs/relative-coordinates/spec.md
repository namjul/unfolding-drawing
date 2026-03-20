## ADDED Requirements

### Requirement: Child places store position as offset from parent
The system SHALL interpret child place coordinates as offsets from parent's world position rather than absolute world coordinates.

#### Scenario: Child coordinates are offsets
- **WHEN** place has a parent (parentPlaceId is not null)
- **WHEN** place's stored coordinates are (dx, dy)
- **WHEN** parent's world position is (px, py)
- **THEN** place's world position is (px + dx, py + dy)

#### Scenario: Root coordinates are absolute
- **WHEN** place has no parent (parentPlaceId is null)
- **WHEN** place's stored coordinates are (x, y)
- **THEN** place's world position is exactly (x, y)

#### Scenario: Nested coordinate computation
- **WHEN** grandchild has parent and grandparent
- **WHEN** grandparent is at world (100, 100)
- **WHEN** parent has offset (+50, +50)
- **WHEN** grandchild has offset (+20, +20)
- **THEN** parent's world position is (150, 150)
- **THEN** grandchild's world position is (170, 170)

#### Scenario: Orphaned place fallback
- **WHEN** place has parentPlaceId set
- **WHEN** parent place does not exist (orphaned)
- **THEN** system treats place's coordinates as absolute world position
- **THEN** place renders at stored (x, y) without offset calculation

### Requirement: World position computation is recursive
The system SHALL recursively compute world positions for nested hierarchies.

#### Scenario: Compute position for deeply nested place
- **WHEN** place is N levels deep in hierarchy
- **THEN** system recursively computes each ancestor's world position
- **THEN** system accumulates offsets from root to place
- **THEN** final world position accounts for entire ancestor chain

#### Scenario: Display derivation includes world position
- **WHEN** system derives display places from persisted places
- **THEN** each DisplayPlace has computed world position
- **THEN** canvas receives places with world coordinates ready for rendering
- **THEN** canvas does not perform coordinate transformation
