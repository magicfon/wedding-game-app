## ADDED Requirements

### Requirement: LINE Rich Menu Two-Tab System

The system SHALL provide a LINE Rich Menu with two switchable tabs for organizing wedding game features.

#### Scenario: User views venue information tab
- **WHEN** a user opens the LINE Bot Rich Menu
- **THEN** the system SHALL display the venue information tab by default (if enabled)
- **AND** the tab SHALL contain 4 buttons: 交通資訊, 菜單, 桌次, 進入遊戲分頁

#### Scenario: User switches to activity tab
- **WHEN** a user clicks the 進入遊戲分頁 button
- **THEN** the system SHALL switch the Rich Menu to the activity tab (if enabled)
- **AND** the activity tab SHALL contain 4 buttons: 照片上傳, 祝福照片牆, 快問快答, 進入會場資訊分頁

#### Scenario: User switches back to venue information tab
- **WHEN** a user clicks the 進入會場資訊分頁 button
- **THEN** the system SHALL switch the Rich Menu to the venue information tab (if enabled)

#### Scenario: User clicks navigation button
- **WHEN** a user clicks any navigation button (交通資訊, 菜單, 桌次, 照片上傳, 祝福照片牆, 快問快答)
- **THEN** the system SHALL open the corresponding LIFF page

---

### Requirement: Rich Menu Tab Enable/Disable Control

The system SHALL provide admin controls to enable or disable each Rich Menu tab independently.

#### Scenario: Admin disables activity tab
- **WHEN** an admin disables the activity tab in the admin interface
- **THEN** the system SHALL prevent users from switching to the activity tab
- **AND** users clicking 進入遊戲分頁 SHALL see the unavailable Rich Menu with a message indicating the feature is not available

#### Scenario: Admin enables previously disabled tab
- **WHEN** an admin enables a previously disabled tab
- **THEN** the system SHALL allow users to switch to that tab
- **AND** the tab SHALL display its normal content

#### Scenario: User attempts to access disabled tab
- **WHEN** a user attempts to switch to a disabled tab
- **THEN** the system SHALL display the unavailable Rich Menu
- **AND** the unavailable Rich Menu SHALL show a message indicating the feature is not yet available

---

### Requirement: Default Tab Configuration

The system SHALL allow admins to configure which tab opens by default when users access the Rich Menu.

#### Scenario: Admin sets venue info as default tab
- **WHEN** an admin sets venue information as the default tab
- **THEN** new users SHALL see the venue information tab when they first open the Rich Menu
- **AND** existing users SHALL see their current tab (not affected by default setting)

#### Scenario: Admin changes default tab
- **WHEN** an admin changes the default tab from venue information to activity
- **THEN** new users SHALL see the activity tab when they first open the Rich Menu
- **AND** existing users SHALL continue to see their previously selected tab

---

### Requirement: Rich Menu Management Interface

The system SHALL provide an admin interface for managing LINE Rich Menu settings.

#### Scenario: Admin views Rich Menu settings
- **WHEN** an admin accesses the Rich Menu management page
- **THEN** the system SHALL display current settings including default tab, tab enable/disable status, and Rich Menu IDs
- **AND** the interface SHALL allow toggling tab enable/disable status
- **AND** the interface SHALL allow changing the default tab
- **AND** the interface SHALL allow uploading Rich Menu images

#### Scenario: Admin updates Rich Menu settings
- **WHEN** an admin updates Rich Menu settings
- **THEN** the system SHALL save the settings to the database
- **AND** the system SHALL apply the changes to the LINE Platform
- **AND** the system SHALL display a success message

#### Scenario: Admin uploads Rich Menu image
- **WHEN** an admin uploads a new Rich Menu image
- **THEN** the system SHALL validate the image dimensions (2500x1686px)
- **AND** the system SHALL upload the image to the LINE Platform
- **AND** the system SHALL update the corresponding Rich Menu
- **AND** the system SHALL display a success message

---

### Requirement: Venue Information Pages

The system SHALL provide venue information pages accessible from the Rich Menu.

#### Scenario: User views transport information
- **WHEN** a user clicks the 交通資訊 button
- **THEN** the system SHALL open the transport information LIFF page
- **AND** the page SHALL display venue location, parking information, and public transportation options

#### Scenario: User views menu
- **WHEN** a user clicks the 菜單 button
- **THEN** the system SHALL open the menu LIFF page
- **AND** the page SHALL display the wedding banquet menu

#### Scenario: User views table assignment
- **WHEN** a user clicks the 桌次 button
- **THEN** the system SHALL open the table assignment LIFF page
- **AND** the system SHALL display the user's assigned table number
- **AND** the page SHALL allow searching for other guests' table assignments

---

### Requirement: Rich Menu State Persistence

The system SHALL persist each user's current Rich Menu tab state.

#### Scenario: User switches tabs
- **WHEN** a user switches from one tab to another
- **THEN** the system SHALL save the user's current tab state to the database
- **AND** the user SHALL see the same tab when they next open the Rich Menu

#### Scenario: New user opens Rich Menu
- **WHEN** a new user opens the Rich Menu for the first time
- **THEN** the system SHALL display the configured default tab
- **AND** the system SHALL save the user's tab state

---

### Requirement: Rich Menu Button Actions

The system SHALL configure Rich Menu buttons with appropriate actions.

#### Scenario: Navigation buttons use LIFF URIs
- **WHEN** a user clicks a navigation button (交通資訊, 菜單, 桌次, 照片上傳, 祝福照片牆, 快問快答)
- **THEN** the button SHALL use a URI action with a LIFF URL
- **AND** the LIFF URL SHALL open the corresponding page in the LINE app

#### Scenario: Tab switch buttons use postback
- **WHEN** a user clicks a tab switch button (進入遊戲分頁, 進入會場資訊分頁)
- **THEN** the button SHALL use a postback action
- **AND** the postback data SHALL specify the target tab
- **AND** the webhook SHALL handle the postback event to switch the Rich Menu
