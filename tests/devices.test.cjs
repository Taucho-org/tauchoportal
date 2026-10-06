const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'devices.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'pages', 'devices.html'), 'utf8');

function loadPage(devices, groups = []) {
    const elements = {};
    const radios = Array.from(template.matchAll(/<input type="radio" name="(groupDeviceTargeting|groupConcurrencyMode)" value="([^"]+)"([^>]*)>/g),
        ([, name, value, attributes]) => ({ name, value, defaultChecked: attributes.includes('checked'), checked: attributes.includes('checked') }));
    const element = id => elements[id] ||= {
        value: '',
        innerHTML: '',
        style: {},
        reset() {},
        focus() {}
    };
    const context = vm.createContext({
        console,
        alert(message) { throw new Error(message); },
        location: { reload() {} },
        allBrands: [{ id: 'brand-a', name: 'Brand A' }],
        myBrands: [],
        devicesI18n: new Proxy({}, { get: (_, key) => `${key}: {0}` }),
        document: {
            body: { style: {} },
            addEventListener() {},
            getElementById: element,
            querySelector: selector => {
                const match = selector.match(/^input\[name="([^"]+)"\](?:\[value="([^"]+)"\]|(:checked))$/);
                return match ? radios.find(radio => radio.name === match[1] &&
                    (match[3] ? radio.checked : radio.value === match[2])) : null;
            },
            querySelectorAll: selector => {
                const match = selector.match(/^input\[name="([^"]+)"\]$/);
                return match ? radios.filter(radio => radio.name === match[1]) : [];
            }
        }
    });
    context.window = context;
    element('groupForm').reset = () => radios.forEach(radio => { radio.checked = radio.defaultChecked; });
    const data = { mydevices: devices, mydevicegroups: groups, mybrands: [] };
    const scripts = template.slice(template.indexOf('{{define "scripts"}}'));
    for (const [, attributes, body] of scripts.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
        const id = attributes.match(/\bid="([^"]+)"/)?.[1];
        if (attributes.includes('type="application/json"')) {
            element(id).textContent = JSON.stringify(data[id]);
        } else if (attributes.includes('src="/js/devices.js"')) {
            vm.runInContext(source, context);
        } else {
            vm.runInContext(body, context);
        }
    }
    function select(name, value) {
        radios.filter(radio => radio.name === name).forEach(radio => { radio.checked = radio.value === value; });
    }
    return { context, elements, radios, select };
}

function device(id, overrides = {}) {
    return {
        id,
        name: id,
        brand: 'brand-a',
        supported_actions: ['on', 'off'],
        group_key: 'brand-a|off,on',
        device_group_id: `own-${id}`,
        ...overrides
    };
}

function row(html, id) {
    return html.match(new RegExp(`<label[^>]*>[\\s\\S]*?value="${id}"[\\s\\S]*?</label>`))?.[0];
}

test('remove and ungroup confirmations replace repeated placeholders in every locale', async () => {
    const localesPath = path.join(__dirname, '..', 'internal', 'i18n', 'locales');
    for (const file of fs.readdirSync(localesPath).filter(file => file.endsWith('.json'))) {
        const locale = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
        const deviceName = 'Device $&';
        const groupName = 'Group $&';
        const { context } = loadPage([
            device('one', { name: deviceName, device_group_id: 'group' })
        ], [{ id: 'group', name: groupName }]);
        context.devicesI18n = {
            removeFromGroupConfirm: locale['devices.removeFromGroupConfirm'],
            ungroupConfirm: locale['devices.ungroupConfirm']
        };
        const messages = [];
        context.confirm = message => {
            messages.push(message);
            return false;
        };
        context.apiRequest = () => { throw new Error('Cancellation must not modify devices'); };
        await context.removeFromGroup('one');
        await context.ungroupGroup('group');
        assert.equal(messages[0], locale['devices.removeFromGroupConfirm']
            .split('{0}').join(deviceName).split('{1}').join(groupName), file);
        assert.equal(messages[1], locale['devices.ungroupConfirm'].split('{0}').join(groupName), file);
        for (const message of messages) assert.doesNotMatch(message, /\{\d+\}/, file);
    }
});

test('new group lists all same-brand, same-capability devices after page initialization', () => {
    const { context, elements } = loadPage([
        device('anchor'),
        device('compatible', { group_key: '', supported_actions: ['off', 'on', 'on'] }),
        device('other-brand', { brand: 'brand-b', group_key: 'brand-b|off,on' }),
        device('other-actions', { group_key: 'brand-a|brightness' }),
        device('custom', { brand: 'custom', group_key: '', supported_actions: ['on', 'off'] })
    ]);
    context.openGroupModal('', 'anchor');
    const html = elements.groupDeviceList.innerHTML;
    assert.match(html, /value="anchor" checked/);
    assert.match(html, /value="compatible"/);
    assert.doesNotMatch(html, /value="compatible" checked/);
    assert.doesNotMatch(html, /value="(?:other-brand|other-actions|custom)"/);
    assert.match(elements.groupCompatNote.innerHTML, /Brand A/);
    assert.equal(elements.groupModal.style.display, 'block');
});

test('editing a group checks existing members and offers compatible devices from other groups', () => {
    const { context, elements } = loadPage([
        device('member-one', { device_group_id: 'group' }),
        device('member-two', { device_group_id: 'group' }),
        device('incompatible-member', { device_group_id: 'group', group_key: 'brand-b|off,on', brand: 'brand-b' }),
        device('standalone'),
        device('other-one', { device_group_id: 'other-group' }),
        device('other-two', { device_group_id: 'other-group' }),
        device('excluded', { group_key: 'brand-a|brightness' })
    ], [
        { id: 'group', name: 'Current group', device_targeting: 'ROUND_ROBIN', concurrency_mode: 'queued' },
        { id: 'other-group', name: 'Other group', device_targeting: 'ALL', concurrency_mode: 'exclusive' }
    ]);
    context.openGroupModal('group');
    const html = elements.groupDeviceList.innerHTML;
    for (const id of ['member-one', 'member-two', 'incompatible-member']) {
        assert.match(html, new RegExp(`value="${id}" checked`));
    }
    assert.match(row(html, 'incompatible-member'), /groupIncompatibleMember/);
    for (const id of ['standalone', 'other-one', 'other-two']) {
        assert.match(html, new RegExp(`value="${id}"`));
        assert.doesNotMatch(html, new RegExp(`value="${id}" checked`));
    }
    assert.match(row(html, 'other-one'), /Other group/);
    assert.doesNotMatch(html, /value="excluded"/);
    assert.equal(elements.groupName.value, 'Current group');
});

test('group modal restores both independent modes and resets defaults for a new group', () => {
    for (const deviceTargeting of ['ALL', 'ROUND_ROBIN', 'USER_AFFINITY']) {
        for (const concurrencyMode of ['exclusive', 'queued']) {
            const { context, radios } = loadPage([
                device('one', { device_group_id: 'group' }),
                device('two', { device_group_id: 'group' })
            ], [{ id: 'group', name: 'Group', device_targeting: deviceTargeting, concurrency_mode: concurrencyMode }]);
            context.openGroupModal('group');
            assert.equal(radios.find(radio => radio.name === 'groupDeviceTargeting' && radio.checked).value, deviceTargeting);
            assert.equal(radios.find(radio => radio.name === 'groupConcurrencyMode' && radio.checked).value, concurrencyMode);
            context.openGroupModal('', 'one');
            assert.equal(radios.find(radio => radio.name === 'groupDeviceTargeting' && radio.checked).value, 'ALL');
            assert.equal(radios.find(radio => radio.name === 'groupConcurrencyMode' && radio.checked).value, 'exclusive');
        }
    }
});

test('creating, reusing an implicit group, and editing send the renamed modes for every combination', async () => {
    for (const mode of ['create', 'reuse', 'edit']) {
        for (const deviceTargeting of ['ALL', 'ROUND_ROBIN', 'USER_AFFINITY']) {
            for (const concurrencyMode of ['exclusive', 'queued']) {
                const existingGroupId = mode === 'edit' ? 'existing' : mode === 'reuse' ? 'own-one' : '';
                const devices = [
                    device('one', { device_group_id: existingGroupId }),
                    device('two', { device_group_id: mode === 'edit' ? existingGroupId : '' })
                ];
                const { context, elements, select } = loadPage(devices, mode === 'edit' ? [{
                    id: 'existing', name: 'Group', device_targeting: 'ALL', concurrency_mode: 'exclusive'
                }] : []);
                context.openGroupModal(mode === 'edit' ? existingGroupId : '', 'one');
                elements.groupName.value = 'Updated group';
                select('groupDeviceTargeting', deviceTargeting);
                select('groupConcurrencyMode', concurrencyMode);
                context.document.querySelectorAll = () => devices.map(dev => ({ value: dev.id }));
                const calls = [];
                context.apiRequest = async (method, url, body) => {
                    calls.push({ method, url, body });
                    return { id: 'created' };
                };
                await context.saveGroup({ preventDefault() {} });
                assert.equal(calls[0].method, mode === 'create' ? 'POST' : 'PATCH');
                assert.equal(calls[0].url, mode === 'create' ? '/device-groups' : `/device-groups/update?id=${existingGroupId}`);
                assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), {
                    name: 'Updated group', device_targeting: deviceTargeting, concurrency_mode: concurrencyMode
                });
            }
        }
    }
});

test('implicit single-device groups use explicit defaults and name-only updates preserve modes', async () => {
    const { context } = loadPage([device('one', { device_group_id: 'old-group' })]);
    const calls = [];
    context.apiRequest = async (method, url, body) => {
        calls.push({ method, url, body });
        return { id: 'new-group' };
    };
    await context.giveDeviceOwnGroup('one', 'One');
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), {
        name: 'One', device_targeting: 'ALL', concurrency_mode: 'exclusive'
    });
    await context.tidyGroupAfterLeave('new-group');
    assert.deepEqual(JSON.parse(JSON.stringify(calls[2].body)), { name: 'one' });
});

test('saving requires both mode selections', async () => {
    const { context, elements, select } = loadPage([device('one'), device('two')]);
    context.openGroupModal('', 'one');
    elements.groupName.value = 'Group';
    select('groupDeviceTargeting', '');
    await assert.rejects(context.saveGroup({ preventDefault() {} }), /groupModesRequired/);
});

test('all locales contain the new group controls and no misleading legacy descriptions', () => {
    const localesPath = path.join(__dirname, '..', 'internal', 'i18n', 'locales');
    const keys = Array.from(template.matchAll(/devices\.(group(?:DeviceTargeting|Targeting\w+|Concurrency\w+))/g), match => `devices.${match[1]}`);
    keys.push('devices.groupModesRequired');
    for (const file of fs.readdirSync(localesPath).filter(file => file.endsWith('.json'))) {
        const locale = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
        for (const key of keys) assert.ok(locale[key], `${file}: missing ${key}`);
        assert.equal(locale['devices.groupOptionSequentialDesc'], undefined);
        assert.equal(locale['devices.groupOptionQueueDesc'], undefined);
    }
});

test('new group reports when there is no compatible peer', () => {
    const { context, elements } = loadPage([
        device('anchor'),
        device('different', { group_key: 'brand-a|brightness' })
    ]);
    context.openGroupModal('', 'anchor');
    assert.match(elements.groupDeviceList.innerHTML, /groupNoCompatibleDevices/);
    assert.doesNotMatch(elements.groupDeviceList.innerHTML, /type="checkbox"/);
});
