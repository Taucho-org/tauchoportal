# Setup Wizard Save Button - Implementation Details

## Problem
The original setup wizard didn't allow users to save credentials. The "Save & Connect" button only appeared on the last step, and in many cases not at all due to the `requires_credentials: true` condition.

## Solution: Save Button Now Always Visible When Needed

### Button Visibility Matrix

```
┌──────────────────────────────┬────────┬────────┬──────┬──────┐
│ Step Condition               │ Back   │ Next   │ Test │ Save │
├──────────────────────────────┼────────┼────────┼──────┼──────┤
│ Step 1, requires_credentials │ Hidden │ Hidden │ ✓*   │ ✓    │
│ Step 1, no credentials       │ Hidden │ ✓      │      │      │
│ Middle step, requires_creds  │ ✓      │ Hidden │ ✓*   │ ✓    │
│ Middle step, no credentials  │ ✓      │ ✓      │      │      │
│ Last step, requires_creds    │ ✓      │ Hidden │ ✓*   │ ✓    │
│ Last step, no credentials    │ ✓      │ Hidden │      │      │
└──────────────────────────────┴────────┴────────┴──────┴──────┘
* Only if allow_credential_test: true
```

### Save Flow Example

**API Response (2 Steps):**
```json
{
  "steps": [
    {
      "order": 1,
      "title": "Enter API Key",
      "content": "Provide your Govee API key...",
      "requires_credentials": true,
      "allow_credential_test": true,
      "credential_fields": [
        {
          "id": "api_key",
          "label": "Govee API Key",
          "type": "password",
          "help_key": "brand.govee.apiKeyHelp"
        }
      ]
    },
    {
      "order": 2,
      "title": "Discover Devices",
      "content": "We'll now scan for your connected devices...",
      "requires_credentials": false,
      "allow_credential_test": false,
      "credential_fields": []
    }
  ]
}
```

**User Interaction:**

```
┌─────────────────────────────────────────────────────┐
│ Setup Wizard - Step 1 of 2                          │
│ Enter API Key                                       │
├─────────────────────────────────────────────────────┤
│ Provide your Govee API key...                       │
│                                                     │
│ ┌────────────────────────────────────────────────┐ │
│ │ Govee API Key: [••••••••••••••••••••••]       │ │
│ │ Get from brand.govee.apiKeyHelp               │ │
│ └────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ [Back]  [Test Credentials]  [Save & Connect]      │
└─────────────────────────────────────────────────────┘
                ↓ User clicks "Save & Connect"
              (After validation)
                ↓
┌─────────────────────────────────────────────────────┐
│ POST /api/auth/brand/govee/connect                 │
│ {                                                  │
│   "credentials": {                                │
│     "api_key": "sk_live_abc123..."                │
│   }                                               │
│ }                                                 │
└─────────────────────────────────────────────────────┘
                ↓
           ✅ Success
                ↓
    Auto-advance to Step 2
                ↓
┌─────────────────────────────────────────────────────┐
│ Setup Wizard - Step 2 of 2                          │
│ Discover Devices                                    │
├─────────────────────────────────────────────────────┤
│ We'll now scan for your connected devices...       │
│                                                     │
│ (No credential fields on this step)                │
├─────────────────────────────────────────────────────┤
│ [Back]  [Next]                                     │
└─────────────────────────────────────────────────────┘
                ↓ User clicks "Next" (or wizard auto-completes)
                ↓
          ✅ Modal closes
     "Brand registered successfully!"
```

## Code Changes Summary

### 1. Dynamic Button Visibility
**From:** Only showed Save on last step + requires_credentials  
**To:** Shows Save on ANY step where requires_credentials: true

```javascript
// OLD (restricted to last step)
if (saveBtn) saveBtn.style.display = (isLastStep && step.requires_credentials) ? 'block' : 'none';

// NEW (shows on any step needing credentials)
if (saveBtn) saveBtn.style.display = step.requires_credentials ? 'block' : 'none';
```

### 2. Intelligent Auto-Advance
After saving, wizard checks if there are more steps:

```javascript
const isLastStep = setupWizardState.currentStep === guide.steps.length - 1;

if (isLastStep) {
  // Last step: close dialog, user is done
  closeModal('setupWizardModal');
  showToast('✅ Brand credentials saved successfully!');
} else {
  // Intermediate step: move to next step automatically
  showToast('✅ Credentials saved. Proceeding to next step...');
  showSetupWizardStep(brandId, setupWizardState.currentStep + 1, guide);
}
```

### 3. Flexible Credential Handling
The save function dynamically processes ANY credential fields defined in the API response:

```javascript
// Builds payload from credential_fields array
const credentialsPayload = {};
currentStep.credential_fields.forEach(field => {
  credentialsPayload[field.id] = setupWizardState.credentials[field.id];
});

// Sends to API
await apiRequest('POST', `/auth/brand/${encodeURIComponent(brandId)}/connect`, {
  credentials: credentialsPayload
});
```

## Key Features

✅ **Flexible:** Works with any number and type of credential fields  
✅ **Intelligent:** Shows save button exactly when needed  
✅ **User-Friendly:** Auto-advances through steps for smooth flow  
✅ **Testable:** Test and Save buttons work independently  
✅ **Forgiving:** Can save on intermediate steps, not just at the end  
✅ **Clear:** Distinct messages for saving vs proceeding  

## Test Scenarios

| Scenario | Result |
|----------|--------|
| Fill API key → Click Save → Step 1 complete | ✅ Auto-advance to Step 2 |
| Fill API key → Click Test → Test passes | ✅ Can still click Save |
| Fill API key → Click Test → Test fails | ✅ Can correct & try again |
| Fill all steps → Save on last step | ✅ Modal closes, brand registered |
| Navigate back from Step 2 to Step 1 | ✅ Credential values preserved |
| Skip test, directly save credentials | ✅ Works fine, test optional |
