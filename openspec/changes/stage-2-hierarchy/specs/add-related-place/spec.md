## ADDED Requirements

### Requirement: User can enter "add related place" mode
The system SHALL provide a mechanism for users to enter a mode for adding a place with an explicit parent relationship.

#### Scenario: Enter mode with parent selected
- **WHEN** user has a place selected and activates "Add Related Place" control
- **THEN** system enters "add related place" tool mode
- **THEN** selected place becomes the designated parent for next place creation

#### Scenario: Attempt to enter mode without parent selected
- **WHEN** user activates "Add Related Place" control without any place selected
- **THEN** system shows guidance indicating parent must be selected first
- **THEN** tool mode does NOT change to "add related place"

### Requirement: User can create a place with parent relationship
The system SHALL allow users to create a new place that references an existing place as its parent.

#### Scenario: Create related place via canvas click
- **WHEN** user is in "add related place" mode
- **WHEN** user clicks on canvas at coordinates (x, y)
- **THEN** system stages a new place at (x, y) with parentPlaceId set to selected parent's ID
- **THEN** system switches tool mode back to "select"
- **THEN** newly staged place becomes selected

#### Scenario: Related place staging preserves parent reference
- **WHEN** user stages a related place with parent P
- **THEN** pending transformation SHALL include parentPlaceId field set to P's ID
- **THEN** parent reference persists through commit

### Requirement: User can commit related place creation
The system SHALL persist related place creation through the standard commit workflow.

#### Scenario: Commit staged related place
- **WHEN** user has a staged related place with parentPlaceId = P
- **WHEN** user commits the pending transformation
- **THEN** system inserts place record with parentPlaceId = P
- **THEN** system records transformation with kind "addRelatedPlace"
- **THEN** transformation payload includes placeId, parentPlaceId, x, and y
- **THEN** pending transformation is cleared

### Requirement: User can reject related place creation
The system SHALL allow users to cancel staged related place creation.

#### Scenario: Reject staged related place
- **WHEN** user has a staged related place
- **WHEN** user rejects the pending transformation
- **THEN** system removes the draft place from display
- **THEN** system clears pending transformation state
- **THEN** tool mode returns to "select"
- **THEN** no place is created in persistence

### Requirement: Related place creation preserves existing free place workflow
The system SHALL maintain all existing "add place" functionality unchanged.

#### Scenario: Free place creation still works
- **WHEN** user enters "add place" mode (not "add related place")
- **WHEN** user clicks canvas at (x, y)
- **THEN** system creates place with parentPlaceId = null
- **THEN** transformation kind is "addPlace" (not "addRelatedPlace")
