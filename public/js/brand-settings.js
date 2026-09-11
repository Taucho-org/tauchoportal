(function () {
  // Use catalog brands directly from backend
  const BRANDS = window._allBrands || [];
  const BRAND_LOOKUP = Object.fromEntries(BRANDS.map((brand) => [brand.id, brand]));
  const BRAND_ALIASES = {
    philipshue: 'philips-hue',
    hue: 'philips-hue',
    kasa: 'tp-link-kasa',
    tplinkkasa: 'tp-link-kasa',
    tplink: 'tp-link-kasa',
    alexa: 'amazon-alexa',
    amazonalexa: 'amazon-alexa'
  };

  // Cache for setup guides (brand_id -> { steps, helpFields })
  const setupGuidesCache = new Map();
  // Track pending guide fetches to avoid duplicate requests
  const pendingGuideFetches = new Map();

  let activeApiKeyBrand = null;
  let activeLocalBrand = null;
  let pendingDisconnectBrand = null;
  let setupWizardState = { brandId: null, currentStep: 0, credentials: {} };
  let setupWizardCredentialsSaved = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeBrandId(value) {
    if (!value) return '';
    const compact = String(value).trim().toLowerCase().replace(/[\s_]/g, '').replace(/-/g, '');
    return BRAND_ALIASES[compact] || String(value).trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  }

  function getBrandMeta(brandId) {
    return BRAND_LOOKUP[normalizeBrandId(brandId)] || null;
  }

  function getBrandName(brandId) {
    const normalizedId = normalizeBrandId(brandId);
    for (const brand of BRANDS) {
      if (normalizeBrandId(brand.id) === normalizedId) {
        return brand.name || brand.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    return brandId;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
    
    // If setupWizardModal was closed and credentials were saved, reload page
    if (modalId === 'setupWizardModal' && setupWizardCredentialsSaved) {
      setupWizardCredentialsSaved = false; // Reset flag
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  }

  async function apiRequest(method, path, body) {
    const options = {
      method,
      credentials: 'include',
      headers: {}
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`/api${path}`, options);
    const contentType = response.headers.get('content-type') || '';
    const payload = response.status === 204 ? null : contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (payload && typeof payload === 'object') {
        throw new Error(payload.error || payload.message || JSON.stringify(payload));
      }
      throw new Error(payload || `${response.status}`);
    }
    return payload;
  }

  async function fetchSetupGuide(brandId) {
    const normalizedId = normalizeBrandId(brandId);
    
    // Check cache first
    if (setupGuidesCache.has(normalizedId)) {
      return setupGuidesCache.get(normalizedId);
    }

    // Check if we're already fetching this guide
    if (pendingGuideFetches.has(normalizedId)) {
      return pendingGuideFetches.get(normalizedId);
    }

    // Fetch from backend API
    const fetchPromise = (async () => {
      try {
        const lang = document.documentElement.lang || 'en';
        const result = await apiRequest('GET', `/brand/${encodeURIComponent(normalizedId)}/setup-guide?lang=${encodeURIComponent(lang)}`);
        
        // Store the full API response with new credential_fields structure
        const guide = {
          id: result.id,
          brand_id: result.brand_id,
          steps: (result.steps || []).map(step => ({
            order: step.order || 0,
            title: step.title || '',
            content: step.content || '',
            step_type: step.step_type || 'info',
            requires_credentials: step.requires_credentials || false,
            allow_credential_test: step.allow_credential_test || false,  // Deprecated, kept for compat
            allow_device_test: step.allow_device_test || false,  // NEW
            device_test_label: step.device_test_label || 'Test Connection',  // NEW
            device_test_help: step.device_test_help || '',  // NEW
            credential_fields: step.credential_fields || []
          })),
          helpFields: result.help_fields || {}
        };
        
        setupGuidesCache.set(normalizedId, guide);
        pendingGuideFetches.delete(normalizedId);
        return guide;
      } catch (error) {
        console.warn(`Failed to fetch setup guide for ${normalizedId}:`, error);
        pendingGuideFetches.delete(normalizedId);
        return null;
      }
    })();

    pendingGuideFetches.set(normalizedId, fetchPromise);
    return fetchPromise;
  }

  async function setOAuthModalContent(result, meta) {
    const link = document.getElementById('oauthLink');
    const qrContainer = document.getElementById('oauthQrContainer');
    qrContainer.innerHTML = '';

    if (result?.qr_code_data_url || result?.qr_code_url || result?.qr_code_image) {
      const img = document.createElement('img');
      img.src = result.qr_code_data_url || result.qr_code_url || result.qr_code_image;
      img.alt = `${getBrandName(meta.id)} QR Code`;
      img.style.maxWidth = '300px';
      qrContainer.appendChild(img);
    }

    const authUrl = result?.auth_url || result?.authorization_url || result?.url || '';
    link.href = authUrl || '#';
    link.style.display = authUrl ? 'inline-flex' : 'none';
  }

  async function openOAuthFlow(brand) {
    const meta = getBrandMeta(brand);
    if (!meta) return;

    try {
      await fetch(`/set-oauth-return?url=${encodeURIComponent('/brand-settings')}`, { credentials: 'include' });
      const result = await apiRequest('POST', `/auth/brand/${encodeURIComponent(meta.id)}/connect`);
      await setOAuthModalContent(result, meta);
      openModal('oauthModal');
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  function openApiKeyModal(brand) {
    const meta = getBrandMeta(brand);
    if (!meta) return;
    activeApiKeyBrand = meta;
    document.getElementById('apiKeyInput').value = '';
    openModal('apiKeyModal');
    document.getElementById('apiKeyInput').focus();
  }

  async function saveApiKey(brand, key) {
    if (!key) {
      showToast(window._i18nMsg?.['brandSettings.validation.apiKeyRequired'] || 'Please enter an API key or token.');
      return;
    }

    try {
      await apiRequest('POST', `/auth/brand/${encodeURIComponent(brand)}/connect`, {
        auth_type: 'api_key',
        credentials: {
          api_key: key
        }
      });
      closeModal('apiKeyModal');
      showToast('✅ ' + (window._i18nMsg?.['brandSettings.status.saved'] || 'Brand authentication saved.') + ' Please refresh to see updated status.');
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  function openLocalDeviceModal(brand) {
    const meta = getBrandMeta(brand);
    if (!meta) return;
    activeLocalBrand = meta;
    document.getElementById('deviceIpInput').value = '';
    document.getElementById('deviceTokenInput').value = '';
    const tokenGroup = document.getElementById('deviceTokenGroup');
    if (tokenGroup) {
      tokenGroup.style.display = meta.requiresToken ? 'block' : 'none';
    }
    openModal('localDeviceModal');
    document.getElementById('deviceIpInput').focus();
  }

  async function saveLocalDeviceAuth(brand, ip, token) {
    if (!ip) {
      showToast(window._i18nMsg?.['brandSettings.validation.ipRequired'] || 'Please enter a device IP address.');
      return;
    }

    try {
      await apiRequest('POST', `/auth/brand/${encodeURIComponent(brand)}/connect`, {
        auth_type: 'local',
        credentials: {
          bridge_ip: ip,
          api_key: token
        }
      });
      closeModal('localDeviceModal');
      showToast('✅ ' + (window._i18nMsg?.['brandSettings.status.saved'] || 'Brand authentication saved.') + ' Please refresh to see updated status.');
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  function promptDisconnect(brand) {
    const meta = getBrandMeta(brand);
    if (!meta) return;
    pendingDisconnectBrand = meta;
    document.getElementById('disconnectModalDescription').textContent = (window._i18nMsg?.['brandSettings.modal.confirmDisconnectDescription'] || 'Are you sure you want to disconnect {brand}?').replace("{brand}", getBrandName(meta.id));
    openModal('disconnectModal');
  }

  async function disconnectBrand(brandId) {
    try {
      await apiRequest('POST', `/auth/brand/${encodeURIComponent(brandId)}/disconnect`);
      closeModal('disconnectModal');
      showToast('✅ ' + (window._i18nMsg?.['brandSettings.status.disconnected'] || 'Brand disconnected.'));
      // Reload page to reflect updated status
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  async function openSetupWizard(brandId) {
    const guide = await fetchSetupGuide(brandId);
    if (!guide || !guide.steps || guide.steps.length === 0) return;
    
    setupWizardState = { brandId, currentStep: 0, credentials: {} };
    showSetupWizardStep(brandId, 0, guide);
    openModal('setupWizardModal');
  }

  function showSetupWizardStep(brandId, stepIndex, guide) {
    if (stepIndex < 0 || stepIndex >= guide.steps.length) return;
    setupWizardState.currentStep = stepIndex;

    const step = guide.steps[stepIndex];
    const titleEl = document.getElementById('setupWizardTitle');
    const contentEl = document.getElementById('setupWizardContent');
    const progressEl = document.getElementById('setupWizardProgress');
    const credentialsSection = document.getElementById('setupWizardCredentials');
    const backBtn = document.querySelector('[data-wizard-action="back"]');
    const nextBtn = document.querySelector('[data-wizard-action="next"]');
    const testBtn = document.querySelector('[data-wizard-action="test"]');
    const saveBtn = document.querySelector('[data-wizard-action="save"]');

    if (titleEl) titleEl.textContent = step.title;
    if (contentEl) contentEl.textContent = step.content;
    if (progressEl) progressEl.textContent = `Step ${stepIndex + 1} of ${guide.steps.length}`;

    if (backBtn) backBtn.style.display = stepIndex > 0 ? 'block' : 'none';
    
    // Show next button only if NOT the last step AND this step doesn't require credentials
    // If this step requires credentials, user must save before proceeding
    const isLastStep = stepIndex === guide.steps.length - 1;
    if (nextBtn) {
      nextBtn.style.display = (stepIndex < guide.steps.length - 1 && !step.requires_credentials) ? 'block' : 'none';
    }
    
    // Show test button only if using OLD credential test approach
    // If allow_device_test is true, the device test section handles it inline
    if (testBtn) {
      // Only show old test button if:
      // - allow_credential_test is true AND
      // - allow_device_test is NOT being used (new approach)
      testBtn.style.display = (step.allow_credential_test && !step.allow_device_test) ? 'block' : 'none';
    }
    
    // Show save button if this step requires credentials (can save on any step that needs them)
    if (saveBtn) saveBtn.style.display = step.requires_credentials ? 'block' : 'none';

    // Render credentials form if this step requires credentials
    if (step.requires_credentials && credentialsSection) {
      renderCredentialsForm(step, credentialsSection);
    } else if (credentialsSection) {
      credentialsSection.innerHTML = '';
    }

    // Render device test section independently (regardless of requires_credentials)
    if ((step.allow_device_test || step.allow_credential_test) && credentialsSection) {
      renderDeviceTestSection(step, credentialsSection);
    }
  }

  function renderCredentialsForm(step, container) {
    container.innerHTML = '';
    
    // Only render if there are credential fields
    if (!step.credential_fields || step.credential_fields.length === 0) {
      return;
    }

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'wizard-credentials-fieldset';
    
    const legend = document.createElement('legend');
    legend.textContent = window._i18nMsg?.['brandSettings.modal.enterCredentials'] || 'Enter Your Credentials';
    fieldset.appendChild(legend);

    // Render each credential field from the API response
    step.credential_fields.forEach(field => {
      const group = document.createElement('div');
      group.className = 'form-group';

      // Label
      const label = document.createElement('label');
      label.htmlFor = field.id;
      label.textContent = field.label || field.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      group.appendChild(label);

      // Input
      const input = document.createElement('input');
      input.type = field.type || 'text';
      input.id = field.id;
      input.name = field.id;
      input.placeholder = field.placeholder || '';
      input.autocomplete = (field.type === 'password') ? 'new-password' : 'off';
      input.required = true;
      
      // Store input reference for credential tracking
      input.addEventListener('input', (e) => {
        setupWizardState.credentials[field.id] = e.target.value;
      });

      group.appendChild(input);

      // Help text (from help_key i18n lookup or direct help text)
      if (field.help_key || field.help) {
        const hint = document.createElement('span');
        hint.className = 'field-hint';
        // Try to get help from i18n by help_key, fallback to direct help text
        if (field.help_key) {
          hint.textContent = window._i18nMsg?.[field.help_key] || field.help || '';
        } else {
          hint.textContent = field.help || '';
        }
        if (hint.textContent) {
          group.appendChild(hint);
        }
      }

      fieldset.appendChild(group);
    });

    container.appendChild(fieldset);
  }

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

    // Get brand-specific device identification requirements
    const brandMeta = getBrandMeta(setupWizardState.brandId);
    const deviceIdentifiers = brandMeta?.device_identification_required || [];
    
    // If no device identifiers required for this brand, don't show test section
    if (!deviceIdentifiers || deviceIdentifiers.length === 0) {
      return;
    }

    // Checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'device-test-controls';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'wizardDeviceTestCheckbox';
    checkbox.className = 'device-test-checkbox';
    
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'wizardDeviceTestCheckbox';
    checkboxLabel.className = 'device-test-label';
    checkboxLabel.textContent = window._i18nMsg?.['brandSettings.modal.testSpecificDevice'] || 'Test specific device';

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);
    section.appendChild(checkboxContainer);

    // Device test form (shown when checkbox is checked)
    const deviceTestForm = document.createElement('div');
    deviceTestForm.className = 'device-test-form';
    deviceTestForm.style.display = 'none';
    deviceTestForm.style.marginTop = '12px';
    deviceTestForm.style.padding = '12px';
    deviceTestForm.style.borderLeft = '3px solid #0969da';
    deviceTestForm.style.backgroundColor = '#f6f8fa';

    // Create input fields for all device identifiers (support multiple parameters)
    const identifierInputs = {};
    
    deviceIdentifiers.forEach((identifier, index) => {
      const inputId = `wizardDeviceIdentifier_${identifier.type}`;
      
      const inputLabel = document.createElement('label');
      inputLabel.htmlFor = inputId;
      inputLabel.style.display = 'block';
      inputLabel.style.marginBottom = '6px';
      inputLabel.style.fontWeight = '500';
      inputLabel.textContent = identifier.label || identifier.type;
      deviceTestForm.appendChild(inputLabel);

      const deviceInput = document.createElement('input');
      deviceInput.type = 'text';
      deviceInput.id = inputId;
      deviceInput.className = 'form-control';
      deviceInput.placeholder = identifier.placeholder || `Enter ${identifier.label || identifier.type}...`;
      deviceInput.style.width = '100%';
      deviceInput.style.marginBottom = '6px';
      deviceInput.style.padding = '6px 8px';
      deviceInput.style.border = '1px solid #d0d7de';
      deviceInput.style.borderRadius = '4px';
      
      // Store reference to input
      identifierInputs[identifier.type] = deviceInput;
      deviceTestForm.appendChild(deviceInput);

      // Add description if available
      if (identifier.description) {
        const description = document.createElement('p');
        description.style.fontSize = '12px';
        description.style.color = '#666';
        description.style.marginBottom = index === deviceIdentifiers.length - 1 ? '12px' : '8px';
        description.style.marginTop = '0';
        description.textContent = identifier.description;
        deviceTestForm.appendChild(description);
      } else if (index < deviceIdentifiers.length - 1) {
        // Add spacing between fields if no description
        const spacer = document.createElement('div');
        spacer.style.marginBottom = '8px';
        deviceTestForm.appendChild(spacer);
      }
    });

    // Test button
    const testButton = document.createElement('button');
    testButton.type = 'button';
    testButton.id = 'wizardDeviceTestButton';
    testButton.className = 'btn-secondary btn-device-test';
    testButton.textContent = step.device_test_label || window._i18nMsg?.['brandSettings.modal.testDevice'] || 'Test Device';
    testButton.style.width = '100%';

    testButton.addEventListener('click', () => {
      // Build device identifiers object with all parameters
      const deviceInfo = {};
      deviceIdentifiers.forEach(identifier => {
        const value = identifierInputs[identifier.type]?.value || '';
        if (value.trim()) {
          deviceInfo[identifier.type] = value.trim();
        }
      });
      
      testSpecificDevice(step, deviceInfo);
    });

    deviceTestForm.appendChild(testButton);
    section.appendChild(deviceTestForm);

    // Show/hide device test form based on checkbox
    checkbox.addEventListener('change', () => {
      deviceTestForm.style.display = checkbox.checked ? 'block' : 'none';
    });

    // Results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'wizardDeviceTestResults';
    resultsContainer.className = 'device-test-results';
    resultsContainer.style.display = 'none';
    section.appendChild(resultsContainer);

    container.appendChild(section);
  }

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

  async function testSpecificDevice(step, deviceInfo) {
    const resultsContainer = document.getElementById('wizardDeviceTestResults');
    const testButton = document.getElementById('wizardDeviceTestButton');

    // Validate input - at least one identifier must be provided
    const identifierValues = Object.values(deviceInfo);
    if (!identifierValues || identifierValues.length === 0 || identifierValues.every(v => !v)) {
      showToast(window._i18nMsg?.['brandSettings.validation.enterDeviceIdentifier'] || 'Please enter device identifiers');
      return;
    }

    // Validate credentials
    const missingFields = step.credential_fields.filter(
      field => !setupWizardState.credentials[field.id] || setupWizardState.credentials[field.id].trim() === ''
    );

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label || f.id).join(', ');
      showToast(window._i18nMsg?.['brandSettings.validation.fillAllFields'] || `Please fill in: ${fieldNames}`);
      return;
    }

    // Update button state
    testButton.disabled = true;
    const originalText = testButton.textContent;
    testButton.textContent = window._i18nMsg?.['brandSettings.modal.testing'] || 'Testing...';

    try {
      // Build credentials payload
      const credentialsPayload = {};
      step.credential_fields.forEach(field => {
        credentialsPayload[field.id] = setupWizardState.credentials[field.id];
      });

      // Call device-specific test endpoint with all device identifiers
      const result = await apiRequest('POST', `/auth/brand/${encodeURIComponent(setupWizardState.brandId)}/test-device`, {
        credentials: credentialsPayload,
        auth_type: getBrandMeta(setupWizardState.brandId)?.authentication_type || 'unknown',
        device_info: deviceInfo  // Pass all identifiers: { device_id: "...", mac_address: "...", sku: "..." }
      });

      // Render results
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'block';

      if (result && result.is_found && result.is_reachable) {
        // Success
        const successDiv = document.createElement('div');
        successDiv.className = 'device-test-success';
        
        const message = `✅ ${result.message || 'Device found and reachable'}`;
        successDiv.innerHTML = `<p style="font-weight: 500; margin-bottom: 8px;">${escapeHtml(message)}</p>`;

        // Device details
        const details = document.createElement('div');
        details.style.fontSize = '14px';
        details.style.lineHeight = '1.6';

        if (result.device_name) {
          details.innerHTML += `<div><strong>Name:</strong> ${escapeHtml(result.device_name)}</div>`;
        }
        if (result.device_id) {
          details.innerHTML += `<div><strong>ID:</strong> ${escapeHtml(result.device_id)}</div>`;
        }
        if (result.device_type) {
          details.innerHTML += `<div><strong>Type:</strong> ${escapeHtml(result.device_type)}</div>`;
        }
        if (result.status) {
          details.innerHTML += `<div><strong>Status:</strong> ${escapeHtml(result.status)}</div>`;
        }
        if (result.mac_address) {
          details.innerHTML += `<div><strong>MAC:</strong> ${escapeHtml(result.mac_address)}</div>`;
        }
        if (result.ip_address) {
          details.innerHTML += `<div><strong>IP:</strong> ${escapeHtml(result.ip_address)}</div>`;
        }
        if (result.signal_strength !== undefined && result.signal_strength !== null) {
          details.innerHTML += `<div><strong>Signal:</strong> ${result.signal_strength} dBm</div>`;
        }
        if (result.last_seen) {
          details.innerHTML += `<div><strong>Last Seen:</strong> ${escapeHtml(result.last_seen)}</div>`;
        }

        successDiv.appendChild(details);
        resultsContainer.appendChild(successDiv);
      } else if (result && result.is_found === false) {
        // Device not found
        const notFoundDiv = document.createElement('div');
        notFoundDiv.className = 'device-test-error';
        
        const message = result.message || 'Device not found';
        notFoundDiv.innerHTML = `<p style="font-weight: 500; margin-bottom: 8px;">⚠️ ${escapeHtml(message)}</p>`;
        
        if (result.suggestion) {
          notFoundDiv.innerHTML += `<p class="test-suggestion">${escapeHtml(result.suggestion)}</p>`;
        }
        
        resultsContainer.appendChild(notFoundDiv);
      } else {
        // Other failure
        const errorDiv = document.createElement('div');
        errorDiv.className = 'device-test-error';
        
        const error = result?.error || result?.message || window._i18nMsg?.['brandSettings.error.deviceTestFailed'] || 'Device test failed';
        const suggestion = result?.suggestion || '';
        
        errorDiv.innerHTML = `<p style="font-weight: 500; margin-bottom: 8px;">❌ ${escapeHtml(error)}</p>`;
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
      errorDiv.innerHTML = `<p style="font-weight: 500; margin-bottom: 8px;">❌ ${escapeHtml(window._i18nMsg?.['brandSettings.error.deviceTestFailed'] || 'Device test failed')}</p>`;
      errorDiv.innerHTML += `<p class="test-suggestion">${escapeHtml(error.message || 'Unknown error')}</p>`;
      
      resultsContainer.appendChild(errorDiv);
    } finally {
      testButton.disabled = false;
      testButton.textContent = originalText;
    }
  }

  async function testWizardCredentials(brandId) {
    const guide = setupGuidesCache.get(normalizeBrandId(brandId));
    if (!guide || !guide.steps) {
      showToast(window._i18nMsg?.['brandSettings.error.loadingGuide'] || 'Error loading setup guide.');
      return;
    }

    const currentStep = guide.steps[setupWizardState.currentStep];
    // Only allow old test approach if allow_credential_test is true AND allow_device_test is NOT true
    if (!currentStep || (!currentStep.allow_credential_test || currentStep.allow_device_test)) {
      showToast(window._i18nMsg?.['brandSettings.error.testNotAvailable'] || 'Credential testing is not available for this step. Use the device test section below.');
      return;
    }

    // Validate that all required credential fields have values
    if (!currentStep.credential_fields || currentStep.credential_fields.length === 0) {
      showToast(window._i18nMsg?.['brandSettings.error.noCredentialsRequired'] || 'No credentials to test.');
      return;
    }

    const missingFields = currentStep.credential_fields.filter(
      field => !setupWizardState.credentials[field.id] || setupWizardState.credentials[field.id].trim() === ''
    );

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label || f.id).join(', ');
      showToast(window._i18nMsg?.['brandSettings.validation.fillAllFields'] || `Please fill in: ${fieldNames}`);
      return;
    }

    const testBtn = document.querySelector('[data-wizard-action="test"]');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = window._i18nMsg?.['brandSettings.modal.testing'] || 'Testing...';
    }

    try {
      // Build credentials payload from credential_fields
      const credentialsPayload = {};
      currentStep.credential_fields.forEach(field => {
        credentialsPayload[field.id] = setupWizardState.credentials[field.id];
      });

      const result = await apiRequest('POST', `/auth/brand/${encodeURIComponent(brandId)}/test`, {
        credentials: credentialsPayload,
        auth_type: getBrandMeta(brandId)?.authentication_type || 'unknown'
      });

      if (result && result.is_valid) {
        const deviceCount = result.device_count || 0;
        const msg = result.message || `✅ Credentials verified! Found ${deviceCount} device(s).`;
        showToast(msg);
      } else {
        const error = result?.error || window._i18nMsg?.['brandSettings.error.validationFailed'] || 'Credentials validation failed';
        showToast(`❌ ${error}`);
      }
    } catch (error) {
      showToast(`❌ ${window._i18nMsg?.['brandSettings.error.testFailed'] || 'Test failed'}: ${error.message}`);
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = window._i18nMsg?.['brandSettings.modal.testCredentials'] || 'Test Credentials';
      }
    }
  }

  async function saveWizardCredentials(brandId) {
    const guide = setupGuidesCache.get(normalizeBrandId(brandId));
    if (!guide || !guide.steps) {
      showToast(window._i18nMsg?.['brandSettings.error.loadingGuide'] || 'Error loading setup guide.');
      return;
    }

    const currentStep = guide.steps[setupWizardState.currentStep];
    if (!currentStep || !currentStep.requires_credentials) {
      showToast(window._i18nMsg?.['brandSettings.error.invalidStep'] || 'Invalid step.');
      return;
    }

    // Validate that all required credential fields have values
    if (!currentStep.credential_fields || currentStep.credential_fields.length === 0) {
      showToast(window._i18nMsg?.['brandSettings.error.noCredentialsRequired'] || 'No credentials required for this step.');
      return;
    }

    const missingFields = currentStep.credential_fields.filter(
      field => !setupWizardState.credentials[field.id] || setupWizardState.credentials[field.id].trim() === ''
    );

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label || f.id).join(', ');
      showToast(window._i18nMsg?.['brandSettings.validation.fillAllFields'] || `Please fill in: ${fieldNames}`);
      return;
    }

    try {
      const saveBtn = document.querySelector('[data-wizard-action="save"]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = window._i18nMsg?.['brandSettings.modal.saving'] || 'Saving...';
      }

      // Build credentials payload from credential_fields
      const credentialsPayload = {};
      currentStep.credential_fields.forEach(field => {
        credentialsPayload[field.id] = setupWizardState.credentials[field.id];
      });

      await apiRequest('POST', `/auth/brand/${encodeURIComponent(brandId)}/connect`, {
        credentials: credentialsPayload,
        auth_type: getBrandMeta(brandId)?.authentication_type || 'unknown'
      });

      // Validate credentials by testing the connection
      try {
        const testBtn = document.querySelector('[data-wizard-action="save"]');
        if (testBtn) {
          testBtn.textContent = window._i18nMsg?.['brandSettings.modal.validating'] || 'Validating...';
        }

        await apiRequest('POST', `/auth/brand/${encodeURIComponent(brandId)}/test`, {
          credentials: credentialsPayload,
          auth_type: getBrandMeta(brandId)?.authentication_type || 'unknown'
        });
        // Validation passed, continue to next step
      } catch (testError) {
        // Validation failed, prevent progression to next step
        showToast(`❌ ${testError.message || (window._i18nMsg?.['brandSettings.error.credentialTest'] || 'Credential validation failed. Please check your credentials.')}`);
        throw testError;
      }

      // Check if this is the last step
      const isLastStep = setupWizardState.currentStep === guide.steps.length - 1;
      
      // Mark that credentials were saved (for modal close handler)
      setupWizardCredentialsSaved = true;
      
      if (isLastStep) {
        // Close dialog and show success message
        closeModal('setupWizardModal');
        showToast('✅ ' + (window._i18nMsg?.['brandSettings.savedSuccess'] || 'Brand credentials saved successfully!'));
        // Reload page to reflect updated status
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        // Move to next step and show success message
        showToast('✅ ' + (window._i18nMsg?.['brandSettings.stepSaved'] || 'Credentials saved. Proceeding to next step...'));
        showSetupWizardStep(brandId, setupWizardState.currentStep + 1, guide);
      }
    } catch (error) {
      showToast(`❌ ${error.message}`);
    } finally {
      const saveBtn = document.querySelector('[data-wizard-action="save"]');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = window._i18nMsg?.['brandSettings.modal.save'] || 'Save & Connect';
      }
    }
  }

  async function handleBrandAction(brandId) {
    const meta = getBrandMeta(brandId);
    if (!meta) return;

    // Try to fetch and show setup wizard if available
    const guide = await fetchSetupGuide(brandId);
    if (guide && guide.steps && guide.steps.length > 0) {
      await openSetupWizard(brandId);
      return;
    }

    // Fall back to direct auth methods if no guide
    if (meta.auth_type === 'oauth') {
      openOAuthFlow(meta.id);
      return;
    }
    if (meta.auth_type === 'api-key' || meta.auth_type === 'api_key') {
      openApiKeyModal(meta.id);
      return;
    }
    if (meta.auth_type === 'local') {
      openLocalDeviceModal(meta.id);
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-close-modal]');
      if (closeButton) {
        closeModal(closeButton.getAttribute('data-close-modal'));
        return;
      }
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach((modal) => {
          if (modal.style.display !== 'none') {
            closeModal(modal.id);
          }
        });
      }
    });

    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    if (saveApiKeyButton) {
      saveApiKeyButton.addEventListener('click', () => {
        if (!activeApiKeyBrand) return;
        saveApiKey(activeApiKeyBrand.id, document.getElementById('apiKeyInput').value.trim());
      });
    }

    const saveLocalDeviceButton = document.getElementById('saveLocalDeviceButton');
    if (saveLocalDeviceButton) {
      saveLocalDeviceButton.addEventListener('click', () => {
        if (!activeLocalBrand) return;
        saveLocalDeviceAuth(
          activeLocalBrand.id,
          document.getElementById('deviceIpInput').value.trim(),
          document.getElementById('deviceTokenInput').value.trim()
        );
      });
    }

    const confirmDisconnectButton = document.getElementById('confirmDisconnectButton');
    if (confirmDisconnectButton) {
      confirmDisconnectButton.addEventListener('click', () => {
        if (!pendingDisconnectBrand) return;
        disconnectBrand(pendingDisconnectBrand.id);
      });
    }

    document.addEventListener('click', (event) => {
      const wizardAction = event.target.getAttribute('data-wizard-action');
      if (!wizardAction) return;

      const brandId = setupWizardState.brandId;
      const cacheKey = normalizeBrandId(brandId);
      const guide = setupGuidesCache.get(cacheKey);
      if (!guide) return;

      if (wizardAction === 'back') {
        if (setupWizardState.currentStep > 0) {
          showSetupWizardStep(brandId, setupWizardState.currentStep - 1, guide);
        }
      } else if (wizardAction === 'next') {
        if (setupWizardState.currentStep < guide.steps.length - 1) {
          showSetupWizardStep(brandId, setupWizardState.currentStep + 1, guide);
        }
      } else if (wizardAction === 'test') {
        testWizardCredentials(brandId);
      } else if (wizardAction === 'save') {
        saveWizardCredentials(brandId);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    if (connected) {
      showToast(`✅ ${getBrandName(connected)} connected. Please refresh to see updated status.`);
      history.replaceState({}, '', '/brand-settings');
    }
  });

  window.handleBrandAction = handleBrandAction;
  window.promptDisconnect = promptDisconnect;
})();
