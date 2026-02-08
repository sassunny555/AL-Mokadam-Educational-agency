/* ============================================
   Public Currency Manager (MYR base)
   ============================================ */

(function () {
    const DEFAULT_CURRENCY = 'MYR';
    const STORAGE_KEY_RATES = 'alm_currency_rates_cache_v1';
    const RATES_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
    const RATES_API = 'https://api.frankfurter.app/latest?from=MYR';

    const supportedCurrencies = ['MYR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'BDT', 'PKR', 'NGN'];
    const ratesState = {
        rates: { MYR: 1 },
        ready: false
    };
    let currentCurrency = DEFAULT_CURRENCY;

    function getSelectedCurrency() {
        return currentCurrency;
    }

    function setSelectedCurrency(code) {
        currentCurrency = supportedCurrencies.includes(code) ? code : DEFAULT_CURRENCY;
    }

    function readCachedRates() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_RATES);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.rates || typeof parsed.rates !== 'object') return null;
            if (!parsed.timestamp || Date.now() - parsed.timestamp > RATES_TTL_MS) return null;
            return parsed.rates;
        } catch (error) {
            console.warn('Currency cache read failed:', error);
            return null;
        }
    }

    function cacheRates(rates) {
        try {
            localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify({
                timestamp: Date.now(),
                rates
            }));
        } catch (error) {
            console.warn('Currency cache write failed:', error);
        }
    }

    async function fetchLiveRates() {
        try {
            const response = await fetch(RATES_API, { cache: 'no-store' });
            if (!response.ok) throw new Error('Rate API request failed');
            const payload = await response.json();
            if (!payload || !payload.rates) throw new Error('Invalid rate API response');

            const normalized = { MYR: 1, ...payload.rates };
            ratesState.rates = normalized;
            ratesState.ready = true;
            cacheRates(normalized);
            renderMoneyNodes();
            emitCurrencyChange();
            return true;
        } catch (error) {
            console.warn('Live currency fetch failed:', error);
            return false;
        }
    }

    async function ensureRates() {
        const cached = readCachedRates();
        if (cached) {
            ratesState.rates = { MYR: 1, ...cached };
            ratesState.ready = true;
            // Refresh in background for better freshness.
            fetchLiveRates();
            return;
        }

        const fetched = await fetchLiveRates();
        if (!fetched) {
            ratesState.rates = { MYR: 1 };
            ratesState.ready = true;
        }
    }

    function convertFromMYR(amount, currencyCode) {
        const code = currencyCode || getSelectedCurrency();
        const numericAmount = Number(amount) || 0;
        const rate = ratesState.rates[code] || 1;
        return numericAmount * rate;
    }

    function formatAmount(amount, currencyCode, fractionDigits) {
        const code = currencyCode || getSelectedCurrency();
        const value = Number(amount) || 0;
        const formatOptions = {
            style: 'currency',
            currency: code
        };
        if (typeof fractionDigits === 'number') {
            formatOptions.minimumFractionDigits = fractionDigits;
            formatOptions.maximumFractionDigits = fractionDigits;
        }
        return new Intl.NumberFormat('en-US', formatOptions).format(value);
    }

    function formatFromMYR(amount, currencyCode, fractionDigits) {
        return formatAmount(convertFromMYR(amount, currencyCode), currencyCode, fractionDigits);
    }

    function emitCurrencyChange() {
        window.dispatchEvent(new CustomEvent('currencychange', {
            detail: {
                currency: getSelectedCurrency()
            }
        }));
    }

    function renderMoneyNodes(root) {
        const container = root || document;
        const nodes = container.querySelectorAll('[data-money-myr]');
        const selectedCurrency = getSelectedCurrency();

        nodes.forEach((node) => {
            const myrValue = Number(node.getAttribute('data-money-myr')) || 0;
            const decimalsAttr = node.getAttribute('data-money-decimals');
            const decimals = decimalsAttr === null ? undefined : Number(decimalsAttr);
            const suffix = node.getAttribute('data-money-suffix') || '';
            const prefix = node.getAttribute('data-money-prefix') || '';
            node.textContent = `${prefix}${formatFromMYR(myrValue, selectedCurrency, decimals)}${suffix}`;
        });
    }

    function injectCurrencySwitcher() {
        if (document.getElementById('currencySelect')) return;
        const navbarContainer = document.querySelector('.navbar .container');
        if (!navbarContainer) return;

        let actions = navbarContainer.querySelector('.nav-actions');
        const themeToggle = navbarContainer.querySelector('.theme-toggle');
        const navCta = navbarContainer.querySelector('.nav-cta');
        const navToggle = navbarContainer.querySelector('.nav-toggle');

        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'nav-actions';

            if (themeToggle) actions.appendChild(themeToggle);
            if (navCta) actions.appendChild(navCta);

            if (navToggle) {
                navbarContainer.insertBefore(actions, navToggle);
            } else {
                navbarContainer.appendChild(actions);
            }
        }

        const anchorElement = actions.querySelector('.theme-toggle')
            || actions.querySelector('.nav-cta')
            || actions.firstChild;
        if (!anchorElement) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'currency-switcher';

        const icon = document.createElement('span');
        icon.className = 'currency-icon';
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.754 4.5a.5.5 0 0 0-.5-.5h-7.5a.5.5 0 0 0 0 1h6.293l-1.4 1.4a.5.5 0 1 0 .707.707l2.247-2.247a.5.5 0 0 0 .001-.706z"/><path d="M4.246 11.5a.5.5 0 0 0 .5.5h7.5a.5.5 0 0 0 0-1H5.953l1.4-1.4a.5.5 0 1 0-.707-.707L4.399 11.14a.5.5 0 0 0-.001.706z"/></svg>';

        const select = document.createElement('select');
        select.id = 'currencySelect';
        select.className = 'currency-select';
        select.setAttribute('aria-label', 'Select currency');

        supportedCurrencies.forEach((code) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            select.appendChild(option);
        });

        select.value = getSelectedCurrency();
        select.addEventListener('change', () => {
            setSelectedCurrency(select.value);
            renderMoneyNodes();
            emitCurrencyChange();
        });

        wrapper.appendChild(icon);
        wrapper.appendChild(select);
        actions.insertBefore(wrapper, anchorElement);
    }

    async function initCurrencyManager() {
        await ensureRates();
        injectCurrencySwitcher();
        renderMoneyNodes();
        emitCurrencyChange();
    }

    window.currencyManager = {
        getSelectedCurrency,
        setSelectedCurrency,
        convertFromMYR,
        formatAmount,
        formatFromMYR,
        renderMoneyNodes,
        isReady: () => ratesState.ready
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCurrencyManager);
    } else {
        initCurrencyManager();
    }
})();
