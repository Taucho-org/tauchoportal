// Load i18n translations
const devicesI18n = JSON.parse(document.getElementById('devicesTranslations').textContent);

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

async function apiRequest(method, path, body) {
    const opts = { method, credentials: 'include', headers: {} };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const r = await fetch(API_BASE + path, opts);
    if (!r.ok) {
        const tx = await r.text();
        throw new Error(tx || r.status);
    }
    return r.status === 204 ? null : r.json();
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

function openAddModal() {
    editingId = null;
    selectedBrand = null;
    selectedProduct = null;
    window.customActions = [];
    showStep(1);
    document.getElementById('deviceModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
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
            <button class="qc-add-btn" onclick="event.stopPropagation(); selectQuickConnectDevice('${escapeJsString(product.id)}', '${escapeJsString(product.name)}', '${escapeJsString(quickConnectBrandId)}')">${escapeJsString(devicesI18n['quickConnectIOwn'] || 'I Own This')}</button>
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
        document.getElementById('devSaveBtn').textContent = devicesI18n['addDeviceButton'];
        editingId = null;
        showStep(2);
        document.getElementById('deviceModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close modal when clicking outside
document.addEventListener('click', e => {
    const qcModal = document.getElementById('quickConnectModal');
    if (qcModal && e.target === qcModal) {
        closeQuickConnectModal();
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
            devNameInput.placeholder = 'e.g., ' + productName;
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
    document.getElementById('step2Title').textContent = actionWord + ' ' + brand.name + ' Device';
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
            if (titleEl) titleEl.textContent = `${brandName} is connected`;
            if (descEl) descEl.textContent = `Using credentials from your Brand Settings. No additional brand credentials needed.`;
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
                <input type="text" placeholder="Action name (e.g., turn_on, set_brightness)" 
                        value="${action.action_name || ''}" 
                        onchange="customActions[${idx}].action_name = this.value"
                        style="flex:1">
                <button type="button" class="btn btn-secondary" onclick="removeCustomAction(${idx})">Remove</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem">
                <input type="text" placeholder="HTTP Method (GET, POST, PUT...)" 
                        value="${action.http_method || 'POST'}" 
                        onchange="customActions[${idx}].http_method = this.value">
                <input type="text" placeholder="URL (e.g., http://device.local/api/action)" 
                        value="${action.http_url || ''}" 
                        onchange="customActions[${idx}].http_url = this.value">
            </div>
            <textarea placeholder="Headers (JSON format, optional). Example: {\"Content-Type\": \"application/json\"}" 
                        rows="2" style="width:100%; padding:0.5rem; margin-bottom:0.75rem; font-family:monospace; font-size:0.85rem"
                        onchange="customActions[${idx}].http_headers = this.value">${action.http_headers || ''}</textarea>
            <textarea placeholder="Body template (JSON with {placeholders} for values). Example: {\"action\": \"{action_name}\", \"brightness\": {brightness}}" 
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
async function saveDevice(e) {
    e.preventDefault();
    const btn = document.getElementById('devSaveBtn');
    btn.disabled = true;
    try {
        const name = document.getElementById('devName').value;
        const room = document.getElementById('devRoom').value || null;
        
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
            if (editingId) {
                await apiRequest('PATCH', `/devices/update?id=${editingId}`, deviceBody);
            } else {
                await apiRequest('POST', '/devices', deviceBody);
            }
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
                    alert(devicesI18n['productModelRequired'] || 'Product model is required');
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
                        alert((input.previousElementSibling?.textContent || fieldType) + ' is required');
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
            if (editingId) {
                await apiRequest('PATCH', `/devices/update?id=${editingId}`, deviceBody);
            } else {
                await apiRequest('POST', '/devices', deviceBody);
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
    if (!confirm(`Remove "${dev.name}"?\n\nConditions using this device will lose their action.`)) return;
    try {
        await apiRequest('DELETE', `/devices?id=${devId}`);
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