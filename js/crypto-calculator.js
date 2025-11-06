/**
 * Crypto Calculator JavaScript
 * Handles real-time currency conversion between crypto and fiat currencies
 */

// Exchange rates
const EXCHANGE_RATES = {
    VND_TO_USD: 0.00004,  // 1 VND ≈ 0.00004 USD
    USD_TO_VND: 25000     // 1 USD ≈ 25,000 VND
};

// Fiat currencies with flag emojis
const FIAT_CURRENCIES = {
    'VND': { name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
    'USD': { name: 'US Dollar', symbol: '$', flag: '🇺🇸' }
};

// State management
let cryptoPrices = {};
let cryptoData = {};
let fromCurrency = 'BTC';
let toCurrency = 'USDT';
let fromIsCrypto = true;
let toIsCrypto = true;
let activeDropdown = null;

document.addEventListener('DOMContentLoaded', async function() {
    // DOM elements
    const fromAmountInput = document.getElementById('fromAmount');
    const toAmountInput = document.getElementById('toAmount');
    const fromCurrencySelector = document.getElementById('fromCurrencySelector');
    const toCurrencySelector = document.getElementById('toCurrencySelector');
    const swapBtn = document.getElementById('swapBtn');
    const loginBtn = document.getElementById('calculatorLoginBtn');
    
    // Load crypto prices
    await loadCryptoPrices();
    
    // Initialize UI
    updateCurrencyUI();
    updateExchangeRate();
    
    // Check login status and update button
    updateLoginButton();
    
    // Real-time calculation on input
    fromAmountInput.addEventListener('input', calculateToAmount);
    toAmountInput.addEventListener('input', calculateFromAmount);
    
    // Currency selector clicks
    fromCurrencySelector.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown(this, 'from');
    });
    
    toCurrencySelector.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown(this, 'to');
    });
    
    // Swap button
    swapBtn.addEventListener('click', swapCurrencies);
    
    // Login button
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        closeAllDropdowns();
    });
});

/**
 * Load cryptocurrency prices from JSON data
 */
async function loadCryptoPrices() {
    try {
        const response = await fetch('/data/full_coin_data.json');
        const data = await response.json();
        
        cryptoData = data;
        
        // Store prices for quick access
        for (const [symbol, coinData] of Object.entries(data)) {
            cryptoPrices[symbol] = coinData.current_price;
        }
        
        console.log('Crypto prices loaded:', Object.keys(cryptoPrices).length, 'coins');
    } catch (error) {
        console.error('Error loading crypto prices:', error);
        // Set default prices as fallback
        cryptoPrices['BTC'] = 110111;
        cryptoPrices['ETH'] = 3848.15;
        cryptoPrices['USDT'] = 1.00;
        cryptoData = {
            'BTC': { coin_name: 'Bitcoin', current_price: 110111, img_url: null },
            'ETH': { coin_name: 'Ethereum', current_price: 3848.15, img_url: null },
            'USDT': { coin_name: 'Tether', current_price: 1.00, img_url: null }
        };
    }
}

/**
 * Toggle dropdown menu
 */
function toggleDropdown(selector, type) {
    // Close other dropdowns
    closeAllDropdowns();
    
    // Check if dropdown already exists
    let dropdown = selector.querySelector('.currency-dropdown');
    if (dropdown) {
        return;
    }
    
    // Create dropdown
    dropdown = document.createElement('div');
    dropdown.className = 'currency-dropdown';
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    
    // Determine if showing crypto or fiat
    const showCrypto = (type === 'from' && fromIsCrypto) || (type === 'to' && toIsCrypto);
    
    if (showCrypto) {
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'dropdown-search-wrapper';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'dropdown-search';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', (e) => filterDropdownItems(e.target.value, dropdown));
        
        searchWrapper.appendChild(searchInput);
        dropdown.appendChild(searchWrapper);
        
        // Populate crypto list
        populateCryptoDropdown(dropdown, type);
        
        // Focus search after a brief delay
        setTimeout(() => searchInput.focus(), 50);
    } else {
        // Populate fiat list
        populateFiatDropdown(dropdown, type);
    }
    
    // Add option to switch between crypto/fiat
    const switchOption = document.createElement('div');
    switchOption.className = 'dropdown-switch-type';
    switchOption.textContent = showCrypto ? 'Show Fiat Currencies' : 'Show Cryptocurrencies';
    switchOption.addEventListener('click', () => {
        if (type === 'from') {
            fromIsCrypto = !fromIsCrypto;
            fromCurrency = fromIsCrypto ? 'BTC' : 'VND';
        } else {
            toIsCrypto = !toIsCrypto;
            toCurrency = toIsCrypto ? 'BTC' : 'VND';
        }
        closeAllDropdowns();
        updateCurrencyUI();
        calculateToAmount();
    });
    dropdown.appendChild(switchOption);
    
    // Position and show dropdown
    selector.style.position = 'relative';
    selector.appendChild(dropdown);
    activeDropdown = dropdown;
}

/**
 * Populate crypto dropdown
 */
function populateCryptoDropdown(dropdown, type) {
    const listContainer = document.createElement('div');
    listContainer.className = 'dropdown-list';
    
    const cryptoArray = Object.entries(cryptoData).map(([symbol, data]) => ({
        symbol,
        ...data
    }));
    
    // Sort by market cap (descending)
    cryptoArray.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    
    const selectedCurrency = type === 'from' ? fromCurrency : toCurrency;
    
    cryptoArray.forEach(crypto => {
        const item = createDropdownItem({
            symbol: crypto.symbol,
            name: crypto.coin_name,
            price: crypto.current_price,
            img_url: crypto.img_url,
            isCrypto: true,
            isSelected: crypto.symbol === selectedCurrency
        });
        
        item.addEventListener('click', () => {
            selectCurrency(crypto.symbol, true, type);
            closeAllDropdowns();
        });
        
        listContainer.appendChild(item);
    });
    
    dropdown.insertBefore(listContainer, dropdown.firstChild);
}

/**
 * Populate fiat dropdown
 */
function populateFiatDropdown(dropdown, type) {
    const listContainer = document.createElement('div');
    listContainer.className = 'dropdown-list';
    
    const selectedCurrency = type === 'from' ? fromCurrency : toCurrency;
    
    Object.entries(FIAT_CURRENCIES).forEach(([code, data]) => {
        const item = createDropdownItem({
            symbol: code,
            name: data.name,
            price: null,
            img_url: null,
            isCrypto: false,
            isSelected: code === selectedCurrency
        });
        
        item.addEventListener('click', () => {
            selectCurrency(code, false, type);
            closeAllDropdowns();
        });
        
        listContainer.appendChild(item);
    });
    
    dropdown.insertBefore(listContainer, dropdown.firstChild);
}

/**
 * Create dropdown item element
 */
function createDropdownItem({ symbol, name, price, img_url, isCrypto, isSelected }) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.symbol = symbol;
    item.dataset.name = name;
    
    if (isSelected) {
        item.classList.add('selected');
    }
    
    const icon = document.createElement('div');
    icon.className = 'dropdown-item-icon';
    icon.style.background = '#D9D9D9';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    
    if (img_url && isCrypto) {
        const img = document.createElement('img');
        img.src = img_url;
        img.alt = symbol;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        img.onerror = function() {
            this.style.display = 'none';
            icon.textContent = symbol.charAt(0);
            icon.style.fontSize = '16px';
            icon.style.fontWeight = '600';
            icon.style.color = '#fff';
        };
        icon.appendChild(img);
    } else if (!isCrypto && FIAT_CURRENCIES[symbol] && FIAT_CURRENCIES[symbol].flag) {
        icon.textContent = FIAT_CURRENCIES[symbol].flag;
        icon.style.fontSize = '24px';
        icon.style.background = 'transparent';
    } else {
        icon.textContent = symbol.charAt(0);
        icon.style.fontSize = '16px';
        icon.style.fontWeight = '600';
        icon.style.color = '#fff';
    }
    
    const info = document.createElement('div');
    info.className = 'dropdown-item-info';
    
    const symbolEl = document.createElement('div');
    symbolEl.className = 'dropdown-item-symbol';
    symbolEl.textContent = symbol;
    
    const nameEl = document.createElement('div');
    nameEl.className = 'dropdown-item-name';
    nameEl.textContent = name;
    
    info.appendChild(symbolEl);
    info.appendChild(nameEl);
    
    item.appendChild(icon);
    item.appendChild(info);
    
    if (price !== null && isCrypto) {
        const priceEl = document.createElement('div');
        priceEl.className = 'dropdown-item-price';
        priceEl.textContent = formatCurrencyPrice(price);
        item.appendChild(priceEl);
    }
    
    return item;
}

/**
 * Format currency price for display
 */
function formatCurrencyPrice(price) {
    if (price >= 1000) {
        return '$' + new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    } else if (price >= 1) {
        return '$' + new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    } else {
        return '$' + price.toFixed(6);
    }
}

/**
 * Filter dropdown items based on search
 */
function filterDropdownItems(searchTerm, dropdown) {
    const items = dropdown.querySelectorAll('.dropdown-item');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const symbol = item.dataset.symbol.toLowerCase();
        const name = item.dataset.name.toLowerCase();
        
        if (symbol.includes(term) || name.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Close all dropdowns
 */
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.currency-dropdown');
    dropdowns.forEach(dropdown => dropdown.remove());
    activeDropdown = null;
}

/**
 * Select a currency
 */
function selectCurrency(currency, isCrypto, type) {
    if (type === 'from') {
        fromCurrency = currency;
        fromIsCrypto = isCrypto;
    } else {
        toCurrency = currency;
        toIsCrypto = isCrypto;
    }
    
    updateCurrencyUI();
    
    // Recalculate if there are values
    const fromAmount = parseFloat(document.getElementById('fromAmount').value);
    if (!isNaN(fromAmount) && fromAmount > 0) {
        calculateToAmount();
    }
}

/**
 * Update currency UI elements
 */
function updateCurrencyUI() {
    const fromCurrencyEl = document.getElementById('fromCurrency');
    const toCurrencyEl = document.getElementById('toCurrency');
    const fromIcon = document.querySelector('#fromCurrencySelector .currency-icon-compact');
    const toIcon = document.querySelector('#toCurrencySelector .currency-icon-compact');
    
    fromCurrencyEl.textContent = fromCurrency;
    toCurrencyEl.textContent = toCurrency;
    
    updateCurrencyIcon(fromIcon, fromCurrency, fromIsCrypto);
    updateCurrencyIcon(toIcon, toCurrency, toIsCrypto);
    
    updateExchangeRate();
}

/**
 * Update currency icon in selector
 */
function updateCurrencyIcon(iconElement, currency, isCrypto) {
    if (!iconElement) return;
    
    // Clear existing content
    iconElement.innerHTML = '';
    iconElement.style.background = '#D9D9D9';
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
    
    if (isCrypto && cryptoData[currency] && cryptoData[currency].img_url) {
        // Show crypto logo image
        const img = document.createElement('img');
        img.src = cryptoData[currency].img_url;
        img.alt = currency;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        img.onerror = function() {
            this.style.display = 'none';
            iconElement.textContent = currency.charAt(0);
            iconElement.style.fontSize = '14px';
            iconElement.style.fontWeight = '600';
            iconElement.style.color = '#fff';
        };
        iconElement.appendChild(img);
    } else if (!isCrypto && FIAT_CURRENCIES[currency] && FIAT_CURRENCIES[currency].flag) {
        iconElement.textContent = FIAT_CURRENCIES[currency].flag;
        iconElement.style.fontSize = '20px';
        iconElement.style.background = 'transparent';
    } else {
        iconElement.textContent = currency.charAt(0);
        iconElement.style.fontSize = '14px';
        iconElement.style.fontWeight = '600';
        iconElement.style.color = '#fff';
    }
}

/**
 * Swap currencies
 */
function swapCurrencies() {
    // Swap currencies
    const tempCurrency = fromCurrency;
    const tempIsCrypto = fromIsCrypto;
    
    fromCurrency = toCurrency;
    fromIsCrypto = toIsCrypto;
    toCurrency = tempCurrency;
    toIsCrypto = tempIsCrypto;
    
    // Swap amounts
    const fromAmountInput = document.getElementById('fromAmount');
    const toAmountInput = document.getElementById('toAmount');
    const tempAmount = fromAmountInput.value;
    
    fromAmountInput.value = toAmountInput.value;
    toAmountInput.value = tempAmount;
    
    updateCurrencyUI();
}

/**
 * Calculate "to" amount based on "from" amount
 */
function calculateToAmount() {
    const fromAmountInput = document.getElementById('fromAmount');
    const toAmountInput = document.getElementById('toAmount');
    const fromAmount = parseFloat(fromAmountInput.value);
    
    if (isNaN(fromAmount) || fromAmount <= 0) {
        toAmountInput.value = '';
        return;
    }
    
    const toAmount = convertCurrency(fromAmount, fromCurrency, toCurrency, fromIsCrypto, toIsCrypto);
    
    // Format based on currency type
    if (toIsCrypto) {
        toAmountInput.value = toAmount.toFixed(8);
    } else {
        toAmountInput.value = toAmount.toFixed(2);
    }
    
    updateExchangeRate();
}

/**
 * Calculate "from" amount based on "to" amount
 */
function calculateFromAmount() {
    const fromAmountInput = document.getElementById('fromAmount');
    const toAmountInput = document.getElementById('toAmount');
    const toAmount = parseFloat(toAmountInput.value);
    
    if (isNaN(toAmount) || toAmount <= 0) {
        fromAmountInput.value = '';
        return;
    }
    
    const fromAmount = convertCurrency(toAmount, toCurrency, fromCurrency, toIsCrypto, fromIsCrypto);
    
    // Format based on currency type
    if (fromIsCrypto) {
        fromAmountInput.value = fromAmount.toFixed(8);
    } else {
        fromAmountInput.value = fromAmount.toFixed(2);
    }
    
    updateExchangeRate();
}

/**
 * Convert currency from one to another
 */
function convertCurrency(amount, fromCurr, toCurr, fromCrypto, toCrypto) {
    // First convert to USD
    let usdAmount;
    
    if (fromCrypto) {
        // Crypto to USD
        const cryptoPrice = cryptoPrices[fromCurr] || 0;
        usdAmount = amount * cryptoPrice;
    } else {
        // Fiat to USD
        if (fromCurr === 'VND') {
            usdAmount = amount * EXCHANGE_RATES.VND_TO_USD;
        } else {
            usdAmount = amount;
        }
    }
    
    // Then convert from USD to target currency
    let result;
    
    if (toCrypto) {
        // USD to Crypto
        const cryptoPrice = cryptoPrices[toCurr] || 1;
        result = usdAmount / cryptoPrice;
    } else {
        // USD to Fiat
        if (toCurr === 'VND') {
            result = usdAmount * EXCHANGE_RATES.USD_TO_VND;
        } else {
            result = usdAmount;
        }
    }
    
    return result;
}

/**
 * Update exchange rate display
 */
function updateExchangeRate() {
    const exchangeRateElement = document.getElementById('exchangeRate');
    
    // Calculate rate for 1 unit of fromCurrency
    const rate = convertCurrency(1, fromCurrency, toCurrency, fromIsCrypto, toIsCrypto);
    
    // Format the rate display
    let rateDisplay;
    if (rate >= 1000) {
        rateDisplay = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4
        }).format(rate);
    } else if (rate >= 1) {
        rateDisplay = rate.toFixed(4);
    } else {
        rateDisplay = rate.toFixed(8);
    }
    
    exchangeRateElement.textContent = `Exchange rate: 1 ${fromCurrency} ≈ ${rateDisplay} ${toCurrency}`;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
    if (num >= 1000) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    } else {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }
}

/**
 * Update login button based on authentication state
 */
function updateLoginButton() {
    const loginBtn = document.getElementById('calculatorLoginBtn');
    if (!loginBtn) return;
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        loginBtn.textContent = 'Convert Now';
        loginBtn.style.background = '#C6F432';
        loginBtn.style.color = '#000000';
    } else {
        loginBtn.textContent = 'Log in';
        loginBtn.style.background = '#000000';
        loginBtn.style.color = '#FFFFFF';
    }
}

/**
 * Handle login button click
 */
function handleLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        // Redirect to login page
        window.location.href = '/pages/login.html';
    } else {
        // User is logged in - redirect to buy/sell page
        window.location.href = '/pages/buynsell.html';
    }
}
