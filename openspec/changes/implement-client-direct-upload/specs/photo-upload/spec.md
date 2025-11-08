## MODIFIED Requirements
### Requirement: Photo Upload
The system SHALL provide photo upload functionality with support for unlimited file sizes through client-side direct upload to Supabase Storage.

#### Scenario: Successful small file upload (<6MB)
- **WHEN** user selects a photo file smaller than 6MB
- **AND** user provides blessing message and privacy settings
- **THEN** system SHALL upload the file directly to Supabase Storage
- **AND** system SHALL send metadata to backend API for database record
- **AND** system SHALL display upload progress
- **AND** system SHALL show success message upon completion

#### Scenario: Successful large file upload (>=6MB)
- **WHEN** user selects a photo file 6MB or larger
- **AND** user provides blessing message and privacy settings
- **THEN** system SHALL use Resumable Upload to transfer file to Supabase Storage
- **AND** system SHALL send metadata to backend API for database record
- **AND** system SHALL display upload progress with resumable capability
- **AND** system SHALL show success message upon completion

#### Scenario: Upload progress tracking
- **WHEN** file upload is in progress
- **THEN** system SHALL display real-time progress indicator
- **AND** system SHALL show current upload status (preparing, uploading, processing, completing)
- **AND** system SHALL allow user to cancel upload
- **AND** for large files, system SHALL support resume after network interruption

#### Scenario: Upload error handling
- **WHEN** upload fails due to network issues
- **THEN** system SHALL display appropriate error message
- **AND** for large files, system SHALL offer resume option
- **AND** system SHALL allow user to retry upload

#### Scenario: Metadata processing
- **WHEN** file upload completes successfully
- **THEN** client SHALL send file metadata (URL, filename, size) to backend API
- **AND** backend SHALL validate the metadata
- **AND** backend SHALL create database record with photo information
- **AND** backend SHALL return success response with photo details

#### Scenario: File size validation
- **WHEN** user selects photo files
- **THEN** system SHALL NOT enforce file size limits on client side
- **AND** system SHALL display file size information to user
- **AND** system SHALL indicate which upload method will be used (direct vs resumable)

#### Scenario: Security and authentication
- **WHEN** uploading directly to Supabase Storage
- **THEN** system SHALL use authenticated Supabase client
- **AND** system SHALL enforce Row Level Security policies
- **AND** system SHALL validate user authentication before upload
- **AND** system SHALL ensure user can only upload to authorized paths

#### Scenario: Multiple file upload
- **WHEN** user selects multiple photo files
- **THEN** system SHALL process each file individually
- **AND** system SHALL use appropriate upload method for each file based on size
- **AND** system SHALL display individual progress for each file
- **AND** system SHALL handle partial failures gracefully