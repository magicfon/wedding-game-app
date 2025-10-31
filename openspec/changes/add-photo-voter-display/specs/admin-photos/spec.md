## ADDED Requirements

### Requirement: Photo Voter Information Display
The system SHALL provide administrators with the ability to view all users who have voted for a specific photo in the photo management interface.

#### Scenario: Display voter list for photo with votes
- **WHEN** an administrator clicks on a photo in the photo management interface
- **AND** the photo has received votes
- **THEN** the system SHALL display a grid layout of all voters below the action buttons
- **AND** each voter SHALL be shown with their LINE display name and avatar image
- **AND** the voters SHALL be displayed without pagination

#### Scenario: Display empty state for photo without votes
- **WHEN** an administrator clicks on a photo in the photo management interface
- **AND** the photo has no votes
- **THEN** the system SHALL display an appropriate message indicating no votes
- **AND** the voter section SHALL still be visible but empty

#### Scenario: Handle voter avatar loading errors
- **WHEN** a voter's avatar image fails to load
- **THEN** the system SHALL display a default user icon
- **AND** the voter's display name SHALL still be visible

## MODIFIED Requirements

### Requirement: Photo Detail Modal Layout
The photo detail modal in the admin interface SHALL include a new section for displaying voter information below the action buttons.

#### Scenario: Photo detail modal with voter section
- **WHEN** an administrator opens a photo detail modal
- **THEN** the modal SHALL contain the photo, photo information, action buttons, and voter section
- **AND** the voter section SHALL be positioned below the action buttons
- **AND** the voter section SHALL use a responsive grid layout
- **AND** the layout SHALL accommodate varying numbers of voters without breaking

#### Scenario: Voter section loading state
- **WHEN** the voter information is being loaded
- **THEN** the system SHALL display a loading indicator in the voter section
- **AND** the loading state SHALL be consistent with the application's loading patterns