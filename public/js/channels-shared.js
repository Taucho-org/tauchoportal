(function () {
    'use strict';

    const PLATFORM_EVENTS = {
        youtube: [{ value: 'comment', label: '💬 Comment received' }, { value: 'superchat', label: '🎁 Super Chat (gift)' }, { value: 'sticker', label: '🖼 Super Sticker' }, { value: 'member', label: '💖 New member / subscriber' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        twitch: [{ value: 'comment', label: '💬 Chat message received' }, { value: 'cheer', label: '🎁 Cheer (Bits) received' }, { value: 'follow', label: '💖 New follower' }, { value: 'sub', label: '⭐ New subscription' }, { value: 'hype_train', label: '🚂 Hype Train starts' }, { value: 'raid', label: '⚡ Raid received' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        niconico: [{ value: 'comment', label: '💬 Comment received' }, { value: 'nicoru', label: '✨ Emotion effect (Nicoru)' }, { value: 'gift', label: '🎁 Gift item received' }, { value: 'follow', label: '💖 New follower' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        twitcasting: [{ value: 'comment', label: '💬 Comment (ぶっこ抜き) received' }, { value: 'gift', label: '🎁 Gift item received' }, { value: 'follow', label: '💖 New follower' }, { value: 'supporter', label: '⭐ New supporter' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        instagram: [{ value: 'comment', label: '💬 Comment received' }, { value: 'like', label: '❤ Like received' }, { value: 'follow', label: '💖 New follower' }, { value: 'gift', label: '🎁 Gift received' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        tiktok: [{ value: 'comment', label: '💬 Comment received' }, { value: 'like', label: '❤ Like received' }, { value: 'follow', label: '💖 New follower' }, { value: 'gift', label: '🎁 Gift received' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        kick: [{ value: 'comment', label: '💬 Chat message received' }, { value: 'follow', label: '💖 New follower' }, { value: 'sub', label: '⭐ New subscription' }, { value: 'raid', label: '⚡ Raid received' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        facebook: [{ value: 'comment', label: '💬 Comment received' }, { value: 'like', label: '❤ Like / reaction received' }, { value: 'follow', label: '💖 New follower' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        x: [{ value: 'comment', label: '💬 Reply received' }, { value: 'like', label: '❤ Like received' }, { value: 'follow', label: '💖 New follower' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
        bilibili: [{ value: 'comment', label: '💬 Comment (弹幕) received' }, { value: 'gift', label: '🎁 Gift received' }, { value: 'follow', label: '💖 New follower' }, { value: 'stream_start', label: '▶ Stream starts' }, { value: 'stream_end', label: '⏹ Stream ends' }],
    };

    const EVENT_PARAMETERS = {
        comment: [{ name: 'event_message', label: 'Message text', type: 'text', value: '' }, { name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }, { name: 'event_is_member', label: 'Is member?', type: 'checkbox', value: false }, { name: 'event_is_mod', label: 'Is moderator?', type: 'checkbox', value: false }],
        superchat: [{ name: 'event_message', label: 'Message', type: 'text', value: '' }, { name: 'event_amount', label: 'Amount (USD)', type: 'number', value: '0' }, { name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }],
        cheer: [{ name: 'event_message', label: 'Message', type: 'text', value: '' }, { name: 'event_amount', label: 'Bits', type: 'number', value: '0' }, { name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }],
        gift: [{ name: 'event_amount', label: 'Gift count', type: 'number', value: '1' }, { name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }],
        sticker: [{ name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }],
        member: [{ name: 'event_sender_name', label: 'Member name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Member ID', type: 'text', value: '' }],
        follow: [{ name: 'event_sender_name', label: 'Follower name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Follower ID', type: 'text', value: '' }],
        sub: [{ name: 'event_sender_name', label: 'Subscriber name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Subscriber ID', type: 'text', value: '' }],
        nicoru: [{ name: 'event_sender_name', label: 'Sender name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Sender ID', type: 'text', value: '' }],
        raid: [{ name: 'event_sender_name', label: 'Raider name', type: 'text', value: '' }, { name: 'event_sender_id', label: 'Raider ID', type: 'text', value: '' }],
        hype_train: [{ name: 'event_message', label: 'Message', type: 'text', value: 'Hype train!' }],
        stream_start: [{ name: 'event_message', label: 'Notification', type: 'text', value: 'Stream started' }],
        stream_end: [{ name: 'event_message', label: 'Notification', type: 'text', value: 'Stream ended' }],
    };

    const PRODUCTS = {
        'govee-h6159': { actions: ['on', 'off', 'color', 'brightness', 'scene', 'flash'] }, 'govee-h6052': { actions: ['on', 'off', 'color', 'brightness', 'color_temp'] }, 'govee-h7021': { actions: ['on', 'off', 'color', 'brightness'] }, 'govee-h5080': { actions: ['on', 'off', 'toggle'] }, 'hue-color': { actions: ['on', 'off', 'color', 'brightness', 'color_temp', 'scene'] }, 'hue-white': { actions: ['on', 'off', 'brightness', 'color_temp'] }, 'hue-strip': { actions: ['on', 'off', 'color', 'brightness', 'scene'] }, 'hue-plug': { actions: ['on', 'off', 'toggle'] }, 'kasa-ep10': { actions: ['on', 'off', 'toggle'] }, 'kasa-ep40': { actions: ['on', 'off', 'toggle'] }, 'kasa-lb130': { actions: ['on', 'off', 'color', 'brightness'] }, 'lifx-color': { actions: ['on', 'off', 'color', 'brightness', 'color_temp', 'scene'] }, 'lifx-mini': { actions: ['on', 'off', 'brightness', 'color_temp'] }, 'lifx-strip': { actions: ['on', 'off', 'color', 'brightness', 'scene'] }, 'tuya-bulb': { actions: ['on', 'off', 'color', 'brightness'] }, 'tuya-plug': { actions: ['on', 'off', 'toggle'] }, 'tuya-strip': { actions: ['on', 'off', 'color', 'brightness'] }, 'nano-shapes': { actions: ['on', 'off', 'color', 'brightness', 'scene'] }, 'nano-lines': { actions: ['on', 'off', 'color', 'brightness', 'scene'] }, 'nano-canvas': { actions: ['on', 'off', 'color', 'brightness', 'scene'] }, 'yee-color': { actions: ['on', 'off', 'color', 'brightness', 'color_temp'] }, 'yee-strip': { actions: ['on', 'off', 'color', 'brightness'] }, 'yee-desk': { actions: ['on', 'off', 'brightness', 'color_temp'] }, 'wled-ctrl': { actions: ['on', 'off', 'color', 'brightness', 'scene', 'flash'] }, 'wyze-plug': { actions: ['on', 'off', 'toggle'] }, 'wyze-bulb': { actions: ['on', 'off', 'color', 'brightness', 'color_temp'] }, 'amz-plug': { actions: ['on', 'off', 'toggle'] }, 'echo-flex': { actions: ['on', 'off', 'toggle'] },
    };

    const platformIcons = window.__platformIcons || {};
    const PLATFORM_META = { youtube: { icon: platformIcons.youtube || '▶', label: 'YouTube' }, twitch: { icon: platformIcons.twitch || '🟣', label: 'Twitch' }, niconico: { icon: platformIcons.niconico || '🔵', label: 'NicoNico' }, instagram: { icon: platformIcons.instagram || '📷', label: 'Instagram' }, tiktok: { icon: platformIcons.tiktok || '🎵', label: 'TikTok' }, kick: { icon: platformIcons.kick || '🟢', label: 'Kick' }, facebook: { icon: platformIcons.facebook || '🔷', label: 'Facebook' }, x: { icon: platformIcons.x || '✖', label: 'X' }, bilibili: { icon: platformIcons.bilibili || '📺', label: 'Bilibili' }, twitcasting: { icon: platformIcons.twitcasting || '🎙', label: 'TwitCasting' } };

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
    function openModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
    function closeModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
    function showMonToast(message) { const toast = document.getElementById('monToast'); if (!toast) return; toast.textContent = message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 3000); }
    function getEventLabel(type, platform) { const event = (PLATFORM_EVENTS[platform] || []).find((item) => item.value === type); return event ? event.label : type; }
    function buildTestEvent(eventType, platform, customParams = {}) { const activeChannel = typeof window.currentChannel !== 'undefined' ? window.currentChannel : null; return { id: 'evt_test_' + Date.now(), user_id: 1, watch_target_id: activeChannel ? activeChannel.id : 'watch_1', platform, event_type: eventType, message: customParams.event_message || '', amount_value: parseInt(customParams.event_amount, 10) || 0, amount_currency: 'USD', amount_display: customParams.event_amount ? `$${customParams.event_amount}` : '$0', sender_name: customParams.event_sender_name || 'TestUser', sender_id: customParams.event_sender_id || 'user_test_123', sender_avatar: '', is_member: customParams.event_is_member === true || customParams.event_is_member === 'true', is_mod: customParams.event_is_mod === true || customParams.event_is_mod === 'true', badges: [], received_at: new Date().toISOString(), created_at: new Date().toISOString() }; }

    window.onclick = function (event) { ['conditionModal', 'filterModal', 'testConditionModal'].forEach((id) => { if (event.target === document.getElementById(id)) closeModal(id); }); };
    Object.assign(window, { PLATFORM_EVENTS, EVENT_PARAMETERS, PLATFORM_META, PRODUCTS, escHtml, isZeroDate, formatDate, formatDateTime, hasActiveFilter, openModal, closeModal, showMonToast, apiRequest, apiGet, getEventLabel, buildTestEvent });
})();


