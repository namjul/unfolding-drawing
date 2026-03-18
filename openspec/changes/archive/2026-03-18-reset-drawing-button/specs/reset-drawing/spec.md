## ADDED Requirements

### Requirement: User can reset the drawing
The system SHALL provide a mechanism to delete all places and return to an empty canvas.

#### Scenario: Reset drawing via inspector button
- **WHEN** user clicks "Reset Drawing" button in inspector
- **THEN** system shows confirmation dialog with message "Delete all places? This cannot be undone."
- **THEN** system waits for user confirmation

#### Scenario: User confirms reset
- **WHEN** user confirms reset in dialog
- **THEN** system marks all existing places as deleted (isDeleted: true)
- **THEN** canvas clears and shows empty grid
- **THEN** selection is cleared (no place selected)
- **THEN** transformation history records "resetDrawing" entry with place count

#### Scenario: User cancels reset
- **WHEN** user cancels reset in dialog
- **THEN** system takes no action
- **THEN** all places remain unchanged
- **THEN** canvas continues displaying existing places

### Requirement: Reset clears pending transformations
The system SHALL handle pending changes before resetting the drawing.

#### Scenario: Reset with pending transformation
- **WHEN** user has a pending transformation (add, move, or delete)
- **WHEN** user initiates reset
- **THEN** system automatically rejects the pending transformation
- **THEN** system proceeds with reset confirmation

#### Scenario: Reset after pending rejection
- **WHEN** pending transformation is rejected during reset
- **THEN** draft place (if any) is removed from display
- **THEN** tool mode returns to "select"
- **THEN** reset proceeds normally

### Requirement: Reset preserves application state
The system SHALL maintain viewport and UI state when resetting.

#### Scenario: Viewport preserved after reset
- **WHEN** user is at specific zoom level and pan position
- **WHEN** user resets the drawing
- **THEN** viewport zoom and pan position remain unchanged
- **THEN** user sees empty canvas at same view location

#### Scenario: Tool mode preserved after reset
- **WHEN** user is in "select" tool mode
- **WHEN** user resets the drawing
- **THEN** tool mode remains "select"

### Requirement: Reset records transformation history
The system SHALL record the reset action in transformation log.

#### Scenario: Reset transformation recorded
- **WHEN** user confirms reset
- **THEN** system records transformation with kind "resetDrawing"
- **THEN** transformation payload includes place count and timestamp
- **THEN** transformation appears in history list

#### Scenario: All previous transformations preserved
- **WHEN** drawing has existing transformation history
- **WHEN** user resets the drawing
- **THEN** all previous transformation entries remain in history
- **THEN** "resetDrawing" entry is appended to history

### Requirement: Reset deletes all places via soft delete
The system SHALL use soft delete mechanism consistent with individual place deletion.

#### Scenario: All places marked as deleted
- **WHEN** drawing contains N places
- **WHEN** user confirms reset
- **THEN** all N places have isDeleted flag set to true
- **THEN** places remain in database but filtered from queries

#### Scenario: Reset with no places has no effect
- **WHEN** drawing is already empty (no places)
- **WHEN** user confirms reset
- **THEN** system records "resetDrawing" transformation with placeCount: 0
- **THEN** no place update operations occur

### Requirement: Reset button is enabled
The system SHALL make "Reset Drawing" button interactive.

#### Scenario: Button is clickable
- **WHEN** inspector renders
- **THEN** "Reset Drawing" button is enabled (not disabled)
- **THEN** button responds to click events
