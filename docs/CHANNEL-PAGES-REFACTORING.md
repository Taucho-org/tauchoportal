# Channel Pages Refactoring

## Overview

The unified `channels.gohtml` page (1730 lines) has been split into 4 separate, focused templates with independent routing. This change improves maintainability, browser history handling, and code organization.

## Route Structure

### Before
All URLs loaded `channels.gohtml` and manipulated DOM via JavaScript to show/hide views:
- `/channels` → channel list
- `/channels/{channel_id}` → channel detail (via JavaScript)
- `/channels/{channel_id}/conditions` → conditions list (via JavaScript)
- `/channels/{channel_id}/conditions/{condition_id}/logic` → condition logic editor (not working)

### After
Each URL loads its own template:

| Route | Template | JS Module | Purpose |
|-------|----------|-----------|---------|
| `/channels` | `channels.gohtml` | `channels-list.js` | List all watched channels |
| `/channels/{channel_id}` | `channel.gohtml` | `channel-detail.js` | View channel details & conditions preview |
| `/channels/{channel_id}/conditions` | `conditions.gohtml` | `conditions-list.js` | Manage conditions for a channel |
| `/channels/{channel_id}/conditions/{condition_id}` | `condition-logic.gohtml` | `condition-logic.js` | Edit condition logic (device actions, events) |

## File Structure

### Templates (`pages/`)
- **channels.gohtml** - Channel list page (full layout + sidebar + list-specific modals)
- **channel.gohtml** - Channel detail page (same layout + sidebar + detail-specific modals)
- **conditions.gohtml** - Conditions list page (same layout + sidebar + conditions-specific modals)
- **condition-logic.gohtml** - Condition logic editor (same layout + sidebar + condition modals)

All templates include:
- Sidebar with add-channel accordion (common to all pages)
- Shared modals: confirmDrawer, filterModal, conditionModal, testConditionModal
- Toast container for notifications

### JavaScript (`public/js/`)

#### Shared Utilities
- **channels-shared.js** - Common functions and data:
  - Modal functions: `openModal()`, `closeModal()`
  - Toast: `showMonToast()`
  - API helpers: `apiRequest()`, `apiGet()`
  - Event data: `PLATFORM_EVENTS`, `EVENT_PARAMETERS`, `PLATFORM_META`, `PRODUCTS`
  - Utilities: `getEventLabel()`, `buildTestEvent()`, `escHtml()`, `formatDate()`, `formatDateTime()`, `hasActiveFilter()`

- **channels-sidebar.js** - Sidebar accordion management:
  - `renderAccordionList()` - Populate platform list from API
  - Async platform search/channel discovery
  - `setExistingChannels()` - Track already-added channels
  - Confirm drawer for adding new channels

#### Page-Specific Modules
- **channels-list.js** - Channel list page:
  - `loadWatches()` - Fetch all channels
  - `renderChannelListView()` - Render channel cards
  - `toggleChannel()`, `deleteChannel()` - Channel management
  - `openFilterModal()`, `saveFilter()` - Stream filtering

- **channel-detail.js** - Channel detail page:
  - `loadWatches()`, `loadConditions()` - Data loading
  - `renderChannelDetailView()` - Render full channel info + conditions preview
  - Display name editing
  - Toggle active/paused state
  - Delete channel
  - Test all conditions for this channel

- **conditions-list.js** - Conditions list page:
  - `loadConditions()` - Fetch conditions for a channel
  - `renderConditionsView()` - Render conditions cards
  - `renderCondCard()` - Individual condition card rendering
  - Condition CRUD: add, edit, delete, toggle enabled/disabled
  - `openAddConditionModal()`, `openEditConditionModal()`, `saveCondition()`
  - `toggleCondition()`, `deleteCondition()`
  - Test single condition: `openTestConditionModal()`, `runConditionTest()`
  - Device action management

- **condition-logic.js** - Condition logic editor page:
  - Auto-load condition from URL (`/channels/{channel_id}/conditions/{condition_id}`)
  - Edit condition logic (device actions, trigger events)
  - Device-action specific UI for each platform
  - Save/update condition logic
  - Test condition with event simulation

## Routing Logic (`cmd/main.go`)

URL path parsing in `ServeHTTP()`:

```go
// /channels → channels.gohtml
// /channels/{channel_id} → channel.gohtml
// /channels/{channel_id}/conditions → conditions.gohtml
// /channels/{channel_id}/conditions/{condition_id}[/logic] → condition-logic.gohtml
```

The routing extracts path segments and matches the pattern to determine which template to load.

## Navigation Flow

### Channel List Page (`/channels`)
- Displays all watched channels in a grid
- Sidebar allows adding new channels
- Click on a channel card → navigate to `/channels/{channel_id}`

### Channel Detail Page (`/channels/{channel_id}`)
- Shows channel info (name, platform, last stream time, platform ID)
- Toggle watch/pause state
- Apply stream filters
- Preview first 3 conditions (or "1 of 5 more...")
- "Manage Conditions →" button → navigate to `/channels/{channel_id}/conditions`
- "Test Conditions" button → test all conditions for this channel

### Conditions List Page (`/channels/{channel_id}/conditions`)
- List all conditions for the channel
- Each condition card shows: event type badge, name, enabled/disabled toggle
- Add new condition button → opens modal → create condition
- Edit condition card → navigate to `/channels/{channel_id}/conditions/{condition_id}`
- Delete condition → removes from list
- Test condition → opens modal → test with sample event

### Condition Logic Editor Page (`/channels/{channel_id}/conditions/{condition_id}`)
- Edit a single condition's logic (device actions, trigger events)
- Device action section shows platform-specific action options
- Save changes back to the condition
- Test condition with custom event parameters

## Benefits

1. **Clean Separation of Concerns**
   - Each template is focused on a single view
   - Reduces code complexity per file
   - Easier to understand and modify

2. **Proper Browser History**
   - Back button works as expected
   - Each page is bookmarkable
   - Browser history preserves context

3. **Better Maintainability**
   - JS modules are smaller and focused
   - Shared utilities are centralized
   - Easier to add features to specific pages without affecting others

4. **Improved SEO**
   - Each URL has its own semantic meaning
   - Proper HTTP semantics (GET for viewing, POST for adding, PATCH for updating)
   - Better for search engines and crawlers

5. **Better Performance**
   - No need to load all 3 view containers on initial page load
   - JavaScript is smaller per page
   - Sidebar is preserved across navigation (can be optimized with client-side caching)

## Shared Sidebar Behavior

The sidebar is present on all 4 pages and allows quick navigation to add new channels or switch between watched channels. The sidebar state (collapsed/expanded) should persist across page navigation (consider adding localStorage persistence for better UX).

## Migration Notes for Developers

- **No more `showView()` / hidden view containers** - Each page has its own content
- **Data passed via URL** - Channel ID and Condition ID are extracted from the URL path
- **Sidebar is reinitialized** - Each page reinitializes the sidebar with fresh data
- **Modals are shared** - All 4 pages include the same modal definitions
- **Utilities are global** - Shared JS utilities are on `window` for easy access

## Future Enhancements

1. **Sidebar persistence** - Remember collapsed/expanded state using localStorage
2. **Optimized sidebar loading** - Cache sidebar platform data to avoid re-fetching on every page
3. **Navigation links** - Breadcrumbs or back buttons for clearer navigation
4. **Condition logic improvements** - The creator mentioned the logic editor needs work; now it's isolated for easier iteration
