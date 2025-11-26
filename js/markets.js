// ========================================
// UKX Crypto Wallet - Markets Page JavaScript
// Market data fetching, filtering, and display
// ========================================

import { jsonFileParser } from "/modules/json/jsonFileParser.js";

// Tag mapping for categories
const TAG_MAPPING = {
    'defi': ['Decentralized Finance (DeFi)', 'DeFi', 'Yield Farming', 'Automated Market Maker (AMM)'],
    'gaming': ['Gaming', 'Play to Earn', 'NFT'],
    'meme': ['Meme', 'Dog-Themed'],
    'layer1': ['Layer 1 (L1)'],
    'privacy': ['Privacy']
};

// Market data storage
let marketData = [];
let newListingsData = [];
let hotCryptoData = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 5;
let chartData24h = {};
let searchQuery = '';

function getCurrencyManager() {
    return window.UKXCurrency || null;
}

function getPreferredCurrencyCode() {
    const manager = getCurrencyManager();
    return manager?.getPreferredCurrency?.() || 'USD';
}

function convertFromUSD(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const manager = getCurrencyManager();
    if (manager?.convertCurrency) {
        return manager.convertCurrency(numeric, 'USD', getPreferredCurrencyCode());
    }
    return numeric;
}

function formatFiat(value, options = {}) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const manager = getCurrencyManager();
    const baseOptions = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
    };
    if (manager?.formatCurrency) {
        return manager.formatCurrency(numeric, { fromCurrency: 'USD', ...baseOptions });
    }
    const fallbackOptions = {
        style: 'currency',
        currency: 'USD',
        ...baseOptions
    };
    return numeric.toLocaleString('en-US', fallbackOptions);
}

window.addEventListener('preferredCurrencyChange', () => {
    if (marketData.length === 0) return;
    renderMarketsTable();
});

// Determine tags for a coin based on categories
function determineTags(categories) {
    const tags = [];
    
    for (const [tag, keywords] of Object.entries(TAG_MAPPING)) {
        if (categories.some(cat => keywords.some(keyword => cat.includes(keyword)))) {
            tags.push(tag);
        }
    }
    
    return tags.length > 0 ? tags : ['all'];
}

// Transform coin data from JSON format to app format
function transformCoinData(coinData) {
    const coins = [];
    // console.log(coinData);
    if (Array.isArray(coinData) && coinData.length === 1 && typeof coinData[0] === 'object' && !Array.isArray(coinData[0])) {
        coinData = coinData[0];
    }
    
    for (const [symbol, data] of Object.entries(coinData)) {
        const tags = determineTags(data.categories || []);
        
        coins.push({
            name: data.coin_name,
            symbol: symbol,
            price: data.current_price,
            change24h: data.price_change_24h,
            volume24h: data.market_cap * 0.1, // Approximate volume
            marketCap: data.market_cap,
            low24h: data.low_24h,
            high24h: data.high_24h,
            imgUrl: data.img_url,
            tags: tags,
            coin_id: data.coin_page_id 
        });
    }
    
    // Sort by market cap (descending)
    return coins.sort((a, b) => b.marketCap - a.marketCap);
}

function resolveCoinIdBySymbol(symbol) {
    if (!symbol || !Array.isArray(marketData)) return null;
    const normalized = symbol.toUpperCase();
    const match = marketData.find(coin => coin.symbol?.toUpperCase() === normalized);
    return match?.coin_id ?? null;
}

// Normalize the 24h data JSON into ordered numeric arrays per symbol
function normalize24hSeries(series) {
    if (!series) return null;

    if (Array.isArray(series)) {
        const normalized = series
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));
        return normalized.length ? normalized : null;
    }

    if (typeof series === 'object') {
        const normalized = Object.entries(series)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([, value]) => Number(value))
            .filter(value => Number.isFinite(value));
        return normalized.length ? normalized : null;
    }

    return null;
}

function getChartSeriesForSymbol(symbol) {
    if (!symbol) return null;
    return chartData24h[symbol.toUpperCase()] || null;
}

// Format large numbers (market cap, volume)
function formatLargeNumber(num) {
    if (!Number.isFinite(Number(num))) return '—';
    return formatFiat(num, { notation: 'compact', maximumFractionDigits: 2 });
}

// Format price with appropriate decimal places
function formatPrice(price) {
    if (!Number.isFinite(Number(price))) return '—';
    const converted = Math.abs(convertFromUSD(price));
    let digits = { minimumFractionDigits: 6, maximumFractionDigits: 8 };
    if (converted >= 1000) {
        digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    } else if (converted >= 1) {
        digits = { minimumFractionDigits: 2, maximumFractionDigits: 4 };
    } else if (converted >= 0.01) {
        digits = { minimumFractionDigits: 4, maximumFractionDigits: 6 };
    }
    return formatFiat(price, digits);
}

function formatChangePercentage(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const sign = numeric >= 0 ? '+' : '';
    return `${sign}${numeric.toFixed(2)}%`;
}

// Calculate position in 24h range (0-100%)
function calculateRangePosition(current, low, high) {
    if (high === low) return 50;
    return ((current - low) / (high - low)) * 100;
}

// Filter market data based on selected tag
function filterMarketData(data, filter) {
    if (filter === 'all') return data;
    return data.filter(coin => coin.tags.includes(filter));
}

function applySearchFilter(data) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter((coin) => {
        const name = coin.name?.toLowerCase() || '';
        const symbol = coin.symbol?.toLowerCase() || '';
        return name.includes(query) || symbol.includes(query);
    });
}

// Paginate market data
function paginateData(data, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
}

function navigateToCoinDetails(coinId) {
    if (coinId === undefined || coinId === null || coinId === '') return false;
    window.location.href = `/pages/coin-details.html?coin_id=${coinId}`;
    return true;
}

// Render a single market row
function renderMarketRow(coin) {
    const changeClass = coin.change24h >= 0 ? 'positive' : 'negative';
    const changeSign = coin.change24h >= 0 ? '+' : '';
    const rangePosition = calculateRangePosition(coin.price, coin.low24h, coin.high24h);

    return `
        <tr data-symbol="${coin.symbol}" data-price-usd="${coin.price}">
            <td>
                <div class="crypto-name-cell">
                    <img src="${coin.imgUrl}" alt="${coin.symbol}" onerror="this.style.display='none';">
                    <span class="crypto-name">${coin.name}<span class="crypto-symbol">${coin.symbol}</span></span>
                </div>
            </td>
            <td class="price-cell">${formatPrice(coin.price)}</td>
            <td class="change-cell ${changeClass}">${changeSign}${coin.change24h.toFixed(2)}%</td>
            <td class="chart-cell">
                <canvas class="mini-chart" data-symbol="${coin.symbol}"></canvas>
            </td>
            <td class="range-cell">
                <div class="range-values">
                    <span class="range-low">${formatPrice(coin.low24h)}</span>
                    <span class="range-high">${formatPrice(coin.high24h)}</span>
                </div>
                <div class="range-bar">
                    <div class="range-indicator ${changeClass}" style="left: ${rangePosition}%"></div>
                </div>
            </td>
            <td class="marketcap-cell">${formatLargeNumber(coin.marketCap)}</td>
        </tr>
    `;
}

// Render the markets table
function renderMarketsTable() {
    const tbody = document.getElementById('marketsTableBody');
    if (!tbody) return;

    // Filter and paginate data
    let filteredData = filterMarketData(marketData, currentFilter);
    filteredData = applySearchFilter(filteredData);
    const paginatedData = paginateData(filteredData, currentPage, itemsPerPage);

    // Clear existing rows
    tbody.innerHTML = '';

    // Render new rows
    paginatedData.forEach(coin => {
        tbody.innerHTML += renderMarketRow(coin);
    });

    // Draw mini charts
    paginatedData.forEach(coin => {
        drawMiniChart(coin.symbol, coin.change24h);
    });

    // Update pagination
    updatePagination(filteredData.length);
    
    // Update hot crypto and new listings cards
    updateMarketCards();
}

// Update hot crypto and new listings cards with real data
function updateMarketCards() {
    const createCardMarkup = (coin, valueContent) => {
        const symbol = coin.symbol || coin.id || '';
        const coinId = coin.coin_id ?? resolveCoinIdBySymbol(symbol) ?? '';
        const image = coin.imgUrl || coin.image || '';
        return `
            <div class="markets-card-item" data-symbol="${symbol}" data-coin-id="${coinId}">
                <div class="markets-card-item-name">
                    <img src="${image}" alt="${symbol}" style="width: 24px; height: 24px; border-radius: 50%;" onerror="this.style.display='none';">
                    <span>${coin.name}</span>
                </div>
                <div class="markets-card-item-value">${valueContent}</div>
            </div>
        `;
    };

    const hotSource = hotCryptoData.length > 0
        ? hotCryptoData.slice(0, 3)
        : [...marketData]
            .sort((a, b) => (Number(b.change24h) || 0) - (Number(a.change24h) || 0))
            .slice(0, 3);

    const newListingsSource = newListingsData.length > 0
        ? newListingsData.slice(0, 3)
        : [...marketData].sort((a, b) => b.marketCap - a.marketCap).slice(10, 13);

    const hotCryptoList = document.querySelector('.markets-card:first-child .markets-card-list');
    if (hotCryptoList && hotSource.length > 0) {
        hotCryptoList.innerHTML = hotSource.map(coin => {
            const changeValue = formatChangePercentage(coin.change24h ?? coin.price_change_percentage_24h ?? 0);
            return createCardMarkup(coin, changeValue);
        }).join('');
    }

    const newListingsCard = document.querySelector('.markets-card:last-child .markets-card-list');
    if (newListingsCard && newListingsSource.length > 0) {
        newListingsCard.innerHTML = newListingsSource.map(coin => {
            const priceValue = formatPrice(coin.price ?? coin.current_price);
            return createCardMarkup(coin, priceValue);
        }).join('');
    }
}

function createSeededRandom(seedString = '') {
    // Simple LCG using a hash derived from the symbol so re-renders stay consistent
    let seed = Array.from(String(seedString).toUpperCase()).reduce((hash, char) => {
        return (hash * 31 + char.charCodeAt(0)) >>> 0;
    }, 0) || 123456789;

    return () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
}

function generateMockSparkline(symbol = '', change24h = 0) {
    const seededRandom = createSeededRandom(symbol);
    const points = [];
    const numPoints = 24;
    let value = 100;

    for (let i = 0; i < numPoints; i++) {
        value += (seededRandom() - 0.48) * 5;
        points.push(value);
    }

    const adjustment = (change24h / 100) * value;
    points[points.length - 1] = value + adjustment;
    return points;
}

// Draw a simple mini chart (sparkline)
function drawMiniChart(symbol, change24h) {
    const canvas = document.querySelector(`.mini-chart[data-symbol="${symbol}"]`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const numericChange = Number.isFinite(Number(change24h)) ? Number(change24h) : 0;
    const realSeries = getChartSeriesForSymbol(symbol);
    const hasRealSeries = Array.isArray(realSeries) && realSeries.length > 1;
    const points = hasRealSeries ? [...realSeries] : generateMockSparkline(symbol, numericChange);
    const numPoints = points.length;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const rawRange = max - min;
    const range = rawRange === 0 ? 1 : rawRange;
    const isFlatLine = rawRange === 0;

    // Get colors from CSS variables for theme support
    const computedStyle = getComputedStyle(document.documentElement);
    const successColor = computedStyle.getPropertyValue('--color-success').trim();
    const errorColor = computedStyle.getPropertyValue('--color-error').trim();

    // Determine trend based on real data if available
    let effectiveChange = numericChange;
    if (hasRealSeries && points.length >= 2) {
        const first = points[0];
        const last = points[points.length - 1];
        if (Number.isFinite(first) && first !== 0) {
            effectiveChange = ((last - first) / Math.abs(first)) * 100;
        } else {
            effectiveChange = last - first;
        }
    }

    const lineColor = effectiveChange >= 0 ? successColor : errorColor;

    // Draw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = (index / (numPoints - 1)) * width;
        const normalized = isFlatLine ? 0.5 : (point - min) / range;
        const y = height - normalized * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Store chart data for hover interactions
    canvas.chartData = {
        points,
        min,
        max,
        range,
        numPoints,
        lineColor,
        symbol,
        usesActualData: hasRealSeries,
        isFlatLine
    };

    // Add hover functionality
    setupChartHover(canvas);
}

// Setup hover tooltip for mini chart
function setupChartHover(canvas) {
    const parent = canvas.parentElement;
    
    // Create tooltip if it doesn't exist
    let tooltip = parent.querySelector('.chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        parent.style.position = 'relative';
        parent.appendChild(tooltip);
    }

    // Mouse move handler
    const handleMouseMove = (e) => {
        if (!canvas.chartData) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if mouse is within canvas bounds
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            tooltip.style.opacity = '0';
            redrawChart(canvas);
            return;
        }

        const { points, min, range, numPoints, lineColor, symbol, usesActualData } = canvas.chartData;
        const width = canvas.width;
        const height = canvas.height;

        // Find nearest point
        const pointIndex = Math.round((x / width) * (numPoints - 1));
        const point = points[pointIndex];
        
        const row = canvas.closest('tr');
        const parsedBasePrice = parseFloat(row?.dataset.priceUsd || '0');
        const hasBasePrice = Number.isFinite(parsedBasePrice);
        const basePriceUsd = hasBasePrice ? parsedBasePrice : 0;
        const lastPoint = points[points.length - 1];

        let hoveredPriceUsd = basePriceUsd;
        if (usesActualData) {
            hoveredPriceUsd = point;
        } else if (hasBasePrice && Number.isFinite(lastPoint) && lastPoint !== 0) {
            hoveredPriceUsd = basePriceUsd * (point / lastPoint);
        }

        // Show tooltip
        tooltip.textContent = `Price ${formatPrice(hoveredPriceUsd)}`;
        tooltip.style.opacity = '1';
        
        // Position tooltip above the cursor
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y - 35}px`;

        // Redraw chart with hover indicator
        redrawChartWithHover(canvas, pointIndex);
    };

    const handleMouseLeave = () => {
        tooltip.style.opacity = '0';
        redrawChart(canvas);
    };

    // Remove old listeners if they exist
    canvas.removeEventListener('mousemove', canvas._hoverHandler);
    canvas.removeEventListener('mouseleave', canvas._leaveHandler);
    
    // Store handlers for future removal
    canvas._hoverHandler = handleMouseMove;
    canvas._leaveHandler = handleMouseLeave;
    
    // Add new listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
}

// Redraw chart with hover indicator
function redrawChartWithHover(canvas, hoverIndex) {
    if (!canvas.chartData) return;

    const ctx = canvas.getContext('2d');
    const { points, min, range, numPoints, lineColor, isFlatLine } = canvas.chartData;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Redraw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = (index / (numPoints - 1)) * width;
        const normalized = isFlatLine ? 0.5 : (point - min) / range;
        const y = height - normalized * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw hover point and vertical line
    const hoverX = (hoverIndex / (numPoints - 1)) * width;
    const hoverNormalized = isFlatLine ? 0.5 : (points[hoverIndex] - min) / range;
    const hoverY = height - hoverNormalized * height;

    // Draw vertical dashed line
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, 0);
    ctx.lineTo(hoverX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw hover point
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(hoverX, hoverY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Add white border to point
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// Redraw chart without hover effects
function redrawChart(canvas) {
    if (!canvas.chartData) return;

    const ctx = canvas.getContext('2d');
    const { points, min, range, numPoints, lineColor, isFlatLine } = canvas.chartData;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Redraw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = (index / (numPoints - 1)) * width;
        const normalized = isFlatLine ? 0.5 : (point - min) / range;
        const y = height - normalized * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}

// Update pagination buttons
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.querySelector('.markets-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.dataset.page = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderMarketsTable();
            updatePaginationActive();
        });
        pagination.appendChild(btn);
    }
}

// Update active pagination button
function updatePaginationActive() {
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.page) === currentPage);
    });
}

// Initialize filter buttons
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.markets-filter-tag');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update filter and reset page
            currentFilter = btn.dataset.filter;
            currentPage = 1;

            // Re-render table
            renderMarketsTable();
        });
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('marketsSearch');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value || '';
        currentPage = 1;
        renderMarketsTable();
    });
}

// Initialize row click handlers
function initializeRowHandlers() {
    document.addEventListener('click', (e) => {
        const cardItem = e.target.closest('.markets-card-item[data-symbol]');
        if (cardItem) {
            const directId = cardItem.dataset.coinId;
            if (navigateToCoinDetails(directId)) return;
            const fallbackSymbol = cardItem.dataset.symbol;
            const resolved = resolveCoinIdBySymbol(fallbackSymbol);
            if (navigateToCoinDetails(resolved)) return;
        }

        const row = e.target.closest('tr[data-symbol]');
        if (row) {
            const symbol = row.dataset.symbol;
            const coin_id = marketData.find(coin => coin.symbol === symbol)?.coin_id ;
            navigateToCoinDetails(coin_id);
        }
    });
}

// Fetch real market data (placeholder for API integration)
async function fetchMarketData() {
    try {
        const data = await jsonFileParser('/data/full_coin_data.json');
        marketData = transformCoinData(data);
        return marketData;
    } catch (error) {
        console.error('Error fetching market data:', error);
        marketData = [];
        return marketData;
    }
}

// Fetch cached 24h sparkline data
async function fetch24hChartData() {
    try {
        const data = await jsonFileParser('/data/data_24h.json');
        chartData24h = Object.entries(data || {}).reduce((acc, [symbol, series]) => {
            const normalized = normalize24hSeries(series);
            if (normalized) {
                acc[symbol.toUpperCase()] = normalized;
            }
            return acc;
        }, {});
        return chartData24h;
    } catch (error) {
        console.error('Error fetching 24h chart data:', error);
        chartData24h = {};
        return chartData24h;
    }
}

// Fetch new listings from CoinGecko API (with rate limit handling)
let _lastCoinGeckoFetch = 0;
const COINGECKO_MIN_INTERVAL = 12000; // 12 seconds between API calls to avoid rate limiting

async function fetchWithRateLimit(url) {
    const now = Date.now();
    const timeSinceLastFetch = now - _lastCoinGeckoFetch;
    
    if (timeSinceLastFetch < COINGECKO_MIN_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, COINGECKO_MIN_INTERVAL - timeSinceLastFetch));
    }
    
    _lastCoinGeckoFetch = Date.now();
    const response = await fetch(url);
    
    // Handle rate limiting (429)
    if (response.status === 429) {
        console.warn('CoinGecko rate limit hit, backing off...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
        return fetch(url); // Retry once
    }
    
    return response;
}

async function fetchNewListings() {
    try {
        // Fetch recently added coins from CoinGecko
        const response = await fetchWithRateLimit('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=id_desc&per_page=10&page=1&sparkline=false&locale=en&price_change_percentage=24h');
        
        if (!response.ok) {
            throw new Error('Failed to fetch new listings from CoinGecko');
        }
        
        const data = await response.json();
        
        // Transform CoinGecko data to our format
        newListingsData = data.map(coin => ({
            name: coin.name,
            symbol: coin.symbol?.toUpperCase(),
            id: coin.id,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0,
            volume24h: coin.total_volume,
            marketCap: coin.market_cap,
            low24h: coin.low_24h,
            high24h: coin.high_24h,
            imgUrl: coin.image,
            tags: ['all']
        }));
        
        return newListingsData;
    } catch (error) {
        console.error('Error fetching new listings from CoinGecko:', error);
        // Return empty array if fetch fails
        newListingsData = [];
        return newListingsData;
    }
}

// Fetch top gainers for hot crypto card
async function fetchHotCrypto() {
    try {
        const response = await fetchWithRateLimit('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h');

        if (!response.ok) {
            throw new Error('Failed to fetch hot crypto data from CoinGecko');
        }

        const data = await response.json();

        hotCryptoData = data.map(coin => ({
            name: coin.name,
            symbol: coin.symbol?.toUpperCase(),
            id: coin.id,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0,
            marketCap: coin.market_cap,
            imgUrl: coin.image,
            tags: ['all']
        }));

        return hotCryptoData;
    } catch (error) {
        console.error('Error fetching hot crypto data:', error);
        hotCryptoData = [];
        return hotCryptoData;
    }
}

// Initialize the markets page
async function initializeMarketsPage() {
    // Fetch local data first (fast), then CoinGecko data (with rate limiting)
    await Promise.all([
        fetchMarketData(),
        fetch24hChartData()
    ]);
    
    // Render with local data immediately
    renderMarketsTable();

    // Then fetch CoinGecko data in background (sequentially to respect rate limits)
    fetchNewListings().then(() => updateMarketCards());
    fetchHotCrypto().then(() => updateMarketCards());

    // Initialize filters
    initializeFilters();
    initializeSearch();

    // Initialize row click handlers
    initializeRowHandlers();

    // Listen for theme changes to redraw charts
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                // Redraw all visible charts when theme changes
                document.querySelectorAll('.mini-chart').forEach(canvas => {
                    const symbol = canvas.dataset.symbol;
                    const row = canvas.closest('tr');
                    if (row) {
                        const changeCell = row.querySelector('.change-cell');
                        const changeText = changeCell?.textContent.trim() || '0%';
                        const change24h = parseFloat(changeText);
                        if (!isNaN(change24h)) {
                            drawMiniChart(symbol, change24h);
                        }
                    }
                });
            }
        });
    });

    // Start observing the document root for theme attribute changes
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Auto-refresh local data every 60 seconds, CoinGecko every 2 minutes (rate limit friendly)
    setInterval(async () => {
        await Promise.all([
            fetchMarketData(),
            fetch24hChartData()
        ]);
        renderMarketsTable();
    }, 60000);
    
    // CoinGecko data refresh (less frequent to avoid rate limits)
    setInterval(async () => {
        await fetchNewListings();
        await fetchHotCrypto();
        updateMarketCards();
    }, 120000); // 2 minutes
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMarketsPage);
} else {
    initializeMarketsPage();
}
