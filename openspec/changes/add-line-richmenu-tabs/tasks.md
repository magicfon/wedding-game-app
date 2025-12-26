# Implementation Tasks

## 1. Database Setup
- [ ] 1.1 Create `database/add-line-richmenu-tables.sql` migration file
- [ ] 1.2 Create `line_richmenu_settings` table for global Rich Menu settings
- [ ] 1.3 Create `line_richmenu_user_states` table for user tab states
- [ ] 1.4 Create `line_richmenu_registry` table for Rich Menu ID tracking
- [ ] 1.5 Insert default settings into `line_richmenu_settings`
- [ ] 1.6 Test database schema creation

## 2. Backend API - Rich Menu Settings
- [ ] 2.1 Create `src/app/api/admin/richmenu/settings/route.ts`
- [ ] 2.2 Implement GET endpoint to retrieve Rich Menu settings
- [ ] 2.3 Implement POST endpoint to update Rich Menu settings
- [ ] 2.4 Add validation for tab enable/disable status
- [ ] 2.5 Add validation for default tab setting
- [ ] 2.6 Test API endpoints with Postman or curl

## 3. Backend API - Rich Menu Switching
- [ ] 3.1 Create `src/app/api/line/richmenu/switch/route.ts`
- [ ] 3.2 Implement tab switching logic
- [ ] 3.3 Add check for tab enable/disable status
- [ ] 3.4 Handle disabled tab scenario (return unavailable Rich Menu)
- [ ] 3.5 Update user tab state in database
- [ ] 3.6 Call LINE API to switch Rich Menu for user
- [ ] 3.7 Test tab switching with enabled tabs
- [ ] 3.8 Test tab switching with disabled tabs

## 4. Backend API - Rich Menu Image Upload
- [ ] 4.1 Create `src/app/api/admin/richmenu/upload-image/route.ts`
- [ ] 4.2 Implement image validation (2500x1686px)
- [ ] 4.3 Upload image to LINE Platform
- [ ] 4.4 Update Rich Menu with new image
- [ ] 4.5 Handle upload errors with retry logic
- [ ] 4.6 Test image upload with valid images
- [ ] 4.7 Test image upload with invalid dimensions

## 5. LINE Webhook Enhancement
- [ ] 5.1 Update `src/app/api/line/webhook/route.ts` to handle postback events
- [ ] 5.2 Add handler for `switch_tab:venue_info` postback
- [ ] 5.3 Add handler for `switch_tab:activity` postback
- [ ] 5.4 Integrate with Rich Menu switching API
- [ ] 5.5 Test postback event handling

## 6. LINE Rich Menu Setup
- [ ] 6.1 Create `src/app/api/line/setup-richmenu/route.ts`
- [ ] 6.2 Implement Rich Menu creation logic for venue_info tab
- [ ] 6.3 Implement Rich Menu creation logic for activity tab
- [ ] 6.4 Implement Rich Menu creation logic for unavailable tab
- [ ] 6.5 Configure button areas for venue_info tab (交通資訊, 菜單, 桌次, 進入遊戲分頁)
- [ ] 6.6 Configure button areas for activity tab (照片上傳, 祝福照片牆, 快問快答, 進入會場資訊分頁)
- [ ] 6.7 Configure button actions (URI for navigation, postback for tab switching)
- [ ] 6.8 Save Rich Menu IDs to database registry
- [ ] 6.9 Test Rich Menu creation

## 7. Admin UI - Rich Menu Management
- [ ] 7.1 Create `src/app/admin/richmenu/page.tsx` admin page
- [ ] 7.2 Implement settings display (default tab, tab status, Rich Menu IDs)
- [ ] 7.3 Add toggle switches for tab enable/disable
- [ ] 7.4 Add dropdown for default tab selection
- [ ] 7.5 Add image upload component for each Rich Menu
- [ ] 7.6 Implement save settings functionality
- [ ] 7.7 Add loading states and error handling
- [ ] 7.8 Test admin interface

## 8. Frontend Pages - Venue Information
- [ ] 8.1 Create `src/app/venue-info/page.tsx` main venue info page
- [ ] 8.2 Create `src/app/venue-info/transport/page.tsx` transport information page
- [ ] 8.3 Create `src/app/venue-info/menu/page.tsx` menu page
- [ ] 8.4 Create `src/app/venue-info/table/page.tsx` table assignment page
- [ ] 8.5 Implement transport information display (location, parking, public transport)
- [ ] 8.6 Implement menu display with images and descriptions
- [ ] 8.7 Implement table assignment display with search functionality
- [ ] 8.8 Add navigation between venue info sub-pages
- [ ] 8.9 Test all venue info pages in LIFF environment

## 9. Rich Menu Image Assets
- [ ] 9.1 Design venue_info Rich Menu image (2500x1686px)
- [ ] 9.2 Design activity Rich Menu image (2500x1686px)
- [ ] 9.3 Design unavailable Rich Menu image (2500x1686px) with "尚未開放" text
- [ ] 9.4 Store images in `public/richmenu-images/` directory
- [ ] 9.5 Upload images to LINE Platform via admin interface

## 10. Integration Testing
- [ ] 10.1 Test complete user flow: open Rich Menu, switch tabs, navigate to pages
- [ ] 10.2 Test admin flow: change settings, disable tabs, upload images
- [ ] 10.3 Test disabled tab scenario
- [ ] 10.4 Test default tab configuration
- [ ] 10.5 Test user state persistence across sessions
- [ ] 10.6 Test with multiple users simultaneously
- [ ] 10.7 Verify LIFF integration for all pages

## 11. Documentation
- [ ] 11.1 Update LINE_SETUP_GUIDE.md with Rich Menu tabs information
- [ ] 11.2 Create RICHMENU_SETUP_GUIDE.md with setup instructions
- [ ] 11.3 Document admin interface usage
- [ ] 11.4 Document Rich Menu image specifications
- [ ] 11.5 Update README.md with new features

## 12. Deployment
- [ ] 12.1 Run database migration on production
- [ ] 12.2 Deploy API routes to Vercel
- [ ] 12.3 Deploy admin pages to Vercel
- [ ] 12.4 Deploy venue info pages to Vercel
- [ ] 12.5 Set up Rich Menus on LINE Platform
- [ ] 12.6 Upload Rich Menu images
- [ ] 12.7 Test production environment
