# Code Changes Reference

## JavaScript Changes Summary

### 1. fetchSetupGuide() — Parse New Fields

```javascript
// Line ~145 in brand-settings.js
// BEFORE:
const guide = {
  id: result.id,
  brand_id: result.brand_id,
  steps: (result.steps || []).map(step => ({
    order: step.order || 0,
    title: step.title || '',
    content: step.content || '',
    requires_credentials: step.requires_credentials || false,
    allow_credential_test: step.allow_credential_test || false,
    credential_fields: step.credential_fields || []
  })),
  helpFields: result.help_fields || {}
};

// AFTER:
const guide = {
  id: result.id,
  brand_id: result.brand_id,
  steps: (result.steps || []).map(step => ({
    order: step.order || 0,
    title: step.title || '',
    content: step.content || '',
    step_type: step.step_type || 'info',                    // ← NEW
    requires_credentials: step.requires_credentials || false,
    allow_credential_test: step.allow_credential_test || false,
    allow_device_test: step.allow_device_test || false,     // ← NEW
    device_test_label: step.device_test_label || 'Test Connection',  // ← NEW
    device_test_help: step.device_test_help || '',          // ← NEW
    credential_fields: step.credential_fields || []
  })),
  helpFields: result.help_fields || {}
};
```

---

### 2. showSetupWizardStep() — Update Button Visibility

```javascript
// Line ~316 in brand-settings.js
// BEFORE:
if (testBtn) testBtn.style.display = step.allow_credential_test ? 'block' : 'none';

// AFTER:
if (testBtn) testBtn.style.display = (step.allow_device_test || step.allow_credential_test) ? 'block' : 'none';
```

---

### 3. renderCredentialsForm() — Add Device Test Section

```javascript
// Line ~327 in brand-settings.js
// BEFORE: (function ended here)
    container.appendChild(fieldset);
  }

// AFTER:
    container.appendChild(fieldset);

    // Add device test section if available (NEW)
    if (step.allow_device_test || step.allow_credential_test) {
      renderDeviceTestSection(step, container);
    }
  }
```

---

### 4. renderDeviceTestSection() — NEW FUNCTION

```javascript
// Lines ~447-525 in brand-settings.js
// Completely new function added
function renderDeviceTestSection(step, container) {
  const section = document.createElement('div');
  section.className = 'wizard-device-test-section';
  section.id = 'wizardDeviceTestSection';

  // Heading
  const heading = document.createElement('h3');
  heading.className = 'device-test-heading';
  heading.textContent = '📋 ' + (window._i18nMsg?.['brandSettings.modal.optionalDeviceTest'] || 'Optional: Test Device Connection');
  section.appendChild(heading);

  // Help text
  if (step.device_test_help) {
    const help = document.createElement('p');
    help.className = 'device-test-help';
    help.textContent = step.device_test_help;
    section.appendChild(help);
  }

  // Checkbox and test button container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'device-test-controls';

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'wizardDeviceTestCheckbox';
  checkbox.className = 'device-test-checkbox';
  
  const checkboxLabel = document.createElement('label');
  checkboxLabel.htmlFor = 'wizardDeviceTestCheckbox';
  checkboxLabel.className = 'device-test-label';
  checkboxLabel.textContent = window._i18nMsg?.['brandSettings.modal.attemptDeviceTest'] || 'Attempt to connect with this key';

  controlsContainer.appendChild(checkbox);
  controlsContainer.appendChild(checkboxLabel);
  section.appendChild(controlsContainer);

  // Test button
  const testButton = document.createElement('button');
  testButton.type = 'button';
  testButton.id = 'wizardDeviceTestButton';
  testButton.className = 'btn-secondary btn-device-test';
  testButton.textContent = step.device_test_label || window._i18nMsg?.['brandSettings.modal.testConnection'] || 'Test Connection';
  testButton.disabled = true; // Disabled until checkbox is checked

  // Enable/disable button based on checkbox
  checkbox.addEventListener('change', () => {
    testButton.disabled = !checkbox.checked;
  });

  // Test button click handler
  testButton.addEventListener('click', () => {
    testDeviceConnection(step);
  });

  controlsContainer.appendChild(testButton);

  // Results container
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'wizardDeviceTestResults';
  resultsContainer.className = 'device-test-results';
  resultsContainer.style.display = 'none';
  section.appendChild(resultsContainer);

  container.appendChild(section);
}
```

---

### 5. testDeviceConnection() — NEW FUNCTION

```javascript
// Lines ~527-620 in brand-settings.js
// Completely new function added
async function testDeviceConnection(step) {
  const checkbox = document.getElementById('wizardDeviceTestCheckbox');
  const button = document.getElementById('wizardDeviceTestButton');
  const resultsContainer = document.getElementById('wizardDeviceTestResults');
  
  if (!checkbox.checked) return;

  // Validate credentials first
  const missingFields = step.credential_fields.filter(
    field => !setupWizardState.credentials[field.id] || setupWizardState.credentials[field.id].trim() === ''
  );

  if (missingFields.length > 0) {
    const fieldNames = missingFields.map(f => f.label || f.id).join(', ');
    showToast(window._i18nMsg?.['brandSettings.validation.fillAllFields'] || `Please fill in: ${fieldNames}`);
    return;
  }

  // Update button state
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = window._i18nMsg?.['brandSettings.modal.testing'] || 'Testing...';

  try {
    // Build credentials payload
    const credentialsPayload = {};
    step.credential_fields.forEach(field => {
      credentialsPayload[field.id] = setupWizardState.credentials[field.id];
    });

    const result = await apiRequest('POST', `/auth/brand/${encodeURIComponent(setupWizardState.brandId)}/test`, {
      credentials: credentialsPayload,
      auth_type: getBrandMeta(setupWizardState.brandId)?.authentication_type || 'unknown'
    });

    // Render results
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';

    if (result && (result.is_valid || result.is_connected)) {
      // Success
      const successDiv = document.createElement('div');
      successDiv.className = 'device-test-success';
      
      const message = result.message || result.is_connected
        ? `✅ ${window._i18nMsg?.['brandSettings.modal.connectionSuccess'] || 'Connected successfully!'}`
        : `✅ ${result.message || 'Credentials verified!'}`;
      
      successDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;

      if (result.device_count !== undefined && result.device_count > 0) {
        const deviceList = document.createElement('ul');
        deviceList.className = 'device-list';
        
        if (Array.isArray(result.devices)) {
          result.devices.forEach(device => {
            const li = document.createElement('li');
            li.textContent = `${escapeHtml(device.name || device.id)} (${device.status || 'unknown'})`;
            deviceList.appendChild(li);
          });
        }
        
        successDiv.appendChild(deviceList);
      }

      resultsContainer.appendChild(successDiv);
    } else {
      // Failure
      const errorDiv = document.createElement('div');
      errorDiv.className = 'device-test-error';
      
      const error = result?.error || window._i18nMsg?.['brandSettings.error.testFailed'] || 'Connection test failed';
      const suggestion = result?.suggestion || '';
      
      errorDiv.innerHTML = `<p>❌ ${escapeHtml(error)}</p>`;
      if (suggestion) {
        errorDiv.innerHTML += `<p class="test-suggestion">${escapeHtml(suggestion)}</p>`;
      }
      
      resultsContainer.appendChild(errorDiv);
    }
  } catch (error) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'device-test-error';
    errorDiv.innerHTML = `<p>❌ ${escapeHtml(window._i18nMsg?.['brandSettings.error.testFailed'] || 'Test failed')}: ${escapeHtml(error.message)}</p>`;
    
    resultsContainer.appendChild(errorDiv);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}
```

---

## CSS Changes Summary

### Added to brand-settings.css (Lines ~169-270)

```css
/* Device Test Section (NEW) */
.wizard-device-test-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
}

.device-test-heading {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #374151;
}

.device-test-help {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #6b7280;
    line-height: 1.4;
}

.device-test-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
}

.device-test-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
}

.device-test-label {
    display: inline;
    font-size: 0.9rem;
    color: #374151;
    cursor: pointer;
    flex-grow: 1;
    margin: 0;
}

.btn-device-test {
    flex-shrink: 0;
    padding: 0.45rem 1rem;
    font-size: 0.875rem;
}

.btn-device-test:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.device-test-results {
    margin-top: 1rem;
    padding: 0.875rem 1rem;
    border-radius: 8px;
    border-left: 4px solid;
    font-size: 0.9rem;
    line-height: 1.5;
}

.device-test-success {
    background: #f0fdf4;
    border-left-color: #22c55e;
    color: #166534;
}

.device-test-success p {
    margin: 0 0 0.5rem;
}

.device-test-success p:last-child {
    margin-bottom: 0;
}

.device-test-error {
    background: #fef2f2;
    border-left-color: #ef4444;
    color: #7f1d1d;
}

.device-test-error p {
    margin: 0 0 0.5rem;
}

.device-test-error p:last-child {
    margin-bottom: 0;
}

.test-suggestion {
    font-size: 0.85rem;
    color: #b91c1c;
    font-style: italic;
}

.device-list {
    margin: 0.5rem 0 0;
    padding-left: 1.25rem;
    list-style-type: disc;
}

.device-list li {
    margin: 0.25rem 0;
    font-size: 0.9rem;
}
```

---

## HTML (No Changes Needed)

The existing HTML structure in `/templates/pages/brand-settings.html` at lines 125-175 works as-is:

```html
<div id="setupWizardModal" class="modal" style="display:none">
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="setupWizardTitle">
        <div class="modal-header">
            <button type="button" class="close" data-close-modal="setupWizardModal">&times;</button>
            <h2 id="setupWizardTitle">Setup Guide</h2>
            <p id="setupWizardProgress" class="modal-progress">Step 1 of 5</p>
        </div>
        <div class="modal-body">
            <p id="setupWizardContent" class="wizard-step-content"></p>
            <div id="setupWizardCredentials" class="wizard-credentials-section"></div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-secondary" data-wizard-action="back">Back</button>
            <button type="button" class="btn-secondary" data-wizard-action="next">Next</button>
            <button type="button" class="btn-primary" data-wizard-action="test">Test Credentials</button>
            <button type="button" class="btn-primary" data-wizard-action="save">Save & Connect</button>
        </div>
    </div>
</div>
```

The device test section is dynamically rendered into `#setupWizardCredentials` by JavaScript.

---

## Summary of Line Counts

| Component | Lines | Type |
|-----------|-------|------|
| fetchSetupGuide() enhancement | ~15 | Modified |
| Button visibility update | ~5 | Modified |
| renderDeviceTestSection() | ~80 | New |
| testDeviceConnection() | ~95 | New |
| CSS styling | ~105 | New |
| **Total additions** | **~300** | — |
| **Files modified** | **2** | — |

---

## Verification

All changes are:
- ✅ Backward compatible
- ✅ Non-breaking
- ✅ Follow existing code style
- ✅ Use existing utilities (escapeHtml, showToast, apiRequest, etc.)
- ✅ Support i18n localization
- ✅ Responsive and accessible

