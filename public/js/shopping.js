(() => {
    const pageSize = 24;
    const translations = JSON.parse(document.getElementById('shoppingTranslations').textContent);
    const searchInput = document.getElementById('shoppingSearch');
    const brandSelect = document.getElementById('shoppingBrand');
    const resultCount = document.getElementById('shoppingResultCount');
    const loadingMessage = document.getElementById('shoppingLoading');
    const errorMessage = document.getElementById('shoppingError');
    const emptyMessage = document.getElementById('shoppingEmpty');
    const productGrid = document.getElementById('shoppingProducts');
    const pagination = document.getElementById('shoppingPagination');
    const previousButton = document.getElementById('shoppingPrevious');
    const nextButton = document.getElementById('shoppingNext');
    const pageInfo = document.getElementById('shoppingPageInfo');

    let offset = 0;
    let searchTimeout;
    let requestId = 0;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function translate(key, values = {}) {
        let text = translations[key] || key;
        for (const [name, value] of Object.entries(values)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
        return text;
    }

    function setMessageState({ loading = false, error = false, empty = false }) {
        loadingMessage.hidden = !loading;
        errorMessage.hidden = !error;
        emptyMessage.hidden = !empty;
        productGrid.hidden = loading || error || empty;
    }

    function renderProducts(products) {
        const brandNames = new Map(
            Array.from(brandSelect.options)
                .filter(option => option.value)
                .map(option => [option.value, option.textContent])
        );

        productGrid.innerHTML = products.map(product => {
            const name = escapeHtml(product.name);
            const brandName = escapeHtml(brandNames.get(product.brand_id) || product.brand_id);
            const category = product.category ? `<p class="shopping-product-category">${escapeHtml(product.category)}</p>` : '';
            const price = product.price ? `<p class="shopping-product-price">${escapeHtml(product.price)}</p>` : '';
            const imageUrl = product.thumbnail_url || '/image/catalog/product-placeholder.png';

            return `
                <article class="shopping-product-card">
                    <div class="shopping-product-image">
                        <img src="${escapeHtml(imageUrl)}" alt="${name}" loading="lazy"
                            onerror="this.onerror=null;this.src='/image/catalog/product-placeholder.png'">
                        <span class="shopping-sold-out-badge">${escapeHtml(translate('soldOut'))}</span>
                    </div>
                    <div class="shopping-product-info">
                        <span class="shopping-product-brand">${brandName}</span>
                        <h2>${name}</h2>
                        ${category}
                        ${price}
                    </div>
                    <button type="button" disabled>${escapeHtml(translate('soldOut'))}</button>
                </article>
            `;
        }).join('');
    }

    async function loadProducts() {
        const currentRequestId = ++requestId;
        const params = new URLSearchParams({
            active_only: 'true',
            limit: String(pageSize),
            offset: String(offset),
            sort_by: 'name'
        });
        if (brandSelect.value) params.set('brand_id', brandSelect.value);
        if (searchInput.value.trim()) params.set('search', searchInput.value.trim());

        resultCount.textContent = '';
        pagination.style.display = 'none';
        setMessageState({ loading: true });

        try {
            const response = await fetch(`/api/catalog/products?${params}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (currentRequestId !== requestId) return;
            if (!Array.isArray(data.products) || !data.pagination) {
                throw new Error('Invalid catalog response');
            }

            const products = data.products;
            const page = data.pagination;
            if (products.length === 0) {
                productGrid.replaceChildren();
                setMessageState({ empty: true });
                return;
            }

            renderProducts(products);
            setMessageState({});
            resultCount.textContent = translate('productCount', { count: page.total });
            pageInfo.textContent = translate('pageInfo', {
                page: Math.floor(page.offset / page.limit) + 1,
                total: page.total_pages
            });
            previousButton.disabled = !page.has_previous;
            nextButton.disabled = !page.has_next;
            pagination.style.display = page.total_pages > 1 ? 'flex' : 'none';
        } catch (error) {
            if (currentRequestId !== requestId) return;
            console.error('Failed to load shopping catalog:', error);
            productGrid.replaceChildren();
            setMessageState({ error: true });
        }
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            offset = 0;
            loadProducts();
        }, 300);
    });

    brandSelect.addEventListener('change', () => {
        offset = 0;
        loadProducts();
    });

    previousButton.addEventListener('click', () => {
        if (offset >= pageSize) {
            offset -= pageSize;
            loadProducts();
        }
    });

    nextButton.addEventListener('click', () => {
        offset += pageSize;
        loadProducts();
    });

    loadProducts();
})();
