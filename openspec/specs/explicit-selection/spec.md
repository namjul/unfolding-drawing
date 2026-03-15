## ADDED Requirements

### Requirement: Canvas is selectable target
The system SHALL treat canvas as an explicit selectable target distinct from "no selection".

#### Scenario: Canvas selected by default
- **WHEN** application starts with no places
- **THEN** canvas is selected
- **THEN** Selection Panel displays "Canvas selected"

#### Scenario: Select canvas by clicking empty area
- **WHEN** user clicks empty canvas area (no place hit)
- **THEN** canvas becomes selected
- **THEN** Selection Panel displays "Canvas selected"
- **THEN** any previously selected place is deselected

#### Scenario: Select place by clicking it
- **WHEN** user clicks on a place
- **THEN** that place becomes selected
- **THEN** Selection Panel displays "Place: [name or id]"
- **THEN** canvas is no longer selected

### Requirement: Selection state is always defined
The system SHALL maintain selection state at all times (never null or undefined).

#### Scenario: Selection state after place deletion
- **WHEN** user deletes the currently selected place
- **WHEN** deletion is committed
- **THEN** canvas becomes selected
- **THEN** Selection Panel displays "Canvas selected"

#### Scenario: Selection state after reset drawing
- **WHEN** user resets drawing (deletes all places)
- **THEN** canvas becomes selected
- **THEN** Selection Panel displays "Canvas selected"

### Requirement: Selection Panel displays current target
The system SHALL show current selection target in dedicated Selection Panel.

#### Scenario: Display canvas selection
- **WHEN** canvas is selected
- **THEN** Selection Panel displays text "Canvas selected"

#### Scenario: Display place selection
- **WHEN** place is selected
- **THEN** Selection Panel displays place name or ID
- **THEN** Selection Panel displays place coordinates

#### Scenario: Selection Panel shows error for missing place
- **WHEN** selected place ID does not exist (deleted elsewhere)
- **THEN** Selection Panel displays error message "Selected place not found"

### Requirement: Selection determines available transformations
The system SHALL show different transformations based on selection target.

#### Scenario: Canvas selected shows Add Place
- **WHEN** canvas is selected
- **THEN** Transformations Panel shows "Add Place" button
- **THEN** Transformations Panel does NOT show "Move Place" or "Delete Place"

#### Scenario: Place selected shows Move and Delete
- **WHEN** place is selected
- **THEN** Transformations Panel shows "Move Place" button
- **THEN** Transformations Panel shows "Delete Place" button
- **THEN** Transformations Panel does NOT show "Add Place"
