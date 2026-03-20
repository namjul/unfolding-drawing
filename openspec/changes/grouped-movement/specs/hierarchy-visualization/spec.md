## MODIFIED Requirements

### Requirement: System renders parent-child relationship lines
The system SHALL visually indicate parent-child relationships with connecting lines on the canvas, using computed world positions.

#### Scenario: Display line from parent to child
- **WHEN** canvas renders a child place P with parentPlaceId = Q
- **WHEN** parent place Q exists and is visible
- **WHEN** parent Q's world position is (qx, qy)
- **WHEN** child P's world position is (qx + dx, qy + dy) computed from offset (dx, dy)
- **THEN** system draws a line from (qx, qy) to (qx + dx, qy + dy)
- **THEN** line is rendered in gray color (rgba(128, 128, 128, 0.4))
- **THEN** line is rendered behind places but above grid

#### Scenario: No line for places without parent
- **WHEN** canvas renders a place with parentPlaceId = null
- **THEN** system does NOT render any parent relationship line for that place

#### Scenario: No line when parent is deleted or missing
- **WHEN** place P has parentPlaceId = Q
- **WHEN** parent Q does not exist or is deleted
- **THEN** system does NOT render relationship line for place P

### Requirement: Relationship lines render for draft places
The system SHALL show relationship preview when staging a related place, using computed world positions for offset-based children.

#### Scenario: Show relationship line for draft child
- **WHEN** user has staged a related place P with parentPlaceId = Q
- **WHEN** draft place has offset (dx, dy)
- **WHEN** parent Q's world position is (qx, qy)
- **WHEN** draft place is visible (amber rendering) at computed world position (qx + dx, qy + dy)
- **THEN** system renders relationship line from (qx, qy) to (qx + dx, qy + dy)
- **THEN** line uses same highlight color as draft place (amber or cyan)

### Requirement: Relationship lines follow grouped movement in draft
The system SHALL update relationship line positions during draft movement preview.

#### Scenario: Draft parent move shows children following
- **WHEN** user stages movement of parent place Q from (qx, qy) to (nx, ny)
- **WHEN** Q has children with offsets
- **THEN** relationship lines render from draft parent position (nx, ny) to draft child positions (nx + dx, ny + dy)
- **THEN** lines connect to preview positions, not original positions
