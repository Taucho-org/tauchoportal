(function () {
    'use strict';

    const { PLATFORM_META, apiRequest, apiGet, showMonToast, escHtml } = window;
    const PLATFORMS = [
        { id: 'youtube', label: 'YouTube', hasOAuth: true, publicAccess: false },
        { id: 'twitch', label: 'Twitch', hasOAuth: true, publicAccess: true },
        { id: 'niconico', label: 'NicoNico', hasOAuth: true, publicAccess: false },
        { id: 'twitcasting', label: 'TwitCasting', hasOAuth: true, publicAccess: false },
        { id: 'kick', label: 'Kick', hasOAuth: false, publicAccess: true },
        { id: 'bilibili', label: 'Bilibili', hasOAuth: false, publicAccess: true },
        { id: 'instagram', label: 'Instagram', hasOAuth: false, publicAccess: false },
        { id: 'tiktok', label: 'TikTok', hasOAuth: false, publicAccess: false },
        { id: 'facebook', label: 'Facebook', hasOAuth: false, publicAccess: false },
        { id: 'x', label: 'X', hasOAuth: false, publicAccess: false },
    ];
    const PROVIDER_MAP = { google: 'youtube', twitch: 'twitch', niconico: 'niconico', twitcasting: 'twitcasting' };
    const state = { connectedSet: new Set(), existingWatchSet: new Set(), selectedChannel: null, accordionLoaded: new Set(), accSearchTimers: new Map(), onChannelsChanged: null };
    const esc = (v) => escHtml(v);

    function setExistingChannels(channels) {
        state.existingWatchSet = new Set((channels || []).map((channel) => `${channel.platform}:${channel.channelId}`));
        renderAccordionList();
    }

    async function init(options = {}) {
        state.onChannelsChanged = options.onChannelsChanged || null;
        state.connectedSet.clear();
        state.accordionLoaded.clear();
        try {
            const user = await apiGet('/auth/user');
            (user.connections || []).forEach((connection) => { const platformId = PROVIDER_MAP[connection.provider]; if (platformId) state.connectedSet.add(platformId); });
            if (user.niconico && user.niconico.connected) state.connectedSet.add('niconico');
        } catch (_) {}
        renderAccordionList();
    }

    function renderAccordionList() {
        const list = document.getElementById('accordionList');
        if (!list) return;
        list.innerHTML = PLATFORMS.map((platform) => {
            const meta = PLATFORM_META[platform.id] || { icon: '📺', label: platform.label };
            const connected = platform.hasOAuth && state.connectedSet.has(platform.id);
            return `<div class="acc-item" id="acc-${platform.id}"><div class="acc-header" onclick="toggleAcc('${platform.id}')"><span class="acc-plat-icon ${platform.id}">${meta.icon}</span><span class="acc-plat-name">${esc(meta.label)}</span>${connected ? '<span class="acc-connected-dot" title="Connected"></span>' : ''}<span class="acc-chevron" id="acc-chev-${platform.id}">›</span></div><div class="acc-body" id="acc-body-${platform.id}"><div class="acc-body-inner" id="acc-inner-${platform.id}"><div class="acc-init-loading">Loading…</div></div></div></div>`;
        }).join('');
    }

    function toggleAcc(platformId) {
        document.getElementById('addSidebar')?.classList.remove('closed');
        const body = document.getElementById(`acc-body-${platformId}`); const chevron = document.getElementById(`acc-chev-${platformId}`); if (!body || !chevron) return;
        const header = body.previousElementSibling; const open = body.classList.toggle('open'); header.classList.toggle('open', open); chevron.style.transform = open ? 'rotate(90deg)' : '';
        if (open && !state.accordionLoaded.has(platformId)) { state.accordionLoaded.add(platformId); renderAccordionBodyContent(platformId); }
    }

    function closeAllAcc() {
        PLATFORMS.forEach((platform) => {
            const body = document.getElementById(`acc-body-${platform.id}`); const chevron = document.getElementById(`acc-chev-${platform.id}`); if (!body || !chevron) return;
            body.classList.remove('open'); body.previousElementSibling.classList.remove('open'); chevron.style.transform = '';
        });
    }

    function renderAccordionBodyContent(platformId) {
        const inner = document.getElementById(`acc-inner-${platformId}`); const platform = PLATFORMS.find((item) => item.id === platformId); if (!inner || !platform) return;
        const connected = platform.hasOAuth && state.connectedSet.has(platformId);
        if (!platform.hasOAuth && !platform.publicAccess) { inner.innerHTML = `<div class="acc-stub"><span>🚫</span><p>Channel registration for ${esc(platform.label)} is not yet supported.</p></div>`; return; }
        if (platform.hasOAuth && !connected) { inner.innerHTML = `<div class="acc-not-connected"><p>Connect your ${esc(platform.label)} account first.</p><a class="acc-connect-link" href="/account-settings">Go to Account Settings →</a></div>`; return; }
        let html = '';
        if (platformId !== 'kick' && platformId !== 'bilibili') html += `<div class="acc-search-wrap"><span class="acc-search-icon">🔍</span><input class="acc-search" type="text" id="acc-search-${platformId}" placeholder="Search channels…" oninput="onAccSearch('${platformId}', this.value)"></div><div class="acc-results" id="acc-results-${platformId}"></div>`;
        else html += `<div class="acc-results" id="acc-results-${platformId}"></div>`;
        if (platform.hasOAuth && connected) {
            html += `<div class="acc-section-label">Your Channels</div><div class="acc-results" id="acc-own-${platformId}"><div class="acc-init-loading">Loading…</div></div>`;
            if (platformId === 'youtube' || platformId === 'twitch') html += `<div class="acc-section-label">Following / Subscriptions</div><div class="acc-results" id="acc-subs-${platformId}"><div class="acc-init-loading">Loading…</div></div>`;
        }
        html += `<div class="acc-section-label">Add by ID / URL</div><form class="acc-manual" id="acc-manual-${platformId}" onsubmit="submitAccManual(event, '${platformId}')"><input type="text" placeholder="Channel ID or URL" required><button type="submit" class="acc-manual-submit">Add</button></form>`;
        inner.innerHTML = html;
        if (platform.hasOAuth && connected) { loadAccOwnChannels(platformId); if (platformId === 'youtube' || platformId === 'twitch') loadAccSubs(platformId, null); }
    }

    function submitAccManual(event, platformId) {
        event.preventDefault(); const value = event.target.querySelector('input').value.trim(); if (!value) return; openConfirm({ platform: platformId, channelId: value, name: value, thumbnail: null });
    }

    function onAccSearch(platformId, value) {
        clearTimeout(state.accSearchTimers.get(platformId)); const results = document.getElementById(`acc-results-${platformId}`);
        if (!value.trim()) { if (results) results.innerHTML = ''; return; }
        state.accSearchTimers.set(platformId, setTimeout(() => doAccSearch(platformId, value.trim()), 400));
    }

    async function doAccSearch(platformId, query) {
        const results = document.getElementById(`acc-results-${platformId}`); if (!results) return; results.innerHTML = '<div class="result-loading">Searching…</div>';
        try { renderMiniChannelResults(results, normalizePagedData(await apiGet(`/platform/${platformId}/search?q=${encodeURIComponent(query)}`)).items, platformId, 'No channels found.'); }
        catch (error) { results.innerHTML = error.status === 501 ? `<div class="stub-notice">🚧 Search for ${esc(PLATFORM_META[platformId]?.label || platformId)} is coming soon.</div>` : `<div class="result-error">Search failed: ${esc(error.message)}</div>`; }
    }

    async function loadAccOwnChannels(platformId) {
        const results = document.getElementById(`acc-own-${platformId}`); if (!results) return;
        try { renderMiniChannelResults(results, normalizePagedData(await apiGet(`/platform/${platformId}/channels/mine`)).items, platformId, 'No own channels found.'); }
        catch (error) { results.innerHTML = error.status === 501 ? '<div class="stub-notice">🚧 Not yet available.</div>' : `<div class="result-error">Failed to load: ${esc(error.message)}</div>`; }
    }

    async function loadAccSubs(platformId, cursor) {
        const results = document.getElementById(`acc-subs-${platformId}`); if (!results) return; if (!cursor) results.innerHTML = '<div class="result-loading">Loading…</div>';
        const param = platformId === 'youtube' ? 'page_token' : 'cursor'; const endpoint = platformId === 'youtube' ? 'subscriptions' : 'following'; const suffix = cursor ? `?${param}=${encodeURIComponent(cursor)}` : '';
        try {
            const normalized = normalizePagedData(await apiGet(`/platform/${platformId}/${endpoint}${suffix}`)); const token = normalized.next_page_token || normalized.cursor || null;
            if (!cursor) renderMiniChannelResults(results, normalized.items || normalized, platformId, 'Not following any channels.', token);
            else { const fragment = document.createElement('div'); renderMiniChannelResults(fragment, normalized.items || normalized, platformId, '', token); results.querySelector('.load-more-sm')?.remove(); results.append(...fragment.childNodes); }
        } catch (error) { results.innerHTML = error.status === 501 ? '<div class="stub-notice">🚧 Not yet available.</div>' : `<div class="result-error">Failed to load: ${esc(error.message)}</div>`; }
    }

    function renderMiniChannelResults(container, items, platformId, emptyMessage, nextToken) {
        if (!items || items.length === 0) { container.innerHTML = `<div class="result-empty">${esc(emptyMessage)}</div>`; return; }
        container.innerHTML = items.map((channel) => {
            const channelId = channel.channel_id || channel.id || ''; const name = channel.title || channel.display_name || channel.name || channelId; const thumbnail = channel.thumbnail || channel.thumbnail_url || '';
            const subtitle = channel.subscriber_count != null ? `${formatCount(channel.subscriber_count)} subscribers` : (channel.follower_count != null ? `${formatCount(channel.follower_count)} followers` : '');
            const added = state.existingWatchSet.has(`${platformId}:${channelId}`); const thumb = thumbnail ? `<img class="mini-thumb-img" src="${esc(thumbnail)}" alt="" loading="lazy">` : `<div class="mini-thumb-placeholder">${esc(PLATFORM_META[platformId]?.icon || '📺')}</div>`;
            return `<div class="mini-card"><div class="mini-thumb">${thumb}</div><div class="mini-info"><div class="mini-name">${esc(name)}</div><div class="mini-meta">${subtitle}</div></div>${added ? '<span class="mini-badge-added">Added</span>' : `<button class="mini-add-btn" title="Add channel" onclick='openConfirm(${JSON.stringify({ platform: platformId, channelId, name, thumbnail: thumbnail || null })})'>+</button>`}</div>`;
        }).join('') + (nextToken ? `<button class="load-more-sm" onclick="loadAccSubs('${platformId}', '${esc(nextToken)}')">Load more…</button>` : '');
    }

    function openConfirm(channel) {
        state.selectedChannel = channel; const meta = PLATFORM_META[channel.platform] || { icon: '📺', label: channel.platform };
        const thumb = channel.thumbnail ? `<img style="width:100%; height:100%; object-fit:cover; border-radius:4px;" src="${esc(channel.thumbnail)}" alt="">` : `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:32px;">${meta.icon}</div>`;
        document.getElementById('confirmPreview').innerHTML = `<div class="cf-platform-icon ${esc(channel.platform)}" style="position:relative; width:80px; height:80px; border-radius:4px; flex-shrink:0; overflow:hidden;">${thumb}</div><div class="cf-channel-info"><strong>${esc(channel.name)}</strong><span>${meta.icon} ${esc(meta.label)} · ${esc(channel.channelId)}</span></div>`;
        document.getElementById('confirmName').value = channel.name || ''; document.getElementById('confirmActive').checked = true; document.getElementById('confirmError').style.display = 'none'; document.getElementById('confirmAddBtn').disabled = false; document.getElementById('confirmAddBtn').textContent = '+ Add Channel'; document.getElementById('confirmOverlay').style.display = 'block'; document.getElementById('confirmDrawer').classList.add('open'); document.getElementById('confirmName').focus();
    }

    function cancelConfirm() { document.getElementById('confirmOverlay').style.display = 'none'; document.getElementById('confirmDrawer').classList.remove('open'); state.selectedChannel = null; }
    function showConfirmError(message) { const error = document.getElementById('confirmError'); error.textContent = message; error.style.display = 'block'; }
    async function confirmAdd() {
        if (!state.selectedChannel) return; const name = document.getElementById('confirmName').value.trim(); if (!name) { showConfirmError('Please enter a display name.'); return; }
        const button = document.getElementById('confirmAddBtn'); button.disabled = true; button.textContent = 'Adding…'; document.getElementById('confirmError').style.display = 'none';
        try {
            const body = { platform: state.selectedChannel.platform, channel_id: state.selectedChannel.channelId, name, is_active: document.getElementById('confirmActive').checked };
            if (state.selectedChannel.thumbnail) body.thumbnail_url = state.selectedChannel.thumbnail; await apiRequest('POST', '/watches', body); state.existingWatchSet.add(`${state.selectedChannel.platform}:${state.selectedChannel.channelId}`);
            cancelConfirm(); showMonToast(`✅ "${name}" added!`); if (typeof state.onChannelsChanged === 'function') await state.onChannelsChanged(); renderAccordionList();
        } catch (error) { showConfirmError(error.message || 'Failed to add channel.'); button.disabled = false; button.textContent = '+ Add Channel'; }
    }

    function normalizePagedData(data) { if (Array.isArray(data)) return { items: data, next_page_token: null, cursor: null }; if (data && Array.isArray(data.items)) return data; return { items: [], next_page_token: null, cursor: null }; }
    function formatCount(value) { if (value == null) return ''; if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`; if (value >= 1000) return `${(value / 1000).toFixed(1)}K`; return String(value); }

    Object.assign(window, { toggleAcc, closeAllAcc, onAccSearch, loadAccSubs, submitAccManual, openConfirm, cancelConfirm, confirmAdd });
    window.ChannelsSidebar = { init, setExistingChannels, renderAccordionList, closeAllAcc };
})();
