// ========================================
// UKX Crypto Wallet - Markets Page JavaScript
// Market data fetching, filtering, and display
// ========================================

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
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 5;

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
            tags: tags
        });
    }
    
    // Sort by market cap (descending)
    return coins.sort((a, b) => b.marketCap - a.marketCap);
}

// Format large numbers (market cap, volume)
function formatLargeNumber(num) {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

// Format price with appropriate decimal places
function formatPrice(price) {
    if (price >= 1000) return `$${price.toFixed(2)}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
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

// Paginate market data
function paginateData(data, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
}

// Render a single market row
function renderMarketRow(coin) {
    const changeClass = coin.change24h >= 0 ? 'positive' : 'negative';
    const changeSign = coin.change24h >= 0 ? '+' : '';
    const rangePosition = calculateRangePosition(coin.price, coin.low24h, coin.high24h);

    return `
        <tr data-symbol="${coin.symbol}">
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
    const filteredData = filterMarketData(marketData, currentFilter);
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
    // Get top 3 coins by market cap rank for hot crypto
    const hotCrypto = [...marketData]
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 3);
    
    // Use fetched new listings data or fallback to market data
    const newListings = newListingsData.length > 0 ? newListingsData.slice(0, 3) : 
        [...marketData].sort((a, b) => b.marketCap - a.marketCap).slice(10, 13);
    
    // Update hot crypto card
    const hotCryptoList = document.querySelector('.markets-card:first-child .markets-card-list');
    if (hotCryptoList && hotCrypto.length > 0) {
        hotCryptoList.innerHTML = hotCrypto.map((coin, index) => `
            <div class="markets-card-item">
                <div class="markets-card-item-name">
                    <img src="${coin.imgUrl}" alt="${coin.symbol}" style="width: 24px; height: 24px; border-radius: 50%;" onerror="this.style.display='none';">
                    <span>#${index + 1} ${coin.name}</span>
                </div>
                <div class="markets-card-item-value">${formatLargeNumber(coin.marketCap)}</div>
            </div>
        `).join('');
    }
    
    // Update new listings card
    const newListingsCard = document.querySelector('.markets-card:last-child .markets-card-list');
    if (newListingsCard && newListings.length > 0) {
        newListingsCard.innerHTML = newListings.map(coin => `
            <div class="markets-card-item">
                <div class="markets-card-item-name">
                    <img src="${coin.imgUrl}" alt="${coin.symbol || coin.id}" style="width: 24px; height: 24px; border-radius: 50%;" onerror="this.style.display='none';">
                    <span>${coin.name}</span>
                </div>
                <div class="markets-card-item-value">${formatPrice(coin.price)}</div>
            </div>
        `).join('');
    }
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

    // Generate random data points for demo
    const points = [];
    const numPoints = 24;
    let value = 100;
    
    for (let i = 0; i < numPoints; i++) {
        value += (Math.random() - 0.48) * 5;
        points.push(value);
    }

    // Adjust to match 24h change
    const adjustment = (change24h / 100) * value;
    points[points.length - 1] = value + adjustment;

    // Find min and max for scaling
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min;

    // Get colors from CSS variables for theme support
    const computedStyle = getComputedStyle(document.documentElement);
    const successColor = computedStyle.getPropertyValue('--color-success').trim();
    const errorColor = computedStyle.getPropertyValue('--color-error').trim();
    
    // Use success color for positive trend, error color for negative trend
    const lineColor = change24h >= 0 ? successColor : errorColor;
    
    // Draw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = (index / (numPoints - 1)) * width;
        const y = height - ((point - min) / range) * height;
        
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
        symbol
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

        const { points, min, range, numPoints, lineColor, symbol } = canvas.chartData;
        const width = canvas.width;
        const height = canvas.height;

        // Find nearest point
        const pointIndex = Math.round((x / width) * (numPoints - 1));
        const point = points[pointIndex];
        
        // Get the actual price from the row
        const row = canvas.closest('tr');
        const priceCell = row?.querySelector('.price-cell');
        const currentPrice = priceCell?.textContent.replace('$', '') || '0';
        const basePrice = parseFloat(currentPrice.replace(/,/g, ''));
        
        // Calculate approximate price for the hovered point (based on the chart data)
        const priceMultiplier = point / points[points.length - 1];
        const hoveredPrice = basePrice * priceMultiplier;

        // Show tooltip
        tooltip.textContent = `Price ${formatPrice(hoveredPrice)}`;
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
    const { points, min, range, numPoints, lineColor } = canvas.chartData;
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
        const y = height - ((point - min) / range) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw hover point and vertical line
    const hoverX = (hoverIndex / (numPoints - 1)) * width;
    const hoverY = height - ((points[hoverIndex] - min) / range) * height;

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
    const { points, min, range, numPoints, lineColor } = canvas.chartData;
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
        const y = height - ((point - min) / range) * height;
        
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

// Initialize row click handlers
function initializeRowHandlers() {
    document.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-symbol]');
        if (row) {
            const symbol = row.dataset.symbol;
            console.log(`Clicked on ${symbol} - Navigate to detail page`);
            // TODO: Navigate to coin detail page
            // window.location.href = `/pages/coin-detail.html?symbol=${symbol}`;
        }
    });
}

// Fetch real market data (placeholder for API integration)
async function fetchMarketData() {
    try {
        // Load data from local JSON file
        const response = await fetch('/data/full_coin_data.json');
        if (!response.ok) {
            throw new Error('Failed to fetch market data');
        }
        const data = await response.json();
        
        // Transform the data to our format
        marketData = transformCoinData(data);
        
        return marketData;
    } catch (error) {
        console.error('Error fetching market data:', error);
        // Return empty array if fetch fails
        marketData = [];
        return marketData;
    }
}

// Fetch new listings from CoinGecko API
async function fetchNewListings() {
    try {
        // Fetch recently added coins from CoinGecko
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=id_desc&per_page=10&page=1&sparkline=false&locale=en');
        
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
            change24h: coin.price_change_percentage_24h || 0,
            volume24h: coin.total_volume,
            marketCap: coin.market_cap,
            low24h: coin.low_24h,
            high24h: coin.high_24h,
            imgUrl: coin.image,
            tags: ['all']
        }));
        
        console.log('Fetched new listings from CoinGecko:', newListingsData.length);
        return newListingsData;
    } catch (error) {
        console.error('Error fetching new listings from CoinGecko:', error);
        // Return empty array if fetch fails
        newListingsData = [];
        return newListingsData;
    }
}

// Initialize the markets page
async function initializeMarketsPage() {
    console.log('Initializing markets page...');
    
    // Fetch market data and new listings in parallel
    await Promise.all([
        fetchMarketData(),
        fetchNewListings()
    ]);
    
    // Render market data
    renderMarketsTable();

    // Initialize filters
    initializeFilters();

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

    // Auto-refresh data every 60 seconds
    setInterval(async () => {
        await Promise.all([
            fetchMarketData(),
            fetchNewListings()
        ]);
        renderMarketsTable();
    }, 60000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMarketsPage);
} else {
    initializeMarketsPage();
}
