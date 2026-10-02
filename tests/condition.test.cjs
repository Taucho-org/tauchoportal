const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'condition.js'), 'utf8');
const classSource = source.slice(0, source.indexOf('/**\n * ConditionEditor class'));
const context = vm.createContext({ console: { error() {}, warn() {} }, alert() {} });
vm.runInContext(classSource + '\nglobalThis.Handler = DeviceActionHandler;', context);

const evaluator = {
    Operator: 'WHOLESENTENCE',
    Variables: [],
    SubConditions: [{ Operator: 'PARAM', Variables: ['content'] }]
};

function handler(custom = false) {
    const instance = Object.create(context.Handler.prototype);
    const body = { color: '#FFFF00', brightness: 50, durationSeconds: 5, enabled: false, extra: { mode: 'on' } };
    const customInput = { value: JSON.stringify(body) };
    Object.assign(instance, {
        selectedGroupId: 'group-1',
        deviceGroups: [{ id: 'group-1' }],
        selectedTemplateId: custom ? '__custom__' : '1',
        selectedTemplate: { actionBody: body },
        parameterConfigs: {},
        parameterEditors: {},
        jsonTextarea: { value: '' },
        modalElement: { style: { display: 'block' }, querySelector: () => customInput }
    });
    return instance;
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

test('preset and custom actions embed every evaluator without an HTTP envelope', () => {
    for (const custom of [false, true]) {
        const instance = handler(custom);
        instance.parameterConfigs = {
            brightness: { mode: 'flexible', evaluator },
            durationSeconds: { mode: 'flexible', evaluator: { Operator: 'PARAM', Variables: ['duration'] } }
        };
        const params = plain(instance.buildActionParams());
        assert.deepEqual(Object.keys(params).sort(), ['device_action_body', 'device_group_id']);
        assert.deepEqual(params.device_action_body.brightness, evaluator);
        assert.deepEqual(params.device_action_body.durationSeconds, { Operator: 'PARAM', Variables: ['duration'] });
        assert.equal(params.device_action_body.color, '#FFFF00');
        assert.equal(params.device_action_body.enabled, false);
        assert.deepEqual(params.device_action_body.extra, { mode: 'on' });
        assert.equal(params.device_action_body.method, undefined);
        assert.equal(instance.selectedTemplate.actionBody.brightness, 50);
    }
});

test('graphical editor values are read even without textarea change events', () => {
    const instance = handler();
    instance.parameterConfigs.brightness = { mode: 'flexible', evaluator: null };
    instance.parameterEditors.brightness = { conditionInput: { value: JSON.stringify(evaluator) } };
    assert.deepEqual(plain(instance.getActionParams()).device_action_body.brightness, evaluator);
});

test('invalid fields block saving instead of silently retaining a static default', () => {
    const instance = handler();
    instance.parameterConfigs.brightness = { mode: 'flexible', evaluator: { Operator: 'WHOLESENTENCE', Variables: [] } };
    assert.throws(() => instance.getActionParams(), /requires an input/);
    assert.equal(instance.jsonTextarea.value, '');
    instance.parameterEditors.brightness = { conditionInput: { value: '{invalid' } };
    assert.throws(() => instance.getActionParams());
    instance.parameterConfigs = {};
    instance.parameterEditors = {};
    instance.selectedTemplate.actionBody = [];
    assert.throws(() => instance.buildActionParams(), /non-empty JSON object/);
});

test('optional evaluator arrays accept null and undefined but reject other non-arrays', () => {
    const instance = handler();
    for (const absent of [undefined, null]) {
        const leaf = { Operator: 'PARAM', Variables: ['content'], SubConditions: absent };
        const root = { Operator: 'WHOLESENTENCE', Variables: absent, SubConditions: [leaf] };
        assert.equal(instance.validateParameterEvaluator(leaf).valid, true);
        assert.equal(instance.validateParameterEvaluator(root).valid, true);
        instance.parameterConfigs.brightness = { mode: 'flexible', evaluator: root };
        assert.deepEqual(plain(instance.getActionParams()).device_action_body.brightness, plain(root));
    }
    for (const invalid of [false, 0, '', {}, 'content']) {
        assert.equal(instance.validateParameterEvaluator({
            Operator: 'PARAM', Variables: ['content'], SubConditions: invalid
        }).valid, false);
        assert.equal(instance.validateParameterEvaluator({
            Operator: 'WHOLESENTENCE', Variables: invalid, SubConditions: [evaluator]
        }).valid, false);
    }
    assert.equal(instance.validateParameterEvaluator({
        Operator: 'WHOLESENTENCE', Variables: null, SubConditions: null
    }).valid, false);
});

test('device test numeric bounds omit null and undefined while preserving zero', () => {
    const devicesSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'devices.js'), 'utf8');
    const renderSource = devicesSource.slice(
        devicesSource.indexOf('function normalizeTestParameterName'),
        devicesSource.indexOf('async function runDeviceTest')
    );
    for (const bound of [undefined, null, 0, 100]) {
        const inputs = [];
        const elements = {
            testTemplateSelect: { value: '1' },
            testTemplateFields: { replaceChildren() {}, append() {} },
            runDeviceTestButton: {}
        };
        const deviceContext = vm.createContext({
            activeTestDevice: {},
            activeTestTemplates: [{
                id: 1,
                optional_parameters: ['brightness'],
                ui_fields: [{ key: 'brightness', type: 'number', min: bound, max: bound }],
                parameter_constraints: { brightness: { min: bound, max: bound } }
            }],
            document: {
                getElementById: id => elements[id],
                createElement: tag => {
                    const element = { dataset: {}, append() {} };
                    if (tag === 'input') inputs.push(element);
                    return element;
                }
            }
        });
        vm.runInContext(renderSource + '\nrenderTestTemplateFields();', deviceContext);
        assert.equal(inputs.length, 1);
        for (const key of ['min', 'max']) {
            assert.equal(Object.hasOwn(inputs[0], key), bound != null);
            if (bound != null) assert.equal(inputs[0][key], bound);
        }
    }
});

test('static JSON values retain types and top-level object fields are not flattened', () => {
    const instance = handler();
    for (const [input, expected] of [['50', 50], ['false', false], ['null', null], ['"50"', '50'], ['white', 'white']]) {
        assert.deepEqual(instance.parseStaticValue(input), expected);
    }
    assert.deepEqual(plain(instance.extractParameterPaths({ extra: { nested: 1 }, 'literal.dot': evaluator })), ['extra', 'literal.dot']);
    instance.parameterConfigs['literal.dot'] = { mode: 'flexible', evaluator };
    assert.deepEqual(plain(instance.buildActionParams()).device_action_body['literal.dot'], evaluator);
});

test('saved group and per-field logic reload and can be edited again', () => {
    const instance = handler();
    const saved = { device_group_id: 'group-1', device_action_body: { brightness: evaluator, enabled: false } };
    instance.jsonTextarea.value = JSON.stringify(saved);
    instance.mainContainer = { querySelector: () => ({ value: '' }) };
    instance.showGroupDevices = () => {};
    instance.loadFromJson();
    assert.equal(instance.selectedTemplateId, '__custom__');
    assert.deepEqual(plain(instance.buildActionParams()), saved);
    assert.deepEqual(plain(instance.getActionParams()), saved);
    instance.deviceGroups = [];
    assert.throws(() => instance.getActionParams(), /device group is unavailable/);
});

test('attaching mode controls does not switch untouched static values to flexible', () => {
    const instance = handler();
    const radios = ['static', 'flexible'].map(value => ({
        value,
        addEventListener(name, listener) { this.listener = listener; }
    }));
    const staticInput = { value: '50', style: {}, addEventListener() {} };
    const textarea = { value: JSON.stringify(evaluator), style: {}, addEventListener() {} };
    const drawing = { style: {}, classList: { contains: () => false } };
    instance.parameterConfigs.brightness = { mode: 'static', value: 50 };
    instance.attachParameterModeListeners({
        querySelectorAll: () => radios,
        querySelector: selector => selector === '[data-mode="static"]' ? staticInput
            : selector === '[data-mode="flexible"]' ? textarea : drawing
    }, 'brightness');
    assert.equal(instance.parameterConfigs.brightness.mode, 'static');
    assert.equal(instance.buildActionParams().device_action_body.brightness, 50);
    radios[1].listener();
    assert.deepEqual(plain(instance.buildActionParams()).device_action_body.brightness, evaluator);
    radios[0].listener();
    assert.equal(instance.buildActionParams().device_action_body.brightness, 50);
});

test('custom template selection works even if the group has no preset templates', () => {
    const instance = handler();
    const select = { innerHTML: '' };
    instance.modalElement.querySelector = () => select;
    let selected;
    instance.onTemplateSelected = value => { selected = value; };
    instance.renderTemplateSelector([]);
    select.onchange({ target: { value: '__custom__' } });
    assert.equal(selected, '__custom__');
});

test('all supported locales have the new configuration label and parameter-only hint', () => {
    for (const locale of ['en', 'ja', 'de', 'fr', 'es', 'zh', 'ko']) {
        const strings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'internal', 'i18n', 'locales', locale + '.json'), 'utf8'));
        assert.ok(strings['condition.deviceAction.configure']);
        assert.ok(strings['condition.deviceAction.topLevelHint']);
    }
});

test('page Save and Test send the same current top-level action configuration', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'templates', 'pages', 'condition.html'), 'utf8');
    const inline = html.slice(html.indexOf('<script>\nlet conditionEditor'), html.lastIndexOf('</script>'))
        .replace(/^<script>\n/, '');
    const elements = {
        'condition-view': { dataset: { platform: 'youtube' } },
        currentEventType: { innerText: 'chat' },
        conditionEventFieldOptionsData: { textContent: '[]' },
        conditionTemplatesData: { textContent: '[]' },
        conditionPropertiesData: { textContent: '[]' },
        conditionLogicInput: { value: JSON.stringify({ Operator: 'OR', SubConditions: [] }) },
        sendingparamjson: { value: '{}' },
        testEventType: { value: 'chat' },
        testTriggerRealDevice: { checked: true },
        testEventParamsContainer: { querySelectorAll: () => [] },
        testResultsContainer: { style: {} },
        testResultsContent: {},
        submitConditionButton: { textContent: 'Save' }
    };
    const sent = [];
    const params = { device_group_id: 'group-1', device_action_body: { brightness: evaluator, enabled: false } };
    const page = vm.createContext({
        console: { log() {}, error() {} },
        alert() {},
        document: { getElementById: id => elements[id], querySelector: () => null, addEventListener() {} },
        deviceActionHandler: { getActionParams: () => params },
        window: { location: {}, addEventListener() {}, createTestEventFromMetadata: async () => ({ content: 'hello' }) },
        fetch: async (url, options) => {
            sent.push({ url, method: options.method, body: JSON.parse(options.body) });
            return { ok: true, json: async () => ({ matched: true, resolved_action_body: { brightness: 'hello' } }) };
        }
    });
    vm.runInContext(inline, page);
    await vm.runInContext('runConditionTest()', page);
    vm.runInContext('submitCondition()', page);
    vm.runInContext("submitCondition = " + page.submitCondition.toString().replace("const conditionID = '{{.Condition.ID}}';", "const conditionID = '';"), page);
    vm.runInContext('submitCondition()', page);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(sent.length, 3);
    assert.deepEqual(sent.map(request => request.method), ['POST', 'PATCH', 'POST']);
    for (const request of sent) {
        assert.deepEqual(request.body.device_action_body, params.device_action_body);
        assert.equal(request.body.device_group_id, 'group-1');
        for (const obsolete of ['device_action_params', 'device_action_param_name', 'device_action_param_evaluator', 'device_id']) {
            assert.equal(Object.hasOwn(request.body, obsolete), false);
        }
    }
    assert.equal(sent[0].body.trigger_real_device, true);
    assert.match(elements.testResultsContent.innerHTML, /resolved_action_body/);
});
