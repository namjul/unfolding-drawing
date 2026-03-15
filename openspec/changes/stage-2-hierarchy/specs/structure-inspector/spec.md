## ADDED Requirements

### Requirement: Inspector displays place hierarchy as indented list
The system SHALL show place structure in the inspector with visual hierarchy indication.

#### Scenario: Display root places without indentation
- **WHEN** inspector renders places list
- **WHEN** place P has parentPlaceId = null
- **THEN** place P is displayed with zero indentation
- **THEN** place is labeled as root or top-level

#### Scenario: Display child places with indentation
- **WHEN** inspector renders places list
- **WHEN** place P has parentPlaceId = Q
- **THEN** place P is displayed with increased indentation relative to parent Q
- **THEN** place P appears below its parent Q in the list

#### Scenario: Display nested hierarchy with proportional indentation
- **WHEN** place P has parentPlaceId = Q
- **WHEN** place Q has parentPlaceId = R
- **THEN** place P is indented more than Q
- **THEN** place Q is indented more than R
- **THEN** visual nesting depth matches relationship depth

### Requirement: Inspector shows parent-child relationships clearly
The system SHALL make parent references explicit in the structure list.

#### Scenario: Show parent reference for child place
- **WHEN** inspector displays place P with parentPlaceId = Q
- **THEN** inspector shows parent's name or ID alongside place P
- **THEN** user can identify which place is the parent

#### Scenario: Show children count for parent place
- **WHEN** inspector displays place Q
- **WHEN** one or more places have parentPlaceId = Q
- **THEN** inspector shows count of direct children for place Q

### Requirement: Inspector hierarchy list is navigable
The system SHALL allow users to interact with the hierarchy structure.

#### Scenario: Select place from hierarchy list
- **WHEN** user clicks on a place entry in hierarchy list
- **THEN** system selects that place
- **THEN** canvas updates to show selection ring
- **THEN** relationship lines highlight if place has parent or children

#### Scenario: Hierarchy list reflects current selection
- **WHEN** user selects a place on canvas or via inspector
- **THEN** hierarchy list highlights the selected place entry
- **THEN** user can see selected place's position in hierarchy

### Requirement: Inspector hierarchy updates when relationships change
The system SHALL keep hierarchy view synchronized with place data.

#### Scenario: Hierarchy updates after adding related place
- **WHEN** user commits a related place creation with parent Q
- **THEN** new place appears in hierarchy list indented under parent Q
- **THEN** parent Q's children count increments

#### Scenario: Hierarchy updates after deleting child place
- **WHEN** user commits deletion of place P with parentPlaceId = Q
- **THEN** place P is removed from hierarchy list
- **THEN** parent Q's children count decrements

#### Scenario: Hierarchy updates after deleting parent place
- **WHEN** user commits deletion of place Q that has children
- **THEN** place Q is removed from hierarchy list
- **THEN** children of Q remain visible (as orphans or promoted to root)
