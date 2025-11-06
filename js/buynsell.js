/**
 * Buy and Sell Page JavaScript
 * Handles crypto trading UI with dropdown currency selection
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
let currentMode = 'buy'; // 'buy' or 'sell'
let selectedCrypto = 'BTC';
let selectedFiat = 'VND';
let activeDropdown = null;

document.addEventListener('DOMContentLoaded', async function() {
    // DOM elements
    const tabs = document.querySelectorAll('.trade-tab');
    const input1Label = document.getElementById('input1Label');
    const submitBtn = document.getElementById('tradeSubmitBtn');
    const payCurrency = document.getElementById('payCurrency');
    const receiveCurrency = document.getElementById('receiveCurrency');
    const payAmountInput = document.getElementById('payAmount');
    const receiveAmountInput = document.getElementById('receiveAmount');
    
    // Currency selectors
    const payCurrencySelector = payCurrency.parentElement;
    const receiveCurrencySelector = receiveCurrency.parentElement;

    // Check if user is logged in
    // const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // Update button text based on login status
    updateSubmitButton();

    // Load crypto prices
    await loadCryptoPrices();

    // Initialize UI with default selections
    updateUIForMode();

    // Tab switching functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.getAttribute('data-tab');
            updateUIForMode();
            payAmountInput.value = '';
            receiveAmountInput.value = '';
            updateExchangeRate();
        });
    });

    // Real-time calculation on input
    payAmountInput.addEventListener('input', calculateReceiveAmount);
    receiveAmountInput.addEventListener('input', calculatePayAmount);

    // Form submission
    submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleSubmit();
    });

    // Currency selector clicks - open dropdown
    payCurrencySelector.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown(this, 'pay');
    });

    receiveCurrencySelector.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown(this, 'receive');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        closeAllDropdowns();
    });
    
    // Check for pending trade
    checkPendingTrade();
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
    
    // Add search if showing crypto
    const showCrypto = (currentMode === 'buy' && type === 'receive') || 
                       (currentMode === 'sell' && type === 'pay');
    
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
        populateCryptoDropdown(dropdown);
        
        // Focus search after a brief delay
        setTimeout(() => searchInput.focus(), 50);
    } else {
        // Populate fiat list
        populateFiatDropdown(dropdown);
    }
    
    // Position and show dropdown
    selector.style.position = 'relative';
    selector.appendChild(dropdown);
    activeDropdown = dropdown;
}

/**
 * Populate crypto dropdown
 */
function populateCryptoDropdown(dropdown) {
    const listContainer = document.createElement('div');
    listContainer.className = 'dropdown-list';
    
    const cryptoArray = Object.entries(cryptoData).map(([symbol, data]) => ({
        symbol,
        ...data
    }));
    
    // Sort by market cap (descending)
    cryptoArray.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    
    cryptoArray.forEach(crypto => {
        const item = createDropdownItem({
            symbol: crypto.symbol,
            name: crypto.coin_name,
            price: crypto.current_price,
            img_url: crypto.img_url,
            isCrypto: true,
            isSelected: crypto.symbol === selectedCrypto
        });
        
        item.addEventListener('click', () => {
            selectCurrency(crypto.symbol, true);
            closeAllDropdowns();
        });
        
        listContainer.appendChild(item);
    });
    
    dropdown.appendChild(listContainer);
}

/**
 * Populate fiat dropdown
 */
function populateFiatDropdown(dropdown) {
    const listContainer = document.createElement('div');
    listContainer.className = 'dropdown-list';
    
    Object.entries(FIAT_CURRENCIES).forEach(([code, data]) => {
        const item = createDropdownItem({
            symbol: code,
            name: data.name,
            price: null,
            img_url: null,
            isCrypto: false,
            isSelected: code === selectedFiat
        });
        
        item.addEventListener('click', () => {
            selectCurrency(code, false);
            closeAllDropdowns();
        });
        
        listContainer.appendChild(item);
    });
    
    dropdown.appendChild(listContainer);
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
            // If image fails to load, show first letter
            img.remove();
            icon.textContent = symbol.charAt(0);
            icon.style.fontWeight = '700';
            icon.style.fontSize = '14px';
            icon.style.color = '#000000';
        };
        icon.appendChild(img);
    } else if (!isCrypto && FIAT_CURRENCIES[symbol] && FIAT_CURRENCIES[symbol].flag) {
        // Show flag emoji for fiat currency
        icon.textContent = FIAT_CURRENCIES[symbol].flag;
        icon.style.fontSize = '18px';
        icon.style.fontWeight = '400';
        icon.style.background = 'transparent';
    } else {
        // Show first letter as default icon
        icon.textContent = symbol.charAt(0);
        icon.style.fontWeight = '700';
        icon.style.fontSize = '14px';
        icon.style.color = '#000000';
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
function selectCurrency(currency, isCrypto) {
    if (isCrypto) {
        selectedCrypto = currency;
    } else {
        selectedFiat = currency;
    }
    
    updateUIForMode();
    
    // Recalculate if there are values
    const payAmount = parseFloat(document.getElementById('payAmount').value);
    if (!isNaN(payAmount) && payAmount > 0) {
        calculateReceiveAmount();
    }
}

/**
 * Update UI elements based on current mode (buy/sell)
 */
function updateUIForMode() {
    const input1Label = document.getElementById('input1Label');
    const payCurrency = document.getElementById('payCurrency');
    const receiveCurrency = document.getElementById('receiveCurrency');
    
    if (currentMode === 'buy') {
        input1Label.textContent = "You'll pay";
        payCurrency.textContent = selectedFiat;
        receiveCurrency.textContent = selectedCrypto;
        updateCurrencyIcon(payCurrency.previousElementSibling, selectedFiat, false);
        updateCurrencyIcon(receiveCurrency.previousElementSibling, selectedCrypto, true);
    } else {
        input1Label.textContent = "You'll sell";
        payCurrency.textContent = selectedCrypto;
        receiveCurrency.textContent = selectedFiat;
        updateCurrencyIcon(payCurrency.previousElementSibling, selectedCrypto, true);
        updateCurrencyIcon(receiveCurrency.previousElementSibling, selectedFiat, false);
    }
    
    updateSubmitButton();
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
            iconElement.innerHTML = '';
            iconElement.textContent = currency.charAt(0);
            iconElement.style.fontWeight = '700';
            iconElement.style.fontSize = '14px';
            iconElement.style.color = '#000000';
        };
        iconElement.appendChild(img);
    } else if (!isCrypto && FIAT_CURRENCIES[currency] && FIAT_CURRENCIES[currency].flag) {
        // Show flag emoji for fiat currency
        iconElement.textContent = FIAT_CURRENCIES[currency].flag;
        iconElement.style.fontSize = '18px';
        iconElement.style.fontWeight = '400';
        iconElement.style.background = 'transparent';
    } else {
        // Show first letter as fallback
        iconElement.textContent = currency.charAt(0);
        iconElement.style.fontWeight = '700';
        iconElement.style.fontSize = '14px';
        iconElement.style.color = '#000000';
    }
}

/**
 * Update submit button text based on login status and mode
 */
function updateSubmitButton() {
    const submitBtn = document.getElementById('tradeSubmitBtn');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        submitBtn.textContent = currentMode === 'buy' ? 'Buy Now' : 'Sell Now';
    } else {
        submitBtn.textContent = currentMode === 'buy' ? 'Log in to buy' : 'Log in to sell';
    }
}

/**
 * Calculate receive amount based on pay amount
 */
function calculateReceiveAmount() {
    const payAmountInput = document.getElementById('payAmount');
    const receiveAmountInput = document.getElementById('receiveAmount');
    const payAmount = parseFloat(payAmountInput.value);
    
    if (isNaN(payAmount) || payAmount <= 0) {
        receiveAmountInput.value = '';
        return;
    }
    
    let receiveAmount;
    const cryptoPrice = cryptoPrices[selectedCrypto] || cryptoPrices['BTC'];
    
    if (currentMode === 'buy') {
        // Buying crypto with fiat
        let usdAmount;
        if (selectedFiat === 'VND') {
            usdAmount = payAmount * EXCHANGE_RATES.VND_TO_USD;
        } else {
            usdAmount = payAmount;
        }
        receiveAmount = usdAmount / cryptoPrice;
    } else {
        // Selling crypto for fiat
        const usdValue = payAmount * cryptoPrice;
        if (selectedFiat === 'VND') {
            receiveAmount = usdValue * EXCHANGE_RATES.USD_TO_VND;
        } else {
            receiveAmount = usdValue;
        }
    }
    
    // Format based on amount size
    if (currentMode === 'buy') {
        receiveAmountInput.value = receiveAmount.toFixed(8);
    } else {
        receiveAmountInput.value = receiveAmount.toFixed(2);
    }
    
    updateExchangeRate();
}

/**
 * Calculate pay amount based on receive amount
 */
function calculatePayAmount() {
    const payAmountInput = document.getElementById('payAmount');
    const receiveAmountInput = document.getElementById('receiveAmount');
    const receiveAmount = parseFloat(receiveAmountInput.value);
    
    if (isNaN(receiveAmount) || receiveAmount <= 0) {
        payAmountInput.value = '';
        return;
    }
    
    let payAmount;
    const cryptoPrice = cryptoPrices[selectedCrypto] || cryptoPrices['BTC'];
    
    if (currentMode === 'buy') {
        // Buying crypto with fiat
        const usdAmount = receiveAmount * cryptoPrice;
        if (selectedFiat === 'VND') {
            payAmount = usdAmount * EXCHANGE_RATES.USD_TO_VND;
        } else {
            payAmount = usdAmount;
        }
    } else {
        // Selling crypto for fiat
        let usdValue;
        if (selectedFiat === 'VND') {
            usdValue = receiveAmount * EXCHANGE_RATES.VND_TO_USD;
        } else {
            usdValue = receiveAmount;
        }
        payAmount = usdValue / cryptoPrice;
    }
    
    payAmountInput.value = payAmount.toFixed(currentMode === 'sell' ? 8 : 2);
    updateExchangeRate();
}

/**
 * Update exchange rate display
 */
function updateExchangeRate() {
    const exchangeRateElement = document.querySelector('.exchange-rate');
    const cryptoPrice = cryptoPrices[selectedCrypto] || cryptoPrices['BTC'];
    
    let displayPrice;
    if (selectedFiat === 'VND') {
        displayPrice = cryptoPrice * EXCHANGE_RATES.USD_TO_VND;
        exchangeRateElement.textContent = `1 ${selectedCrypto} ≈ ${formatNumber(displayPrice)} ${selectedFiat}`;
    } else {
        displayPrice = cryptoPrice;
        exchangeRateElement.textContent = `1 ${selectedCrypto} ≈ $${formatNumber(displayPrice)}`;
    }
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
 * Handle form submission
 */
function handleSubmit() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const payAmountInput = document.getElementById('payAmount');
    const receiveAmountInput = document.getElementById('receiveAmount');
    const payAmount = parseFloat(payAmountInput.value);
    const receiveAmount = parseFloat(receiveAmountInput.value);
    
    // Validation
    if (isNaN(payAmount) || payAmount <= 0) {
        showNotification('error', 'Please enter a valid amount to ' + (currentMode === 'buy' ? 'pay' : 'sell'));
        return;
    }
    
    if (isNaN(receiveAmount) || receiveAmount <= 0) {
        showNotification('error', 'Please enter a valid amount to receive');
        return;
    }
    
    // Minimum transaction check
    if (currentMode === 'buy') {
        const minAmount = selectedFiat === 'VND' ? 100000 : 5;
        if (payAmount < minAmount) {
            showNotification('error', `Minimum transaction amount is ${minAmount} ${selectedFiat}`);
            return;
        }
    } else {
        if (payAmount < 0.001) {
            showNotification('error', 'Minimum sell amount is 0.001 ' + selectedCrypto);
            return;
        }
    }
    
    // Check if logged in
    if (!isLoggedIn) {
        // Store transaction details in sessionStorage for after login
        sessionStorage.setItem('pendingTrade', JSON.stringify({
            mode: currentMode,
            payAmount: payAmount,
            receiveAmount: receiveAmount,
            payCurrency: currentMode === 'buy' ? selectedFiat : selectedCrypto,
            receiveCurrency: currentMode === 'buy' ? selectedCrypto : selectedFiat,
            selectedCrypto: selectedCrypto,
            selectedFiat: selectedFiat
        }));
        
        showNotification('info', 'Please log in to complete your transaction');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1500);
        return;
    }
    
    // Process transaction (for logged in users)
    processTransaction(payAmount, receiveAmount);
}

/**
 * Process the transaction
 */
function processTransaction(payAmount, receiveAmount) {
    const payCurrency = currentMode === 'buy' ? selectedFiat : selectedCrypto;
    const receiveCurrency = currentMode === 'buy' ? selectedCrypto : selectedFiat;
    
    // Show confirmation
    const message = `Confirm ${currentMode}:\n\n` +
                    `Pay: ${payAmount.toFixed(8)} ${payCurrency}\n` +
                    `Receive: ${receiveAmount.toFixed(8)} ${receiveCurrency}\n\n` +
                    `Continue?`;
    
    if (confirm(message)) {
        // Simulate transaction processing
        showNotification('success', 'Transaction submitted! Processing...');
        
        // Clear inputs
        document.getElementById('payAmount').value = '';
        document.getElementById('receiveAmount').value = '';
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = '/pages/dashboard.html';
        }, 2000);
    }
}

/**
 * Show notification to user
 */
function showNotification(type, message) {
    // Simple alert for now - can be enhanced with custom notification UI
    const icons = {
        'success': '✓',
        'error': '✗',
        'info': 'ℹ'
    };
    
    alert(`${icons[type]} ${message}`);
}

/**
 * Check for pending trade after login
 */
function checkPendingTrade() {
    const pendingTrade = sessionStorage.getItem('pendingTrade');
    if (pendingTrade) {
        const trade = JSON.parse(pendingTrade);
        
        // Restore trade details
        currentMode = trade.mode;
        selectedCrypto = trade.selectedCrypto || 'BTC';
        selectedFiat = trade.selectedFiat || 'VND';
        
        const modeTab = document.querySelector(`[data-tab="${currentMode}"]`);
        if (modeTab) modeTab.click();
        
        document.getElementById('payAmount').value = trade.payAmount;
        document.getElementById('receiveAmount').value = trade.receiveAmount;
        
        // Clear from session storage
        sessionStorage.removeItem('pendingTrade');
        
        showNotification('info', 'Your pending transaction has been restored. Please review and confirm.');
    }
}
