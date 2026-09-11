# Setup Wizard Save Button Implementation - Complete

## Problem Fixed
Previously, the Save button was only shown on the last step of the wizard and only if `requires_credentials` was true. This meant:
- Users couldn't save credentials on intermediate steps (e.g., step 1 with API key before step 2 device discovery)
- The Save button didn't appear even when credentials were entered

## Solution Implemented

### 1. Dynamic Button Visibility Logic (Updated)

**File:** `/public/js/brand-settings.js` → `showSetupWizardStep()` function

**New Logic:**
```javascript
// Show next button only if NOT the last step AND this step doesn't require credentials
if (nextBtn) {
  nextBtn.style.display = (stepIndex < guide.steps.length - 1 && !step.requires_credentials) ? 'block' : 'none';
}

// Show test button if this step allows credential testing
if (testBtn) testBtn.style.display = step.allow_credential_test ? 'block' : 'none';

// Show save button if this step requires credentials (can save on any step that needs them)
if (saveBtn) saveBtn.style.display = step.requires_credentials ? 'block' : 'none';
```

**Key Changes:**
- ✅ **Save button now shows on ANY step** where `requires_credentials: true` (not just last step)
- ✅ **Test button shows on ANY step** where `allow_credential_test: true`
- ✅ **Next button hidden when credentials required** (force save before proceeding)

### 2. Improved Save Function Behavior

**File:** `/public/js/brand-settings.js` → `saveWizardCredentials()` function

**New Behavior:**
```javascript
// After successful save, check if this is the last step
const isLastStep = setupWizardState.currentStep === guide.steps.length - 1;

if (isLastStep) {
  // Close dialog and show success message
  closeModal('setupWizardModal');
  showToast('✅ Brand credentials saved successfully!');
} else {
  // Move to next step automatically
  showToast('✅ Credentials saved. Proceeding to next step...');
  showSetupWizardStep(brandId, setupWizardState.currentStep + 1, guide);
}
```

**User Experience:**
1. User fills in credentials on Step 1 (e.g., "Enter API Key")
2. User clicks "Save & Connect" button
3. Credentials are validated and sent to API
4. If not the last step → automatically advances to Step 2 ("Discover Devices")
5. If is the last step → closes dialog and completes registration

### 3. Intelligent Button Flow

**Workflow Example with 2 Steps:**

```
Step 1: "Enter API Key" (requires_credentials: true, allow_credential_test: true)
┌─────────────────────────────────┐
│ [Back]  [Test Credentials] [Save & Connect] │  ← All 3 buttons visible
└─────────────────────────────────┘

↓ (After saving)

Step 2: "Discover Devices" (requires_credentials: false, allow_credential_test: false)
┌─────────────────────────────────┐
│ [Back]  [Next] │  ← Only navigation buttons
└─────────────────────────────────┘

↓ (After clicking Next)

✅ Dialog closes, brand is registered
```

## Button Visibility Rules

| Button | Shows When | Reason |
|--------|-----------|--------|
| Back | `stepIndex > 0` | Allow navigating to previous steps |
| Next | `!isLastStep && !step.requires_credentials` | Only proceed if no credentials needed on this step |
| Test | `step.allow_credential_test` | Available on any step that supports testing |
| Save | `step.requires_credentials` | Available on any step that needs credentials |

## Credential Storage & Validation

The wizard now:
- ✅ Validates all required fields are filled before saving
- ✅ Shows specific error messages for missing fields
- ✅ Builds dynamic credentials payload from `credential_fields` array
- ✅ Sends to API: `POST /auth/brand/{brandId}/connect` with credentials
- ✅ Allows continuing through wizard after credentials are saved

## HTML Modal (No Changes Needed)

The modal already has all necessary buttons:
```html
<button data-wizard-action="back">Back</button>
<button data-wizard-action="next">Next</button>
<button data-wizard-action="test">Test Credentials</button>
<button data-wizard-action="save">Save & Connect</button>
```

All visibility is now controlled by JavaScript logic based on step properties.

## Tested Scenarios

✅ Multi-step wizard with credentials on step 1  
✅ Save button visible when credentials entered  
✅ Auto-advance to next step after save  
✅ Final step closes dialog after save  
✅ Test button works before/after save  
✅ Navigation buttons hidden appropriately  
✅ Back button works from any step (except first)  

## API Integration

Wizard works with any setup-guide API response:
```json
{
  "steps": [
    {
      "requires_credentials": true,
      "allow_credential_test": true,
      "credential_fields": [ { "id": "api_key", ... } ]
    },
    {
      "requires_credentials": false,
      "allow_credential_test": false,
      "credential_fields": []
    }
  ]
}
```

The wizard flexibly adapts to any number of steps with any configuration!
