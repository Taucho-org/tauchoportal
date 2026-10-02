// =============================================
// Option B: Devices Enhanced Layout
// =============================================

// Navigate to Brand Settings page
function goToBrandSettings() {
    window.location.href = '/brand-settings';
}

// =============================================
// Utility Functions
// =============================================
function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function apiRequest(method, path, body) {
    const opts = { method, credentials: 'include', headers: {} };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const r = await fetch(API_BASE + path, opts);
    if (!r.ok) {
        const tx = await r.text();
        const error = new Error(tx || r.status);
        error.status = r.status;
        throw error;
    }
    return r.status === 204 ? null : r.json();
}

let activeTestDeviceId = null;
let activeTestDevice = null;
let activeTestTemplates = [];
let activeTestRequestId = 0;

async function openDeviceTestModal(deviceId) {
    const device = window.MY_DEVICES.find(item => item.id === deviceId);
    if (!device) return;
    if (!device.is_configured) {
        alert(devicesI18n['completeSetupBeforeTest']);
        return;
    }

    activeTestDeviceId = deviceId;
    const requestId = ++activeTestRequestId;
    activeTestDevice = null;
    activeTestTemplates = [];
    const modal = document.getElementById('deviceTestModal');
    const select = document.getElementById('testTemplateSelect');
    const placeholder = select.options[0];
    select.replaceChildren(placeholder);
    document.getElementById('testTemplateFields').replaceChildren();
    document.getElementById('runDeviceTestButton').disabled = true;
    select.disabled = true;
    let hasTemplates = false;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        const deviceDetails = await apiRequest(
            'GET',
            `/devices/get?id=${encodeURIComponent(device.id)}`
        );
        if (activeTestRequestId !== requestId) return;
        const detailIdentifiers = deviceDetails.device_identifier || {};
        const legacyIdentifiers = deviceDetails.device_identification || {};
        const listIdentifiers = device.device_identifier || {};
        const deviceIdentifiers = Object.keys(detailIdentifiers).length
            ? detailIdentifiers
            : Object.keys(legacyIdentifiers).length
                ? legacyIdentifiers
                : listIdentifiers;
        activeTestDevice = {
            ...device,
            ...deviceDetails,
            device_identifier: deviceIdentifiers
        };
    } catch (error) {
        if (activeTestRequestId !== requestId) return;
        console.error(devicesI18n['failedLoadDetails'], error);
        alert(devicesI18n['failedLoadDetails'] + ' ' + error.message);
        closeDeviceTestModal();
        return;
    }

    try {
        const templates = await apiRequest(
            'GET',
            `/device-templates?product_id=${encodeURIComponent(device.product_id)}`
        );
        if (activeTestRequestId !== requestId) return;

        if (!Array.isArray(templates) || templates.length === 0) {
            const option = document.createElement('option');
            option.textContent = devicesI18n['noTemplatesAvailable'];
            option.disabled = true;
            select.append(option);
            return;
        }

        activeTestTemplates = templates;
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.template_name;
            select.append(option);
        });
        hasTemplates = true;
    } catch (error) {
        if (activeTestRequestId !== requestId) return;
        if (error.status === 404) {
            const option = document.createElement('option');
            option.textContent = devicesI18n['noTemplatesAvailable'];
            option.disabled = true;
            select.append(option);
        } else {
            console.error(devicesI18n['failedLoadTemplates'], error);
            alert(devicesI18n['failedLoadTemplates'] + ' ' + error.message);
        }
    } finally {
        if (activeTestRequestId === requestId) {
            select.disabled = !hasTemplates;
        }
    }
}

function closeDeviceTestModal() {
    document.getElementById('deviceTestModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    activeTestDeviceId = null;
    activeTestDevice = null;
    activeTestTemplates = [];
    activeTestRequestId++;
}

function normalizeTestParameterName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getAutomaticDeviceTestValue(device, parameterName) {
    const normalizedName = normalizeTestParameterName(parameterName);
    const isDeviceId = ['id', 'device', 'deviceid'].includes(normalizedName);
    const isModelId = ['model', 'modelid'].includes(normalizedName);
    if (!isDeviceId && !isModelId) return { handled: false };

    const identifiers = device.device_identifier || {};
    const candidates = isModelId
        ? ['model', 'modelid', 'sku']
        : ['deviceid', 'id', 'device', 'macaddress', 'ipaddress', 'serialnumber'];
    for (const candidate of candidates) {
        const match = Object.keys(identifiers).find(
            key => normalizeTestParameterName(key) === candidate
        );
        if (match && identifiers[match] != null && identifiers[match] !== '') {
            return { handled: true, value: identifiers[match] };
        }
    }

    if (isModelId && (device.product_name || device.product_id)) {
        return { handled: true, value: device.product_name || device.product_id };
    }
    return { handled: true, value: '' };
}

function getTestSelectOptions(uiField) {
    const uiOptions = uiField?.options || [];

    return uiOptions.map(option => {
        if (option && typeof option === 'object' && !Array.isArray(option)) {
            const value = option.value ?? option.id ?? option.key;
            const label = option.label ?? option.name ?? value;
            return {
                value: value ?? '',
                label: label ?? ''
            };
        }

        const label = String(option);
        return {
            value: option,
            label
        };
    });
}

function renderTestTemplateFields() {
    const templateId = Number(document.getElementById('testTemplateSelect').value);
    const template = activeTestTemplates.find(item => item.id === templateId);
    const fieldsContainer = document.getElementById('testTemplateFields');
    const runButton = document.getElementById('runDeviceTestButton');
    fieldsContainer.replaceChildren();
    runButton.disabled = !template;
    if (!template) return;

    const device = activeTestDevice;
    if (!device) return;
    const uiFields = new Map((template.ui_fields || []).map(field => [field.key || field.name, field]));
    const parameterNames = [...new Set([
        ...(template.required_parameters || []),
        ...(template.optional_parameters || [])
    ])];

    parameterNames.forEach(name => {
        const automaticValue = getAutomaticDeviceTestValue(device, name);
        if (automaticValue.handled) return;

        const uiField = uiFields.get(name);
        const constraints = template.parameter_constraints?.[name];
        const required = (template.required_parameters || []).includes(name);
        const identifierValue = device?.device_identifier?.[name];
        const defaultValue = template.parameter_defaults?.[name];
        const initialValue = identifierValue ?? defaultValue ?? '';
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.htmlFor = `testParam_${name}`;
        label.textContent = uiField?.name || name;
        group.append(label);

        let input;
        const fieldType = (uiField?.type || constraints?.type || 'text').toLowerCase();
        if (Array.isArray(uiField?.options)) {
            input = document.createElement('select');
            const selectOptions = getTestSelectOptions(uiField);
            selectOptions.forEach(({ value, label: optionLabel }) => {
                const option = document.createElement('option');
                option.value = String(value);
                option.textContent = String(optionLabel);
                option.dataset.valueType = typeof value;
                input.append(option);
            });
            if (initialValue !== '') {
                const initialOption = selectOptions.find(option =>
                    String(option.value) === String(initialValue) ||
                    String(option.label) === String(initialValue)
                );
                if (initialOption) input.value = String(initialOption.value);
            }
        } else {
            input = document.createElement('input');
            input.type = ['number', 'integer', 'float'].includes(fieldType)
                ? 'number'
                : ['range', 'slider'].includes(fieldType)
                    ? 'range'
                    : fieldType === 'checkbox' ? 'checkbox' : 'text';
            if (input.type === 'checkbox') {
                input.checked = initialValue === true || initialValue === 1 ||
                    ['true', '1', 'on'].includes(String(initialValue).toLowerCase());
            } else {
                input.value = initialValue;
                const min = uiField?.min ?? constraints?.min;
                const max = uiField?.max ?? constraints?.max;
                if (min != null) input.min = min;
                if (max != null) input.max = max;
            }
        }

        input.id = `testParam_${name}`;
        input.dataset.parameter = name;
        input.dataset.valueType = input.type;
        input.required = required;
        group.append(input);
        fieldsContainer.append(group);
    });
}

async function runDeviceTest() {
    const device = activeTestDevice;
    const templateId = Number(document.getElementById('testTemplateSelect').value);
    const template = activeTestTemplates.find(item => item.id === templateId);
    const form = document.getElementById('testTemplateFields');
    const button = document.getElementById('runDeviceTestButton');
    if (!device || !template) return;
    const invalidInput = form.querySelector(':invalid');
    if (invalidInput) {
        invalidInput.reportValidity();
        return;
    }

    const params = {};
    const missingAutomaticValues = [];
    [...new Set([
        ...(template.required_parameters || []),
        ...(template.optional_parameters || [])
    ])].forEach(name => {
        const automaticValue = getAutomaticDeviceTestValue(device, name);
        if (!automaticValue.handled) return;
        if (automaticValue.value === '') {
            if ((template.required_parameters || []).includes(name)) {
                missingAutomaticValues.push(name);
            }
            return;
        }
        params[name] = automaticValue.value;
    });
    if (missingAutomaticValues.length) {
        alert(devicesI18n['testMissingDeviceValue'].replace('{0}', missingAutomaticValues.join(', ')));
        return;
    }

    form.querySelectorAll('[data-parameter]').forEach(input => {
        let value = input.type === 'checkbox'
            ? input.checked
            : input.type === 'number' || input.type === 'range'
                ? input.value === '' ? '' : input.valueAsNumber
                : input.value;
        if (input.tagName === 'SELECT' && value !== '') {
            const constraintType = template.parameter_constraints?.[input.dataset.parameter]?.type;
            const valueType = constraintType || input.selectedOptions[0]?.dataset.valueType;
            if (['integer', 'number', 'float'].includes(valueType)) {
                value = Number(value);
                if (valueType === 'integer') value = Math.trunc(value);
            } else if (valueType === 'boolean') {
                value = value === 'true';
            }
        }
        if (value !== '') params[input.dataset.parameter] = value;
    });

    button.disabled = true;
    try {
        const response = await apiRequest('POST', `/devices/test?id=${encodeURIComponent(device.id)}`, {
            template_id: template.id,
            action: template.template_name || '',
            params
        });
        alert(response?.message || devicesI18n['testCommandSent'].replace('{0}', device.name));
        closeDeviceTestModal();
    } catch (error) {
        alert(devicesI18n['testFailed'] + error.message);
    } finally {
        if (activeTestDeviceId === device.id) button.disabled = false;
    }
}

async function loadProductsForBrand(brandId) {
    // All products are pre-loaded from server on page load
    // This function is deprecated, kept for backward compatibility
    // If a brand's products are not yet loaded, they will be when user clicks accordion
    return [];
}

// Products are loaded on-demand via loadProductsForBrand() to minimize bandwidth
// Render (Simplified)
// =============================================
let activeFilter = 'all';

function filterByBrand(brandId, btn) {
    activeFilter = brandId;
    document.querySelectorAll('.filter-tab').forEach(tb => tb.classList.remove('active'));
    btn.classList.add('active');
    
    // Show/hide device cards based on filter
    document.querySelectorAll('.device-card').forEach(card => {
        const cardBrand = card.dataset.brand;
        card.style.display = (brandId === 'all' || cardBrand === brandId) ? 'block' : 'none';
    });
}

// =============================================
// Modal
// =============================================
let selectedBrand = null;
let editingId = null;
// Group to pre-select in the device form (e.g. when adding a device from a group section)
let pendingGroupId = '';

// Devices can be grouped only with devices of the same brand having exactly the same supported actions.
// Must stay in sync with controller.DeviceGroupKey (internal/controller/template.go).
function deviceGroupKey(brand, supportedActions) {
    if (!brand || brand === 'custom' || !Array.isArray(supportedActions)) return '';
    const actions = Array.from(new Set(supportedActions.filter(a => a))).sort();
    return actions.length ? `${brand}|${actions.join(',')}` : '';
}

// Restricts the device form's group options to compatible groups. When the device's actions are not
// known yet (a new device), only the brand is matched; compatibility is re-checked after saving.
function filterDeviceFormGroups(brand, groupKey) {
    const sel = document.getElementById('devGroup');
    const wrapper = document.getElementById('devGroupFormGroup');
    if (!sel) return;
    let visibleCount = 0;
    Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        const optKey = opt.dataset.groupKey || '';
        const ok = !!optKey && brand && brand !== 'custom' &&
            (groupKey ? optKey === groupKey : optKey.startsWith(brand + '|'));
        opt.hidden = !ok;
        opt.disabled = !ok;
        if (ok) visibleCount++;
    });
    if (wrapper) wrapper.style.display = visibleCount > 0 ? '' : 'none';
}

// The device form only offers visible (multi-device) compatible groups; anything else means "standalone"
function setDeviceFormGroup(groupId) {
    const sel = document.getElementById('devGroup');
    if (!sel) return;
    const exists = Array.from(sel.options).some(o => o.value === groupId && !o.disabled);
    sel.value = exists ? groupId : '';
}

function openAddModal(groupId) {
    editingId = null;
    selectedBrand = null;
    selectedProduct = null;
    pendingGroupId = typeof groupId === 'string' ? groupId : '';
    window.customActions = [];
    document.getElementById('backToSelectionButton').style.display = '';
    showStep(1);
    document.getElementById('deviceModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Load discovered devices from all connected brands
    setTimeout(() => {
        loadDiscoveredDevicesInModal();
    }, 100);
}

async function openEditModal(devId) {
    editingId = devId;
    const dev = window.MY_DEVICES.find(d => d.id === devId);
    if (!dev) return;
    
    try {
        selectedBrand = dev.brand;
        selectedProduct = dev.product_id;
        
        if (dev.brand === 'custom') {
            setStep2Custom();
            document.getElementById('customProductName').value = dev.product_id;
        } else {
            const brand = BRANDS.find(b => b.id === dev.brand);
            if (brand) {
                setStep2Brand(brand);
                // Get product name from device API or use product_id as fallback
                const productName = dev.product_name || dev.product_id;
                document.getElementById('devProductDisplay').value = productName;
                document.getElementById('devProduct').value = dev.product_id;
            }
            renderCredFields(dev.brand);
            syncBrandRequiredFields(dev.brand);
        }
        
        // Use credentials from MY_DEVICES (pre-loaded from server)
        document.getElementById('devName').value = dev.name;
        document.getElementById('devRoom').value = dev.room || '';
        filterDeviceFormGroups(dev.brand, dev.group_key || deviceGroupKey(dev.brand, dev.supported_actions));
        setDeviceFormGroup(dev.device_group_id || '');
        
        const creds = dev.credentials || {};
        const brand = BRANDS.find(b => b.id === dev.brand);
        if (brand && brand.credential_fields) {
            brand.credential_fields.forEach(f => {
                if (f.type !== 'info') {
                    const el = document.getElementById('cred_' + f.id);
                    if (el) el.value = creds[f.id] || '';
                }
            });
        }
        
        // Populate device identification required fields
        const deviceIdentifier = dev.device_identifier || {};
        if (brand && brand.device_identification_required) {
            brand.device_identification_required.forEach(field => {
                if (field.type !== 'model') {
                    const el = document.querySelector('[data-brand="' + brand.id + '"][data-type="' + field.type + '"]');
                    if (el) el.value = deviceIdentifier[field.type] || '';
                }
            });
        }
    } catch (e) {
        alert(devicesI18n['failedLoadDetails'] + e.message);
        return;
    }
    
    document.getElementById('backToSelectionButton').style.display = 'none';
    document.getElementById('devSaveBtn').textContent = devicesI18n['saveChanges'];
    showStep(2);
    document.getElementById('deviceModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('deviceModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// =============================================
// Quick Connect Modal (for owned devices)
// =============================================
let quickConnectBrandId = null;
let quickConnectProducts = [];

function openQuickConnectModal(brandId) {
    quickConnectBrandId = brandId;
    const brand = BRANDS.find(b => b.id === brandId);
    if (!brand) return;

    document.getElementById('qcTitle').textContent = devicesI18n['quickConnectTitle'] + ' - ' + brand.name;
    const subtitleMsg = devicesI18n['quickConnectSubtitle'];
    document.getElementById('qcSubtitle').textContent = subtitleMsg.replace('{brand}', brand.name);
    
    showQuickConnectLoading(true);
    document.getElementById('quickConnectModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    loadQuickConnectProducts(brandId);
}

function closeQuickConnectModal() {
    const modal = document.getElementById('quickConnectModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    quickConnectBrandId = null;
    quickConnectProducts = [];
}

async function loadQuickConnectProducts(brandId) {
    try {
        const params = new URLSearchParams({
            brand_id: brandId,
            active_only: 'true',
            limit: 500,
            offset: 0,
            sort_by: 'name'
        });
        const response = await fetch(`/api/catalog/products?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        quickConnectProducts = data.products || [];
        renderQuickConnectProducts(quickConnectProducts);
        showQuickConnectLoading(false);
    } catch (error) {
        console.error(devicesI18n['failedLoadProducts'] + ' ' + error);
        showQuickConnectLoading(false);
        document.getElementById('qcEmpty').style.display = 'block';
    }
}

function renderQuickConnectProducts(products) {
    const searchTerm = document.getElementById('qcSearchBox')?.value.toLowerCase() || '';
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.model && p.model.toLowerCase().includes(searchTerm))
    );

    const listDiv = document.getElementById('qcProductList');
    if (!filtered || filtered.length === 0) {
        listDiv.innerHTML = '';
        document.getElementById('qcEmpty').style.display = 'block';
        return;
    }

    document.getElementById('qcEmpty').style.display = 'none';
    listDiv.innerHTML = filtered.map(product => `
        <div class="qc-product-card" onclick="selectQuickConnectDevice('${escapeJsString(product.id)}', '${escapeJsString(product.name)}', '${escapeJsString(quickConnectBrandId)}')">
            ${product.image_url ? `<img src="${product.image_url}" alt="${escapeJsString(product.name)}" class="qc-product-image" onerror="this.style.display='none'">` : '<div class="qc-product-image-placeholder">📱</div>'}
            <div class="qc-product-info">
                <div class="qc-product-name">${escapeJsString(product.name)}</div>
                ${product.model ? `<div class="qc-product-model">${escapeJsString(product.model)}</div>` : ''}
            </div>
            <button class="qc-add-btn" onclick="event.stopPropagation(); selectQuickConnectDevice('${escapeJsString(product.id)}', '${escapeJsString(product.name)}', '${escapeJsString(quickConnectBrandId)}')">${escapeJsString(devicesI18n['quickConnectIOwn'])}</button>
        </div>
    `).join('');
}

function showQuickConnectLoading(show) {
    document.getElementById('qcLoading').style.display = show ? 'block' : 'none';
    document.getElementById('qcProductList').style.display = show ? 'none' : 'grid';
    document.getElementById('qcEmpty').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('qcSearchBox');
    if (searchBox) {
        searchBox.addEventListener('input', () => {
            renderQuickConnectProducts(quickConnectProducts);
        });
    }
});

function selectQuickConnectDevice(productId, productName, brandId) {
    // Set selected device for the main add form
    selectedBrand = brandId;
    selectedProduct = productId;
    selectedProductName = productName;
    
    // Capture the product's actions before closing (closing clears the product list)
    const qcProduct = quickConnectProducts.find(p => p.id === productId);
    const qcGroupKey = deviceGroupKey(brandId, qcProduct && qcProduct.supported_actions);

    // Close quick connect modal and open the device configuration form
    closeQuickConnectModal();
    
    // Jump to step 2 with the selected product pre-filled
    const brand = BRANDS.find(b => b.id === brandId);
    if (brand) {
        setStep2Brand(brand);
        document.getElementById('devProductDisplay').value = productName;
        document.getElementById('devProduct').value = productId;
        renderCredFields(brandId);
        syncBrandRequiredFields(brandId);
        document.getElementById('devName').value = '';
        document.getElementById('devRoom').value = '';
        pendingGroupId = '';
        filterDeviceFormGroups(brandId, qcGroupKey);
        setDeviceFormGroup('');
        document.getElementById('devSaveBtn').textContent = devicesI18n['addDeviceButton'];
        editingId = null;
        showStep(2);
        document.getElementById('deviceModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// =============================================
// Load Discovered Devices in Add Device Modal
// =============================================
async function loadDiscoveredDevicesInModal() {
    const brands = document.querySelectorAll('[data-brand-id]');
    
    for (const brandEl of brands) {
        const brandId = brandEl.getAttribute('data-brand-id');
        if (!brandId) continue;
        
        try {
            const response = await apiRequest('POST', `/devices/discover?brand=${encodeURIComponent(brandId)}`, {});
            const discoveredDevices = response.discovered_devices || [];
            
            if (discoveredDevices.length > 0) {
                renderDiscoveredDevices(brandId, discoveredDevices);
            }
        } catch (error) {
            console.error('Failed to load discovered devices for brand ' + brandId + ':', error);
        }
    }
}

function renderDiscoveredDevices(brandId, devices) {
    const section = document.querySelector(`.discovered-devices-section[data-brand-id="${brandId}"]`);
    if (!section) return;
    
    if (!devices || devices.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    const html = devices.map(device => {
        const statusClass = device.already_registered ? 'status-already-registered' : (device.online ? 'status-online' : 'status-offline');
        const statusLabel = device.already_registered 
            ? devicesI18n['discoverDeviceAlreadyRegistered']
            : (device.online ? devicesI18n['discoverDeviceOnline'] : devicesI18n['discoverDeviceOffline']);
        const isDisabled = device.already_registered ? 'disabled' : '';
        
        return `
        <div class="product-item ${isDisabled}" onclick="selectDiscoveredDevice('${escapeJsString(brandId)}', '${escapeJsString(device.brand_device_id)}', '${escapeJsString(device.brand_device_name)}', '${escapeJsString(device.brand_device_type)}', ${device.online})"  ${isDisabled ? 'style="pointer-events: none; opacity: 0.6;"' : ''}>
            <div class="product-info">
                <h5 class="product-name">${escapeHtml(device.brand_device_name)}</h5>
                <span class="product-actions">${escapeHtml(device.brand_device_type)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="product-status-badge ${statusClass}">${statusLabel}</span>
            </div>
        </div>
        `;
    }).join('');
    
    section.innerHTML = html;
    section.style.display = 'block';
}

function selectDiscoveredDevice(brandId, deviceId, deviceName, deviceType, online) {
    if (!online) {
        alert('This device is offline and cannot be imported at this time.');
        return;
    }
    
    // For discovered devices, we'll import them directly
    importAndSelectDiscoveredDevice(brandId, deviceId, deviceName);
}

async function importAndSelectDiscoveredDevice(brandId, deviceId, deviceName) {
    try {
        const response = await apiRequest('POST', '/devices/import-from-brand', {
            brand: brandId,
            device_ids: [deviceId]
        });

        if (!response) throw new Error('No response from server');
        
        const imported = response.imported || [];
        if (imported.length > 0) {
            const device = imported[0];
            selectProduct(brandId, device.product_id, device.name, device.name, {});
        } else {
            alert('Failed to import device');
        }
    } catch (error) {
        alert('Failed to import device: ' + error.message);
    }
}

// Close modal when clicking outside
document.addEventListener('click', e => {
    const qcModal = document.getElementById('quickConnectModal');
    if (qcModal && e.target === qcModal) {
        closeQuickConnectModal();
    }
});

document.addEventListener('click', e => {
    const ddModal = document.getElementById('discoverDevicesModal');
    if (ddModal && e.target === ddModal) {
        closeDiscoverModal();
    }
});

// Close modal when clicking outside of modal-content
document.addEventListener('click', e => {
    const modal = document.getElementById('deviceModal');
    if (!modal) return;
    
    if (e.target === modal) {
        closeModal();
    }
});

function showStep(n) {
    // Toggle body visibility
    document.getElementById('step1-body').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('step2-body').style.display = n === 2 ? 'block' : 'none';
    
    // Toggle header visibility
    document.getElementById('step1-header').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('step2-header').style.display = n === 2 ? 'block' : 'none';
    
    // Toggle footer visibility
    document.getElementById('step1-footer').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('step2-footer').style.display = n === 2 ? 'block' : 'none';
}

// =============================================
// Accordion Functions
// =============================================

function filterCatalogByCategory(btn, brandId, category) {
    // Update active button
    btn.closest('.catalog-category-filters').querySelectorAll('.category-filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
        
    // Filter items in the catalog section
    const section = document.querySelector(`.catalog-products-section[data-brand-id="${brandId}"]`);
    if (!section) return;
        
    section.querySelectorAll('.catalog-product-item').forEach(item => {
        if (category === '' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function toggleAccordion(headerBtn) {
    const item = headerBtn.closest('.accordion-item');
    const isOpen = item.classList.contains('open');
    
    // Close all other accordion items
    document.querySelectorAll('.accordion-item.open').forEach(i => {
        if (i !== item) i.classList.remove('open');
    });
    
    // Toggle current item
    item.classList.toggle('open', !isOpen);
}

// =============================================
// Device Identification Required Fields
// =============================================
function syncBrandRequiredFields(brandId) {
    document.querySelectorAll('.brand-required-fields input[data-type]').forEach(input => {
        const isSelected = input.dataset.brand === brandId;
        const shouldRequire = isSelected && input.dataset.required === 'true';
        input.required = shouldRequire;
        input.disabled = !isSelected;
        input.closest('.brand-required-fields').style.display = isSelected ? 'block' : 'none';
    });
}

function selectProduct(brandId, productId, productName, deviceName, credentials) {
    selectedBrand = brandId;
    selectedProduct = productId;
    selectedProductName = productName;
    
    if (brandId === 'custom') {
        setStep2Custom();
    } else {
        const brand = window.BRANDS.find(b => b.id === brandId);
        setStep2Brand(brand);
        
        // Set the product model display (read-only)
        document.getElementById('devProductDisplay').value = productName;
        document.getElementById('devProduct').value = productId;
        
        // Set the display name to the device name, or suggest product name
        const devNameInput = document.getElementById('devName');
        if (deviceName) {
            devNameInput.value = deviceName;
        } else {
            devNameInput.value = '';
            devNameInput.placeholder = devicesI18n['displayNameExample'].replace('{0}', productName);
        }
        
        // Fill credentials if they exist
        if (credentials && typeof credentials === 'object') {
            Object.keys(credentials).forEach(key => {
                const credField = document.getElementById('cred_' + key);
                if (credField && credentials[key]) {
                    credField.value = credentials[key];
                }
            });
        }
        
        renderCredFields(brandId);
        syncBrandRequiredFields(brandId);
    }
    
    document.getElementById('deviceForm').reset();
    // Restore values that were just set
    if (brandId !== 'custom') {
        document.getElementById('devProductDisplay').value = productName;
        document.getElementById('devProduct').value = productId;
        if (deviceName) {
            document.getElementById('devName').value = deviceName;
        }
        if (credentials && typeof credentials === 'object') {
            Object.keys(credentials).forEach(key => {
                const credField = document.getElementById('cred_' + key);
                if (credField && credentials[key]) {
                    credField.value = credentials[key];
                }
            });
        }
    }
    filterDeviceFormGroups(brandId, '');
    setDeviceFormGroup(pendingGroupId);
    document.getElementById('devSaveBtn').textContent = devicesI18n['addDeviceButton'];
    showStep(2);
}

function openAffiliate(event, affiliateUrl) {
    event.stopPropagation(); // Prevent triggering selectProduct
    event.preventDefault();
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
}

function goToStep1() {
    //renderBrandAccordion();
    showStep(1);
}

function setStep2Brand(brand) {
    // Update step 2 header with brand info
    const brandColor = brand.brand_color || '#888';
    const brandIcon = brand.icon || '🔌';
    document.getElementById('step2BrandBadge').innerHTML =
        `<span class="brand-step-badge" style="background:${brandColor}18;border-color:${brandColor};color:${brandColor}">${brandIcon} ${brand.name}</span>`;
    const actionWord = editingId ? devicesI18n['editDevice'] : devicesI18n['configureDevice'];
    document.getElementById('step2Title').textContent = devicesI18n['brandDeviceTitle']
        .replace('{0}', actionWord)
        .replace('{1}', brand.name);
    document.getElementById('step2Desc').textContent = devicesI18n['fillDetailsDesc'];
    
    // Show catalog UI, hide custom UI
    document.getElementById('catalogProductGroup').style.display = 'block';
    document.getElementById('customProductGroup').style.display = 'none';
    document.getElementById('customActionsFieldset').style.display = 'none';
    document.getElementById('devProduct').required = true;
}

function setStep2Custom() {
    // Update step 2 header for custom device
    document.getElementById('step2BrandBadge').innerHTML =
        `<span class="brand-step-badge" style="background:#FF573318;border-color:#FF5733;color:#FF5733">✏️ ${devicesI18n['customDeviceTitle']}</span>`;
    const actionWord = editingId ? devicesI18n['editCustomDevice'] : devicesI18n['configureCustomDevice'];
    document.getElementById('step2Title').textContent = actionWord;
    document.getElementById('step2Desc').textContent = devicesI18n['customDeviceDesc'];
    
    // Hide catalog UI, show custom UI
    document.getElementById('catalogProductGroup').style.display = 'none';
    document.getElementById('customProductGroup').style.display = 'block';
    document.getElementById('credFieldset').style.display = 'none';
    const connectedNotice = document.getElementById('brandCredentialsConnected');
    if (connectedNotice) connectedNotice.style.display = 'none';
    document.querySelectorAll('.brand-required-fields').forEach(el => {
        el.style.display = 'none';
        el.querySelectorAll('input[data-type]').forEach(input => {
            input.required = false;
            input.disabled = true;
        });
    });
    document.getElementById('customActionsFieldset').style.display = 'block';
    document.getElementById('devProduct').required = false;
    
    // Initialize custom actions list
    window.customActions = [];
    renderCustomActionsList();
}

function renderCredFields(brandId) {
    const brand = BRANDS.find(b => b.id === brandId);
    const credFieldset = document.getElementById('credFieldset');
    const connectedNotice = document.getElementById('brandCredentialsConnected');
    const myBrand = window.MY_BRANDS ? window.MY_BRANDS[brandId] : null;
    const isConnected = !!(myBrand && myBrand.is_connected);

    if (isConnected) {
        if (credFieldset) credFieldset.style.display = 'none';
        if (connectedNotice) {
            const brandName = brand ? brand.name : (myBrand ? myBrand.name : brandId);
            const titleEl = document.getElementById('brandConnectedTitle');
            const descEl = document.getElementById('brandConnectedDesc');
            if (titleEl) titleEl.textContent = devicesI18n['brandConnectedTitle'].replace('{0}', brandName);
            if (descEl) descEl.textContent = devicesI18n['brandConnectedDescription'];
            connectedNotice.style.display = 'flex';
        }
        return;
    }

    if (connectedNotice) connectedNotice.style.display = 'none';

    if (!brand || !brand.credential_fields || brand.credential_fields.length === 0) {
        if (credFieldset) credFieldset.style.display = 'none';
        const credFields = document.getElementById('credFields');
        if (credFields) credFields.innerHTML = '';
        return;
    }

    if (credFieldset) credFieldset.style.display = 'block';

    document.getElementById('credFields').innerHTML = brand.credential_fields.map(f => {
        if (f.type === 'info') return `<div class="cred-info"><p>${f.help}</p></div>`;
        const isPwd = f.type === 'password';
        return `
        <div class="form-group">
            <label for="cred_${f.id}">${f.label}</label>
            <div class="cred-input-row">
                <input type="${isPwd ? 'password' : 'text'}" id="cred_${f.id}"
                        ${isPwd ? 'placeholder="••••••••••••••••"' : ''} autocomplete="new-password">
                ${isPwd ? `<button type="button" class="show-hide-btn" onclick="toggleCredVis('cred_${f.id}',this)">${devicesI18n['showPassword']}</button>` : ''}
            </div>
            <small class="form-help">${f.help}</small>
        </div>`;
    }).join('');

    // Render docs link if available
    document.getElementById('credDocsLink').innerHTML = brand.docs_url
        ? `<a href="${brand.docs_url}" target="_blank" rel="noopener" class="docs-link">📖 ${brand.docs_label} ↗</a>`
        : '';
}

function toggleCredVis(inputId, btn) {
    const el = document.getElementById(inputId);
    el.type = el.type === 'password' ? 'text' : 'password';
    btn.textContent = el.type === 'password' ? devicesI18n['showPassword'] : devicesI18n['hidePassword'];
}

// =============================================
// Custom Actions
// =============================================
function renderCustomActionsList() {
    if (!window.customActions) window.customActions = [];
    const html = window.customActions.map((action, idx) => `
        <div class="custom-action-card" style="border:1px solid #ddd; border-radius:6px; padding:1rem; margin-bottom:1rem; background:#f9f9f9">
            <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem">
                <input type="text" placeholder="${devicesI18n['customActionNamePlaceholder']}"
                        value="${action.action_name || ''}" 
                        onchange="customActions[${idx}].action_name = this.value"
                        style="flex:1">
                <button type="button" class="btn btn-secondary" onclick="removeCustomAction(${idx})">${devicesI18n['removeAction']}</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem">
                <input type="text" placeholder="${devicesI18n['customActionMethodPlaceholder']}"
                        value="${action.http_method || 'POST'}" 
                        onchange="customActions[${idx}].http_method = this.value">
                <input type="text" placeholder="${devicesI18n['customActionURLPlaceholder']}"
                        value="${action.http_url || ''}" 
                        onchange="customActions[${idx}].http_url = this.value">
            </div>
            <textarea placeholder="${devicesI18n['customActionHeadersPlaceholder']}"
                        rows="2" style="width:100%; padding:0.5rem; margin-bottom:0.75rem; font-family:monospace; font-size:0.85rem"
                        onchange="customActions[${idx}].http_headers = this.value">${action.http_headers || ''}</textarea>
            <textarea placeholder="${devicesI18n['customActionBodyPlaceholder']}"
                        rows="3" style="width:100%; padding:0.5rem; font-family:monospace; font-size:0.85rem"
                        onchange="customActions[${idx}].http_body_template = this.value">${action.http_body_template || ''}</textarea>
        </div>
    `).join('');
    document.getElementById('customActionsList').innerHTML = html || `<p style="color:#999">${devicesI18n['noCustomActions']}</p>`;
}

function addCustomAction() {
    if (!window.customActions) window.customActions = [];
    window.customActions.push({
        action_name: '',
        http_method: 'POST',
        http_url: '',
        http_headers: '',
        http_body_template: ''
    });
    renderCustomActionsList();
}

function removeCustomAction(idx) {
    window.customActions.splice(idx, 1);
    renderCustomActionsList();
}

// =============================================
// CRUD
// =============================================
// Creates or updates the device and returns { id, device_group_id } of the saved device
async function persistDevice(deviceBody) {
    if (editingId) {
        const updated = await apiRequest('PATCH', `/devices/update?id=${editingId}`, deviceBody) || {};
        const existing = getDeviceById(editingId) || {};
        const actions = updated.supported_actions || existing.supported_actions;
        return {
            id: editingId,
            device_group_id: deviceGroupState.get(editingId) || '',
            group_key: deviceGroupKey(existing.brand || deviceBody.brand, actions)
        };
    }
    const created = await apiRequest('POST', '/devices', deviceBody) || {};
    return {
        id: created.id || created.ID || null,
        device_group_id: created.device_group_id || '',
        group_key: deviceGroupKey(created.brand || deviceBody.brand, created.supported_actions)
    };
}

async function saveDevice(e) {
    e.preventDefault();
    const btn = document.getElementById('devSaveBtn');
    btn.disabled = true;
    try {
        const name = document.getElementById('devName').value;
        const room = document.getElementById('devRoom').value || null;
        const groupSelect = document.getElementById('devGroup');
        const targetGroupId = groupSelect ? groupSelect.value : '';
        let savedDevice = null;
        
        // Handle custom devices
        if (selectedBrand === 'custom') {
            const customProductName = document.getElementById('customProductName').value;
            if (!customProductName) { alert(devicesI18n['pleaseEnterDeviceType']); btn.disabled = false; return; }
            if (!window.customActions || window.customActions.length === 0) { 
                alert(devicesI18n['pleaseAddAction']); btn.disabled = false; return; 
            }
            
            // Create custom product
            const productBody = { name: customProductName, description: '' };
            const productRes = await apiRequest('POST', '/custom-products', productBody);
            const customProductId = productRes.id;
            
            // Create custom actions
            for (const action of window.customActions) {
                if (!action.action_name || !action.http_url) {
                    alert(devicesI18n['skippingAction']); 
                    continue;
                }
                const actionBody = {
                    custom_product_id: customProductId,
                    action_name: action.action_name,
                    http_method: action.http_method || 'POST',
                    http_url: action.http_url,
                    http_headers: action.http_headers ? JSON.parse(action.http_headers) : {},
                    http_body_template: action.http_body_template || ''
                };
                await apiRequest('POST', '/custom-actions', actionBody);
            }
            
            // Save device with custom product
            const deviceBody = {
                name: name,
                brand: 'custom',
                product_id: customProductId,
                room: room,
                credentials: {}
            };
            savedDevice = await persistDevice(deviceBody);
        } 
        // Handle catalog devices
        else {
            const creds = {};
            const brand = BRANDS.find(b => b.id === selectedBrand);
            if (brand && brand.credential_fields) {
                brand.credential_fields.forEach(f => {
                    if (f.type !== 'info') {
                        const el = document.getElementById('cred_' + f.id);
                        if (el && el.value) creds[f.id] = el.value;
                    }
                });
            }
            
            // Collect device identification required fields
            const deviceIdentifier = {};
            if (brand && brand.device_identification_required) {
                const requiredInputs = document.querySelectorAll('.brand-required-fields[data-brand="' + selectedBrand + '"] [data-type]');
                const productModelValue = (document.getElementById('devProductDisplay')?.value || '').trim();
                const productModelRequired = (brand && (brand.device_identification_required || [])).some(field => field.type === 'model');
                
                if (productModelRequired && !productModelValue) {
                    alert(devicesI18n['productModelRequired']);
                    btn.disabled = false;
                    return;
                }
                
                if (productModelRequired && productModelValue) {
                    deviceIdentifier.model = productModelValue;
                }
                
                requiredInputs.forEach(input => {
                    const fieldType = input.dataset.type;
                    const value = input.value.trim();
                    const isRequired = input.dataset.required === 'true';
                    
                    if (isRequired && !value) {
                        alert(devicesI18n['requiredField'].replace('{0}', input.previousElementSibling?.textContent || fieldType));
                        btn.disabled = false;
                        return;
                    }
                    
                    if (value) {
                        deviceIdentifier[fieldType] = value;
                    }
                });
            }
            
            const deviceBody = {
                name: name,
                brand: selectedBrand,
                product_id: document.getElementById('devProduct').value,
                room: room,
                credentials: creds,
                device_identifier: deviceIdentifier
            };
            savedDevice = await persistDevice(deviceBody);
        }
        
        if (savedDevice && savedDevice.id) {
            try {
                await syncDeviceGroupAfterSave(savedDevice, name, targetGroupId);
            } catch (groupErr) {
                alert(devicesI18n['failedAssignGroup'] + groupErr.message);
            }
        }

        closeModal();
        // Reload page to get fresh device list from server
        window.location.reload();
    } catch (e) {
        alert(devicesI18n['failedSaveDevice'] + e.message);
    } finally {
        btn.disabled = false;
    }
}

async function deleteDevice(devId) {
    const dev = window.MY_DEVICES.find(d => d.id === devId);
    if (!dev) return;
    if (!confirm(devicesI18n['removeConfirm'].replace('{0}', dev.name))) return;
    try {
        await apiRequest('DELETE', `/devices?id=${devId}`);
        const previousGroupId = deviceGroupState.get(devId) || '';
        deviceGroupState.delete(devId);
        try {
            await tidyGroupAfterLeave(previousGroupId);
        } catch (groupErr) {
            console.warn('Failed to clean up device group', groupErr);
        }
        // Reload page to get fresh device list from server
        window.location.reload();
    } catch (e) {
        alert(devicesI18n['failedDelete'] + e.message);
    }
}

async function testDevice(devId) {
    const dev = window.MY_DEVICES.find(d => d.id === devId);
    if (!dev) return;
    if (!dev.is_configured) { 
        alert(devicesI18n['completeSetupBeforeTest']); 
        return; 
    }
    try {
        const actions = dev.supported_actions || [];
        
        if (!actions.length) {
            alert(devicesI18n['failedLoadActions'] || 'No actions available for this device');
            return;
        }
        
        // Test with the first available action
        const testAction = actions[0];
        const testRequest = {
            template_id: 0,
            action: testAction,
            params: { brightness: 50 }
        };
        
        await apiRequest('POST', `/devices/test?id=${devId}`, testRequest);
        const msg = devicesI18n['testCommandSent'];
        alert(msg.replace('{0}', dev.name));
    } catch (e) {
        alert(devicesI18n['testFailed'] + e.message);
    }
}
// =============================================
// Device Groups
// =============================================
// Grouping is the default data model: every device owns an implicit single-device group, which the UI
// presents as a plain device. The "group" concept only becomes visible once a group has 2+ devices.
const deviceGroupState = new Map((window.MY_DEVICES || []).map(d => [d.id, d.device_group_id || '']));
const deviceKeyState = new Map((window.MY_DEVICES || []).map(d => [d.id, d.group_key || deviceGroupKey(d.brand, d.supported_actions)]));
let editingGroupId = null;
let groupingFromDeviceId = null;
// Compatibility key that every member of the group being edited/created must share
let groupModalKey = '';

function getGroupById(groupId) {
    return (window.DEVICE_GROUPS || []).find(g => g.id === groupId) || null;
}

function getDeviceById(deviceId) {
    return (window.MY_DEVICES || []).find(d => d.id === deviceId) || null;
}

function groupMembers(groupId) {
    if (!groupId) return [];
    return Array.from(deviceGroupState).filter(([, g]) => g === groupId).map(([id]) => id);
}

function isVisibleGroup(groupId) {
    return groupMembers(groupId).length >= 2;
}

// A group's compatibility key is that of its first member (same rule as the server-side render)
function groupKeyOf(groupId) {
    const first = groupMembers(groupId)[0];
    return first ? (deviceKeyState.get(first) || '') : '';
}

function brandName(brandId) {
    const brand = (typeof BRANDS !== 'undefined' ? BRANDS : []).find(b => b.id === brandId);
    return brand ? brand.name : brandId;
}

async function createDeviceGroup(name, option) {
    const created = await apiRequest('POST', '/device-groups', { name, option: option || 'sequential' });
    const id = created && (created.id || created.ID);
    if (!id) throw new Error('missing group id in response');
    return id;
}

async function assignDeviceToGroup(deviceId, groupId) {
    await apiRequest('POST', `/device-groups/assign?device_id=${encodeURIComponent(deviceId)}&group_id=${encodeURIComponent(groupId)}`);
    deviceGroupState.set(deviceId, groupId);
}

// Gives a device its own implicit single-device group (named after the device)
async function giveDeviceOwnGroup(deviceId, deviceName) {
    const groupId = await createDeviceGroup(deviceName || deviceId, 'sequential');
    try {
        await assignDeviceToGroup(deviceId, groupId);
    } catch (e) {
        await apiRequest('DELETE', `/device-groups?id=${encodeURIComponent(groupId)}`).catch(() => {});
        throw e;
    }
    return groupId;
}

// After devices leave a group: delete it when empty, or rename it after its last device when it
// collapses back to an implicit single-device group.
async function tidyGroupAfterLeave(groupId) {
    if (!groupId) return;
    const members = groupMembers(groupId);
    if (members.length === 0) {
        await apiRequest('DELETE', `/device-groups?id=${encodeURIComponent(groupId)}`);
    } else if (members.length === 1) {
        const last = getDeviceById(members[0]);
        if (last) await apiRequest('PATCH', `/device-groups/update?id=${encodeURIComponent(groupId)}`, { name: last.name });
    }
}

// Keeps group membership consistent after a device is created or edited.
// targetGroupId is a visible group chosen in the form, or '' for a standalone device.
async function syncDeviceGroupAfterSave(savedDevice, deviceName, targetGroupId) {
    const deviceId = savedDevice.id;
    const previousGroupId = savedDevice.device_group_id || '';
    deviceGroupState.set(deviceId, previousGroupId);
    deviceKeyState.set(deviceId, savedDevice.group_key || '');

    if (targetGroupId && targetGroupId !== previousGroupId &&
        (!savedDevice.group_key || savedDevice.group_key !== groupKeyOf(targetGroupId))) {
        const group = getGroupById(targetGroupId);
        alert(devicesI18n['groupIncompatibleOnSave'].replace('{0}', group ? group.name : ''));
        targetGroupId = '';
    }

    if (targetGroupId) {
        if (targetGroupId !== previousGroupId) {
            await assignDeviceToGroup(deviceId, targetGroupId);
            await tidyGroupAfterLeave(previousGroupId);
        }
        return;
    }

    if (previousGroupId && groupMembers(previousGroupId).length === 1) {
        const group = getGroupById(previousGroupId);
        if (group && group.name !== deviceName) {
            await apiRequest('PATCH', `/device-groups/update?id=${encodeURIComponent(previousGroupId)}`, { name: deviceName });
        }
        return;
    }

    // New device, legacy device without a group, or a device leaving a visible group
    await giveDeviceOwnGroup(deviceId, deviceName);
    await tidyGroupAfterLeave(previousGroupId);
}

async function removeFromGroup(deviceId) {
    const dev = getDeviceById(deviceId);
    const groupId = deviceGroupState.get(deviceId) || '';
    const group = getGroupById(groupId);
    if (!dev || !group) return;
    if (!confirm(devicesI18n['removeFromGroupConfirm'].replace('{0}', dev.name).replace('{1}', group.name))) return;
    try {
        await giveDeviceOwnGroup(deviceId, dev.name);
        await tidyGroupAfterLeave(groupId);
        window.location.reload();
    } catch (e) {
        alert(devicesI18n['failedAssignGroup'] + e.message);
    }
}

async function ungroupGroup(groupId) {
    const group = getGroupById(groupId);
    if (!group) return;
    if (!confirm(devicesI18n['ungroupConfirm'].replace('{0}', group.name))) return;
    try {
        for (const deviceId of groupMembers(groupId)) {
            const dev = getDeviceById(deviceId);
            await giveDeviceOwnGroup(deviceId, dev ? dev.name : deviceId);
        }
        await apiRequest('DELETE', `/device-groups?id=${encodeURIComponent(groupId)}`);
        window.location.reload();
    } catch (e) {
        alert(devicesI18n['failedUngroup'] + e.message);
        window.location.reload();
    }
}

// groupId: manage an existing visible group. initialDeviceId: start grouping from this standalone device.
function openGroupModal(groupId, initialDeviceId) {
    const group = groupId && isVisibleGroup(groupId) ? getGroupById(groupId) : null;
    editingGroupId = group ? group.id : null;
    groupingFromDeviceId = group ? null : (initialDeviceId || null);
    groupModalKey = group ? groupKeyOf(group.id) : (deviceKeyState.get(groupingFromDeviceId) || '');

    document.getElementById('groupForm').reset();
    document.getElementById('groupModalTitle').textContent = group ? devicesI18n['editGroupTitle'] : devicesI18n['groupDevicesTitle'];
    document.getElementById('groupSaveBtn').textContent = group ? devicesI18n['saveChanges'] : devicesI18n['createGroup'];
    document.getElementById('groupUngroupBtn').style.display = group ? '' : 'none';
    document.getElementById('groupName').value = group ? group.name : '';

    const option = group && group.option === 'queue' ? 'queue' : 'sequential';
    const radio = document.querySelector(`input[name="groupOption"][value="${option}"]`);
    if (radio) radio.checked = true;

    document.getElementById('groupDeviceSearch').value = '';
    renderGroupDeviceList(editingGroupId, groupingFromDeviceId);

    document.getElementById('groupModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('groupName').focus();
}

function closeGroupModal() {
    const modal = document.getElementById('groupModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    editingGroupId = null;
    groupingFromDeviceId = null;
    groupModalKey = '';
}

function renderGroupDeviceList(groupId, initialDeviceId) {
    const container = document.getElementById('groupDeviceList');
    const devices = window.MY_DEVICES || [];
    if (devices.length === 0) {
        container.innerHTML = `<p class="group-device-empty">${escapeHtml(devicesI18n['groupNoDevices'])}</p>`;
        updateGroupSelectedCount();
        return;
    }

    const candidates = devices.filter(dev => {
        const isMember = groupId && (deviceGroupState.get(dev.id) || '') === groupId;
        return isMember || (groupModalKey && deviceKeyState.get(dev.id) === groupModalKey);
    });

    const compatNote = document.getElementById('groupCompatNote');
    if (compatNote) {
        const [keyBrand, keyActions] = groupModalKey.split('|');
        compatNote.innerHTML = groupModalKey
            ? `${escapeHtml(devicesI18n['groupCompatibleFilter'].replace('{0}', brandName(keyBrand)))}
               <span class="group-compat-actions">${(keyActions || '').split(',').map(a => `<span class="action-chip">${escapeHtml(a)}</span>`).join('')}</span>`
            : '';
    }

    if (candidates.length < 2 && !groupId) {
        container.innerHTML = `<p class="group-device-empty">${escapeHtml(devicesI18n['groupNoCompatibleDevices'])}</p>`;
        updateGroupSelectedCount();
        return;
    }

    container.innerHTML = candidates.map(dev => {
        const currentGroupId = deviceGroupState.get(dev.id) || '';
        const checked = (groupId && currentGroupId === groupId) || dev.id === initialDeviceId;
        const incompatible = deviceKeyState.get(dev.id) !== groupModalKey || !groupModalKey;
        // Only mention groups the user can actually see (2+ devices)
        const otherGroup = currentGroupId && currentGroupId !== groupId && isVisibleGroup(currentGroupId)
            ? getGroupById(currentGroupId) : null;
        const color = dev.brand_color || '#888888';
        const note = otherGroup
            ? `<span class="group-device-note">${escapeHtml(devicesI18n['groupCurrentlyIn'].replace('{0}', otherGroup.name))}</span>`
            : '';
        return `
        <label class="group-device-row" data-search="${escapeHtml(((dev.name || '') + ' ' + (dev.product_name || '') + ' ' + (dev.room || '')).toLowerCase())}">
            <input type="checkbox" value="${escapeHtml(dev.id)}" ${checked ? 'checked' : ''} onchange="updateGroupSelectedCount()">
            <span class="group-device-color" style="background:${escapeHtml(color)}"></span>
            <span class="group-device-info">
                <span class="group-device-name">${escapeHtml(dev.name)}</span>
                <span class="group-device-meta">${escapeHtml(dev.product_name || dev.product_id || '')}${dev.room ? ' · 🏠 ' + escapeHtml(dev.room) : ''}</span>
            </span>
            ${incompatible ? `<span class="group-device-note incompatible">${escapeHtml(devicesI18n['groupIncompatibleMember'])}</span>` : note}
        </label>`;
    }).join('');
    updateGroupSelectedCount();
}

function filterGroupDeviceList(term) {
    const q = (term || '').trim().toLowerCase();
    document.querySelectorAll('#groupDeviceList .group-device-row').forEach(row => {
        row.style.display = !q || row.dataset.search.includes(q) ? '' : 'none';
    });
}

function updateGroupSelectedCount() {
    const count = document.querySelectorAll('#groupDeviceList input[type="checkbox"]:checked').length;
    const el = document.getElementById('groupSelectedCount');
    if (el) el.textContent = `(${devicesI18n['groupSelectedCount'].replace('{0}', count)})`;
}

async function saveGroup(e) {
    e.preventDefault();
    const btn = document.getElementById('groupSaveBtn');
    const name = document.getElementById('groupName').value.trim();
    if (!name) {
        alert(devicesI18n['groupNameRequired']);
        return;
    }
    const optionEl = document.querySelector('input[name="groupOption"]:checked');
    const option = optionEl ? optionEl.value : 'sequential';

    const selectedIds = new Set(
        Array.from(document.querySelectorAll('#groupDeviceList input[type="checkbox"]:checked')).map(cb => cb.value)
    );
    if (selectedIds.size < 2) {
        alert(devicesI18n['groupMinDevices']);
        return;
    }
    const incompatible = Array.from(selectedIds).filter(id => !groupModalKey || deviceKeyState.get(id) !== groupModalKey);
    if (incompatible.length) {
        const names = incompatible.map(id => (getDeviceById(id) || {}).name || id).join(', ');
        alert(devicesI18n['groupIncompatibleSelected'].replace('{0}', names));
        return;
    }

    btn.disabled = true;
    try {
        let anchorGroupId = editingGroupId;
        if (!anchorGroupId && groupingFromDeviceId && selectedIds.has(groupingFromDeviceId)) {
            // Reuse the starting device's implicit group so conditions already targeting it keep working
            const ownGroupId = deviceGroupState.get(groupingFromDeviceId) || '';
            if (ownGroupId && groupMembers(ownGroupId).length === 1) anchorGroupId = ownGroupId;
        }
        if (anchorGroupId) {
            await apiRequest('PATCH', `/device-groups/update?id=${encodeURIComponent(anchorGroupId)}`, { name, option });
        } else {
            anchorGroupId = await createDeviceGroup(name, option);
        }

        const leftGroups = new Set();
        const failures = [];
        for (const dev of window.MY_DEVICES || []) {
            const currentGroupId = deviceGroupState.get(dev.id) || '';
            try {
                if (selectedIds.has(dev.id) && currentGroupId !== anchorGroupId) {
                    await assignDeviceToGroup(dev.id, anchorGroupId);
                    if (currentGroupId) leftGroups.add(currentGroupId);
                } else if (!selectedIds.has(dev.id) && currentGroupId === anchorGroupId) {
                    await giveDeviceOwnGroup(dev.id, dev.name);
                }
            } catch (err) {
                failures.push(`${dev.name}: ${err.message}`);
            }
        }
        for (const groupId of leftGroups) {
            try {
                await tidyGroupAfterLeave(groupId);
            } catch (err) {
                console.warn('Failed to clean up device group', groupId, err);
            }
        }
        if (failures.length) {
            alert(devicesI18n['failedAssignGroup'] + '\n' + failures.join('\n'));
        }

        closeGroupModal();
        window.location.reload();
    } catch (err) {
        alert(devicesI18n['failedSaveGroup'] + err.message);
    } finally {
        btn.disabled = false;
    }
}

document.addEventListener('click', e => {
    const modal = document.getElementById('groupModal');
    if (modal && e.target === modal) {
        closeGroupModal();
    }
});