/**
 * Trading Simulator
 * Paper trading interface with real-time price simulation
 */

import { drawCandlestickChart, addCandlestickInteractivity } from '../modules/graphjs/candlestick.js';
import { fetchCurrentPrices, fetchHistoricalPrices, fetchIntradayPrices, fetchMinuteData, fetch5MinuteData, rateLimitedFetch } from '../modules/coingecko/api.js';

// ========================================
// State Management
// ========================================

const STORAGE_KEY = 'ukx_trading_simulator';
const HISTORICAL_CACHE_KEY = 'ukx_historical_cache';
const HISTORICAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const INITIAL_BALANCE = 10000;
const TRADING_FEE = 0.001; // 0.1% fee

const state = {
    virtualBalance: INITIAL_BALANCE,
    holdings: {}, // { symbol: { amount, avgPrice, totalCost } }
    orderHistory: [],
    selectedCoin: 'BTC',
    orderSide: 'buy',
    coinData: {},
    priceHistory: {},
    currentPeriod: '24h',
    chartInteractivityAdded: false
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadState();
    showLoadingStates();
    loadCoinData();
    initializeEventListeners();
    updateUI();
    startPriceSimulation();
});

// ========================================
// Login Status Check
// ========================================

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loginPrompt = document.getElementById('loginPrompt');
    const orderFormContainer = document.getElementById('orderFormContainer');
    const holdingsSection = document.querySelector('.holdings-section');
    
    if (!isLoggedIn) {
        // Show login prompt, hide order form
        if (loginPrompt) loginPrompt.style.display = 'flex';
        if (orderFormContainer) orderFormContainer.style.display = 'none';
        
        // Show empty state for holdings
        if (holdingsSection) {
            const holdingsList = holdingsSection.querySelector('#holdingsList');
            if (holdingsList) {
                holdingsList.innerHTML = `
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <p>Login Required</p>
                        <span>Login to view your holdings</span>
                    </div>
                `;
            }
        }
    } else {
        // Show order form, hide login prompt
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (orderFormContainer) orderFormContainer.style.display = 'block';
    }
}

// ========================================
// Loading States
// ========================================

function showLoadingStates() {
    // Add skeleton class to balance amounts
    document.querySelectorAll('.balance-amount').forEach(el => {
        el.classList.add('skeleton');
    });
    
    // Add skeleton class to price displays
    const priceValue = document.getElementById('currentPrice');
    if (priceValue) priceValue.classList.add('skeleton');
    
    const priceChange = document.getElementById('priceChange');
    if (priceChange) priceChange.classList.add('skeleton');
    
    // Add skeleton class to market stats
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.add('skeleton');
    });
    
    // Add skeleton class to chart section
    const chartSection = document.querySelector('.chart-section');
    if (chartSection) chartSection.classList.add('skeleton');
    
    // Add skeleton class to coin icon
    const coinIcon = document.getElementById('selectedCoinIcon');
    if (coinIcon) coinIcon.classList.add('skeleton');
}

function hideLoadingStates() {
    // Remove skeleton class from all elements
    document.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove('skeleton');
        el.classList.add('is-loaded');
    });
}

function showCoinSwitchLoadingStates() {
    // Add skeleton class to price displays
    const priceValue = document.getElementById('currentPrice');
    if (priceValue) priceValue.classList.add('skeleton');
    
    const priceChange = document.getElementById('priceChange');
    if (priceChange) priceChange.classList.add('skeleton');
    
    // Add skeleton class to market stats
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.add('skeleton');
    });
    
    // Add skeleton class to chart section
    const chartSection = document.querySelector('.chart-section');
    if (chartSection) chartSection.classList.add('skeleton');
}

function hideCoinSwitchLoadingStates() {
    // Remove skeleton class from price displays
    const priceValue = document.getElementById('currentPrice');
    if (priceValue) {
        priceValue.classList.remove('skeleton');
        priceValue.classList.add('is-loaded');
    }
    
    const priceChange = document.getElementById('priceChange');
    if (priceChange) {
        priceChange.classList.remove('skeleton');
        priceChange.classList.add('is-loaded');
    }
    
    // Remove skeleton class from market stats
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.remove('skeleton');
        el.classList.add('is-loaded');
    });
    
    // Remove skeleton class from chart section
    const chartSection = document.querySelector('.chart-section');
    if (chartSection) {
        chartSection.classList.remove('skeleton');
        chartSection.classList.add('is-loaded');
    }
}

// ========================================
// Data Loading
// ========================================

async function loadCoinData() {
    try {
        // STEP 1: Load local JSON data first for instant UI
        const response = await fetch('/data/full_coin_data.json');
        const baseData = await response.json();
        
        // Use local data immediately
        state.coinData = { ...baseData };
        
        // Show UI with local data right away
        populateCoinDropdown();
        
        // Load cached historical data if available
        loadCachedHistoricalData(state.selectedCoin);
        
        // Select coin and update UI with local data
        await selectCoinFast(state.selectedCoin);
        
        // Hide loading states - UI is now interactive
        hideLoadingStates();
        
        // STEP 2: Fetch live prices in background (non-blocking)
        fetchLivePricesInBackground(Object.keys(baseData));
        
        // STEP 3: Load historical data in background
        loadHistoricalDataInBackground(state.selectedCoin);
        
    } catch (error) {
        console.error('Failed to load coin data:', error);
        showError('Failed to load market data. Please refresh the page.');
        hideLoadingStates();
    }
}

/**
 * Fast coin selection without waiting for API calls
 */
async function selectCoinFast(symbol) {
    state.selectedCoin = symbol;
    const coin = state.coinData[symbol];
    
    if (!coin) return;
    
    // Update selector button
    document.getElementById('selectedCoinIcon').src = coin.img_url;
    document.getElementById('selectedCoinIcon').alt = symbol;
    document.getElementById('selectedCoinSymbol').textContent = symbol;
    document.getElementById('selectedCoinName').textContent = coin.coin_name;
    
    // Generate synthetic history if not available
    if (!state.priceHistory[symbol]) {
        state.priceHistory[symbol] = generatePriceHistory(coin.current_price, 30);
    }
    
    updateUI();
}

/**
 * Fetch live prices in background without blocking UI
 */
async function fetchLivePricesInBackground(symbols) {
    try {
        const livePrice = await rateLimitedFetch(() => fetchCurrentPrices(symbols));
        
        // Update state with live prices
        Object.keys(state.coinData).forEach(symbol => {
            if (livePrice[symbol]) {
                state.coinData[symbol] = {
                    ...state.coinData[symbol],
                    current_price: livePrice[symbol].current_price,
                    price_change_24h: livePrice[symbol].price_change_24h,
                    market_cap: livePrice[symbol].market_cap,
                    high_24h: state.coinData[symbol].high_24h || livePrice[symbol].current_price * 1.02,
                    low_24h: state.coinData[symbol].low_24h || livePrice[symbol].current_price * 0.98
                };
            }
        });
        
        // Refresh UI with live data
        updatePriceDisplay();
        updateMarketStats();
        populateCoinDropdown();
    } catch (error) {
        console.warn('Failed to fetch live prices, using cached data:', error);
    }
}

/**
 * Load historical data in background without blocking UI
 */
async function loadHistoricalDataInBackground(symbol) {
    // Check cache first
    const cached = getCachedHistoricalData(symbol);
    if (cached) {
        state.priceHistory[symbol] = cached;
        updateChart();
        return;
    }
    
    try {
        // Fetch all time periods in parallel (single batch)
        const [data30d, data7d, data1d] = await Promise.all([
            fetchHistoricalPrices(symbol, 30).catch(() => null),
            fetchHistoricalPrices(symbol, 7).catch(() => null),
            fetchIntradayPrices(symbol).catch(() => null)
        ]);
        
        if (!state.priceHistory[symbol]) {
            state.priceHistory[symbol] = {};
        }
        
        if (data30d) state.priceHistory[symbol]['30d'] = data30d;
        if (data7d) state.priceHistory[symbol]['7d'] = data7d;
        if (data1d) {
            state.priceHistory[symbol]['24h'] = data1d;
            state.priceHistory[symbol]['1h'] = data1d.slice(-4);
            state.priceHistory[symbol]['4h'] = data1d.slice(-16);
        }
        
        // Cache the data
        cacheHistoricalData(symbol, state.priceHistory[symbol]);
        
        updateChart();
    } catch (error) {
        console.warn(`Failed to load historical data for ${symbol}:`, error);
    }
}

/**
 * Get cached historical data
 */
function getCachedHistoricalData(symbol) {
    try {
        const cached = localStorage.getItem(`${HISTORICAL_CACHE_KEY}_${symbol}`);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is expired
        if (Date.now() - timestamp > HISTORICAL_CACHE_TTL) {
            localStorage.removeItem(`${HISTORICAL_CACHE_KEY}_${symbol}`);
            return null;
        }
        
        // Restore Date objects
        Object.keys(data).forEach(period => {
            if (Array.isArray(data[period])) {
                data[period] = data[period].map(item => ({
                    ...item,
                    time: item.time ? new Date(item.time) : undefined
                }));
            }
        });
        
        return data;
    } catch {
        return null;
    }
}

/**
 * Cache historical data
 */
function cacheHistoricalData(symbol, data) {
    try {
        localStorage.setItem(`${HISTORICAL_CACHE_KEY}_${symbol}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        // Storage might be full, ignore
    }
}

/**
 * Load cached historical data on startup
 */
function loadCachedHistoricalData(symbol) {
    const cached = getCachedHistoricalData(symbol);
    if (cached) {
        state.priceHistory[symbol] = cached;
    }
}

/**
 * Load historical price data from CoinGecko (used when switching coins)
 * Now uses parallel fetches and caching for better performance
 */
async function loadHistoricalData(symbol) {
    // Check cache first
    const cached = getCachedHistoricalData(symbol);
    if (cached) {
        state.priceHistory[symbol] = cached;
        updateChart();
        return;
    }
    
    try {
        // Fetch all time periods in parallel
        const [data30d, data7d, data1d] = await Promise.all([
            fetchHistoricalPrices(symbol, 30).catch(() => null),
            fetchHistoricalPrices(symbol, 7).catch(() => null),
            fetchIntradayPrices(symbol).catch(() => null)
        ]);
        
        if (!state.priceHistory[symbol]) {
            state.priceHistory[symbol] = {};
        }
        
        if (data30d) {
            state.priceHistory[symbol]['30d'] = data30d;
            state.priceHistory[symbol]['90d'] = data30d;
            state.priceHistory[symbol]['1y'] = data30d;
        }
        if (data7d) state.priceHistory[symbol]['7d'] = data7d;
        if (data1d) {
            state.priceHistory[symbol]['24h'] = data1d;
            state.priceHistory[symbol]['1h'] = data1d.slice(-4);
            state.priceHistory[symbol]['4h'] = data1d.slice(-16);
        }
        
        // Cache the data
        cacheHistoricalData(symbol, state.priceHistory[symbol]);
        
        updateChart();
        
    } catch (error) {
        console.error(`Failed to load historical data for ${symbol}:`, error);
        // Fallback to generated data
        if (!state.priceHistory[symbol]) {
            state.priceHistory[symbol] = generatePriceHistory(
                state.coinData[symbol]?.current_price || 1000,
                30
            );
        }
        updateChart();
    }
}

/**
 * Load minute-level data for short timeframes
 */
async function loadMinuteData(symbol) {
    try {
        console.log(`Loading minute data for ${symbol}...`);
        
        const [data1m, data5m] = await Promise.all([
            rateLimitedFetch(() => fetchMinuteData(symbol, 60)),
            rateLimitedFetch(() => fetch5MinuteData(symbol))
        ]);
        
        if (!state.priceHistory[symbol]) {
            state.priceHistory[symbol] = {};
        }
        
        state.priceHistory[symbol]['1m'] = data1m;
        state.priceHistory[symbol]['5m'] = data5m;
        
        console.log(`Loaded minute data for ${symbol} (1m: ${data1m.length} points, 5m: ${data5m.length} points)`);
        updateChart();
        
    } catch (error) {
        console.error(`Failed to load minute data for ${symbol}:`, error);
    }
}

function populateCoinDropdown() {
    const dropdownList = document.getElementById('coinDropdownList');
    dropdownList.innerHTML = '';
    
    // Show skeleton loading items if no data yet
    if (Object.keys(state.coinData).length === 0) {
        for (let i = 0; i < 5; i++) {
            const item = document.createElement('div');
            item.className = 'coin-dropdown-item skeleton';
            item.innerHTML = `
                <div class="coin-icon skeleton"></div>
                <div class="coin-info">
                    <div class="coin-symbol">LOAD</div>
                    <div class="coin-name">Loading...</div>
                </div>
                <div class="coin-price">$0.00</div>
            `;
            dropdownList.appendChild(item);
        }
        return;
    }
    
    Object.entries(state.coinData).forEach(([symbol, coin]) => {
        const item = document.createElement('div');
        item.className = 'coin-dropdown-item';
        item.dataset.symbol = symbol;
        
        item.innerHTML = `
            <img src="${coin.img_url}" alt="${symbol}" class="coin-icon">
            <div class="coin-info">
                <div class="coin-symbol">${symbol}</div>
                <div class="coin-name">${coin.coin_name}</div>
            </div>
            <div class="coin-price">$${formatPrice(coin.current_price)}</div>
        `;
        
        item.addEventListener('click', () => {
            selectCoin(symbol);
            closeCoinDropdown();
        });
        
        dropdownList.appendChild(item);
    });
}

// ========================================
// Price History Generation & Simulation
// ========================================

function generatePriceHistory(currentPrice, days) {
    const history = [];
    const now = new Date();
    
    // Generate historical data with realistic volatility
    let price = currentPrice * 0.95; // Start 5% lower
    
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate OHLCV candle data
        const open = price;
        
        // Random daily volatility (±3%)
        const highChange = Math.random() * 0.03;
        const lowChange = -Math.random() * 0.03;
        
        const high = price * (1 + highChange);
        const low = price * (1 + lowChange);
        
        // Close somewhere between high and low
        const closePosition = Math.random();
        const close = low + (high - low) * closePosition;
        
        // Random volume
        const volume = Math.random() * 500 + 100;
        
        history.push({
            date: date.toISOString().split('T')[0],
            price: close,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume
        });
        
        // Update price for next candle
        price = close * (1 + (Math.random() - 0.5) * 0.02);
    }
    
    // Ensure the last price matches current price
    history[history.length - 1].price = currentPrice;
    history[history.length - 1].close = currentPrice;
    
    return history;
}

function startPriceSimulation() {
    // Simulate price changes every 3 seconds
    setInterval(() => {
        Object.entries(state.coinData).forEach(([symbol, coin]) => {
            // Random price change (±0.5%)
            const change = (Math.random() - 0.5) * 0.01;
            const newPrice = coin.current_price * (1 + change);
            
            // Update current price
            state.coinData[symbol].current_price = newPrice;
            
            // Add to price history - handle both object and array formats
            if (!state.priceHistory[symbol]) return;
            
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            
            // Check if priceHistory is object (new format) or array (old format)
            const isObjectFormat = typeof state.priceHistory[symbol] === 'object' && !Array.isArray(state.priceHistory[symbol]);
            
            if (isObjectFormat) {
                // New format: object with time periods
                // Update the 24h data which is used most frequently
                const history24h = state.priceHistory[symbol]['24h'];
                if (history24h && Array.isArray(history24h) && history24h.length > 0) {
                    const lastEntry = history24h[history24h.length - 1];
                    
                    // Update the last entry with new price
                    if (lastEntry) {
                        lastEntry.close = newPrice;
                        lastEntry.high = Math.max(lastEntry.high || newPrice, newPrice);
                        lastEntry.low = Math.min(lastEntry.low || newPrice, newPrice);
                        lastEntry.price = newPrice;
                    }
                    
                    // Update 24h change
                    if (history24h.length > 1) {
                        const firstEntry = history24h[0];
                        if (firstEntry && firstEntry.price) {
                            const changePercent = ((newPrice - firstEntry.price) / firstEntry.price) * 100;
                            state.coinData[symbol].price_change_24h = changePercent;
                        }
                    }
                }
            } else if (Array.isArray(state.priceHistory[symbol])) {
                // Old format: direct array
                const history = state.priceHistory[symbol];
                if (history.length > 0) {
                    const lastEntry = history[history.length - 1];
                    
                    if (lastEntry && lastEntry.date === dateStr) {
                        // Update today's candle
                        lastEntry.price = newPrice;
                        lastEntry.close = newPrice;
                        lastEntry.high = Math.max(lastEntry.high || newPrice, newPrice);
                        lastEntry.low = Math.min(lastEntry.low || newPrice, newPrice);
                        lastEntry.volume = (lastEntry.volume || 0) + Math.random() * 10;
                    } else {
                        // Add new day candle
                        history.push({
                            date: dateStr,
                            price: newPrice,
                            open: (lastEntry && lastEntry.close) || newPrice,
                            high: newPrice * 1.01,
                            low: newPrice * 0.99,
                            close: newPrice,
                            volume: Math.random() * 500 + 100
                        });
                        
                        // Keep only last 30 days
                        if (history.length > 30) {
                            history.shift();
                        }
                    }
                    
                    // Update 24h change
                    if (history.length > 1) {
                        const yesterday = history[history.length - 2];
                        if (yesterday && yesterday.price) {
                            const changePercent = ((newPrice - yesterday.price) / yesterday.price) * 100;
                            state.coinData[symbol].price_change_24h = changePercent;
                        }
                    }
                }
            }
        });
        
        // Update UI if we're viewing the affected coin
        updatePriceDisplay();
        updateChart();
        updateHoldings();
        updatePortfolioValue();
    }, 3000);
}

// ========================================
// UI Updates
// ========================================

function updateUI() {
    updateBalanceDisplay();
    updatePriceDisplay();
    updateChart();
    updateMarketStats();
    updateOrderForm();
    updateHoldings();
    updateOrderHistory();
    updatePortfolioValue();
}

function updateBalanceDisplay() {
    document.getElementById('virtualBalance').textContent = `$${formatNumber(state.virtualBalance)}`;
}

function updatePortfolioValue() {
    let totalValue = 0;
    let totalCost = 0;
    
    Object.entries(state.holdings).forEach(([symbol, holding]) => {
        const currentPrice = state.coinData[symbol]?.current_price || 0;
        const value = holding.amount * currentPrice;
        totalValue += value;
        totalCost += holding.totalCost;
    });
    
    const portfolioValueEl = document.getElementById('portfolioValue');
    portfolioValueEl.textContent = `$${formatNumber(totalValue)}`;
    
    const totalPL = totalValue - totalCost;
    const totalPLEl = document.getElementById('totalPL');
    totalPLEl.textContent = `${totalPL >= 0 ? '+' : ''}$${formatNumber(Math.abs(totalPL))}`;
    totalPLEl.classList.toggle('negative', totalPL < 0);
    totalPLEl.parentElement.querySelector('.balance-amount').classList.toggle('negative', totalPL < 0);
}

function updatePriceDisplay() {
    const coin = state.coinData[state.selectedCoin];
    if (!coin) return;
    
    document.getElementById('currentPrice').textContent = `$${formatPrice(coin.current_price)}`;
    
    const priceChangeEl = document.getElementById('priceChange');
    const change = coin.price_change_24h || 0;
    priceChangeEl.innerHTML = `
        <span class="change-value">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
    `;
    priceChangeEl.className = 'price-change';
    priceChangeEl.classList.add(change >= 0 ? 'positive' : 'negative');
}

function updateChart() {
    const historyData = state.priceHistory[state.selectedCoin];
    const chartSection = document.querySelector('.chart-section');
    const isSkeletonLoading = chartSection && chartSection.classList.contains('skeleton');
    
    if (!historyData) {
        // Only show old loading if skeleton loading is not active
        if (!isSkeletonLoading) {
            showChartLoading();
        }
        return;
    }
    
    const period = state.currentPeriod;
    
    // Get data for selected period
    let history;
    if (typeof historyData === 'object' && !Array.isArray(historyData)) {
        // New format: object with different time periods
        history = historyData[period] || historyData['24h'] || [];
    } else {
        // Old format: array (fallback for generated data)
        history = historyData;
        
        // Filter based on period
        if (period === '7d') {
            history = history.slice(-7);
        } else if (period === '30d') {
            history = history.slice(-30);
        }
    }
    
    if (!history || history.length === 0) {
        console.warn(`No data available for ${state.selectedCoin} (${period})`);
        // Only show old loading if skeleton loading is not active
        if (!isSkeletonLoading) {
            showChartLoading(`Loading ${period.toUpperCase()} data...`);
        }
        return;
    }
    
    // Convert history to candle format
    const candles = history.map(h => {
        // Handle both Date objects and strings
        let timeLabel = h.time;
        if (timeLabel instanceof Date) {
            if (period === '1m' || period === '5m') {
                // Show time with seconds for minute views
                timeLabel = timeLabel.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false 
                });
            } else if (period === '24h' || period === '1h' || period === '4h') {
                timeLabel = timeLabel.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
            } else {
                timeLabel = timeLabel.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
        }
        
        return {
            time: h.date || timeLabel,
            open: h.open || h.price,
            high: h.high || h.price,
            low: h.low || h.price,
            close: h.close || h.price,
            volume: h.volume || 0
        };
    });
    
    // Draw candlestick chart
    drawCandlestickChart('priceChart', candles, {
        backgroundColor: getComputedStyle(document.documentElement)
            .getPropertyValue('--card-background').trim()
    });
    
    // Add interactivity if not already added
    if (!state.chartInteractivityAdded) {
        addCandlestickInteractivity('priceChart');
        state.chartInteractivityAdded = true;
    }
}

/**
 * Show loading message on chart
 */
function showChartLoading(message = 'Loading chart data...') {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    
    // Clear and draw loading state
    const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--card-background').trim() || '#1a1b1e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw loading text
    ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || '#666';
    ctx.font = '16px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Draw loading spinner
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 40;
    const radius = 20;
    const lineWidth = 3;
    
    ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-primary').trim() || '#00d4aa';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 1.5);
    ctx.stroke();
}

function generateHourlyCandles(dailyHistory) {
    if (!dailyHistory || dailyHistory.length === 0) return [];
    
    const today = dailyHistory[dailyHistory.length - 1];
    const hourlyCandles = [];
    const now = new Date();
    
    // Generate 24 hourly candles for today
    let price = today.open || today.price;
    
    for (let i = 23; i >= 0; i--) {
        const time = new Date(now);
        time.setHours(time.getHours() - i);
        
        const open = price;
        const volatility = 0.005; // 0.5% volatility per hour
        
        const high = price * (1 + Math.random() * volatility);
        const low = price * (1 - Math.random() * volatility);
        const close = low + (high - low) * Math.random();
        
        hourlyCandles.push({
            date: time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            }),
            open: open,
            high: high,
            low: low,
            close: close,
            price: close,
            volume: Math.random() * 50 + 10
        });
        
        price = close;
    }
    
    // Make sure last candle matches current price
    hourlyCandles[hourlyCandles.length - 1].close = today.close || today.price;
    hourlyCandles[hourlyCandles.length - 1].price = today.close || today.price;
    
    return hourlyCandles;
}



function getCoinColor(symbol) {
    const colors = {
        'BTC': '#f7931a',
        'ETH': '#627eea',
        'USDT': '#26a17b',
        'BNB': '#f3ba2f',
        'SOL': '#00d4aa',
        'ADA': '#0033ad',
        'XRP': '#23292f',
        'DOT': '#e6007a',
        'DOGE': '#c2a633',
        'AVAX': '#e84142',
        'SHIB': '#ffa409',
        'MATIC': '#8247e5',
        'LTC': '#345d9d',
        'UNI': '#ff007a',
        'LINK': '#2a5ada'
    };
    
    return colors[symbol] || '#22c55e';
}

function updateMarketStats() {
    const coin = state.coinData[state.selectedCoin];
    if (!coin) return;
    
    document.getElementById('high24h').textContent = `$${formatPrice(coin.high_24h)}`;
    document.getElementById('low24h').textContent = `$${formatPrice(coin.low_24h)}`;
    document.getElementById('marketCap').textContent = formatMarketCap(coin.market_cap);
    
    const holding = state.holdings[state.selectedCoin];
    document.getElementById('userHoldings').textContent = holding 
        ? `${formatAmount(holding.amount)} ${state.selectedCoin}`
        : `0.00 ${state.selectedCoin}`;
}

function updateOrderForm() {
    const coinSymbols = document.querySelectorAll('#orderCoinSymbol');
    coinSymbols.forEach(el => el.textContent = state.selectedCoin);
    
    // Update input step based on coin price
    const coin = state.coinData[state.selectedCoin];
    const orderAmountInput = document.getElementById('orderAmount');
    if (coin && orderAmountInput) {
        // Dynamic step based on coin price
        // For expensive coins like BTC, smaller steps; for cheaper coins, larger steps
        const price = coin.current_price;
        let step;
        if (price >= 1000) {
            step = '0.00000001'; // Very small for BTC
        } else if (price >= 100) {
            step = '0.000001';   // Small for ETH
        } else if (price >= 10) {
            step = '0.00001';    // Medium for mid-tier coins
        } else {
            step = '0.0001';     // Larger for cheaper coins
        }
        orderAmountInput.step = step;
    }
    
    // Update submit button text
    const submitBtn = document.getElementById('orderSubmitBtn');
    const icon = state.orderSide === 'buy'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
    
    submitBtn.innerHTML = `${icon} Place ${state.orderSide === 'buy' ? 'Buy' : 'Sell'} Order`;
    submitBtn.className = `btn-order btn-${state.orderSide}`;
    
    // Clear form
    document.getElementById('orderAmount').value = '';
    updateOrderSummary();
}

function updateOrderSummary() {
    const amount = parseFloat(document.getElementById('orderAmount').value) || 0;
    const coin = state.coinData[state.selectedCoin];
    if (!coin) return;
    
    const price = coin.current_price;
    const total = amount * price;
    const fee = total * TRADING_FEE;
    const finalTotal = total + (state.orderSide === 'buy' ? fee : -fee);
    
    document.getElementById('summaryPrice').textContent = `$${formatPrice(price)}`;
    document.getElementById('summaryFee').textContent = `$${formatNumber(fee)}`;
    document.getElementById('summaryTotal').textContent = `$${formatNumber(Math.abs(finalTotal))}`;
    document.getElementById('orderTotal').value = `$${formatNumber(total)}`;
}

function updateHoldings() {
    const holdingsList = document.getElementById('holdingsList');
    
    // Show skeleton loading if coin data is not loaded yet
    if (Object.keys(state.coinData).length === 0) {
        holdingsList.innerHTML = '';
        for (let i = 0; i < 2; i++) {
            const item = document.createElement('div');
            item.className = 'holding-item skeleton';
            item.innerHTML = `
                <div class="holding-header">
                    <div class="coin-icon skeleton"></div>
                    <div class="holding-info">
                        <div class="holding-symbol">LOAD</div>
                        <div class="holding-amount">0.00000000 LOAD</div>
                    </div>
                    <div class="holding-value">
                        <div class="holding-usd">$0.00</div>
                        <div class="holding-pl">+$0.00 (0.00%)</div>
                    </div>
                </div>
            `;
            holdingsList.appendChild(item);
        }
        return;
    }
    
    if (Object.keys(state.holdings).length === 0) {
        holdingsList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <p>No holdings yet</p>
                <span>Start trading to build your portfolio</span>
            </div>
        `;
        return;
    }
    
    holdingsList.innerHTML = '';
    
    Object.entries(state.holdings).forEach(([symbol, holding]) => {
        const coin = state.coinData[symbol];
        if (!coin) return;
        
        const currentValue = holding.amount * coin.current_price;
        const pl = currentValue - holding.totalCost;
        const plPercent = (pl / holding.totalCost) * 100;
        
        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div class="holding-header">
                <img src="${coin.img_url}" alt="${symbol}" class="coin-icon">
                <div class="holding-info">
                    <div class="holding-symbol">${symbol}</div>
                    <div class="holding-amount">${formatAmount(holding.amount)} ${symbol}</div>
                </div>
                <div class="holding-value">
                    <div class="holding-usd">$${formatNumber(currentValue)}</div>
                    <div class="holding-pl ${pl >= 0 ? 'positive' : 'negative'}">
                        ${pl >= 0 ? '+' : ''}$${formatNumber(Math.abs(pl))} (${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%)
                    </div>
                </div>
            </div>
        `;
        
        holdingsList.appendChild(item);
    });
}

function updateOrderHistory() {
    const tbody = document.getElementById('orderHistoryBody');
    
    if (state.orderHistory.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">No orders yet. Start trading to see your history here.</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    // Show most recent orders first
    const sortedHistory = [...state.orderHistory].reverse();
    
    sortedHistory.forEach(order => {
        const tr = document.createElement('tr');
        
        const time = new Date(order.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const currentPrice = state.coinData[order.symbol]?.current_price || order.price;
        let pl = 0;
        let plDisplay = '-';
        
        if (order.side === 'buy') {
            pl = (currentPrice - order.price) * order.amount;
            plDisplay = `${pl >= 0 ? '+' : ''}$${formatNumber(Math.abs(pl))}`;
        } else if (order.side === 'sell') {
            // For sell orders, show realized P&L
            const holding = state.holdings[order.symbol];
            if (holding) {
                pl = (order.price - holding.avgPrice) * order.amount;
                plDisplay = `${pl >= 0 ? '+' : ''}$${formatNumber(Math.abs(pl))}`;
            }
        }
        
        tr.innerHTML = `
            <td>${time}</td>
            <td>${order.symbol}/USD</td>
            <td><span class="order-side ${order.side}">${order.side.toUpperCase()}</span></td>
            <td>${formatAmount(order.amount)}</td>
            <td>$${formatPrice(order.price)}</td>
            <td>$${formatNumber(order.total)}</td>
            <td>$${formatNumber(order.fee)}</td>
            <td class="pl-value ${pl >= 0 ? 'positive' : 'negative'}">${plDisplay}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ========================================
// Event Listeners
// ========================================

function initializeEventListeners() {
    // Coin selector
    document.getElementById('coinSelectorBtn').addEventListener('click', toggleCoinDropdown);
    
    // Coin search
    document.getElementById('coinSearchInput').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.coin-dropdown-item');
        
        items.forEach(item => {
            const symbol = item.dataset.symbol.toLowerCase();
            const name = item.querySelector('.coin-name').textContent.toLowerCase();
            const matches = symbol.includes(search) || name.includes(search);
            item.style.display = matches ? 'flex' : 'none';
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('coinDropdown');
        const btn = document.getElementById('coinSelectorBtn');
        
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            closeCoinDropdown();
        }
    });
    
    // Chart period buttons
    document.querySelectorAll('.time-period-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.time-period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentPeriod = e.target.dataset.period;
            
            // Load minute data if needed
            if ((state.currentPeriod === '1m' || state.currentPeriod === '5m') && 
                state.priceHistory[state.selectedCoin] &&
                !state.priceHistory[state.selectedCoin]['1m']) {
                await loadMinuteData(state.selectedCoin);
            }
            
            updateChart();
        });
    });
    
    // Order tabs
    document.querySelectorAll('.order-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            state.orderSide = e.target.dataset.side;
            updateOrderForm();
        });
    });
    
    // Order amount input
    document.getElementById('orderAmount').addEventListener('input', updateOrderSummary);
    
    // Percentage buttons
    document.querySelectorAll('.percentage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const percent = parseFloat(btn.dataset.percent) / 100;
            const coin = state.coinData[state.selectedCoin];
            
            if (state.orderSide === 'buy') {
                // Calculate amount based on available balance
                const availableForOrder = state.virtualBalance * percent;
                const price = coin.current_price;
                const amount = availableForOrder / (price * (1 + TRADING_FEE));
                document.getElementById('orderAmount').value = amount.toFixed(8);
            } else {
                // Calculate amount based on holdings
                const holding = state.holdings[state.selectedCoin];
                if (holding) {
                    const amount = holding.amount * percent;
                    document.getElementById('orderAmount').value = amount.toFixed(8);
                }
            }
            
            updateOrderSummary();
        });
    });
    
    // Order form submit
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    
    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your order history?')) {
            state.orderHistory = [];
            updateOrderHistory();
            saveState();
        }
    });
    
    // Modal close buttons
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        document.getElementById('successModal').classList.remove('active');
    });
    
    document.getElementById('errorModalCloseBtn').addEventListener('click', () => {
        document.getElementById('errorModal').classList.remove('active');
    });
}

function toggleCoinDropdown() {
    const dropdown = document.getElementById('coinDropdown');
    dropdown.classList.toggle('active');
    
    if (dropdown.classList.contains('active')) {
        document.getElementById('coinSearchInput').value = '';
        document.getElementById('coinSearchInput').focus();
        
        // Reset all items visibility
        document.querySelectorAll('.coin-dropdown-item').forEach(item => {
            item.style.display = 'flex';
        });
    }
}

function closeCoinDropdown() {
    document.getElementById('coinDropdown').classList.remove('active');
}

async function selectCoin(symbol) {
    state.selectedCoin = symbol;
    const coin = state.coinData[symbol];
    
    if (!coin) return;
    
    // Update selector button immediately
    document.getElementById('selectedCoinIcon').src = coin.img_url;
    document.getElementById('selectedCoinIcon').alt = symbol;
    document.getElementById('selectedCoinSymbol').textContent = symbol;
    document.getElementById('selectedCoinName').textContent = coin.coin_name;
    
    // Try to use cached/generated data first for instant feedback
    const hasCachedData = state.priceHistory[symbol] && 
        (state.priceHistory[symbol]['24h'] || Array.isArray(state.priceHistory[symbol]));
    
    if (!hasCachedData) {
        // Generate synthetic data for instant display
        state.priceHistory[symbol] = generatePriceHistory(coin.current_price, 30);
    }
    
    // Update UI immediately with available data
    updateUI();
    
    // Load real historical data in background if not cached
    if (!hasCachedData || !getCachedHistoricalData(symbol)) {
        showCoinSwitchLoadingStates();
        loadHistoricalDataInBackground(symbol).then(() => {
            hideCoinSwitchLoadingStates();
        });
    }
    
    // Load minute data in background if needed
    if ((state.currentPeriod === '1m' || state.currentPeriod === '5m') && 
        (!state.priceHistory[symbol] || !state.priceHistory[symbol]['1m'])) {
        loadMinuteData(symbol);
    }
}

// ========================================
// Order Handling
// ========================================

function handleOrderSubmit(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('orderAmount').value);
    const coin = state.coinData[state.selectedCoin];
    
    if (!amount || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }
    
    const price = coin.current_price;
    const total = amount * price;
    const fee = total * TRADING_FEE;
    
    if (state.orderSide === 'buy') {
        const totalCost = total + fee;
        
        if (totalCost > state.virtualBalance) {
            showError('Insufficient balance for this order');
            return;
        }
        
        // Execute buy order
        state.virtualBalance -= totalCost;
        
        if (!state.holdings[state.selectedCoin]) {
            state.holdings[state.selectedCoin] = {
                amount: 0,
                avgPrice: 0,
                totalCost: 0
            };
        }
        
        const holding = state.holdings[state.selectedCoin];
        const newTotalAmount = holding.amount + amount;
        const newTotalCost = holding.totalCost + total;
        
        holding.amount = newTotalAmount;
        holding.totalCost = newTotalCost;
        holding.avgPrice = newTotalCost / newTotalAmount;
        
        showSuccess(`Successfully bought ${formatAmount(amount)} ${state.selectedCoin} for $${formatNumber(total)}`);
    } else {
        // Sell order
        const holding = state.holdings[state.selectedCoin];
        
        if (!holding || holding.amount < amount) {
            showError('Insufficient holdings for this order');
            return;
        }
        
        const totalReceived = total - fee;
        state.virtualBalance += totalReceived;
        
        holding.amount -= amount;
        holding.totalCost -= (holding.avgPrice * amount);
        
        if (holding.amount < 0.00000001) {
            delete state.holdings[state.selectedCoin];
        }
        
        showSuccess(`Successfully sold ${formatAmount(amount)} ${state.selectedCoin} for $${formatNumber(total)}`);
    }
    
    // Record order in history
    state.orderHistory.push({
        timestamp: Date.now(),
        symbol: state.selectedCoin,
        side: state.orderSide,
        amount: amount,
        price: price,
        total: total,
        fee: fee
    });
    
    saveState();
    updateUI();
}

function handleReset() {
    if (!confirm('Are you sure you want to reset the simulator? This will clear all your trades and reset your balance.')) {
        return;
    }
    
    state.virtualBalance = INITIAL_BALANCE;
    state.holdings = {};
    state.orderHistory = [];
    
    saveState();
    updateUI();
    
    showSuccess('Simulator reset successfully!');
}

// ========================================
// Modal Functions
// ========================================

function showSuccess(message) {
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('successModal').classList.add('active');
    
    setTimeout(() => {
        document.getElementById('successModal').classList.remove('active');
    }, 3000);
}

function showError(message) {
    document.getElementById('errorModalMessage').textContent = message;
    document.getElementById('errorModal').classList.add('active');
}

// ========================================
// Storage Functions
// ========================================

function saveState() {
    const saveData = {
        virtualBalance: state.virtualBalance,
        holdings: state.holdings,
        orderHistory: state.orderHistory,
        selectedCoin: state.selectedCoin
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.virtualBalance = data.virtualBalance || INITIAL_BALANCE;
            state.holdings = data.holdings || {};
            state.orderHistory = data.orderHistory || [];
            state.selectedCoin = data.selectedCoin || 'BTC';
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
    }
}

// ========================================
// Utility Functions
// ========================================

function formatNumber(num) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else if (price >= 1) {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    } else {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 6,
            maximumFractionDigits: 8
        });
    }
}

function formatAmount(amount) {
    if (amount >= 1) {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        });
    } else {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 8,
            maximumFractionDigits: 8
        });
    }
}

function formatMarketCap(cap) {
    if (cap >= 1e12) {
        return `$${(cap / 1e12).toFixed(2)}T`;
    } else if (cap >= 1e9) {
        return `$${(cap / 1e9).toFixed(2)}B`;
    } else if (cap >= 1e6) {
        return `$${(cap / 1e6).toFixed(2)}M`;
    } else {
        return `$${formatNumber(cap)}`;
    }
}
