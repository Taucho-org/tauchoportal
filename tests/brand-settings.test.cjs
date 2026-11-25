const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'brand-settings.js'), 'utf8');
const englishLocale = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'internal', 'i18n', 'locales', 'en.json'), 'utf8'));

function loadPage(fetch, messages = {}) {
    const elements = new Map();
    const documentListeners = {};
    const toastMessages = [];
    const element = id => {
        if (!elements.has(id)) {
            elements.set(id, {
                id,
                value: '',
                textContent: '',
                disabled: false,
                style: { display: 'none' },
                listeners: {},
                addEventListener(type, listener) {
                    this.listeners[type] = listener;
                },
                focus() {},
                classList: { add() {}, remove() {} },
                remove() {}
            });
        }
        return elements.get(id);
    };
    const document = {
        addEventListener(type, listener) {
            (documentListeners[type] ||= []).push(listener);
        },
        getElementById: element,
        querySelectorAll() {
            return [];
        },
        createElement: element,
        body: {
            appendChild(toast) {
                toastMessages.push(toast.textContent);
            }
        }
    };
    const window = {
        _allBrands: [{ id: 'unicorn', name: 'Unicorn E.', authentication_type: 'sso' }],
        __user: { email: 'taucho@example.com' },
        _i18nMsg: messages,
        location: { search: '', reload() {} }
    };
    const context = vm.createContext({
        AbortController,
        document,
        fetch,
        history: { replaceState() {} },
        setTimeout() {},
        URLSearchParams,
        window
    });
    vm.runInContext(source, context);
    for (const listener of documentListeners.DOMContentLoaded || []) listener();

    return { documentListeners, element, toastMessages, window };
}

test('Unicorn connect sends entered credentials to connect-sso and clears the password', async () => {
    const calls = [];
    const { element, window } = loadPage(async (url, options) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({
                success: true,
                brand_id: 'unicorn',
                status: 'connected',
                message: 'Unicorn account connected'
            })
        };
    });

    window.handleBrandAction('unicorn');
    assert.equal(element('unicornConnectModal').style.display, 'block');
    assert.equal(element('unicornUserId').value, 'taucho@example.com');
    assert.equal(element('unicornPassword').value, '');

    element('unicornUserId').value = 'unicorn-login';
    element('unicornPassword').value = 'secret-password';
    await element('unicornConnectForm').listeners.submit({ preventDefault() {} });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/auth/brand/unicorn/connect-sso');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.credentials, 'include');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
        user_id: 'unicorn-login',
        password: 'secret-password'
    });
    assert.equal(element('unicornPassword').value, '');
    assert.equal(element('unicornConnectModal').style.display, 'none');
});

test('closing the Unicorn credential dialog clears the password', () => {
    const { documentListeners, element, window } = loadPage(async () => {
        assert.fail('Closing the dialog must not submit credentials');
    });
    window.handleBrandAction('unicorn');
    element('unicornPassword').value = 'secret-password';

    documentListeners.click[0]({
        target: {
            closest() {
                return { getAttribute: () => 'unicornConnectModal' };
            }
        }
    });

    assert.equal(element('unicornPassword').value, '');
    assert.equal(element('unicornConnectModal').style.display, 'none');
});

test('displays a localized service error and clears the submitted password', async () => {
    const { element, window } = loadPage(async () => ({
        ok: false,
        status: 503,
        json: async () => ({
            error: 'service unavailable',
            reason: 'Unicorn login service unavailable'
        })
    }), englishLocale);

    window.handleBrandAction('unicorn');
    element('unicornUserId').value = 'unicorn-login';
    element('unicornPassword').value = 'secret-password';
    await element('unicornConnectForm').listeners.submit({ preventDefault() {} });

    assert.equal(element('unicornConnectError').textContent, englishLocale['brandSettings.sso.serviceUnavailable']);
    assert.equal(element('unicornConnectError').hidden, false);
    assert.equal(element('unicornPassword').value, '');
    assert.equal(element('unicornConnectButton').disabled, false);
    assert.equal(element('unicornConnectModal').style.display, 'block');
});

test('shows localized field validation and rejected-credential messages', async () => {
    let requestCount = 0;
    const { element, window } = loadPage(async () => {
        requestCount += 1;
        return {
            ok: false,
            status: 422,
            json: async () => ({
                success: false,
                message: 'Unicorn ID or Password was not accepted'
            })
        };
    }, englishLocale);

    window.handleBrandAction('unicorn');
    element('unicornUserId').value = '';
    await element('unicornConnectForm').listeners.submit({ preventDefault() {} });
    assert.equal(element('unicornConnectError').textContent, englishLocale['brandSettings.sso.userIdRequired']);
    assert.equal(requestCount, 0);

    element('unicornUserId').value = 'unicorn-login';
    await element('unicornConnectForm').listeners.submit({ preventDefault() {} });
    assert.equal(element('unicornConnectError').textContent, englishLocale['brandSettings.sso.passwordRequired']);
    assert.equal(requestCount, 0);

    element('unicornPassword').value = 'wrong-password';
    await element('unicornConnectForm').listeners.submit({ preventDefault() {} });
    assert.equal(element('unicornConnectError').textContent, englishLocale['brandSettings.sso.invalidCredentials']);
    assert.equal(element('unicornPassword').value, '');
    assert.equal(requestCount, 1);
});

test('all supported locales include the Unicorn connection error translations', () => {
    const localeDirectory = path.join(__dirname, '..', 'internal', 'i18n', 'locales');
    const keys = [
        'brandSettings.sso.userIdRequired',
        'brandSettings.sso.passwordRequired',
        'brandSettings.sso.invalidCredentials',
        'brandSettings.sso.invalidRequest',
        'brandSettings.sso.sessionExpired',
        'brandSettings.sso.connectionFailed',
        'brandSettings.sso.serviceUnavailable'
    ];

    for (const file of fs.readdirSync(localeDirectory).filter(file => file.endsWith('.json'))) {
        const locale = JSON.parse(fs.readFileSync(path.join(localeDirectory, file), 'utf8'));
        for (const key of keys) assert.ok(locale[key], `${file}: missing ${key}`);
    }
});
