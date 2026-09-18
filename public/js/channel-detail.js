(function () {
    'use strict';
    const { PLATFORM_META, PLATFORM_EVENTS, apiRequest, escHtml, hasActiveFilter, openModal, closeModal, createTestEventFromMetadata, getEventParameters, getEventLabel } = window;
    const t = window.channelDetailTranslations || {}; // Fallback to empty object if not loaded
    const getChannelIdFromURL = () => {
        const match = window.location.pathname.match(/^\/channels\/([^\/]+)\/?$/);
        return match ? match[1] : null;
    };
    const getChannelDataFromDOM = () => {
        const nameElem = document.querySelector('.editable-name');
        const platformElem = document.querySelector('.platform-tag');
        const toggleCheckbox = document.querySelector('.channel-detail-toggle input[type="checkbox"]');
        const filterBtn = document.querySelector('.action-btn.filter');
        if (!nameElem) return null;
        return {
            id: getChannelIdFromURL(),
            name: nameElem.textContent.replace(' ✏️', '').trim(),
            platform: platformElem ? platformElem.className.split(' ')[1] : 'unknown',
            active: toggleCheckbox ? toggleCheckbox.checked : false,
            streamFilter: filterBtn && filterBtn.classList.contains('active') ? {} : null
        };
    };
    async function loadWatches() { 
        if (window.ChannelsSidebar) {
            await window.ChannelsSidebar.init({ onChannelsChanged: () => {} });
        }
    }
    async function route() { 
        const channelId = getChannelIdFromURL();
        if (!channelId) return window.location.href = '/channels';
        await loadWatches();
        window.scrollTo(0, 0);
    }
    async function updateDisplayName(channelId, newName) { 
        const trimmed = (newName || '').trim(); 
        if (!trimmed) { 
            alert(t.emptyDisplayName || 'Display name cannot be empty'); 
            return false; 
        } 
        try { 
            await apiRequest('PATCH', `/watches/update?id=${channelId}`, { name: trimmed }); 
            location.reload();
            return true; 
        } catch (error) { 
            alert((t.failedUpdateName || 'Failed to update display name: ') + error.message); 
            return false; 
        } 
    }
    function startEditDisplayName(event, channelId, currentName) { 
        event.stopPropagation(); 
        const node = event.target.closest('.editable-name'); 
        if (!node) return; 
        const input = document.createElement('input'); 
        input.type = 'text'; 
        input.className = 'name-edit-input'; 
        input.value = currentName; 
        node.innerHTML = ''; 
        node.appendChild(input); 
        input.focus(); 
        input.select(); 
        const restore = () => { 
            node.innerHTML = `${escHtml(currentName)} <span class="name-edit-pencil">✏️</span>`; 
        }; 
        const finish = async () => { 
            if (!(await updateDisplayName(channelId, input.value))) restore(); 
        }; 
        input.addEventListener('blur', finish, { once: true }); 
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') finish(); 
            if (e.key === 'Escape') restore(); 
        }); 
    }
    async function toggleChannel(channelId, checkbox) { 
        try { 
            await apiRequest('PATCH', `/watches/update?id=${channelId}`, { is_active: checkbox.checked }); 
            location.reload();
        } catch (error) { 
            checkbox.checked = !checkbox.checked; 
            alert((t.failedUpdateChannel || 'Failed to update channel: ') + error.message); 
        } 
    }
    async function deleteChannel(channelId) { 
        if (!confirm(t.confirmRemove || 'Remove this channel from monitoring?\n\nAll conditions for this channel will also be removed.')) return; 
        try { 
            await apiRequest('DELETE', `/watches?id=${channelId}`); 
            window.location.href = '/channels';
        } catch (error) { 
            alert((t.failedDelete || 'Failed to delete channel: ') + error.message); 
        } 
    }
    async function openTestAllConditionsModal() { 
        const select = document.getElementById('testEventType'); 
        const platformTag = document.querySelector('.platform-tag');
        const platform = platformTag ? platformTag.className.split(' ')[1] : 'unknown';
        console.log('[openTestAllConditionsModal] Platform:', platform);
        try {
            const events = await window.getEventsForPlatform(platform);
            console.log('[openTestAllConditionsModal] Events returned:', events);
            select.innerHTML = '<option value="">' + (t.selectEventType || 'Select event type...') + '</option>' + (events || []).map((evt) => {
                console.log('[openTestAllConditionsModal] Mapping event:', evt);
                return `<option value="${evt.value}">${getEventLabel(evt.value, platform)}</option>`;
            }).join('');
            console.log('[openTestAllConditionsModal] Select innerHTML updated');
        } catch (e) {
            console.error('[openTestAllConditionsModal] Failed to populate events:', e);
        }
        document.getElementById('testConditionTitle').textContent = t.testAllConditions || 'Test All Conditions'; 
        document.getElementById('testTriggerRealDevice').checked = false; 
        document.getElementById('testResultsContainer').style.display = 'none'; 
        await updateTestEventParams(); 
        openModal('testConditionModal'); 
    }
    async function updateTestEventParams() { 
        const eventType = document.getElementById('testEventType').value; 
        const container = document.getElementById('testEventParamsContainer'); 
        container.innerHTML = ''; 
        if (!eventType) {
            console.log('[updateTestEventParams] No event type selected');
            return; 
        }
        
        const platformTag = document.querySelector('.platform-tag');
        const platform = platformTag ? platformTag.className.split(' ')[1] : 'unknown';
        console.log('[updateTestEventParams] Fetching params for platform:', platform, 'eventType:', eventType);
        const params = await window.getEventParameters(platform, eventType);
        console.log('[updateTestEventParams] Params returned:', params);
        (params || []).forEach((param) => { 
            const group = document.createElement('div'); 
            group.className = 'form-group'; 
            group.innerHTML = param.type === 'checkbox' ? `<label class="checkbox-label"><input type="checkbox" id="param_${param.name}" ${param.value ? 'checked' : ''}><span>${param.label}</span></label>` : `<label>${param.label}</label><input type="${param.type === 'number' ? 'number' : 'text'}" id="param_${param.name}" value="${param.value}">`; 
            container.appendChild(group); 
        }); 
    }
    async function runConditionTest() { 
        const eventType = document.getElementById('testEventType').value; 
        if (!eventType) return alert(t.selectEventTypeAlert || 'Please select an event type'); 
        const button = document.getElementById('testConditionBtn'); 
        button.disabled = true; 
        try { 
            const customParams = {}; 
            const channelId = getChannelIdFromURL();
            const platformTag = document.querySelector('.platform-tag');
            const platform = platformTag ? platformTag.className.split(' ')[1] : 'unknown';
            console.log('[runConditionTest] Testing with platform:', platform, 'eventType:', eventType);
            const params = await window.getEventParameters(platform, eventType);
            (params || []).forEach((param) => { 
                const input = document.getElementById(`param_${param.name}`); 
                if (input) customParams[param.name] = param.type === 'checkbox' ? input.checked : input.value; 
            }); 
            console.log('[runConditionTest] Built custom params:', customParams);
            const testEvent = await createTestEventFromMetadata(platform, eventType, customParams, { watchTargetId: channelId });
            displayTestResults(await apiRequest('POST', '/conditions/test-all', { 
                watch_target_id: channelId, 
                test_event: testEvent, 
                trigger_real_device: document.getElementById('testTriggerRealDevice').checked 
            })); 
        } catch (error) { 
            alert((t.failedTestCondition || 'Failed to test condition: ') + error.message); 
        } finally { 
            button.disabled = false; 
        } 
    }
    function displayTestResults(response) { 
        const container = document.getElementById('testResultsContainer'); 
        const content = document.getElementById('testResultsContent'); 
        container.style.display = 'block'; 
        content.innerHTML = `<p><strong>${t.totalTested || 'Total tested:'}` + `</strong> ${response.total_conditions}</p><p><strong>${t.matched || 'Matched:'}` + `</strong> ${response.matched}</p><p><strong>${t.wouldTrigger || 'Would trigger:'}` + `</strong> ${response.triggered}</p><p><strong>${t.errors || 'Errors:'}` + `</strong> ${response.errors}</p>${response.results && response.results.length ? `<hr><h5>${t.details || 'Details:'}</h5><div style="max-height:300px; overflow-y:auto;">${response.results.map((result) => `<div style="margin:0.5rem 0; padding:0.5rem; background:${result.matched ? '#e8f5e9' : '#ffebee'}; border-radius:4px;"><strong>${escHtml(result.condition_name)}</strong>: ${result.matched ? t.matched_badge || '✅ Matched' : t.no_match || '❌ No match'}${result.would_trigger ? ' ' + (t.would_trigger || '(would trigger)') : ''}</div>`).join('')}</div>` : ''}`; 
    }
    Object.assign(window, { openTestAllConditionsModal, toggleChannel, deleteChannel, updateDisplayName, startEditDisplayName, updateTestEventParams, runConditionTest, displayTestResults });
    route();
})();
