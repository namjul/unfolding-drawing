## ADDED Requirements

### Requirement: Deleting a parent deletes all descendants
The system SHALL recursively delete all descendant places when a parent is deleted.

#### Scenario: Delete parent with children
- **WHEN** user deletes a place that has children
- **THEN** system marks parent as deleted (isDeleted: true)
- **THEN** system marks all children as deleted
- **THEN** canvas no longer renders parent or children

#### Scenario: Delete parent with nested descendants
- **WHEN** user deletes a place with children and grandchildren
- **THEN** system recursively deletes entire subtree
- **THEN** grandchildren are deleted even though only grandparent was selected
- **THEN** all descendants removed from display and structure list

#### Scenario: Cascade delete in draft preview
- **WHEN** user stages deletion of parent place
- **THEN** draft overlay shows parent marked for deletion
- **THEN** draft overlay shows all descendants marked for deletion
- **THEN** user can reject to restore entire subtree

#### Scenario: Cascade delete on commit
- **WHEN** user commits deletion of parent with children
- **THEN** database updates all places in subtree (set isDeleted: true)
- **THEN** transformation history records parent deletion
- **THEN** descendant deletions are implied by cascade (not separate transformation entries)

### Requirement: Leaf place deletion has no cascade
The system SHALL delete only the selected place when it has no children.

#### Scenario: Delete childless place
- **WHEN** user deletes a place with no children
- **THEN** only that place is marked as deleted
- **THEN** parent (if any) and siblings remain unchanged

#### Scenario: Delete child does not affect siblings
- **WHEN** parent has multiple children
- **WHEN** user deletes one child
- **THEN** only the selected child is deleted
- **THEN** parent and other children remain unchanged
