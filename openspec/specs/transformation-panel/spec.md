## ADDED Requirements

### Requirement: Transformations Panel shows context-sensitive operations
The system SHALL display only transformations valid for current selection target.

#### Scenario: Add Place available when canvas selected
- **WHEN** canvas is selected
- **THEN** Transformations Panel displays "Add Place" button
- **THEN** button is enabled when no pending transformation exists

#### Scenario: Move and Delete available when place selected
- **WHEN** place is selected
- **THEN** Transformations Panel displays "Move Place" button
- **THEN** Transformations Panel displays "Delete Place" button
- **THEN** buttons are enabled when allowed by pending state

#### Scenario: Transformation buttons disabled when pending exists
- **WHEN** pending transformation exists
- **THEN** all transformation buttons in panel are disabled
- **THEN** user must commit or reject before starting new transformation

### Requirement: Add Place transformation workflow
The system SHALL allow creating places via button + canvas click.

#### Scenario: Begin Add Place transformation
- **WHEN** canvas is selected
- **WHEN** user clicks "Add Place" button
- **THEN** system enters "awaiting add place target" state
- **THEN** Transformations Panel shows "→ Click canvas to complete transformation" message

#### Scenario: Complete Add Place transformation
- **WHEN** system is awaiting add place target
- **WHEN** user clicks canvas at coordinates (x, y)
- **THEN** draft place is created at (x, y)
- **THEN** awaiting state is cleared
- **THEN** pending transformation is staged (kind: addPlace)

#### Scenario: Auto-reject pending before Add Place
- **WHEN** user has pending transformation
- **WHEN** user clicks "Add Place" button
- **THEN** pending transformation is automatically rejected
- **THEN** system enters "awaiting add place target" state

### Requirement: Move Place transformation workflow
The system SHALL allow moving places via button + canvas click.

#### Scenario: Begin Move Place transformation
- **WHEN** place is selected
- **WHEN** user clicks "Move Place" button
- **THEN** system enters "awaiting move place target" state
- **THEN** Transformations Panel shows "→ Click canvas to complete transformation" message

#### Scenario: Complete Move Place transformation
- **WHEN** system is awaiting move place target for place P
- **WHEN** user clicks canvas at coordinates (x, y)
- **THEN** move transformation is staged for place P to position (x, y)
- **THEN** awaiting state is cleared
- **THEN** pending transformation shows staged move

#### Scenario: Auto-reject pending before Move Place
- **WHEN** user has pending transformation
- **WHEN** user clicks "Move Place" button
- **THEN** pending transformation is automatically rejected
- **THEN** system enters "awaiting move place target" state

### Requirement: Delete Place transformation workflow
The system SHALL allow deleting places via button click.

#### Scenario: Delete Place executes immediately
- **WHEN** place is selected
- **WHEN** user clicks "Delete Place" button
- **THEN** deletion is staged immediately (no canvas click required)
- **THEN** pending transformation shows staged deletion
- **THEN** awaiting state remains "none"

#### Scenario: Auto-reject pending before Delete Place
- **WHEN** user has pending transformation
- **WHEN** user clicks "Delete Place" button
- **THEN** pending transformation is automatically rejected
- **THEN** deletion is staged for currently selected place

### Requirement: No tool mode state exists
The system SHALL NOT use tool mode concept for interaction control.

#### Scenario: No tool mode displayed
- **WHEN** inspector renders
- **THEN** system does NOT display "Current tool: Select" or "Current tool: Add place"
- **THEN** no tool mode panel exists

#### Scenario: Canvas click behavior determined by awaiting state
- **WHEN** user clicks canvas
- **THEN** behavior is determined by awaiting transformation state
- **THEN** behavior is NOT determined by tool mode
