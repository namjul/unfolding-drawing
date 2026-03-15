## ADDED Requirements

### Requirement: Canvas displays selection border when selected
The system SHALL render visual border around canvas edges when canvas is selected.

#### Scenario: Border appears when canvas selected
- **WHEN** canvas becomes selected
- **THEN** red border appears around canvas edges
- **THEN** border width is 4 pixels
- **THEN** border color matches place selection ring (red)

#### Scenario: Border disappears when place selected
- **WHEN** canvas is selected (border visible)
- **WHEN** user selects a place
- **THEN** canvas border disappears
- **THEN** place selection ring appears

#### Scenario: Border reappears when canvas re-selected
- **WHEN** place is selected
- **WHEN** user clicks empty canvas area
- **THEN** canvas becomes selected
- **THEN** canvas border reappears

### Requirement: Canvas border uses screen space coordinates
The system SHALL render canvas border in screen space, not world space.

#### Scenario: Border width constant regardless of zoom
- **WHEN** canvas is selected
- **WHEN** user zooms viewport in or out
- **THEN** border width remains 4 pixels (screen space)
- **THEN** border does NOT scale with viewport zoom

#### Scenario: Border position at canvas edges
- **WHEN** canvas is selected
- **THEN** border is drawn along canvas edges
- **THEN** border is inset 2 pixels from edge (half border width)

### Requirement: Canvas border visual styling
The system SHALL style canvas border consistently with place selection.

#### Scenario: Border color matches place selection
- **WHEN** canvas border is rendered
- **THEN** border color is RGB(248, 113, 113) with full opacity
- **THEN** border color matches place selection ring color

#### Scenario: Border is solid line
- **WHEN** canvas border is rendered
- **THEN** border style is solid (not dashed or dotted)
- **THEN** border has no rounded corners

#### Scenario: Border anti-aliased
- **WHEN** canvas border is rendered
- **THEN** border is anti-aliased for smooth appearance

### Requirement: Canvas border does not interfere with interactions
The system SHALL ensure border does not block or interfere with canvas interactions.

#### Scenario: Can select places near edge
- **WHEN** canvas border is visible
- **WHEN** place is positioned near canvas edge
- **WHEN** user clicks on place
- **THEN** place is selected (border does not block hit testing)

#### Scenario: Can click canvas near edge
- **WHEN** canvas border is visible
- **WHEN** user clicks empty area near canvas edge
- **THEN** canvas remains selected (border does not prevent canvas click)
