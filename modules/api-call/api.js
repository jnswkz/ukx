import { API } from "/env.js";

const apiUrl = 'https://api.perplexity.ai/chat/completions';
const REQUEST_TIMEOUT_MS = 30000; // Increased timeout for file processing
const SLOW_RESPONSE_WARNING_MS = 8000;
const API_KEY = API;

// Response cache to avoid repeated API calls
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Persisted state for chat coin preview charts
const CHAT_CHART_STATE_KEY = 'ukx_chat_chart_periods';

function readStoredChartState() {
    try {
        const raw = localStorage.getItem(CHAT_CHART_STATE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn('Unable to read chat chart state from storage', error);
        return {};
    }
}

function getStoredChartPeriod(symbol) {
    if (!symbol) return null;
    const state = readStoredChartState();
    const key = symbol.toUpperCase();
    return state[key] || null;
}

function persistChartPeriod(symbol, period) {
    if (!symbol || !period) return;
    const key = symbol.toUpperCase();
    const nextState = readStoredChartState();
    nextState[key] = period;
    try {
        localStorage.setItem(CHAT_CHART_STATE_KEY, JSON.stringify(nextState));
    } catch (error) {
        console.warn('Unable to persist chat chart state', error);
    }
}

// Preloaded context data (loaded once)
let preloadedContext = null;
let contextLoadPromise = null;

// Coin data for detecting mentions and creating links
let coinDataCache = null;

// Common coin name mappings (name/alias -> symbol)
const COIN_ALIASES = {
    'bitcoin': 'BTC',
    'btc': 'BTC',
    'ethereum': 'ETH',
    'eth': 'ETH',
    'ether': 'ETH',
    'tether': 'USDT',
    'usdt': 'USDT',
    'binance coin': 'BNB',
    'bnb': 'BNB',
    'solana': 'SOL',
    'sol': 'SOL',
    'ripple': 'XRP',
    'xrp': 'XRP',
    'cardano': 'ADA',
    'ada': 'ADA',
    'dogecoin': 'DOGE',
    'doge': 'DOGE',
    'polkadot': 'DOT',
    'dot': 'DOT',
    'avalanche': 'AVAX',
    'avax': 'AVAX',
    'shiba inu': 'SHIB',
    'shib': 'SHIB',
    'polygon': 'MATIC',
    'matic': 'MATIC',
    'litecoin': 'LTC',
    'ltc': 'LTC',
    'uniswap': 'UNI',
    'uni': 'UNI',
    'chainlink': 'LINK',
    'link': 'LINK',
    'tron': 'TRX',
    'trx': 'TRX',
    'stellar': 'XLM',
    'xlm': 'XLM',
    'monero': 'XMR',
    'xmr': 'XMR',
    'cosmos': 'ATOM',
    'atom': 'ATOM',
    'near': 'NEAR',
    'near protocol': 'NEAR',
    'fantom': 'FTM',
    'ftm': 'FTM',
    'filecoin': 'FIL',
    'fil': 'FIL',
    'vechain': 'VET',
    'vet': 'VET',
    'aptos': 'APT',
    'apt': 'APT',
    'the open network': 'TON',
    'ton': 'TON',
    'toncoin': 'TON'
};

// News category mappings (keywords -> news articles)
const NEWS_CATEGORIES = {
    'defi': {
        keywords: ['defi', 'decentralized finance', 'yield farming', 'liquidity', 'lending', 'borrowing', 'amm', 'automated market'],
        articles: [
            { title: 'DeFi Yield Farming Strategies', url: '/pages/news/defi-yield-farming-strategies.html' },
            { title: 'Flash Loans in DeFi', url: '/pages/news/flash-loans-in-defi-protocols.html' },
            { title: 'DeFi Protocol Infrastructure', url: '/pages/news/defi-protocol-infrastructure.html' },
            { title: 'Decentralized Exchanges & AMM', url: '/pages/news/decentralized-exchanges-and-amm-models.html' }
        ]
    },
    'nft': {
        keywords: ['nft', 'nfts', 'non-fungible', 'digital art', 'collectibles', 'opensea', 'marketplace'],
        articles: [
            { title: 'NFT Marketplaces & Platforms', url: '/pages/news/nft-marketplaces-and-platforms.html' },
            { title: 'NFT Utility Beyond Digital Art', url: '/pages/news/nft-utility-beyond-digital-art.html' },
            { title: 'AI and Blockchain Art Creation', url: '/pages/news/ai-and-blockchain-art-creation.html' }
        ]
    },
    'security': {
        keywords: ['security', 'hack', 'scam', 'fraud', 'wallet security', 'custody', 'safe', 'protect'],
        articles: [
            { title: 'Cryptocurrency Wallet Security', url: '/pages/news/cryptocurrency-wallet-security.html' },
            { title: 'Hardware Wallet Security', url: '/pages/news/hardware-wallet-security.html' },
            { title: 'Anti-Fraud Cryptocurrency Measures', url: '/pages/news/anti-fraud-cryptocurrency-measures.html' },
            { title: 'Crypto Custody Solutions', url: '/pages/news/crypto-custody-and-security-solutions.html' }
        ]
    },
    'trading': {
        keywords: ['trading', 'trade', 'exchange', 'buy', 'sell', 'market', 'arbitrage', 'derivatives'],
        articles: [
            { title: 'Cryptocurrency Arbitrage Trading', url: '/pages/news/cryptocurrency-arbitrage-trading.html' },
            { title: 'Crypto Market Making Strategies', url: '/pages/news/crypto-market-making-strategies.html' },
            { title: 'Cryptocurrency Derivatives Trading', url: '/pages/news/cryptocurrency-derivatives-trading.html' },
            { title: 'Market Psychology in Crypto', url: '/pages/news/market-psychology-in-crypto.html' }
        ]
    },
    'staking': {
        keywords: ['staking', 'stake', 'proof of stake', 'pos', 'passive income', 'rewards', 'validator'],
        articles: [
            { title: 'Cryptocurrency Staking for Passive Income', url: '/pages/news/cryptocurrency-staking-for-passive-income.html' },
            { title: 'Proof of Stake Consensus', url: '/pages/news/proof-of-stake-consensus-mechanisms.html' },
            { title: 'Ethereum Merge & Proof of Stake', url: '/pages/news/ethereum-merge-and-proof-of-stake.html' }
        ]
    },
    'regulation': {
        keywords: ['regulation', 'regulatory', 'tax', 'taxes', 'legal', 'compliance', 'law', 'government', 'sec'],
        articles: [
            { title: 'Crypto Regulatory Frameworks', url: '/pages/news/crypto-regulatory-frameworks.html' },
            { title: 'Cryptocurrency Tax Obligations', url: '/pages/news/cryptocurrency-tax-obligations.html' },
            { title: 'Crypto Compliance Requirements', url: '/pages/news/crypto-compliance-requirements.html' },
            { title: 'Crypto Privacy Regulations', url: '/pages/news/crypto-privacy-regulations.html' }
        ]
    },
    'layer2': {
        keywords: ['layer 2', 'layer2', 'l2', 'scaling', 'rollup', 'lightning', 'optimism', 'arbitrum'],
        articles: [
            { title: 'Layer 2 Scaling Solutions', url: '/pages/news/understanding-layer-2-scaling-solutions-for-ethereum.html' },
            { title: 'Bitcoin Lightning Network', url: '/pages/news/bitcoin-lightning-network-technology.html' },
            { title: 'Blockchain Scalability Solutions', url: '/pages/news/blockchain-scalability-solutions.html' }
        ]
    },
    'web3': {
        keywords: ['web3', 'metaverse', 'dao', 'daos', 'decentralized', 'dapp', 'dapps'],
        articles: [
            { title: 'Web3 and the Metaverse Revolution', url: '/pages/news/web3-and-the-metaverse-revolution.html' },
            { title: 'DAOs Explained', url: '/pages/news/decentralized-autonomous-organizations-explained.html' },
            { title: 'Decentralized Social Media', url: '/pages/news/decentralized-social-media-platforms.html' }
        ]
    },
    'mining': {
        keywords: ['mining', 'miner', 'proof of work', 'pow', 'hashrate', 'asic'],
        articles: [
            { title: 'Cryptocurrency Mining Operations', url: '/pages/news/cryptocurrency-mining-operations.html' },
            { title: 'Mining Pool Collaboration', url: '/pages/news/mining-pool-collaboration.html' },
            { title: 'Blockchain Consensus Mechanisms', url: '/pages/news/blockchain-consensus-mechanisms.html' }
        ]
    },
    'privacy': {
        keywords: ['privacy', 'private', 'anonymous', 'anonymity', 'zero knowledge', 'zk', 'zkp'],
        articles: [
            { title: 'Zero Knowledge Proofs for Privacy', url: '/pages/news/zero-knowledge-proofs-for-privacy.html' },
            { title: 'Blockchain Privacy Technologies', url: '/pages/news/blockchain-privacy-technologies.html' },
            { title: 'Crypto Privacy Regulations', url: '/pages/news/crypto-privacy-regulations.html' }
        ]
    },
    'gaming': {
        keywords: ['gaming', 'game', 'play to earn', 'p2e', 'gamefi', 'metaverse game'],
        articles: [
            { title: 'Blockchain Gaming & Play-to-Earn', url: '/pages/news/blockchain-gaming-and-play-to-earn.html' },
            { title: 'Gaming Guilds Organization', url: '/pages/news/gaming-guilds-organization.html' },
            { title: 'Cross-Game Asset Interoperability', url: '/pages/news/cross-game-asset-interoperability.html' }
        ]
    },
    'stablecoin': {
        keywords: ['stablecoin', 'stablecoins', 'usdt', 'usdc', 'dai', 'peg', 'algorithmic'],
        articles: [
            { title: 'Stablecoin Price Mechanisms', url: '/pages/news/stablecoin-price-mechanisms.html' },
            { title: 'Algorithmic Stablecoin Mechanisms', url: '/pages/news/algorithmic-stablecoin-mechanisms.html' },
            { title: 'Central Bank Digital Currencies', url: '/pages/news/central-bank-digital-currencies.html' }
        ]
    },
    'smart contract': {
        keywords: ['smart contract', 'smart contracts', 'solidity', 'contract', 'automation'],
        articles: [
            { title: 'Smart Contracts & Blockchain Automation', url: '/pages/news/smart-contracts-and-blockchain-automation.html' },
            { title: 'Blockchain Oracles Connecting Data', url: '/pages/news/blockchain-oracles-connecting-data.html' }
        ]
    }
};

if (!API_KEY) {
  console.error('API key missing. Set window.API_KEY in your HTML for local testing.');
}
const headers = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

const payload = {
  model: 'sonar-pro',
  messages: [{ role: 'user', content: 'What were the results of the 2025 French Open Finals?' }]
};

// Try several possible response paths and return first non-empty string
function extractTextFromResponse(data) {
  if (!data) return null;
  // Common response shapes:
  if (typeof data === 'string') return data;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data?.choices?.[0]?.text) return data.choices[0].text;
  if (data?.answer) return data.answer;
  if (data?.result) return data.result;
  if (data?.output) return data.output;
  // fallback: stringify short
  try {
    return JSON.stringify(data).slice(0, 1000); // limit length
  } catch (e) {
    return null;
  }
}

// fetch(apiUrl, {
//   method: 'POST',
//   headers,
//   body: JSON.stringify(payload)
// })
//   .then(r => r.json())
//   .then(data => {
//     const text = extractTextFromResponse(data);
//     if (text) {
//       console.log('reply (text only):', text);
//       // use `text` in your UI instead of the full JSON
//     } else {
//       console.warn('Could not extract text from API response', data);
//     }
//   })
//   .catch(err => console.error(err));

export async function callApi(message){
    // Check cache first
    const cacheKey = message.toLowerCase().trim();
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('Using cached response');
        return cached.response;
    }

    // Preload context data if not already loaded
    const context = await getPreloadedContext();
    
    const prompt = `You are the official AI assistant for UKX Crypto Wallet. You have access to the user's REAL wallet data and portfolio information.

IMPORTANT: The data provided below is the user's ACTUAL wallet data - treat it as real, accurate, and current. When users ask about their holdings, balances, or transactions, respond with specific numbers from this data confidently.

Guidelines:
- Answer questions about the user's crypto wallet directly and confidently
- Use specific numbers from the data (prices, amounts, percentages)
- Do not use tables - provide insights and summaries in plain text
- For specific data points, use bullet lists
- Be concise and helpful
- If asked about a specific coin, provide its current price and any holdings the user has

User's wallet data:
${context}

User question: ${message}`;

    const payload = {
        "model": 'sonar',
        messages: [{
            role: 'user',
            content: prompt
        }],
        "stream": false,
        "max_tokens": 500
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
        if (elapsed > SLOW_RESPONSE_WARNING_MS) {
            console.warn(`Assistant API responded slowly (${Math.round(elapsed)}ms). Possible network congestion or API throttling.`);
        }

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error(`Assistant API error ${response.status}: ${errorBody.slice(0, 200)}`);
        }
        const data = await response.json();
        const text = extractTextFromResponse(data);
         if (text) {
            const cleaned = text
                // Remove citation brackets like [1], [2,3], etc.
                .replace(/(?:\s*\[\s*(?:\d+(?:\s*,\s*\d+)*)\s*\])+/g, '')
                // Remove markdown bold/italic markers (* and **)
                .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
                // Remove remaining stray asterisks
                .replace(/\*/g, '')
                // Remove other common markdown characters
                .replace(/#{1,6}\s*/g, '') // headers
                .replace(/`{1,3}/g, '') // code blocks
                .replace(/~{2}/g, '') // strikethrough
                // Remove common unicode characters
                .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-') // bullets → dash
                .replace(/[\u2018\u2019]/g, "'") // smart quotes → regular
                .replace(/[\u201C\u201D]/g, '"') // smart double quotes
                .replace(/[\u2013\u2014]/g, '-') // en/em dash → hyphen
                .replace(/[\u2026]/g, '...') // ellipsis
                .replace(/[\u00A0]/g, ' ') // non-breaking space
                // Clean up extra whitespace
                .replace(/\s{2,}/g, ' ')
                .trim();
            
            // Cache the response
            responseCache.set(cacheKey, {
                response: cleaned,
                timestamp: Date.now()
            });
            
            // Add coin shortcuts if coins are mentioned
            let finalResponse = await addCoinShortcuts(cleaned, message);
            
            // Add news links if relevant topics are mentioned
            finalResponse = addNewsLinks(finalResponse, message);
            
            return finalResponse;
        } else {
            console.warn('Could not extract text from API response', data);
            return null;
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Assistant request timed out before completion. This can happen with slow networks or overloaded APIs.');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Preload context data once to avoid fetching files with every API call
 */
async function getPreloadedContext() {
    if (preloadedContext) return preloadedContext;
    
    if (contextLoadPromise) return contextLoadPromise;
    
    contextLoadPromise = (async () => {
        try {
            // Fetch all data files in parallel (local fetch is fast)
            const [data24h, data7d, data30d] = await Promise.all([
                fetch('/data/data_24h.json').then(r => r.json()).catch(() => null),
                fetch('/data/data_7d.json').then(r => r.json()).catch(() => null),
                fetch('/data/data_30_days.json').then(r => r.json()).catch(() => null)
            ]);
            
            // Create a condensed summary instead of full JSON
            const summary = createContextSummary(data24h, data7d, data30d);
            preloadedContext = summary;
            return summary;
        } catch (error) {
            console.warn('Failed to preload context data:', error);
            preloadedContext = 'No wallet data available.';
            return preloadedContext;
        }
    })();
    
    return contextLoadPromise;
}

/**
 * Create a condensed summary of wallet data for the AI context
 * Now creates a more structured, token-efficient format
 */
function createContextSummary(data24h, data7d, data30d) {
    const parts = [];
    
    // Create structured summaries instead of raw JSON
    if (data24h) {
        const summary24h = summarizeTimeData(data24h, '24h');
        if (summary24h) parts.push(summary24h);
    }
    if (data7d) {
        const summary7d = summarizeTimeData(data7d, '7d');
        if (summary7d) parts.push(summary7d);
    }
    if (data30d) {
        const summary30d = summarizeTimeData(data30d, '30d');
        if (summary30d) parts.push(summary30d);
    }
    
    return parts.join('\n\n') || 'No wallet data available.';
}

/**
 * Summarize time-based data into a compact format
 */
function summarizeTimeData(data, period) {
    if (!data) return null;
    
    try {
        // If it's an array of price/performance data
        if (Array.isArray(data)) {
            const coins = data.slice(0, 20); // Limit to top 20
            const lines = coins.map(coin => {
                const symbol = coin.symbol || coin.id || 'Unknown';
                const price = coin.current_price || coin.price || 0;
                const change = coin.price_change_percentage_24h || coin.change || 0;
                return `${symbol}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`;
            });
            return `[${period} Market Data]\n${lines.join('\n')}`;
        }
        
        // If it's an object with coin holdings or portfolio data
        if (typeof data === 'object') {
            const entries = Object.entries(data).slice(0, 20);
            const lines = entries.map(([key, value]) => {
                if (typeof value === 'object') {
                    return `${key}: ${JSON.stringify(value).slice(0, 100)}`;
                }
                return `${key}: ${value}`;
            });
            return `[${period} Data]\n${lines.join('\n')}`;
        }
        
        return `[${period}] ${JSON.stringify(data).slice(0, 500)}`;
    } catch (e) {
        return null;
    }
}

/**
 * Preload context on module load for faster first response
 */
getPreloadedContext().catch(() => {});

/**
 * Load coin data for detecting mentions
 */
async function loadCoinData() {
    if (coinDataCache) return coinDataCache;
    
    try {
        const response = await fetch('/data/full_coin_data.json');
        coinDataCache = await response.json();
        return coinDataCache;
    } catch (error) {
        console.warn('Failed to load coin data:', error);
        return {};
    }
}

// Preload coin data
loadCoinData().catch(() => {});

/**
 * Detect coins mentioned in user message and response, add interactive chart previews
 */
async function addCoinShortcuts(response, userMessage) {
    const coinData = await loadCoinData();
    const priceData = await loadPriceData('24h');
    const mentionedCoins = new Set();
    
    // Combine user message and response for detection
    const combinedText = (userMessage + ' ' + response).toLowerCase();
    
    // Check for coin aliases
    for (const [alias, symbol] of Object.entries(COIN_ALIASES)) {
        // Use word boundary matching to avoid partial matches
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(combinedText) && coinData[symbol]) {
            mentionedCoins.add(symbol);
        }
    }
    
    // Also check direct symbol mentions (BTC, ETH, etc.)
    for (const symbol of Object.keys(coinData)) {
        const regex = new RegExp(`\\b${symbol}\\b`, 'i');
        if (regex.test(combinedText)) {
            mentionedCoins.add(symbol);
        }
    }
    
    // If no coins mentioned, return original response
    if (mentionedCoins.size === 0) {
        return response;
    }
    
    // Build coin cards with interactive canvas charts
    const coinCards = [];
    const chartInitializers = [];
    
    for (const symbol of mentionedCoins) {
        const coin = coinData[symbol];
        if (coin) {
            const pageId = coin.coin_page_id !== undefined ? coin.coin_page_id : symbol.toLowerCase();
            const prices = priceData[symbol] || {};
            const priceArray = extractPrices(prices, '24h');
            const priceChange = coin.price_change_24h || 0;
            const changeClass = priceChange >= 0 ? 'positive' : 'negative';
            const changeSign = priceChange >= 0 ? '+' : '';
            
            // Calculate high/low from price data
            const high = priceArray.length > 0 ? Math.max(...priceArray) : coin.current_price;
            const low = priceArray.length > 0 ? Math.min(...priceArray) : coin.current_price;
            
            // Generate unique chart ID
            const chartId = generateChartId();
            chartInitializers.push({ chartId, symbol });
            
            // Format market cap
            const marketCap = coin.market_cap || 0;
            const marketCapFormatted = formatCompactNumber(marketCap);
            
            coinCards.push(
                `<a href="/pages/markets.html" class="coin-card-link" data-destination="markets">` +
                `<div class="coin-preview-card" data-symbol="${symbol}" data-coin-id="${pageId}">` +
                `<div class="coin-preview-header">` +
                `<img src="${coin.img_url}" alt="${symbol}" class="coin-preview-icon">` +
                `<div class="coin-preview-info">` +
                `<span class="coin-preview-symbol">${symbol}</span>` +
                `<span class="coin-preview-name">${coin.coin_name}</span>` +
                `</div>` +
                `<div class="coin-preview-price-main">` +
                `<span class="coin-preview-current">$${formatPriceCompact(coin.current_price)}</span>` +
                `<span class="coin-preview-change ${changeClass}">${changeSign}${priceChange.toFixed(2)}%</span>` +
                `</div>` +
                `</div>` +
                `<div class="coin-preview-chart-container">` +
                `<canvas id="${chartId}" class="coin-preview-canvas"></canvas>` +
                `</div>` +
                `<div class="coin-preview-range">` +
                `<div class="chat-chart-range-item"><span class="chat-chart-label">L:</span><span class="chat-chart-low">$${formatPriceCompact(low)}</span></div>` +
                `<div class="chat-chart-period-btns">` +
                `<button class="chat-chart-btn active" data-period="24h">24h</button>` +
                `<button class="chat-chart-btn" data-period="7d">7d</button>` +
                `<button class="chat-chart-btn" data-period="30d">30d</button>` +
                `</div>` +
                `<div class="chat-chart-range-item"><span class="chat-chart-label">H:</span><span class="chat-chart-high">$${formatPriceCompact(high)}</span></div>` +
                `</div>` +
                `<div class="coin-preview-stats">` +
                `<div class="coin-preview-stat">` +
                `<span class="stat-label">Market Cap</span>` +
                `<span class="stat-value">$${marketCapFormatted}</span>` +
                `</div>` +
                `<div class="coin-preview-stat">` +
                `<span class="stat-label">24h Volume</span>` +
                `<span class="stat-value">$${formatCompactNumber(coin.total_volume || 0)}</span>` +
                `</div>` +
                `</div>` +
                `<div class="coin-preview-action">` +
                `<span>View market →</span>` +
                `</div>` +
                `</div>` +
                `</a>`
            );
        }
    }
    
    // Append coin cards to response
    if (coinCards.length > 0) {
        // Schedule chart initialization after DOM is updated
        setTimeout(() => {
            chartInitializers.forEach(({ chartId, symbol }) => {
                initializeMiniChart(chartId, symbol);
            });
        }, 100);
        
        return response + 
            `<div class="coin-previews-container">` +
            `<div class="coin-previews">${coinCards.join('')}</div>` +
            `</div>`;
    }
    
    return response;
}

/**
 * Format number in compact form (K, M, B, T)
 */
function formatCompactNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

/**
 * Load price data for all periods (24h, 7d, 30d)
 */
let priceDataCache = {
    '24h': null,
    '7d': null,
    '30d': null
};

async function loadPriceData(period = '24h') {
    if (priceDataCache[period]) return priceDataCache[period];
    
    const fileMap = {
        '24h': '/data/data_24h.json',
        '7d': '/data/data_7d.json',
        '30d': '/data/data_30_days.json'
    };
    
    try {
        const response = await fetch(fileMap[period] || fileMap['24h']);
        priceDataCache[period] = await response.json();
        return priceDataCache[period];
    } catch (error) {
        console.warn(`Failed to load ${period} price data:`, error);
        return {};
    }
}

// Preload all periods
Promise.all([
    loadPriceData('24h'),
    loadPriceData('7d'),
    loadPriceData('30d')
]).catch(() => {});

/**
 * Generate unique ID for each chart
 */
let chartIdCounter = 0;
function generateChartId() {
    return `chat-chart-${++chartIdCounter}-${Date.now()}`;
}

/**
 * Draw interactive mini chart on canvas (matches coin-details style)
 */
function drawMiniChart(canvas, prices, lineColor) {
    if (!canvas || prices.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, height);
    
    const margin = { top: 8, right: 8, bottom: 8, left: 8 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    // Calculate points
    const points = prices.map((price, i) => ({
        x: margin.left + (i / (prices.length - 1)) * chartWidth,
        y: margin.top + chartHeight - ((price - min) / range) * chartHeight,
        price
    }));
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, margin.top, 0, height - margin.bottom);
    gradient.addColorStop(0, lineColor + '40');
    gradient.addColorStop(1, lineColor + '05');
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - margin.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - margin.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line with bezier curves
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        
        const tension = 0.15;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Store points for tooltip interaction
    canvas._chartPoints = points;
    canvas._chartMin = min;
    canvas._chartMax = max;
    canvas._lineColor = lineColor;
}

/**
 * Draw tooltip on mini chart
 */
function drawMiniChartTooltip(canvas, index) {
    if (!canvas._chartPoints || index < 0 || index >= canvas._chartPoints.length) return;
    
    const ctx = canvas.getContext('2d');
    const points = canvas._chartPoints;
    const point = points[index];
    const lineColor = canvas._lineColor || '#22c55e';
    
    // Redraw chart
    const prices = points.map(p => p.price);
    drawMiniChart(canvas, prices, lineColor);
    
    // Draw crosshair
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(point.x, 8);
    ctx.lineTo(point.x, canvas.height - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw point
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tooltip box
    const price = formatPriceCompact(point.price);
    const tooltipText = `$${price}`;
    ctx.font = '600 11px JetBrains Mono, monospace';
    const textWidth = ctx.measureText(tooltipText).width;
    const boxWidth = textWidth + 12;
    const boxHeight = 22;
    
    let boxX = point.x - boxWidth / 2;
    let boxY = point.y - boxHeight - 10;
    
    // Keep tooltip in bounds
    if (boxX < 4) boxX = 4;
    if (boxX + boxWidth > canvas.width - 4) boxX = canvas.width - boxWidth - 4;
    if (boxY < 4) boxY = point.y + 10;
    
    // Draw tooltip background with rounded corners (manual for compatibility)
    ctx.fillStyle = 'rgba(30, 32, 36, 0.95)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxHeight, r);
    ctx.arcTo(boxX + boxWidth, boxY + boxHeight, boxX, boxY + boxHeight, r);
    ctx.arcTo(boxX, boxY + boxHeight, boxX, boxY, r);
    ctx.arcTo(boxX, boxY, boxX + boxWidth, boxY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw tooltip text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tooltipText, boxX + boxWidth / 2, boxY + boxHeight / 2);
}

/**
 * Initialize interactive chart after DOM insertion
 */
function initializeMiniChart(chartId, symbol) {
    setTimeout(async () => {
        const canvas = document.getElementById(chartId);
        if (!canvas || canvas.dataset.bound === 'true') return;
        
        const container = canvas.closest('.coin-preview-card');
        if (!container) return;
        canvas.dataset.bound = 'true';
        
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 240;
        canvas.height = rect.height || 80;
        
        const periodBtns = Array.from(container.querySelectorAll('.chat-chart-btn'));
        const savedPeriod = getStoredChartPeriod(symbol);
        const activeBtn = container.querySelector('.chat-chart-btn.active');
        const defaultBtn =
            (savedPeriod && container.querySelector(`.chat-chart-btn[data-period="${savedPeriod}"]`)) ||
            activeBtn ||
            periodBtns[0] ||
            null;
        
        const setActiveButton = (targetBtn) => {
            periodBtns.forEach((btn) => btn.classList.toggle('active', btn === targetBtn));
        };
        
        setActiveButton(defaultBtn);
        let currentPeriod = defaultBtn?.dataset?.period || '24h';
        
        const updateRangeLabels = (series = []) => {
            if (!Array.isArray(series) || series.length === 0) return;
            const min = Math.min(...series);
            const max = Math.max(...series);
            const highEl = container.querySelector('.chat-chart-high');
            const lowEl = container.querySelector('.chat-chart-low');
            if (highEl) highEl.textContent = `$${formatPriceCompact(max)}`;
            if (lowEl) lowEl.textContent = `$${formatPriceCompact(min)}`;
        };
        
        // Load and draw chart
        let priceData = await loadPriceData(currentPeriod);
        let prices = extractPrices(priceData?.[symbol], currentPeriod);
        
        if (prices.length < 2 && currentPeriod !== '24h') {
            currentPeriod = '24h';
            priceData = await loadPriceData(currentPeriod);
            prices = extractPrices(priceData?.[symbol], currentPeriod);
            const fallbackBtn = container.querySelector('.chat-chart-btn[data-period="24h"]');
            if (fallbackBtn) setActiveButton(fallbackBtn);
        }
        
        const coinData = await loadCoinData();
        const coin = coinData[symbol];
        const isUp = coin && (coin.price_change_24h || 0) >= 0;
        const lineColor = isUp ? '#22c55e' : '#ef4444';
        
        if (prices.length >= 2) {
            drawMiniChart(canvas, prices, lineColor);
            updateRangeLabels(prices);
            persistChartPeriod(symbol, currentPeriod);
        }
        
        // Prevent link navigation on canvas interaction
        canvas.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Add mouse interaction for tooltip
        canvas.addEventListener('mousemove', (e) => {
            if (!canvas._chartPoints) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const points = canvas._chartPoints;
            
            // Find closest point
            let closestIndex = -1;
            let minDist = Infinity;
            points.forEach((p, i) => {
                const dist = Math.abs(p.x - mouseX);
                if (dist < minDist && dist < 30) {
                    minDist = dist;
                    closestIndex = i;
                }
            });
            
            if (closestIndex !== -1) {
                canvas.style.cursor = 'crosshair';
                drawMiniChartTooltip(canvas, closestIndex);
            } else {
                canvas.style.cursor = 'default';
                const prices = points.map(p => p.price);
                drawMiniChart(canvas, prices, canvas._lineColor);
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            if (!canvas._chartPoints) return;
            const prices = canvas._chartPoints.map(p => p.price);
            drawMiniChart(canvas, prices, canvas._lineColor);
        });
        
        // Period button handlers - prevent navigation and switch period
        periodBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (btn.classList.contains('active')) return;
                
                setActiveButton(btn);
                
                const period = btn.dataset.period || '24h';
                const data = await loadPriceData(period);
                const newPrices = extractPrices(data?.[symbol], period);
                
                if (newPrices.length >= 2) {
                    drawMiniChart(canvas, newPrices, lineColor);
                    updateRangeLabels(newPrices);
                    persistChartPeriod(symbol, period);
                }
            });
        });
    }, 50);
}

/**
 * Rehydrate coin preview charts that are already in the DOM (e.g., from chat history)
 */
export function rehydrateChatCharts(root = document) {
    const scope = root || document;
    const cards = scope.querySelectorAll('.coin-preview-card[data-symbol]');
    cards.forEach((card) => {
        const symbol = card.dataset.symbol;
        const canvas = card.querySelector('.coin-preview-canvas');
        if (!symbol || !canvas) return;
        initializeMiniChart(canvas.id, symbol);
    });
}

/**
 * Extract prices array from data object based on period
 */
function extractPrices(priceObj, period) {
    if (!priceObj) return [];
    const maxPoints = period === '24h' ? 24 : period === '7d' ? 7 : 30;

    // Arrays are returned directly (coerced to numbers)
    if (Array.isArray(priceObj)) {
        return priceObj
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .slice(0, maxPoints);
    }

    if (typeof priceObj !== 'object') return [];

    // Special handling for 7d data shaped like day0_time0 → average per day
    if (period === '7d') {
        const buckets = new Map();
        Object.entries(priceObj).forEach(([key, value]) => {
            const match = key.match(/day(\d+)_time\d+/);
            if (!match) return;
            const day = Number(match[1]);
            if (!Number.isFinite(day)) return;
            if (!buckets.has(day)) buckets.set(day, []);
            buckets.get(day).push(Number(value));
        });

        const averages = Array.from(buckets.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, values]) => {
                const valid = values.filter((val) => Number.isFinite(val));
                if (valid.length === 0) return null;
                return valid.reduce((sum, val) => sum + val, 0) / valid.length;
            })
            .filter((val) => Number.isFinite(val));

        return averages.slice(0, maxPoints);
    }

    // Generic object: sort by numeric portion of key (day0, 0, 1, 2, …)
    const entries = Object.entries(priceObj)
        .map(([key, value]) => {
            const numericKey = Number(key.toString().replace(/[^\\d.]/g, ''));
            return { numericKey, value: Number(value) };
        })
        .filter((entry) => Number.isFinite(entry.numericKey) && Number.isFinite(entry.value))
        .sort((a, b) => a.numericKey - b.numericKey)
        .slice(0, maxPoints);

    return entries.map((entry) => entry.value);
}

/**
 * Format price in compact form
 */
function formatPriceCompact(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (price >= 1) {
        return price.toFixed(2);
    } else {
        return price.toFixed(4);
    }
}

/**
 * Detect news-related topics and add relevant article links
 */
function addNewsLinks(response, userMessage) {
    const combinedText = (userMessage + ' ' + response).toLowerCase();
    const matchedCategories = new Set();
    
    // Check if user is asking about news
    const newsKeywords = ['news', 'article', 'learn', 'read', 'what is', 'how does', 'explain', 'tell me about', 'information'];
    const isNewsQuery = newsKeywords.some(kw => combinedText.includes(kw));
    
    // Find matching categories
    for (const [category, data] of Object.entries(NEWS_CATEGORIES)) {
        for (const keyword of data.keywords) {
            if (combinedText.includes(keyword)) {
                matchedCategories.add(category);
                break;
            }
        }
    }
    
    // If no matches or not a news query, return original
    if (matchedCategories.size === 0) {
        return response;
    }
    
    // Build article links
    const articleLinks = [];
    for (const category of matchedCategories) {
        const articles = NEWS_CATEGORIES[category].articles.slice(0, 2); // Max 2 per category
        articleLinks.push(...articles);
    }
    
    // Limit to 4 articles total
    const limitedArticles = articleLinks.slice(0, 4);
    
    if (limitedArticles.length === 0) {
        return response;
    }
    
    // Build HTML
    const articlesHtml = limitedArticles.map(article => 
        `<a href="${article.url}" class="news-link-item">` +
        `<span class="news-link-icon">📰</span>` +
        `<span class="news-link-title">${article.title}</span>` +
        `<span class="news-link-arrow">→</span>` +
        `</a>`
    ).join('');
    
    return response + 
        `<div class="news-links-container">` +
        `<div class="news-links-header">` +
        `<span class="news-links-label">📚 Related Articles</span>` +
        `<a href="/pages/news.html" class="news-links-all">View all news →</a>` +
        `</div>` +
        `<div class="news-links">${articlesHtml}</div>` +
        `</div>`;
}
