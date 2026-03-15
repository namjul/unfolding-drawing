## ADDED Requirements

### Requirement: System tracks awaiting transformation target state
The system SHALL maintain state between clicking transformation button and completing it.

#### Scenario: Awaiting state starts as none
- **WHEN** application starts
- **THEN** awaiting transformation target state is "none"

#### Scenario: Awaiting add place after button click
- **WHEN** user clicks "Add Place" button
- **THEN** awaiting transformation target state becomes "addPlace"

#### Scenario: Awaiting move place after button click
- **WHEN** user clicks "Move Place" button
- **THEN** awaiting transformation target state becomes "movePlace" with place ID

#### Scenario: Awaiting cleared after transformation completed
- **WHEN** user is awaiting transformation target
- **WHEN** user clicks canvas to complete transformation
- **THEN** awaiting transformation target state returns to "none"

### Requirement: Inspector shows awaiting feedback
The system SHALL display message when awaiting transformation target.

#### Scenario: Show awaiting message
- **WHEN** awaiting transformation target state is NOT "none"
- **THEN** Transformations Panel displays "→ Click canvas to complete transformation"

#### Scenario: Hide awaiting message when none
- **WHEN** awaiting transformation target state is "none"
- **THEN** Transformations Panel does NOT display awaiting message

### Requirement: Awaiting state cleared on reject
The system SHALL clear awaiting state when user rejects pending transformation.

#### Scenario: Reject clears awaiting
- **WHEN** user has staged transformation and is awaiting next target
- **WHEN** user clicks "Reject change"
- **THEN** awaiting transformation target state returns to "none"
- **THEN** awaiting message disappears

### Requirement: Canvas click completes awaiting transformation
The system SHALL execute transformation when user clicks canvas while awaiting.

#### Scenario: Add place on canvas click while awaiting
- **WHEN** awaiting transformation target is "addPlace"
- **WHEN** user clicks canvas at (x, y)
- **THEN** add place transformation executes at (x, y)
- **THEN** awaiting state clears

#### Scenario: Move place on canvas click while awaiting
- **WHEN** awaiting transformation target is "movePlace" for place P
- **WHEN** user clicks canvas at (x, y)
- **THEN** move place transformation stages move to (x, y)
- **THEN** awaiting state clears

#### Scenario: Normal selection when not awaiting
- **WHEN** awaiting transformation target is "none"
- **WHEN** user clicks canvas
- **THEN** normal selection behavior occurs (select place or canvas)
- **THEN** no transformation is executed
