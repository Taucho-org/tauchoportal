# Device and Device Group Relationship Analysis

## Current Implementation Status: ✅ FULLY IMPLEMENTED

Device grouping functionality is **complete and operational** in the current codebase. The feature was not lost.

---

## Architecture Overview

### Data Model Flow
```
User has Multiple Devices
    ↓
Each Device has device_group_id field (nullable)
    ↓
Device Groups are created via API (/device-groups endpoints)
    ↓
Devices are assigned to Groups (GroupKey matching for compatibility)
    ↓
Frontend displays Multi-Device Groups + Standalone Devices
```

---

## Backend Data Model

### Device Structure
**File:** `internal/controller/devices.go`

```go
type Device struct {
    Id               string            `json:"id"`
    UserId           int               `json:"user_id"`
    Name             string            `json:"name"`
    Brand            string            `json:"brand"`
    ProductId        string            `json:"product_id"`
    ProductName      string            `json:"product_name"`
    Room             string            `json:"room"`
    IsConfigured     bool              `json:"is_configured"`
    Status           string            `json:"status"`
    DeviceIdentifier map[string]string `json:"device_identifier"`
    DeviceGroupId    string            `json:"device_group_id"`  // ← KEY FIELD
    SupportedActions []string          `json:"supported_actions"`
    CreatedAt        string            `json:"created_at"`
    UpdatedAt        string            `json:"updated_at"`
}
```

### DeviceGroup Structure
**File:** `internal/controller/devicegroups.go`

```go
type DeviceGroup struct {
    Id        string `json:"id"`
    UserId    int    `json:"user_id"`
    Name      string `json:"name"`
    Option    string `json:"option"`         // "sequential" | "queue"
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
}

type DeviceGroupWithDevices struct {
    Id        string   `json:"id"`
    UserId    int      `json:"user_id"`
    Name      string   `json:"name"`
    Option    string   `json:"option"`      // Trigger mode: sequential (fire one-by-one) or queue (rotate devices)
    CreatedAt string   `json:"created_at"`
    UpdatedAt string   `json:"updated_at"`
    Devices   []Device `json:"devices"`     // Devices in this group
}
```

### Template Data Structure
**File:** `internal/controller/template.go`

```go
type DeviceForTemplate struct {
    // ... (other fields)
    DeviceGroupID  string
    GroupKey       string         // Compatibility key: "{brand}|{sorted_actions}"
    Groupable      bool           // True if 2+ devices share same GroupKey
}

type DeviceGroupForTemplate struct {
    ID      string                 // Group ID
    Name    string                 // Group name
    Option  string                 // "sequential" | "queue"
    Devices []DeviceForTemplate    // Member devices
    GroupKey string                // Compatibility key of group's devices
    CanAddMore bool                // True if compatible devices exist outside group
}
```

---

## GroupKey System (Device Compatibility)

### How GroupKey Works
**File:** `internal/controller/template.go`

```go
func deviceGroupKey(brand string, supportedActions []string) string {
    // Creates: "{brand}|{sorted_actions}"
    // Example: "philips_hue|brightness,color,power"
}
```

**Purpose:** 
- Devices can only be grouped if they have the **same brand** AND **same supported actions**
- Ensures a single API call can trigger the same action on all group members
- Prevents incompatible devices (e.g., light + lock) from being in same group

**Example:**
- Device A: Philips Hue, actions: [power, brightness, color] → GroupKey: "philips_hue|brightness,color,power"
- Device B: Philips Hue, actions: [power, brightness, color] → GroupKey: "philips_hue|brightness,color,power"
- Device C: TP-Link Kasa, actions: [power] → GroupKey: "tp_link_kasa|power"
- ✓ Devices A & B can be grouped together
- ✗ Device C cannot join group A+B (different GroupKey)

---

## Display Logic: "Grouping by Default"

### SplitDevicesForDisplay Function
**File:** `internal/controller/template.go` (lines 451-475)

Every device conceptually owns an **implicit single-device group**.

**Display Rules:**
1. Groups with **2+ members** → Shown as explicit groups (`.MultiDeviceGroups`)
2. Groups with **1 member** → Shown as standalone device (`.StandaloneDevices`)
3. Ungrouped devices → Shown as standalone devices

**Result:**
- User sees devices organized by actual groupings
- "Grouping by default" is transparent to UI

**Data Passed to Template:**
```go
data.MultiDeviceGroups      // Groups with 2+ devices (from GroupKey)
data.StandaloneDevices      // Single devices + ungrouped devices
```

---

## API Endpoints (Backend)

### Device Group Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/device-groups` | GET | List all groups for user |
| `/device-groups/get?id={id}` | GET | Get group with member devices |
| `/device-groups` | POST | Create new group |
| `/device-groups/update?id={id}` | PATCH | Update group name/option |
| `/device-groups?id={id}` | DELETE | Delete group (devices stay, ungrouped) |
| `/device-groups/assign?device_id={}&group_id={}` | POST | Assign device to group |
| `/device-groups/remove?device_id={}` | POST | Remove device from group |

---

## Frontend Implementation

### Key JavaScript Functions
**File:** `public/js/devices.js`

#### State Management
```javascript
const deviceGroupState = new Map()      // Maps device_id → device_group_id
const deviceKeyState = new Map()        // Maps device_id → group_key
```

#### Group Operations
```javascript
function deviceGroupKey(brand, supportedActions)     // Compute GroupKey
function getGroupById(groupId)                       // Fetch group by ID
function groupMembers(groupId)                       // Get devices in group
function isVisibleGroup(groupId)                     // Check if 2+ member group
function groupKeyOf(groupId)                         // Get GroupKey of group

async function createDeviceGroup(name, option)       // Create new group
async function assignDeviceToGroup(deviceId, groupId) // Add device to group
async function removeFromGroup(deviceId)             // Remove device from group
async function ungroupGroup(groupId)                 // Delete group
async function tidyGroupAfterLeave(groupId)          // Cleanup empty groups

function openGroupModal(groupId, initialDeviceId)    // Edit group
function closeGroupModal()                           // Close modal
function renderGroupDeviceList(groupId, initialDeviceId) // Render member list
async function saveGroup(e)                          // Save group changes
```

### Trigger Modes (Option Field)

**Sequential Mode** 🎉
- All devices fire **one after another**
- Like "party poppers": pop, pop, pop in sequence
- Good for: Lights (blink in sequence), Confetti cannons

**Queue Mode** 🎟️
- Devices serve viewers **in rotation**
- Each viewer uses one device, then passes to next device
- Good for: Limited resources (confetti cannons with ammo), rotating displays

---

## HTML Template Structure

### Devices Page Layout
**File:** `templates/pages/devices.html`

```html
<!-- Connected Brands Section -->
<div class="brand-status-widget">...</div>

<!-- Quick Connect Section -->
<div class="quick-connect">...</div>

<!-- Multi-Device Groups Section (2+ member groups) -->
<div class="device-groups" id="deviceGroups">
    <!-- Each DeviceGroupForTemplate becomes a <section class="device-group"> -->
    <!-- Shows group name, option badge, member devices, "Add More" button -->
</div>

<!-- Standalone Devices Section (single-device implicit groups + ungrouped) -->
<div class="devices-list" id="devicesList">
    <!-- Each StandaloneDevice becomes a device-card -->
    <!-- Can have "Group" button if Groupable=true -->
</div>

<!-- Add Device Modal -->
<div id="deviceModal">...</div>

<!-- Edit Group Modal -->
<div id="groupModal">...</div>
```

### Device Card Rendering
**File:** `templates/pages/devices.html` (lines 265-330)

Device card shows:
- Device name, product name, room
- Status badge (online/offline)
- Supported actions (up to 5 chips)
- Action buttons: Test, Edit, Delete, [Group] (if groupable)
- In-group badge if `InGroup=true`

---

## Current State: Frontend → Backend Sync

### Device Save Flow (Adding a Device)
1. User fills form in "Add Device" modal
2. Frontend calls `selectProduct()` → `showStep(2)` to configure
3. User configures device → calls `saveDevice()`
4. **GroupKey is computed** → Determines if device is groupable
5. Device saved → UI updated with new device
6. Standalone devices re-rendered → "Group" button appears if 2+ same GroupKey

### Device Edit Flow
```javascript
async function openEditModal(devId) {
    // Load existing device
    // Show device details in modal (name, room, etc.)
    // User edits → saveDevice()
    // Backend returns updated Device
    // deviceGroupState & deviceKeyState updated
    // UI re-renders
}
```

### Group Operations Flow
```javascript
async function openGroupModal(groupId) {
    // Load group details
    // Render compatible devices (filter by GroupKey)
    // Show current group members with checkmarks
    // User checks/unchecks devices
    
async function saveGroup() {
    // Update group name/option
    // Assign/remove devices as needed
    // Call /device-groups/assign and /device-groups/remove
    // Re-fetch device groups data
    // UI updates automatically
}
```

---

## CSS Styling

### Device Groups
- `.device-groups` - Container for multi-member groups
- `.device-group` - Single group section
- `.device-group-header` - Group title + actions
- `.device-group-title` - Name + option badge
- `.device-group-actions` - Manage/Delete buttons
- `.group-option-badge` - "Sequential" or "Queue" badge
- `.devices-list.group-devices-list` - Horizontal device list

### Group Modal
- `.group-device-list` - Device selection checklist
- `.group-device-search` - Search box for devices
- `.group-compat-note` - Compatibility warning
- `.group-move-note` - "Devices will move out of old group" notice

---

## Key Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Create device groups | ✅ | Modal form with name + trigger mode |
| Edit group name/option | ✅ | Click "Manage" button on group |
| Assign devices to group | ✅ | Select from compatible devices |
| Remove device from group | ✅ | Uncheck in group modal |
| Delete group | ✅ | Group becomes ungrouped devices |
| Sequential trigger mode | ✅ | Fire one-by-one (party popper style) |
| Queue trigger mode | ✅ | Rotate devices (each viewer uses one) |
| GroupKey compatibility | ✅ | Brand + actions must match |
| Display grouping by default | ✅ | 2+ device groups shown, single shown as device |
| Groupable indicator | ✅ | Shows "Group" button if 2+ same GroupKey |
| Add devices to existing group | ✅ | "Add Devices" button in group |
| Compatibility checking | ✅ | Warns if devices have different actions |
| Group migration notices | ✅ | "Moving device out of old group" |

---

## Conclusion

Device grouping is **NOT lost**. It's fully implemented across:
- ✅ Backend API (device-groups endpoints)
- ✅ Data model (device_group_id field)
- ✅ Frontend logic (JS state management)
- ✅ UI templates (modal, device cards, group sections)
- ✅ Styling (CSS for groups and modals)
- ✅ i18n translations (30+ group-related keys)

All integration points are present and working.
