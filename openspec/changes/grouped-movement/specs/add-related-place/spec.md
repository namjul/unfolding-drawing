## MODIFIED Requirements

### Requirement: User can create a place with parent relationship
The system SHALL allow users to create a new place that references an existing place as its parent, storing position as offset from parent.

#### Scenario: Create related place via canvas click
- **WHEN** user is in "add related place" mode
- **WHEN** user clicks on canvas at world coordinates (x, y)
- **WHEN** parent's world position is (px, py)
- **THEN** system computes offset (x - px, y - py)
- **THEN** system stages a new place with stored coordinates equal to the offset
- **THEN** system stores parentPlaceId set to selected parent's ID
- **THEN** system switches tool mode back to "select"
- **THEN** newly staged place becomes selected

#### Scenario: Related place renders at world position
- **WHEN** related place is committed with offset (dx, dy)
- **WHEN** parent's world position is (px, py)
- **THEN** place renders at world position (px + dx, py + dy)
- **THEN** relationship line connects parent world position to child world position

#### Scenario: Related place staging preserves parent reference
- **WHEN** user stages a related place with parent P
- **THEN** pending transformation SHALL include parentPlaceId field set to P's ID
- **THEN** pending transformation SHALL include offset coordinates (not world coordinates)
- **THEN** parent reference persists through commit

### Requirement: User can commit related place creation
The system SHALL persist related place creation through the standard commit workflow, storing offset coordinates.

#### Scenario: Commit staged related place
- **WHEN** user has a staged related place with parentPlaceId = P
- **WHEN** staged place has offset coordinates (dx, dy)
- **WHEN** user commits the pending transformation
- **THEN** system inserts place record with parentPlaceId = P
- **THEN** system stores coordinates (dx, dy) as offset from parent
- **THEN** system records transformation with kind "addRelatedPlace"
- **THEN** transformation payload includes placeId, parentPlaceId, and world coordinates (x, y)
- **THEN** pending transformation is cleared
