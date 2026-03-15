## ADDED Requirements

### Requirement: System renders parent-child relationship lines
The system SHALL visually indicate parent-child relationships with connecting lines on the canvas.

#### Scenario: Display line from parent to child
- **WHEN** canvas renders a place P with parentPlaceId = Q
- **WHEN** parent place Q exists and is visible
- **THEN** system draws a line from Q's center (x, y) to P's center (x, y)
- **THEN** line is rendered in gray color (rgba(128, 128, 128, 0.4))
- **THEN** line is rendered behind places but above grid

#### Scenario: No line for places without parent
- **WHEN** canvas renders a place with parentPlaceId = null
- **THEN** system does NOT render any parent relationship line for that place

#### Scenario: No line when parent is deleted or missing
- **WHEN** place P has parentPlaceId = Q
- **WHEN** parent Q does not exist or is deleted
- **THEN** system does NOT render relationship line for place P

### Requirement: System highlights relationship when parent or child is selected
The system SHALL emphasize parent-child relationship lines when either endpoint is selected.

#### Scenario: Highlight line when child is selected
- **WHEN** user selects a place P with parentPlaceId = Q
- **THEN** relationship line from Q to P is rendered in brighter color (cyan or highlighted gray)

#### Scenario: Highlight line when parent is selected
- **WHEN** user selects a place Q
- **WHEN** one or more places have parentPlaceId = Q
- **THEN** all relationship lines from Q to its children are rendered in brighter color

#### Scenario: Normal line color when neither endpoint selected
- **WHEN** neither parent nor child in a relationship is selected
- **THEN** relationship line is rendered in default gray color

### Requirement: Relationship lines render for draft places
The system SHALL show relationship preview when staging a related place.

#### Scenario: Show relationship line for draft child
- **WHEN** user has staged a related place P with parentPlaceId = Q
- **WHEN** draft place is visible (amber rendering)
- **THEN** system renders relationship line from parent Q to draft place P
- **THEN** line uses same highlight color as draft place (amber or cyan)
