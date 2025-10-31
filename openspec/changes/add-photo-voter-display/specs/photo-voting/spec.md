## ADDED Requirements

### Requirement: Photo Voters API Endpoint
The system SHALL provide an API endpoint for administrators to retrieve voter information for a specific photo.

#### Scenario: Retrieve voter list for photo
- **WHEN** an administrator requests voter information for a photo ID
- **AND** the requester has valid administrator privileges
- **THEN** the system SHALL return a list of all users who voted for the photo
- **AND** each voter SHALL include their LINE display name and avatar URL
- **AND** the response SHALL include the total count of voters

#### Scenario: Handle non-existent photo
- **WHEN** an administrator requests voter information for a non-existent photo ID
- **THEN** the system SHALL return an appropriate error response
- **AND** the response SHALL indicate that the photo was not found

#### Scenario: Handle unauthorized access
- **WHEN** a non-administrator user requests voter information
- **THEN** the system SHALL return an authorization error
- **AND** the response SHALL indicate that administrator privileges are required

#### Scenario: Handle photo with no votes
- **WHEN** an administrator requests voter information for a photo with no votes
- **THEN** the system SHALL return an empty voter list
- **AND** the response SHALL indicate zero total voters

## MODIFIED Requirements

### Requirement: Vote Data Structure
The vote information SHALL include user profile data for display in the admin interface.

#### Scenario: Vote data with user information
- **WHEN** retrieving vote information for admin display
- **THEN** the system SHALL join votes table with users table
- **AND** each vote record SHALL include voter's display name and avatar URL
- **AND** the data SHALL be structured for efficient frontend rendering