const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'catalog-storefront.js'), 'utf8');

function loadCatalog(products, deviceProducts = []) {
    const grid = { innerHTML: '', hidden: false };
    const loading = { hidden: true };
    const error = { hidden: true };
    const empty = { hidden: true };
    const errorMessage = { textContent: '' };
    const count = { textContent: '' };
    const search = { value: '', addEventListener() {} };
    const root = {
        dataset: {
            brand: 'taucho',
            addLabel: 'Add device',
            buyLabel: 'Buy now',
            noResults: 'No products',
            countTemplate: 'Showing {start}-{end} of {total}',
            pageTemplate: '{page}/{total}'
        },
        querySelector(selector) {
            return ({
                '[data-catalog-products]': grid,
                '[data-catalog-loading]': loading,
                '[data-catalog-error]': error,
                '[data-catalog-empty]': empty,
                '[data-catalog-error-message]': errorMessage,
                '[data-catalog-count]': count,
                '[data-catalog-search]': search,
                '[data-catalog-pagination]': null
            })[selector] ?? null;
        },
        addEventListener() {}
    };
    const requests = [];
    const context = vm.createContext({
        document: {
            documentElement: { lang: 'ja' },
            querySelectorAll: selector => selector === '[data-storefront-catalog]' ? [root] : []
        },
        URL,
        URLSearchParams,
        Intl,
        navigator: { languages: ['ja-JP'], language: 'ja-JP' },
        window: { location: { origin: 'https://taucho.org' } },
        fetch: async url => {
            requests.push(String(url));
            const data = String(url).includes('/storefront/')
                ? { products }
                : { products: deviceProducts, pagination: { has_next: false, offset: 0, limit: 100 } };
            return { ok: true, json: async () => data };
        },
        console
    });
    vm.runInContext(source, context);
    return { count, empty, error, grid, loading, requests, root, context };
}

test('storefront request uses page language and browser-region currency and renders enriched fields', async () => {
    const page = loadCatalog([{
        id: 289,
        brand_id: 'taucho',
        source_product_key: 'api-mirror-ball',
        source_url: 'https://taucho.org/shopping/mirrorball',
        category: 'Streaming gadgets',
        name: 'API ミラーボール',
        language_code: 'jp',
        description: 'Localized product description',
        price: 8000,
        compare_at_price: 9000,
        currency: 'JPY',
        discount_percent: 11,
        campaign_name: 'Winter sale',
        images: [
            { image_url: '/image/catalog/mirrorball-front.png', position: 0 },
            { image_url: '/image/catalog/mirrorball-side.png', position: 1 }
        ],
        offers: [{
            id: 42,
            offer_name: 'Store offer',
            price: 8000,
            compare_at_price: 9000,
            currency: 'JPY',
            discount_percent: 11,
            valid_from: '2026-11-01T00:00:00Z',
            valid_until: '2026-12-01T00:00:00Z',
            source_url: 'https://taucho.org/shopping/mirrorball',
            captured_at: '2026-11-25T00:00:00Z'
        }]
    }], [{
        id: 'api-mirror-ball',
        brand_id: 'taucho',
        name: 'API Mirror Ball'
    }]);

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(page.requests.length, 2);
    const request = new URL(page.requests.find(url => url.includes('/storefront/')), 'https://taucho.org');
    assert.equal(request.pathname, '/api/catalog/storefront/products');
    assert.equal(request.searchParams.get('language'), 'jp');
    assert.equal(request.searchParams.get('currency'), 'JPY');
    assert.equal(request.searchParams.get('active_only'), 'true');
    assert.match(page.grid.innerHTML, /Localized product description/);
    assert.match(page.grid.innerHTML, /lang="ja"/);
    assert.match(page.grid.innerHTML, /data-image-index="1"/);
    assert.match(page.grid.innerHTML, /8,000/);
    assert.match(page.grid.innerHTML, /9,000/);
    assert.match(page.grid.innerHTML, /Winter sale/);
    assert.match(page.grid.innerHTML, /Store offer/);
    assert.match(page.grid.innerHTML, /data-catalog-add data-product-id="api-mirror-ball"/);
    assert.match(page.grid.innerHTML, /2026/);
    assert.equal(page.empty.hidden, true);
    assert.equal(page.loading.hidden, true);
    assert.equal(page.error.hidden, true);
});

test('storefront uses API null pricing without inventing a currency value', async () => {
    const page = loadCatalog([{
        id: 290,
        brand_id: 'taucho',
        source_product_key: 'unpriced',
        name: 'Unpriced product',
        language_code: 'en',
        description: null,
        price: null,
        currency: null,
        images: [],
        offers: []
    }]);

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.match(page.grid.innerHTML, /Unpriced product/);
    assert.doesNotMatch(page.grid.innerHTML, /storefront-price|storefront-offers/);
    assert.doesNotMatch(page.grid.innerHTML, /data-catalog-add/);
    assert.match(page.grid.innerHTML, /product-placeholder\.png/);
});
