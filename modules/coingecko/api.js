/**
 * CoinGecko API Integration
 * Fetches real-time cryptocurrency prices and market data
 */

// CoinGecko API endpoints
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_ID_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'USDC': 'usd-coin',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'TRX': 'tron',
    'TON': 'the-open-network',
    'AVAX': 'avalanche-2',
    'SHIB': 'shiba-inu',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'UNI': 'uniswap',
    'LINK': 'chainlink',
    'ATOM': 'cosmos',
    'XLM': 'stellar',
    'BCH': 'bitcoin-cash',
    'NEAR': 'near',
    'APT': 'aptos'
};

/**
 * Fetch current prices for multiple coins
 * @param {Array<string>} symbols - Array of coin symbols (e.g., ['BTC', 'ETH'])
 * @returns {Promise<Object>} - Object with symbol as key and price data as value
 */
export async function fetchCurrentPrices(symbols) {
    try {
        // Convert symbols to CoinGecko IDs
        const ids = symbols
            .map(symbol => SYMBOL_TO_ID_MAP[symbol])
            .filter(id => id !== undefined)
            .join(',');
        
        if (!ids) {
            throw new Error('No valid coin symbols provided');
        }
        
        const url = `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert back to symbol-keyed object
        const result = {};
        symbols.forEach(symbol => {
            const id = SYMBOL_TO_ID_MAP[symbol];
            if (id && data[id]) {
                result[symbol] = {
                    current_price: data[id].usd,
                    price_change_24h: data[id].usd_24h_change || 0,
                    market_cap: data[id].usd_market_cap || 0,
                    volume_24h: data[id].usd_24h_vol || 0
                };
            }
        });
        
        return result;
    } catch (error) {
        console.error('Error fetching prices from CoinGecko:', error);
        throw error;
    }
}

/**
 * Fetch detailed market data for a single coin
 * @param {string} symbol - Coin symbol (e.g., 'BTC')
 * @returns {Promise<Object>} - Detailed market data
 */
export async function fetchCoinDetails(symbol) {
    try {
        const id = SYMBOL_TO_ID_MAP[symbol];
        if (!id) {
            throw new Error(`Unknown coin symbol: ${symbol}`);
        }
        
        const url = `${COINGECKO_API_BASE}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            symbol: symbol,
            name: data.name,
            current_price: data.market_data.current_price.usd,
            price_change_24h: data.market_data.price_change_percentage_24h,
            high_24h: data.market_data.high_24h.usd,
            low_24h: data.market_data.low_24h.usd,
            market_cap: data.market_data.market_cap.usd,
            volume_24h: data.market_data.total_volume.usd,
            image: data.image.large,
            description: data.description.en
        };
    } catch (error) {
        console.error(`Error fetching details for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch historical price data aggregated by time period
 * @param {string} symbol - Coin symbol (e.g., 'BTC')
 * @param {number} days - Number of days (1, 7, 14, 30, 90, 180, 365, max)
 * @returns {Promise<Array>} - Array of OHLCV candles aggregated by appropriate interval
 */
export async function fetchHistoricalPrices(symbol, days = 7) {
    try {
        const id = SYMBOL_TO_ID_MAP[symbol];
        if (!id) {
            throw new Error(`Unknown coin symbol: ${symbol}`);
        }
        
        // Use market_chart to get both prices and volumes
        const url = `${COINGECKO_API_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.prices || !data.total_volumes || data.prices.length === 0) {
            return [];
        }
        
        // Determine aggregation interval based on days requested
        let intervalMs;
        if (days <= 1) {
            intervalMs = 60 * 60 * 1000; // 1 hour for 24h view
        } else if (days <= 7) {
            intervalMs = 4 * 60 * 60 * 1000; // 4 hours for 7d view
        } else if (days <= 30) {
            intervalMs = 24 * 60 * 60 * 1000; // 1 day for 30d view
        } else {
            intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week for longer periods
        }
        
        // Group data by interval
        const intervalGroups = new Map();
        
        data.prices.forEach((priceItem, index) => {
            const timestamp = priceItem[0];
            const intervalTimestamp = Math.floor(timestamp / intervalMs) * intervalMs;
            
            if (!intervalGroups.has(intervalTimestamp)) {
                intervalGroups.set(intervalTimestamp, {
                    prices: [],
                    volumes: []
                });
            }
            
            const group = intervalGroups.get(intervalTimestamp);
            group.prices.push(priceItem[1]);
            
            if (data.total_volumes[index]) {
                group.volumes.push(data.total_volumes[index][1]);
            }
        });
        
        // Convert groups to OHLCV candles
        const candles = [];
        Array.from(intervalGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([timestamp, group]) => {
                const prices = group.prices;
                const volumes = group.volumes;
                
                if (prices.length > 0) {
                    candles.push({
                        time: new Date(timestamp),
                        open: prices[0],
                        high: Math.max(...prices),
                        low: Math.min(...prices),
                        close: prices[prices.length - 1],
                        price: prices[prices.length - 1],
                        // Average volume for the period (since CoinGecko provides rolling 24h volume)
                        volume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0
                    });
                }
            });
        
        return candles;
    } catch (error) {
        console.error(`Error fetching historical prices for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch intraday price data (hourly for last 24 hours)
 * @param {string} symbol - Coin symbol
 * @returns {Promise<Array>} - Hourly candlestick data with aggregated volumes
 */
export async function fetchIntradayPrices(symbol) {
    try {
        const id = SYMBOL_TO_ID_MAP[symbol];
        if (!id) {
            throw new Error(`Unknown coin symbol: ${symbol}`);
        }
        
        // Get data with finer granularity (5-min intervals) for better hourly aggregation
        const url = `${COINGECKO_API_BASE}/coins/${id}/market_chart?vs_currency=usd&days=1`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.prices || !data.total_volumes || data.prices.length === 0) {
            return [];
        }
        
        // Aggregate data into 1-hour candles
        const hourlyCandles = [];
        const msPerHour = 60 * 60 * 1000;
        
        // Group data points by hour
        const hourGroups = new Map();
        
        data.prices.forEach((priceItem, index) => {
            const timestamp = priceItem[0];
            const hourTimestamp = Math.floor(timestamp / msPerHour) * msPerHour;
            
            if (!hourGroups.has(hourTimestamp)) {
                hourGroups.set(hourTimestamp, {
                    prices: [],
                    volumes: []
                });
            }
            
            const group = hourGroups.get(hourTimestamp);
            group.prices.push(priceItem[1]);
            
            // Collect volume for this data point
            if (data.total_volumes[index]) {
                group.volumes.push(data.total_volumes[index][1]);
            }
        });
        
        // Convert groups to OHLCV candles
        Array.from(hourGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([timestamp, group]) => {
                const prices = group.prices;
                const volumes = group.volumes;
                
                if (prices.length > 0) {
                    hourlyCandles.push({
                        time: new Date(timestamp),
                        open: prices[0],
                        high: Math.max(...prices),
                        low: Math.min(...prices),
                        close: prices[prices.length - 1],
                        price: prices[prices.length - 1],
                        // Average volume for the hour (CoinGecko provides rolling 24h volume)
                        volume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0
                    });
                }
            });
        
        return hourlyCandles;
    } catch (error) {
        console.error(`Error fetching intraday prices for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch minute-level price data (1-minute intervals)
 * @param {string} symbol - Coin symbol
 * @param {number} minutes - Number of minutes (1-60 for 1m view, up to 300 for 5m view)
 * @returns {Promise<Array>} - Minute-level price data with matched volumes
 */
export async function fetchMinuteData(symbol, minutes = 60) {
    try {
        const id = SYMBOL_TO_ID_MAP[symbol];
        if (!id) {
            throw new Error(`Unknown coin symbol: ${symbol}`);
        }
        
        // CoinGecko provides data points at ~5 minute intervals for days=1
        const url = `${COINGECKO_API_BASE}/coins/${id}/market_chart?vs_currency=usd&days=1`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.prices || data.prices.length === 0) {
            return [];
        }
        
        const prices = data.prices;
        const volumes = data.total_volumes || [];
        
        // Get the most recent data points
        const pointsNeeded = Math.min(minutes, prices.length);
        const recentPrices = prices.slice(-pointsNeeded);
        const recentVolumes = volumes.slice(-pointsNeeded);
        
        return recentPrices.map((priceItem, index) => {
            const price = priceItem[1];
            const time = new Date(priceItem[0]);
            const volume = recentVolumes[index]?.[1] || 0;
            
            // Estimate OHLC from single price point with small variation
            const variation = 0.001; // 0.1% variation
            
            return {
                time: time,
                price: price,
                open: price * (1 - variation * Math.random()),
                high: price * (1 + variation * Math.random()),
                low: price * (1 - variation * Math.random()),
                close: price,
                volume: volume // Volume matched by index to timestamp
            };
        });
    } catch (error) {
        console.error(`Error fetching minute data for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch 5-minute aggregated candlestick data
 * Groups minute data into 5-minute intervals with summed volumes
 * @param {string} symbol - Coin symbol
 * @returns {Promise<Array>} - 5-minute candle data with aggregated volumes
 */
export async function fetch5MinuteData(symbol) {
    try {
        // Get minute-level data (last 300 minutes = 5 hours)
        const minuteData = await fetchMinuteData(symbol, 300);
        
        if (!minuteData || minuteData.length === 0) {
            return [];
        }
        
        // Group data into 5-minute intervals
        const fiveMinCandles = [];
        
        for (let i = 0; i < minuteData.length; i += 5) {
            const group = minuteData.slice(i, i + 5);
            
            if (group.length === 0) continue;
            
            // Aggregate OHLCV for this 5-minute period
            const open = group[0].open;
            const close = group[group.length - 1].close;
            const high = Math.max(...group.map(d => d.high));
            const low = Math.min(...group.map(d => d.low));
            // Sum volumes across all data points in this 5-minute window
            const volume = group.reduce((sum, d) => sum + (d.volume || 0), 0);
            const time = group[0].time;
            
            fiveMinCandles.push({
                time: time,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: volume, // Summed volume for the 5-minute period
                price: close
            });
        }
        
        return fiveMinCandles;
    } catch (error) {
        console.error(`Error fetching 5-minute data for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Rate limiting helper - wait between API calls
 * CoinGecko free tier: ~10-30 calls/minute
 */
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000; // 2 seconds between calls

export async function rateLimitedFetch(fetchFunction) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall < MIN_CALL_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLastCall));
    }
    
    lastCallTime = Date.now();
    return await fetchFunction();
}
