(function () {
    'use strict';
    const { PLATFORM_META, PLATFORM_EVENTS, PRODUCTS, apiRequest, escHtml, formatDate, formatDateTime, openModal, closeModal, getEventLabel, buildTestEvent, getEventParameters } = window;
    const t = window.conditionsListTranslations || {}; // Fallback to empty object
    const EVENT_BADGE_CLASS = { comment: 'comment', superchat: 'gift', sticker: 'gift', cheer: 'gift', gift: 'gift', member: 'follow', follow: 'follow', sub: 'follow', nicoru: 'effect', hype_train: 'stream', raid: 'stream', stream_start: 'stream', stream_end: 'stream' };
    let CHANNELS = [], testingConditionId = null, deviceCache = null;

    async function loadWatches() { 
        CHANNELS = (await apiRequest('GET', '/watches')).map((watch) => ({ id: watch.id, name: watch.name, platform: watch.platform, channelId: watch.channel_id, lastStream: formatDate(watch.last_stream_at, 'Never') })); 
        window.ChannelsSidebar.setExistingChannels(CHANNELS); 
    }

    async function route() { 
        await loadWatches(); 
        window.scrollTo(0, 0); 
    }

    function getChannelIdFromUrl() {
        const match = window.location.pathname.match(/^\/channels\/([^\/]+)\/conditions\/?$/);
        return match ? match[1] : null;
    }

    function getChannelNameFromDOM() {
        return document.querySelector('.breadcrumb a[href*="/channels/"]')?.textContent || '';
    }

    function getPlatformFromDOM() {
        const iconSpan = document.querySelector('.page-header-top .platform-icon-sm');
        if (iconSpan) {
            const classes = iconSpan.className;
            // Extract platform from className - it's the second class after "platform-icon-sm"
            const parts = classes.split(' ');
            const platformIdx = parts.indexOf('platform-icon-sm');
            if (platformIdx !== -1 && parts[platformIdx + 1]) {
                return parts[platformIdx + 1];
            }
        }
        return null;
    }

    function getConditionNameFromCard(conditionId) {
        const card = document.querySelector(`[data-cond-id="${conditionId}"]`);
        return card ? card.querySelector('.rule-name')?.textContent || '' : '';
    }

    function navigate(path) { 
        window.location.href = path; 
    }

    function filterConds(type, button) { 
        document.querySelectorAll('.filter-tabs .filter-tab').forEach((tab) => tab.classList.remove('active')); 
        button.classList.add('active'); 
        document.querySelectorAll('#conditionsList .rule-card').forEach((card) => { 
            card.style.display = type === 'all' || card.dataset.type === type ? 'block' : 'none'; 
        }); 
    }

    async function updateConditionFields(conditionId, fields) {
        try {
            await apiRequest('PATCH', `/conditions/update?id=${encodeURIComponent(conditionId)}`, fields);
            window.location.reload();
            return true;
        } catch (error) {
            const errorMsg = error.message || 'Unknown error';
            alert((t.updateError || 'Failed to update condition: {error}').replace('{error}', errorMsg));
            return false;
        }
    }

    function startEditConditionName(event, conditionId, currentName) {
        event.stopPropagation();
        const node = event.target.closest('.editable-name');
        if (!node || node.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'name-edit-input';
        input.value = currentName;
        node.replaceChildren(input);
        input.focus();
        input.select();

        const restore = () => {
            node.replaceChildren(document.createTextNode(currentName + ' '));
            const pencil = document.createElement('span');
            pencil.className = 'name-edit-pencil';
            pencil.textContent = '✏️';
            node.appendChild(pencil);
        };
        const finish = async () => {
            const name = input.value.trim();
            if (!name) {
                alert(window._i18nMsg?.['condition.nameEmpty'] || 'Condition name cannot be empty');
                restore();
                return;
            }
            if (name === currentName) {
                restore();
                return;
            }
            if (!(await updateConditionFields(conditionId, { name }))) restore();
        };

        input.addEventListener('blur', finish, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') restore();
        });
    }

    function startEditConditionFilter(event, conditionId, currentFilter) {
        event.preventDefault();
        event.stopPropagation();
        const node = event.target.closest('.editable-condition-filter');
        if (!node || node.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'name-edit-input condition-filter-input';
        input.value = currentFilter;
        node.replaceChildren(input);
        input.focus();
        input.select();

        const restore = () => {
            node.replaceChildren();
            if (currentFilter) {
                node.append(document.createTextNode(t.eventContaining || ' containing '));
                const code = document.createElement('code');
                code.textContent = `"${currentFilter}"`;
                node.appendChild(code);
            } else {
                node.textContent = ` + ${window._i18nMsg?.['channelLayout.keywordFilter'] || 'Keyword Filter'} `;
            }
            const pencil = document.createElement('span');
            pencil.className = 'name-edit-pencil';
            pencil.textContent = '✏️';
            node.appendChild(pencil);
        };
        const finish = async () => {
            const filter = input.value.trim();
            if (filter === currentFilter) {
                restore();
                return;
            }
            if (!(await updateConditionFields(conditionId, { filter }))) restore();
        };

        input.addEventListener('blur', finish, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') restore();
        });
    }

    async function openAddConditionModal() { 
        const channelName = getChannelNameFromDOM();
        const platform = getPlatformFromDOM();
        document.getElementById('condModalTitle').textContent = t.addCondition || 'Add Condition'; 
        document.getElementById('condModalSubtitle').textContent = `${t.defineWhenTrigger || 'Define when to trigger an action on'} ${channelName}.`; 
        document.getElementById('condSaveBtn').textContent = t.addBtn || 'Add Condition'; 
        document.getElementById('conditionForm').reset(); 
        document.getElementById('condFilterGroup').style.display = 'none'; 
        document.getElementById('condActionSelectGroup').style.display = 'none'; 
        document.getElementById('condColorGroup').style.display = 'none'; 
        document.getElementById('condBrightnessGroup').style.display = 'none'; 
        document.getElementById('condBrightness').value = 50; 
        document.getElementById('condBrightnessVal').textContent = '50'; 
        document.querySelectorAll('.color-preset').forEach((button, index) => button.classList.toggle('selected', index === 0)); 
        if (platform) populateEventSelect(platform); 
        await toggleDeviceAction(document.getElementById('condHasDevice')); 
        openModal('conditionModal'); 
    }

    async function populateEventSelect(platform) { 
        try {
            const events = await window.getEventsForPlatform(platform);
            document.getElementById('condEventType').innerHTML = `<option value="">${t.selectEventType || 'Select event type...'}</option>` + (events || []).map((eventType) => `<option value="${eventType.value}">${getEventLabel(eventType.value, platform)}</option>`).join('');
        } catch (e) {
            console.error('Failed to populate events:', e);
        }
    }

    function updateCondEventFields() { 
        document.getElementById('condFilterGroup').style.display = document.getElementById('condEventType').value === 'comment' ? 'block' : 'none'; 
    }

    async function saveCondition(event) { 
        event.preventDefault(); 
        const button = document.getElementById('condSaveBtn'); 
        button.disabled = true; 
        try { 
            const deviceId = document.getElementById('condHasDevice').checked ? document.getElementById('condDeviceSelect').value || null : null; 
            const deviceAction = deviceId ? document.getElementById('condActionSelect').value || null : null; 
            const deviceActionParams = {}; 
            
            // Handle legacy color/brightness params
            if (deviceAction === 'color') { 
                const selected = document.querySelector('.color-preset.selected'); 
                if (selected) deviceActionParams.color = selected.dataset.color; 
            } 
            if (deviceAction === 'brightness') deviceActionParams.brightness = parseInt(document.getElementById('condBrightness').value, 10); 
            
            // Handle new device action body/params
            const deviceActionBodyText = document.getElementById('condDeviceActionBody')?.value || '';
            const deviceActionBody = deviceActionBodyText ? parseJSON(deviceActionBodyText) : null;
            const deviceActionParamName = document.getElementById('condParamName')?.value || '';
            const deviceActionParamEvaluator = deviceActionParamName ? buildEvaluatorLogic() : null;
            
            const body = { 
                watch_id: getChannelIdFromUrl(), 
                name: document.getElementById('condName').value, 
                event_type: document.getElementById('condEventType').value, 
                filter: document.getElementById('condFilter').value || '', 
                is_enabled: document.getElementById('condEnabled').checked, 
                device_id: deviceId, 
                device_action: deviceAction, 
                device_action_params: Object.keys(deviceActionParams).length ? deviceActionParams : null,
                device_action_body: deviceActionBody,
                device_action_param_name: deviceActionParamName || null,
                device_action_param_evaluator: deviceActionParamEvaluator
            }; 
            await apiRequest('POST', '/conditions', body); 
            closeModal('conditionModal'); 
            window.location.reload(); 
        } catch (error) { 
            const errorMsg = error.message || 'Unknown error';
            alert((t.saveError || 'Failed to save condition: {error}').replace('{error}', errorMsg)); 
        } finally { 
            button.disabled = false; 
        } 
    }

    async function toggleCondition(conditionId, checkbox) { 
        try { 
            await apiRequest('PATCH', `/conditions/update?id=${conditionId}`, { is_enabled: checkbox.checked }); 
            window.location.reload(); 
        } catch (error) { 
            checkbox.checked = !checkbox.checked; 
            const errorMsg = error.message || 'Unknown error';
            alert((t.updateError || 'Failed to update condition: {error}').replace('{error}', errorMsg)); 
        } 
    }

    async function deleteCondition(conditionId) { 
        if (!confirm(t.deleteConfirm || 'Delete this condition?\n\nThis event will no longer trigger any actions.')) return; 
        try { 
            await apiRequest('DELETE', `/conditions?id=${conditionId}`); 
            window.location.reload(); 
        } catch (error) { 
            const errorMsg = error.message || 'Unknown error';
            alert((t.deleteError || 'Failed to delete condition: {error}').replace('{error}', errorMsg)); 
        } 
    }

    async function openTestConditionModal(conditionId) { 
        testingConditionId = conditionId; 
        const conditionName = getConditionNameFromCard(conditionId);
        const card = document.querySelector(`[data-cond-id="${conditionId}"]`);
        const eventType = card?.dataset.type || '';
        const platform = getPlatformFromDOM();

        document.getElementById('testConditionTitle').textContent = (t.testTitle || 'Test Condition: {name}').replace('{name}', conditionName); 
        try {
            const events = await window.getEventsForPlatform(platform);
            document.getElementById('testEventType').innerHTML = `<option value="">${t.selectEventType || 'Select event type...'}</option>` + (events || []).map((evt) => `<option value="${evt.value}">${getEventLabel(evt.value, platform)}</option>`).join('');
        } catch (e) {
            console.error(t.populateEventsError || 'Failed to populate test events:', e);
        }
        document.getElementById('testEventType').value = eventType; 
        document.getElementById('testTriggerRealDevice').checked = false; 
        document.getElementById('testResultsContainer').style.display = 'none'; 
        await updateTestEventParams(); 
        openModal('testConditionModal'); 
    }

    async function updateTestEventParams() { 
        const eventType = document.getElementById('testEventType').value; 
        const platform = getPlatformFromDOM();
        const container = document.getElementById('testEventParamsContainer'); 
        container.innerHTML = ''; 
        if (!eventType || !platform) return; 
        
        const params = await window.getEventParameters(platform, eventType); 
        (params || []).forEach((param) => { 
            const group = document.createElement('div'); 
            group.className = 'form-group'; 
            group.innerHTML = param.type === 'checkbox' 
                ? `<label class="checkbox-label"><input type="checkbox" id="param_${param.name}" ${param.value ? 'checked' : ''}><span>${param.label}</span></label>` 
                : `<label>${param.label}</label><input type="${param.type === 'number' ? 'number' : 'text'}" id="param_${param.name}" value="${param.value}">`; 
            container.appendChild(group); 
        }); 
    }

    async function runConditionTest() { 
        const eventType = document.getElementById('testEventType').value; 
        const platform = getPlatformFromDOM();
        if (!eventType) return alert(t.selectEventTypeRequired || 'Please select an event type'); 
        const button = document.getElementById('testConditionBtn'); 
        button.disabled = true; 
        try { 
            const customParams = {}; 
            const params = await window.getEventParameters(platform, eventType);
            (params || []).forEach((param) => { 
                const input = document.getElementById(`param_${param.name}`); 
                if (input) customParams[param.name] = param.type === 'checkbox' ? input.checked : input.value; 
            }); 
            displayTestResults(await apiRequest('POST', `/conditions/${testingConditionId}/test`, { 
                test_event: buildTestEvent(eventType, platform, customParams), 
                trigger_real_device: document.getElementById('testTriggerRealDevice').checked 
            })); 
        } catch (error) { 
            const errorMsg = error.message || 'Unknown error';
            alert((t.testError || 'Failed to test condition: {error}').replace('{error}', errorMsg)); 
        } finally { 
            button.disabled = false; 
        } 
    }

    function displayTestResults(response) { 
        const container = document.getElementById('testResultsContainer'); 
        const content = document.getElementById('testResultsContent'); 
        container.style.display = 'block'; 
        const resultLabel = response.matched ? t.testMatched || '✅ MATCHED' : t.testNoMatch || '❌ NO MATCH';
        content.innerHTML = `<p><strong>${resultLabel}</strong></p><p><strong>${t.testWouldTrigger || 'Would trigger device:'}:</strong> ${response.would_trigger ? 'Yes' : 'No'}</p><p><strong>${t.testDevice || 'Device:'}:</strong> ${response.device_id || 'None'}</p><p><strong>${t.testAction || 'Action:'}:</strong> ${response.device_action || 'None'}</p>${response.computed_values && response.computed_values.length ? `<p><strong>${t.testComputedValues || 'Computed values:'}:</strong> ${response.computed_values.map((value) => `<code>${escHtml(value)}</code>`).join(', ')}</p>` : ''}${response.execution_error ? `<p style="color:red"><strong>${t.testError_label || 'Error:'}:</strong> ${escHtml(response.execution_error)}</p>` : ''}${response.execution_result ? `<p style="color:green"><strong>${t.testResult || 'Result:'}:</strong> ${escHtml(response.execution_result)}</p>` : ''}`; 
    }

    function editConditionLogic(conditionId) { 
        navigate(`/channels/${getChannelIdFromUrl()}/conditions/${conditionId}`); 
    }

    async function toggleDeviceAction(checkbox) { 
        const enabled = checkbox.checked; 
        document.getElementById('deviceActionFields').style.display = enabled ? 'block' : 'none'; 
        if (enabled) await populateDeviceDropdown(); 
        else { 
            document.getElementById('condDeviceSelect').value = ''; 
            document.getElementById('condActionSelect').value = ''; 
            document.getElementById('condActionSelectGroup').style.display = 'none'; 
            updateCondActionParams(); 
        } 
    }

    async function populateDeviceDropdown() { 
        const select = document.getElementById('condDeviceSelect'); 
        while (select.options.length > 1) select.remove(1); 
        try { 
            if (!deviceCache) deviceCache = await apiRequest('GET', '/devices'); 
            deviceCache.forEach((device) => select.add(new Option(`${device.name} (${device.brand})`, device.id))); 
        } catch (error) { 
            console.error('Failed to load devices:', error); 
        } 
    }

    async function updateCondActionSelect() { 
        const select = document.getElementById('condDeviceSelect'); 
        const device = (deviceCache || []).find((item) => item.id === select.value); 
        const group = document.getElementById('condActionSelectGroup'); 
        const actionSelect = document.getElementById('condActionSelect'); 
        const sendingParamsSection = document.getElementById('sendingParamsSection');
        
        if (!device || !device.supported_actions || !device.supported_actions.length) { 
            group.style.display = 'none'; 
            actionSelect.value = ''; 
            if (sendingParamsSection) sendingParamsSection.style.display = 'none';
            updateCondActionParams(); 
            return; 
        }
        
        const currentValue = actionSelect.value; 
        group.style.display = 'block'; 
        while (actionSelect.options.length > 1) actionSelect.remove(1); 
        const labels = { 
            on: t['deviceAction.on'] || 'Turn On', 
            off: t['deviceAction.off'] || 'Turn Off', 
            toggle: t['deviceAction.toggle'] || 'Toggle On/Off', 
            color: t['deviceAction.color'] || 'Set Color', 
            brightness: t['deviceAction.brightness'] || 'Set Brightness', 
            color_temp: t['deviceAction.color_temp'] || 'Set Color Temperature', 
            scene: t['deviceAction.scene'] || 'Scene Mode', 
            flash: t['deviceAction.flash'] || 'Flash Alert' 
        }; 
        device.supported_actions.forEach((action) => actionSelect.add(new Option(labels[action] || action, action))); 
        if (currentValue && device.supported_actions.includes(currentValue)) actionSelect.value = currentValue; 
        
        // Load device templates for sending parameters
        if (sendingParamsSection && device.brand) {
            try {
                await loadDeviceTemplates(device.brand);
            } catch (err) {
                console.warn('[updateCondActionSelect] Failed to load device templates:', err);
            }
        }
        
        updateCondActionParams(); 
    }

    function updateCondActionParams() { 
        const action = document.getElementById('condActionSelect').value; 
        document.getElementById('condColorGroup').style.display = action === 'color' ? 'block' : 'none'; 
        document.getElementById('condBrightnessGroup').style.display = action === 'brightness' ? 'block' : 'none'; 
    }

    function selectCondColor(button) { 
        document.querySelectorAll('.color-preset').forEach((item) => item.classList.remove('selected')); 
        button.classList.add('selected'); 
    }

    // ====== NEW: Device Action Parameters Functions ======

    function parseJSON(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    }

    async function loadDeviceTemplates(brand) {
        // Load device action templates for a specific brand
        // This could fetch from an API endpoint or use predefined templates
        // For now, we'll use common templates based on brand
        const templates = {
            govee: {
                brightness: { state: 'on', brightness: 50, transition_ms: 300 },
                color: { state: 'on', color_rgb: '#FF0000', effect: 'none', brightness: 100 },
                on: { state: 'on' },
                off: { state: 'off' }
            },
            hue: {
                brightness: { state: true, brightness: 254, transition: 4 },
                color: { state: true, color_xy: [0.3, 0.3], brightness: 254 },
                on: { state: true },
                off: { state: false }
            },
            lifx: {
                brightness: { power: 'on', brightness: 0.5, duration: 1.0 },
                color: { power: 'on', color: 'rgb(255,0,0)', brightness: 1.0, duration: 1.0 },
                on: { power: 'on' },
                off: { power: 'off' }
            },
            wled: {
                brightness: { bri: 128 },
                on: { on: true },
                off: { on: false }
            }
        };
        return templates[brand.toLowerCase()] || {};
    }

    function updateParamNameDropdown() {
        const bodyText = document.getElementById('condDeviceActionBody')?.value || '';
        const body = parseJSON(bodyText);
        const select = document.getElementById('condParamName');
        
        if (!body || typeof body !== 'object') {
            select.innerHTML = `<option value="">${t['channelLayout.selectParam'] || 'Select parameter...'}</option>`;
            return;
        }

        const keys = Object.keys(body);
        select.innerHTML = `<option value="">${t['channelLayout.selectParam'] || 'Select parameter...'}</option>` +
            keys.map(key => `<option value="${key}">${key}</option>`).join('');
    }

    function updateEvaluatorUI() {
        const type = document.getElementById('evaluatorType')?.value || '';
        const container = document.getElementById('evaluatorUIContainer');
        
        if (!type) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        switch(type) {
            case 'extract_number':
                html = `
                    <div class="form-group">
                        <label for="evaluatorRange">${t['channelLayout.numberRange'] || 'Number Range'}</label>
                        <input type="text" id="evaluatorRange" placeholder="0-100" value="0-100" oninput="updateResultPreview()">
                        <small>${t['channelLayout.numberRangeHelp'] || 'Extracts number from text within this range'}</small>
                    </div>
                `;
                break;
            case 'extract_hex_color':
                html = `
                    <div class="form-help">
                        ${t['channelLayout.hexColorHelp'] || 'Auto-detects hex color codes in format #RRGGBB'}
                    </div>
                `;
                break;
            case 'extract_text':
                html = `
                    <div class="form-group">
                        <label for="evaluatorTextPattern">${t['channelLayout.textPattern'] || 'Text Pattern'}</label>
                        <input type="text" id="evaluatorTextPattern" placeholder="keyword or pattern" oninput="updateResultPreview()">
                        <small>${t['channelLayout.textPatternHelp'] || 'Extracts text matching this pattern'}</small>
                    </div>
                `;
                break;
            case 'regex_extract':
                html = `
                    <div class="form-group">
                        <label for="evaluatorRegex">${t['channelLayout.regexPattern'] || 'Regular Expression'}</label>
                        <input type="text" id="evaluatorRegex" placeholder="(.+)" value="(.+)" oninput="updateResultPreview()">
                        <small>${t['channelLayout.regexPatternHelp'] || 'Regex to extract value (use capturing groups)'}</small>
                    </div>
                `;
                break;
            case 'conditional':
                html = `
                    <div class="form-group">
                        <label>${t['channelLayout.conditionalHelp'] || 'Execute condition if value is matched'}</label>
                        <textarea id="evaluatorConditional" placeholder='{"Operator":"IF_GREATER_THAN","Variables":["$gift_value","1000"],"Result":"party"}' class="json-editor" rows="6" oninput="updateResultPreview()"></textarea>
                        <small>${t['channelLayout.conditionalPatternHelp'] || 'Enter conditional logic as JSON'}</small>
                    </div>
                `;
                break;
            case 'fixed_value':
                html = `
                    <div class="form-group">
                        <label for="evaluatorFixedValue">${t['channelLayout.fixedValue'] || 'Fixed Value'}</label>
                        <input type="text" id="evaluatorFixedValue" placeholder="fixed value" oninput="updateResultPreview()">
                        <small>${t['channelLayout.fixedValueHelp'] || 'Always use this value'}</small>
                    </div>
                `;
                break;
        }

        container.innerHTML = html;
    }

    function updateResultPreview() {
        const bodyText = document.getElementById('condDeviceActionBody')?.value || '';
        const paramName = document.getElementById('condParamName')?.value || '';
        const previewContainer = document.getElementById('resultPreview');
        const previewContent = document.getElementById('resultPreviewContent');

        if (!bodyText || !paramName) {
            previewContainer.style.display = 'none';
            return;
        }

        const body = parseJSON(bodyText);
        if (!body) {
            previewContainer.style.display = 'none';
            return;
        }

        // Simulate a computed value based on evaluator type
        const type = document.getElementById('evaluatorType')?.value || '';
        let computedValue = '';

        switch(type) {
            case 'extract_number':
                const range = document.getElementById('evaluatorRange')?.value || '0-100';
                computedValue = '75'; // Example
                break;
            case 'extract_hex_color':
                computedValue = '#00FF00'; // Example
                break;
            case 'extract_text':
                computedValue = 'extracted_text'; // Example
                break;
            case 'regex_extract':
                computedValue = 'matched_value'; // Example
                break;
            case 'fixed_value':
                computedValue = document.getElementById('evaluatorFixedValue')?.value || 'value';
                break;
            default:
                return;
        }

        // Clone body and replace parameter
        const result = JSON.parse(JSON.stringify(body));
        result[paramName] = isNaN(computedValue) ? computedValue : parseFloat(computedValue);

        previewContainer.style.display = 'block';
        previewContent.textContent = JSON.stringify(result, null, 2);
    }

    function buildEvaluatorLogic() {
        // Build the evaluator ConditionLogic structure from the UI
        const type = document.getElementById('evaluatorType')?.value || '';
        
        const logic = { Operator: '' };

        switch(type) {
            case 'extract_number':
                const range = document.getElementById('evaluatorRange')?.value || '0-100';
                logic.Operator = 'EXTRACT_NUMBER';
                logic.Variables = [range];
                break;
            case 'extract_hex_color':
                logic.Operator = 'EXTRACT_HEX_COLOR';
                break;
            case 'extract_text':
                const pattern = document.getElementById('evaluatorTextPattern')?.value || '';
                logic.Operator = 'EXTRACT_TEXT';
                logic.Variables = [pattern];
                break;
            case 'regex_extract':
                const regex = document.getElementById('evaluatorRegex')?.value || '(.+)';
                logic.Operator = 'REGEX_EXTRACT';
                logic.Variables = [regex];
                break;
            case 'conditional':
                const condText = document.getElementById('evaluatorConditional')?.value || '';
                const condLogic = parseJSON(condText);
                return condLogic || logic;
            case 'fixed_value':
                const fixedVal = document.getElementById('evaluatorFixedValue')?.value || '';
                logic.Operator = 'FIXED_VALUE';
                logic.Variables = [fixedVal];
                break;
        }

        return logic;
    }

    // ====== END Device Action Parameters Functions ======

    Object.assign(window, { 
        loadWatches, filterConds, openAddConditionModal, startEditConditionName, startEditConditionFilter, populateEventSelect, 
        updateCondEventFields, saveCondition, toggleCondition, deleteCondition, openTestConditionModal, 
        updateTestEventParams, runConditionTest, displayTestResults, toggleDeviceAction, populateDeviceDropdown, 
        updateCondActionSelect, updateCondActionParams, selectCondColor, editConditionLogic, navigate, route,
        updateParamNameDropdown, updateEvaluatorUI, updateResultPreview, buildEvaluatorLogic
    });

    Promise.all([route(), window.ChannelsSidebar.init({ onChannelsChanged: route })]);
})();
