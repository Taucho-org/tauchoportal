const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'devices.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'pages', 'devices.html'), 'utf8');

function loadPage(devices, groups = []) {
    const elements = {};
    const element = id => elements[id] ||= {
        value: '',
        innerHTML: '',
        style: {},
        reset() {},
        focus() {}
    };
    const context = vm.createContext({
        console,
        allBrands: [{ id: 'brand-a', name: 'Brand A' }],
        myBrands: [],
        devicesI18n: new Proxy({}, { get: (_, key) => `${key}: {0}` }),
        document: {
            body: { style: {} },
            addEventListener() {},
            getElementById: element,
            querySelector: () => ({}),
            querySelectorAll: () => []
        }
    });
    context.window = context;
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
    return { context, elements };
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
        { id: 'group', name: 'Current group', option: 'queue' },
        { id: 'other-group', name: 'Other group', option: 'sequential' }
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

test('new group reports when there is no compatible peer', () => {
    const { context, elements } = loadPage([
        device('anchor'),
        device('different', { group_key: 'brand-a|brightness' })
    ]);
    context.openGroupModal('', 'anchor');
    assert.match(elements.groupDeviceList.innerHTML, /groupNoCompatibleDevices/);
    assert.doesNotMatch(elements.groupDeviceList.innerHTML, /type="checkbox"/);
});
