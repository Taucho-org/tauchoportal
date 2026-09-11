(function () {
    'use strict';

    // Cache for event metadata to avoid repeated API calls
    let eventMetadataCache = {};
    let platformEventsCache = {};

    // Stub vars - kept for compatibility; event data is fetched from API helpers.
    const PLATFORM_EVENTS = {};
    const EVENT_PARAMETERS = {};

    // API helper that will be defined later
    let apiGet_func = null;

    // Fetch and cache event metadata for a specific platform/event combo
    async function getEventMetadata(platform, eventType) {
        if (!apiGet_func) return null;
        const cacheKey = `${platform}:${eventType}`;
        if (eventMetadataCache[cacheKey]) {
            return eventMetadataCache[cacheKey];
        }
        try {
            const data = await apiGet_func(`/event-metadata/${platform}/${eventType}`);
            eventMetadataCache[cacheKey] = data;
            return data;
        } catch (e) {
            console.error(`Failed to fetch event metadata for ${platform}/${eventType}:`, e);
            return null;
        }
    }

    // Fetch and cache available events for a specific platform
    async function getEventsForPlatform(platform) {
        console.log('[getEventsForPlatform] Called for platform:', platform);
        if (!apiGet_func) {
            console.error('[getEventsForPlatform] apiGet_func is null!');
            return [];
        }
        
        if (!platform) {
            console.error('[getEventsForPlatform] Platform is null or empty!');
            return [];
        }
        
        const cacheKey = `platform:${platform}`;
        if (platformEventsCache[cacheKey]) {
            console.log('[getEventsForPlatform] Returning cached data for', platform);
            return platformEventsCache[cacheKey];
        }
        
        try {
            console.log('[getEventsForPlatform] Calling API: /event-metadata/' + platform);
            const data = await apiGet_func(`/event-metadata/${platform}`);
            console.log('[getEventsForPlatform] API response received:', data);
            // Transform from { platform, events: ["comment", "gift", ...] }
            // to [{ value: 'comment' }, { value: 'gift' }, ...]
            const events = (data.events || []).map(evt => ({ value: evt }));
            platformEventsCache[cacheKey] = events;
            console.log('[getEventsForPlatform] Cached for', platform, ':', events);
            return events;
        } catch (e) {
            console.error(`Failed to fetch events for platform ${platform}:`, e);
            return [];
        }
    }

    // Convert API field response to form field structure
    // API returns: { platform, event_type, fields: [{ name, type, description, optional }, ...] }
    // We need: [{ name: 'field_name', label: 'field_name', type: 'text/number/checkbox', value: '' }, ...]
    async function getEventParameters(platform, eventType) {
        const metadata = await getEventMetadata(platform, eventType);
        if (!metadata || !metadata.fields) return [];
        
        // Map API field types to HTML input types
        const typeMapping = {
            'string': 'text',
            'number': 'number',
            'boolean': 'checkbox',
            'timestamp': 'text',
            'array': 'text',
            'object': 'text'
        };
        
        return getEventMetadataFields(metadata)
            .map((field) => ({
                name: field.name,
                label: field.name,
                type: typeMapping[field.type] || 'text',
                value: formatEventFieldValueForInput(defaultEventFieldValue(field.name, field, platform, eventType))
            }));
    }

    // Note: Device actions are now fetched from backend API (/devices/{id}/actions)
    // No longer uses hardcoded PRODUCTS object
    const PRODUCTS = {}; // Kept for backward compatibility, but should use API instead

    const platformIcons = window.__platformIcons || {};
    const PLATFORM_META = { youtube: { icon: platformIcons.youtube, label: 'YouTube' }, twitch: { icon: platformIcons.twitch, label: 'Twitch' }, niconico: { icon: platformIcons.niconico, label: 'NicoNico' }, instagram: { icon: platformIcons.instagram, label: 'Instagram' }, tiktok: { icon: platformIcons.tiktok, label: 'TikTok' }, kick: { icon: platformIcons.kick, label: 'Kick' }, facebook: { icon: platformIcons.facebook, label: 'Facebook' }, x: { icon: platformIcons.x, label: 'X' }, bilibili: { icon: platformIcons.bilibili, label: 'Bilibili' }, twitcasting: { icon: platformIcons.twitcasting, label: 'TwitCasting' } };

    const escHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const isZeroDate = (v) => !v || v === '0001-01-01T00:00:00Z' || v === '0001-01-01';
    const formatDate = (v, fb = '-') => isZeroDate(v) ? fb : new Date(v).toLocaleDateString();
    const formatDateTime = (v, fb = '-') => isZeroDate(v) ? fb : new Date(v).toLocaleString();
    const hasActiveFilter = (f) => !!(f && ((f.skip_if_title_contains && f.skip_if_title_contains.length) || (f.skip_if_description_contains && f.skip_if_description_contains.length) || (f.require_title_contains && f.require_title_contains.length)));
    const getApiBase = () => typeof API_BASE !== 'undefined' ? API_BASE : '/api';

    async function apiRequest(method, path, body) {
        const options = { method, credentials: 'include', headers: {} };
        if (body) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
        const response = await fetch(getApiBase() + path, options);
        if (!response.ok) throw new Error(await response.text() || response.status);
        return response.status === 204 ? null : response.json();
    }
    async function apiGet(path) {
        const response = await fetch(getApiBase() + path, { credentials: 'include' });
        if (!response.ok) {
            const error = new Error(await response.text() || response.status);
            error.status = response.status;
            throw error;
        }
        return response.json();
    }
    function navigate(path) {
        window.location.href = path;
    }
    function openModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
    function closeModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
    function showMonToast(message) { const toast = document.getElementById('monToast'); if (!toast) return; toast.textContent = message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 3000); }
    function getEventLabel(type, platform) {
        // Try to get translated label from i18n, fallback to event type itself
        const i18n = window._i18nMsg || {};
        const translationKey = `event.type.${type}`;
        const translated = i18n[translationKey];
        return translated || type;
    }

    function getActiveWatchTargetId(fallback = '') {
        const activeChannel = typeof window.currentChannel !== 'undefined' ? window.currentChannel : null;
        return fallback || activeChannel?.id || '';
    }

    function defaultEventFieldValue(fieldName, field, platform, eventType, options = {}) {
        const now = options.now || new Date().toISOString();
        const watchTargetId = getActiveWatchTargetId(options.watchTargetId);
        const defaultsByName = {
            id: 'evt_test_' + Date.now(),
            user_id: 1,
            watch_target_id: watchTargetId,
            stream_event_id: 'stream_evt_test_' + Date.now(),
            platform,
            event_type: eventType,
            received_at: now,
            created_at: now
        };
        if (Object.prototype.hasOwnProperty.call(defaultsByName, fieldName)) return defaultsByName[fieldName];
        switch (field.type) {
            case 'number':
                return 0;
            case 'boolean':
                return false;
            case 'array':
                return [];
            case 'object':
                return {};
            case 'timestamp':
                return now;
            default:
                return '';
        }
    }

    function formatEventFieldValueForInput(value) {
        if (Array.isArray(value) || (value && typeof value === 'object')) {
            return JSON.stringify(value);
        }
        return value;
    }

    function coerceEventFieldValue(value, field, fallback) {
        if (value === undefined || value === null || value === '') return fallback;
        switch (field.type) {
            case 'number': {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : Number(fallback) || 0;
            }
            case 'boolean':
                return value === true || value === 'true';
            case 'array':
                if (Array.isArray(value)) return value;
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : fallback;
                } catch {
                    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
                }
            case 'object':
                if (typeof value === 'object') return value;
                try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
                } catch {
                    return fallback;
                }
            default:
                return String(value);
        }
    }

    function getEventMetadataFields(metadata) {
        if (!metadata || !metadata.fields) return [];
        if (Array.isArray(metadata.fields)) {
            return metadata.fields.filter((field) => field && field.name);
        }
        return Object.entries(metadata.fields)
            .map(([fieldName, field]) => ({ ...field, name: field.name || fieldName }))
            .filter((field) => field.name);
    }

    async function createTestEventFromMetadata(platform, eventType, customParams = {}, options = {}) {
        const metadata = await getEventMetadata(platform, eventType);
        if (!metadata || !metadata.fields) {
            throw new Error(`Event metadata not available for ${platform}/${eventType}`);
        }
        const event = {};
        getEventMetadataFields(metadata).forEach((field) => {
            const fallback = defaultEventFieldValue(field.name, field, platform, eventType, options);
            event[field.name] = coerceEventFieldValue(customParams[field.name], field, fallback);
        });
        event.platform = platform;
        event.event_type = eventType;
        if (options.watchTargetId && Object.prototype.hasOwnProperty.call(event, 'watch_target_id')) {
            event.watch_target_id = options.watchTargetId;
        }
        return event;
    }

    // Set up apiGet_func for use in API fetch functions
    apiGet_func = apiGet;
    
    // ============================================================
    // Device Action Parameters (Sending Params) Helper Functions
    // ============================================================

    // Try to parse JSON string, return null if invalid
    function parseJSON(jsonStr) {
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            return null;
        }
    }

    // Extract keys from JSON string for param selection dropdown
    function getParamNamesFromBody(bodyJson) {
        const parsed = parseJSON(bodyJson);
        if (!parsed || typeof parsed !== 'object') return [];
        return Object.keys(parsed);
    }

    // Build evaluator UI based on selected type
    function buildEvaluatorUI(evaluatorType) {
        const container = document.getElementById('evaluatorUIContainer');
        if (!container) return;
        
        let html = '';
        
        switch (evaluatorType) {
            case 'extract_number':
                html = `
                    <div class="form-group">
                        <label for="evaluatorRange">${window._i18nMsg?.['channelLayout.numberRange'] || 'Number Range'}</label>
                        <input type="text" id="evaluatorRange" placeholder="0-100" value="0-100">
                    </div>
                `;
                break;
            case 'extract_hex_color':
                html = `
                    <div class="form-help">${window._i18nMsg?.['channelLayout.hexColorHelp'] || 'Auto-detects hex color codes'}</div>
                `;
                break;
            case 'extract_text':
                html = `
                    <div class="form-group">
                        <label for="evaluatorPattern">${window._i18nMsg?.['channelLayout.textPattern'] || 'Text Pattern'}</label>
                        <input type="text" id="evaluatorPattern" placeholder="keyword or pattern">
                    </div>
                `;
                break;
            case 'regex_extract':
                html = `
                    <div class="form-group">
                        <label for="evaluatorRegex">${window._i18nMsg?.['channelLayout.regexPattern'] || 'Regular Expression'}</label>
                        <input type="text" id="evaluatorRegex" placeholder="(.+)" value="(.+)">
                    </div>
                `;
                break;
            case 'conditional':
                html = `
                    <div class="form-help">${window._i18nMsg?.['channelLayout.conditionalHelp'] || 'Execute if condition is met'}</div>
                    <div class="form-group">
                        <label for="evaluatorDefaultValue">${window._i18nMsg?.['channelLayout.defaultValue'] || 'Default Value'}</label>
                        <input type="text" id="evaluatorDefaultValue" placeholder="default_value">
                    </div>
                `;
                break;
            case 'fixed_value':
                html = `
                    <div class="form-group">
                        <label for="evaluatorFixedValue">${window._i18nMsg?.['channelLayout.fixedValue'] || 'Fixed Value'}</label>
                        <input type="text" id="evaluatorFixedValue" placeholder="enter fixed value">
                    </div>
                `;
                break;
        }
        
        container.innerHTML = html;
    }

    // Build evaluator structure from UI values
    function buildEvaluatorStructure(evaluatorType) {
        const structure = { Operator: '' };
        
        switch (evaluatorType) {
            case 'extract_number':
                const range = (document.getElementById('evaluatorRange') || {}).value || '0-100';
                structure.Operator = 'EXTRACT_NUMBER';
                structure.Variables = [range];
                break;
            case 'extract_hex_color':
                structure.Operator = 'REGEX_EXTRACT';
                structure.Variables = ['#([0-9A-Fa-f]{6})'];
                break;
            case 'extract_text':
                const pattern = (document.getElementById('evaluatorPattern') || {}).value || '';
                structure.Operator = 'EXTRACT_TEXT';
                structure.Variables = [pattern];
                break;
            case 'regex_extract':
                const regex = (document.getElementById('evaluatorRegex') || {}).value || '(.+)';
                structure.Operator = 'REGEX_EXTRACT';
                structure.Variables = [regex];
                break;
            case 'conditional':
                const defaultVal = (document.getElementById('evaluatorDefaultValue') || {}).value || '';
                structure.Operator = 'CONDITION';
                structure.SubConditions = [{ Operator: 'DEFAULT', Result: defaultVal }];
                break;
            case 'fixed_value':
                const fixedVal = (document.getElementById('evaluatorFixedValue') || {}).value || '';
                structure.Operator = 'FIXED_VALUE';
                structure.Result = fixedVal;
                break;
        }
        
        return structure;
    }

    // Update param name dropdown based on body JSON
    window.updateParamNameDropdown = function() {
        const bodyText = (document.getElementById('condDeviceActionBody') || {}).value || '';
        const paramNameSelect = document.getElementById('condParamName');
        if (!paramNameSelect) return;
        
        const paramNames = getParamNamesFromBody(bodyText);
        const currentValue = paramNameSelect.value;
        
        // Clear and repopulate
        paramNameSelect.innerHTML = `<option value="">${window._i18nMsg?.['channelLayout.selectParam'] || 'Select parameter...'}</option>`;
        paramNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            paramNameSelect.appendChild(opt);
        });
        
        // Update validation message
        const msgEl = document.getElementById('bodyValidationMsg');
        if (msgEl) {
            const foundMsg = window._i18nMsg?.['channelLayout.parametersFound'] || 'parameter(s) found';
            const invalidMsg = window._i18nMsg?.['channelLayout.invalidJsonOrNoParams'] || '⚠️ Invalid JSON or no parameters';
            msgEl.textContent = paramNames.length > 0 
                ? `${paramNames.length} ${foundMsg}`
                : invalidMsg;
        }
    };

    // Update evaluator UI when type changes
    window.updateEvaluatorUI = function() {
        const type = (document.getElementById('evaluatorType') || {}).value || '';
        buildEvaluatorUI(type);
    };

    // Update result preview
    window.updateResultPreview = function() {
        const bodyText = (document.getElementById('condDeviceActionBody') || {}).value || '';
        const paramName = (document.getElementById('condParamName') || {}).value || '';
        const evaluatorType = (document.getElementById('evaluatorType') || {}).value || '';
        
        const preview = document.getElementById('resultPreview');
        const previewContent = document.getElementById('resultPreviewContent');
        
        if (!preview || !previewContent) return;
        
        if (!bodyText || !paramName || !evaluatorType) {
            preview.style.display = 'none';
            return;
        }
        
        const parsed = parseJSON(bodyText);
        if (!parsed) {
            preview.style.display = 'block';
            previewContent.textContent = window._i18nMsg?.['channelLayout.invalidJsonInBody'] || '⚠️ Invalid JSON in body template';
            return;
        }
        
        // Clone and update with example value
        const result = JSON.parse(JSON.stringify(parsed));
        result[paramName] = '[evaluated_value]';
        
        preview.style.display = 'block';
        previewContent.textContent = JSON.stringify(result, null, 2);
    };

    window.onclick = function (event) { ['conditionModal', 'filterModal', 'testConditionModal'].forEach((id) => { if (event.target === document.getElementById(id)) closeModal(id); }); };
    
    // Load device templates and populate sending parameters form
    window.loadDeviceTemplates = async function(brandId) {
        try {
            const response = await apiGet(`/device-templates?brand=${encodeURIComponent(brandId)}`);
            if (!response || !response.length) {
                console.warn('[loadDeviceTemplates] No templates found for brand:', brandId);
                document.getElementById('sendingParamsSection').style.display = 'none';
                return;
            }
            
            // Use first template as default
            const template = response[0];
            const bodyTextarea = document.getElementById('condDeviceActionBody');
            const paramDropdown = document.getElementById('condParamName');
            const sendingParamsSection = document.getElementById('sendingParamsSection');
            
            if (!bodyTextarea || !paramDropdown || !sendingParamsSection) return;
            
            // Populate body template
            if (template.http_body_template) {
                try {
                    // If it's a JSON string, format it nicely
                    const parsed = typeof template.http_body_template === 'string' 
                        ? JSON.parse(template.http_body_template)
                        : template.http_body_template;
                    bodyTextarea.value = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    bodyTextarea.value = template.http_body_template;
                }
            }
            
            // Populate parameter dropdown from required_parameters
            if (paramDropdown) {
                while (paramDropdown.options.length > 1) {
                    paramDropdown.remove(1);
                }
                
                if (template.required_parameters && Array.isArray(template.required_parameters)) {
                    template.required_parameters.forEach(param => {
                        const optionText = typeof param === 'string' ? param : param.name || param;
                        paramDropdown.add(new Option(optionText, optionText));
                    });
                }
            }
            
            // Show sending parameters section
            sendingParamsSection.style.display = 'block';
            
            // Trigger parameter dropdown update to populate constraints
            updateParamNameDropdown();
            
        } catch (err) {
            console.error('[loadDeviceTemplates] Error loading templates:', err);
            const sendingParamsSection = document.getElementById('sendingParamsSection');
            if (sendingParamsSection) sendingParamsSection.style.display = 'none';
        }
    };
    
    Object.assign(window, { PLATFORM_EVENTS, EVENT_PARAMETERS, PLATFORM_META, PRODUCTS, escHtml, isZeroDate, formatDate, formatDateTime, hasActiveFilter, navigate, openModal, closeModal, showMonToast, apiRequest, apiGet, getEventLabel, createTestEventFromMetadata, getEventMetadata, getEventParameters, getEventsForPlatform, updateParamNameDropdown: window.updateParamNameDropdown, updateEvaluatorUI: window.updateEvaluatorUI, updateResultPreview: window.updateResultPreview, loadDeviceTemplates: window.loadDeviceTemplates });
})();
