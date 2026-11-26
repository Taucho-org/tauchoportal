(() => {
    const placeholderImage = '/image/catalog/product-placeholder.png';
    const currencyByRegion = {
        US: 'USD', CA: 'CAD', GB: 'GBP', IE: 'EUR', AU: 'AUD', NZ: 'NZD',
        JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', TW: 'TWD', SG: 'SGD',
        IN: 'INR', BR: 'BRL', MX: 'MXN', CH: 'CHF', NO: 'NOK', SE: 'SEK',
        DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', TR: 'TRY', IL: 'ILS',
        ZA: 'ZAR', AE: 'AED', SA: 'SAR', TH: 'THB', MY: 'MYR', ID: 'IDR',
        PH: 'PHP'
    };
    const euroRegions = new Set([
        'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IT',
        'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'
    ]);
    let productsRequest;
    let deviceProductsRequest;

    function catalogLanguage() {
        const language = document.documentElement.lang.toLowerCase().split('-')[0];
        return ({ ja: 'jp', ko: 'kr' })[language] || language || 'en';
    }

    function catalogCurrency() {
        const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
        for (const locale of locales) {
            try {
                const region = new Intl.Locale(locale).region;
                if (region && (currencyByRegion[region] || euroRegions.has(region))) {
                    return currencyByRegion[region] || 'EUR';
                }
            } catch {
                continue;
            }
        }
        const language = catalogLanguage();
        return ({ de: 'EUR', es: 'EUR', fr: 'EUR', ja: 'JPY', jp: 'JPY', ko: 'KRW', kr: 'KRW', zh: 'CNY' })[language] || 'USD';
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function safeUrl(value, allowRelative = false) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            const url = new URL(value, window.location.origin);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                if (allowRelative || value.startsWith('http://') || value.startsWith('https://')) return url.href;
            }
        } catch {
            return '';
        }
        return '';
    }

    function formatPrice(value, currency, locale) {
        if (value == null || !currency) return '';
        const amount = Number(value);
        if (!Number.isFinite(amount)) return `${value} ${currency}`;
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                currencyDisplay: 'code'
            }).format(amount);
        } catch {
            return `${amount} ${currency}`;
        }
    }

    function localizedDate(value, locale) {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    }

    function htmlLanguage(language) {
        return ({ jp: 'ja', kr: 'ko' })[String(language || '').toLowerCase()] || language || '';
    }

    function translate(template, values) {
        return template.replace(/\{(start|end|total|page)\}/g, (_, key) => values[key] ?? '');
    }

    function loadProducts() {
        if (!productsRequest) {
            const params = new URLSearchParams({
                language: catalogLanguage(),
                currency: catalogCurrency(),
                active_only: 'true'
            });
            productsRequest = Promise.all([
                fetch(`/api/catalog/storefront/products?${params}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        return response.json();
                    })
                    .then(data => {
                        if (!Array.isArray(data.products)) throw new Error('Invalid storefront catalog response');
                        return data.products;
                    }),
                loadDeviceProducts()
            ])
                .then(([products, deviceProducts]) => products.map(product => ({
                    ...product,
                    device_product_id: findDeviceProductId(product, deviceProducts)
                })))
                .catch(error => {
                    productsRequest = null;
                    throw error;
                });
        }
        return productsRequest;
    }

    function loadDeviceProducts() {
        if (!deviceProductsRequest) {
            deviceProductsRequest = (async () => {
                const products = [];
                const limit = 100;
                let offset = 0;
                while (true) {
                    const params = new URLSearchParams({
                        active_only: 'true',
                        limit: String(limit),
                        offset: String(offset),
                        sort_by: 'name'
                    });
                    const response = await fetch(`/api/catalog/products?${params}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    const data = await response.json();
                    const page = Array.isArray(data) ? data : data.products;
                    if (!Array.isArray(page)) throw new Error('Invalid device catalog response');
                    products.push(...page);
                    if (Array.isArray(data) || !data.pagination?.has_next) return products;
                    const nextOffset = Number(data.pagination.offset) + Number(data.pagination.limit);
                    if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
                        throw new Error('Invalid device catalog pagination');
                    }
                    offset = nextOffset;
                }
            })().catch(error => {
                console.error('Error loading device product IDs:', error);
                return [];
            });
        }
        return deviceProductsRequest;
    }

    function findDeviceProductId(product, deviceProducts) {
        const candidates = deviceProducts.filter(candidate => candidate.brand_id === product.brand_id);
        const key = String(product.source_product_key || '');
        const byKey = candidates.find(candidate => String(candidate.id) === key);
        if (byKey) return String(byKey.id);
        const name = String(product.name || '').trim().toLocaleLowerCase();
        if (!name) return '';
        const byName = candidates.filter(candidate =>
            String(candidate.name || '').trim().toLocaleLowerCase() === name
        );
        return byName.length === 1 ? String(byName[0].id) : '';
    }

    function renderImageGallery(images, name) {
        const urls = images.map(image => safeUrl(image.image_url, true)).filter(Boolean);
        if (!urls.length) urls.push(placeholderImage);
        const controls = urls.length > 1
            ? `<div class="storefront-image-controls">
                <button type="button" data-image-step="-1" aria-label="Previous image">‹</button>
                <span data-image-position>1 / ${urls.length}</span>
                <button type="button" data-image-step="1" aria-label="Next image">›</button>
               </div>
               <div class="storefront-image-thumbnails">${urls.map((url, index) =>
                `<button type="button" data-image-index="${index}" aria-label="Show image ${index + 1}" ${index ? '' : 'aria-current="true"'}>
                    <img src="${escapeHtml(url)}" alt="" loading="lazy">
                 </button>`
            ).join('')}</div>`
            : '';
        return `<div class="product-image" data-image-gallery data-images="${escapeHtml(JSON.stringify(urls))}">
            <img src="${escapeHtml(urls[0])}" alt="${escapeHtml(name)}" loading="lazy" data-gallery-image onerror="this.onerror=null;this.src='${placeholderImage}'">
            ${controls}
        </div>`;
    }

    function renderOffer(offer, product, locale) {
        const price = formatPrice(offer.price, offer.currency, locale);
        const compareAt = formatPrice(offer.compare_at_price, offer.currency, locale);
        const title = offer.offer_name || product.campaign_name || '';
        const source = safeUrl(offer.source_url || product.source_url);
        const range = [localizedDate(offer.valid_from, locale), localizedDate(offer.valid_until, locale)].filter(Boolean);
        const capturedAt = localizedDate(offer.captured_at, locale);
        const details = [
            title && `<span>${escapeHtml(title)}</span>`,
            price && `<strong>${escapeHtml(price)}</strong>`,
            compareAt && `<del>${escapeHtml(compareAt)}</del>`,
            offer.discount_percent != null && `<span>-${escapeHtml(offer.discount_percent)}%</span>`,
            range.length && `<span>${escapeHtml(range.join(' - '))}</span>`,
            capturedAt && `<time datetime="${escapeHtml(offer.captured_at)}">${escapeHtml(capturedAt)}</time>`
        ].filter(Boolean).join(' ');
        return `<li>${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${details || escapeHtml(source)}</a>` : details}</li>`;
    }

    function renderProduct(product, root, locale) {
        const name = escapeHtml(product.name || product.source_product_key);
        const category = product.category ? `<p class="storefront-category">${escapeHtml(product.category)}</p>` : '';
        const description = product.description ? `<p class="storefront-description" lang="${escapeHtml(htmlLanguage(product.language_code))}">${escapeHtml(product.description)}</p>` : '';
        const price = formatPrice(product.price, product.currency, locale);
        const compareAt = formatPrice(product.compare_at_price, product.currency, locale);
        const priceLine = price
            ? `<p class="storefront-price"><strong>${escapeHtml(price)}</strong>${compareAt ? ` <del>${escapeHtml(compareAt)}</del>` : ''}${product.discount_percent != null ? ` <span>-${escapeHtml(product.discount_percent)}%</span>` : ''}</p>`
            : '';
        const campaign = product.campaign_name ? `<p class="storefront-campaign">${escapeHtml(product.campaign_name)}</p>` : '';
        const offers = (product.offers || []).length
            ? `<ul class="storefront-offers">${product.offers.map(offer => renderOffer(offer, product, locale)).join('')}</ul>`
            : '';
        const buyUrl = safeUrl(product.offers?.find(offer => offer.source_url)?.source_url || product.source_url);
        const sourceUrl = safeUrl(product.source_url);
        const buyLink = buyUrl
            ? `<a href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">${escapeHtml(root.dataset.buyLabel)}</a>`
            : '';
        return `<article class="catalog-card-v2 storefront-card" data-product-id="${escapeHtml(product.id)}" data-source-key="${escapeHtml(product.source_product_key || '')}" data-product-language="${escapeHtml(product.language_code || '')}">
            ${renderImageGallery(product.images || [], name)}
            <div class="product-details">
                <div>
                    <h3 lang="${escapeHtml(htmlLanguage(product.language_code))}">${name}</h3>
                    ${category}${description}${priceLine}${campaign}${offers}
                    ${sourceUrl && !buyUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(root.dataset.buyLabel)}</a>` : ''}
                </div>
                <div class="storefront-card-actions">
                    ${product.device_product_id ? `<button type="button" class="btn-quick-add" data-catalog-add data-product-id="${escapeHtml(product.device_product_id)}" data-product-name="${name}">${escapeHtml(root.dataset.addLabel)}</button>` : ''}
                    ${buyLink}
                </div>
            </div>
        </article>`;
    }

    function initialize(root) {
        if (root.dataset.initialized) return;
        root.dataset.initialized = 'true';
        const brand = root.dataset.brand;
        const grid = root.querySelector('[data-catalog-products]');
        const loading = root.querySelector('[data-catalog-loading]');
        const error = root.querySelector('[data-catalog-error]');
        const empty = root.querySelector('[data-catalog-empty]');
        const errorMessage = root.querySelector('[data-catalog-error-message]');
        const count = root.querySelector('[data-catalog-count]');
        const search = root.querySelector('[data-catalog-search]');
        const categoryFilter = root.querySelector('[data-catalog-category]');
        const locale = document.documentElement.lang || 'en';
        const pageSize = 20;
        let allProducts = [];
        let currentPage = 0;
        let searchTimeout;

        const showState = state => {
            loading.hidden = state !== 'loading';
            error.hidden = state !== 'error';
            empty.hidden = state !== 'empty';
            grid.hidden = state !== 'products';
        };

        function render() {
            const query = search.value.trim().toLocaleLowerCase(locale);
            const selectedCategory = categoryFilter?.value || '';
            const filtered = allProducts.filter(product =>
                (!selectedCategory || product.category === selectedCategory) &&
                (!query || [product.name, product.description, product.category, product.source_product_key]
                    .some(value => String(value || '').toLocaleLowerCase(locale).includes(query))));
            const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
            currentPage = Math.min(currentPage, pageCount - 1);
            const pageProducts = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
            grid.innerHTML = pageProducts.map(product => renderProduct(product, root, locale)).join('');
            showState(pageProducts.length ? 'products' : 'empty');
            count.textContent = filtered.length
                ? translate(root.dataset.countTemplate, {
                    start: currentPage * pageSize + 1,
                    end: Math.min((currentPage + 1) * pageSize, filtered.length),
                    total: filtered.length
                })
                : '';

            const pagination = root.querySelector('[data-catalog-pagination]');
            if (pagination) {
                const pageInfo = pagination.querySelector('[data-page-info]');
                const buttons = pagination.querySelectorAll('button');
                pageInfo.textContent = translate(root.dataset.pageTemplate, { page: currentPage + 1, total: pageCount });
                buttons[0].disabled = currentPage === 0;
                buttons[1].disabled = currentPage >= pageCount - 1;
                pagination.hidden = pageCount < 2;
            }
        }

        async function load() {
            showState('loading');
            count.textContent = '';
            try {
                allProducts = (await loadProducts()).filter(product => product.brand_id === brand);
                allProducts.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), locale));
                if (categoryFilter) {
                    const selectedCategory = categoryFilter.value;
                    const categories = [...new Set(allProducts.map(product => product.category).filter(Boolean))]
                        .sort((a, b) => String(a).localeCompare(String(b), locale));
                    categoryFilter.innerHTML = `<option value="">${escapeHtml(root.dataset.allProductsLabel)}</option>` +
                        categories.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
                    if (categories.includes(selectedCategory)) categoryFilter.value = selectedCategory;
                }
                currentPage = 0;
                render();
            } catch (cause) {
                console.error(`Error loading ${root.dataset.brandName} storefront products:`, cause);
                errorMessage.textContent = root.dataset.noResults;
                showState('error');
            }
        }

        root.addEventListener('click', event => {
            const target = event.target;
            const imageStep = target.closest('[data-image-step]');
            const imageIndex = target.closest('[data-image-index]');
            if (imageStep || imageIndex) {
                const gallery = target.closest('[data-image-gallery]');
                const images = JSON.parse(gallery.dataset.images);
                const image = gallery.querySelector('[data-gallery-image]');
                const thumbnails = gallery.querySelectorAll('[data-image-index]');
                const shown = Number(image.dataset.imageIndex || 0);
                const next = imageIndex
                    ? Number(imageIndex.dataset.imageIndex)
                    : (shown + Number(imageStep.dataset.imageStep) + images.length) % images.length;
                image.src = images[next];
                image.dataset.imageIndex = String(next);
                gallery.querySelector('[data-image-position]').textContent = `${next + 1} / ${images.length}`;
                thumbnails.forEach((button, index) => {
                    if (index === next) button.setAttribute('aria-current', 'true');
                    else button.removeAttribute('aria-current');
                });
            }
            const button = target.closest('[data-catalog-add]');
            if (button && window.selectProduct) {
                window.selectProduct(brand, button.dataset.productId, button.dataset.productName);
            }
            if (target.closest('[data-catalog-clear]')) {
                search.value = '';
                currentPage = 0;
                render();
            }
            if (target.closest('[data-catalog-retry]')) load();
            const pageButton = target.closest('[data-page-direction]');
            if (pageButton) {
                currentPage += Number(pageButton.dataset.pageDirection);
                render();
            }
        });
        search.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 0;
                render();
            }, 250);
        });
        categoryFilter?.addEventListener('change', () => {
            currentPage = 0;
            render();
        });
        load();
    }

    window.StorefrontCatalog = {
        language: catalogLanguage,
        currency: catalogCurrency,
        load: loadProducts
    };

    document.querySelectorAll('[data-storefront-catalog]').forEach(initialize);
})();
