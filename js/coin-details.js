import { jsonFileParser } from "/modules/json/jsonFileParser.js";

const searchParam = new URLSearchParams(window.location.search);
const coinIdParam = searchParam.get('coin_id');
const coinId = coinIdParam !== null ? Number.parseInt(coinIdParam, 10) : null;
// console.log('Coin ID from URL:', coinId);
if (coinId !== null && !isNaN(coinId)) {
    loadCoinDetails(coinId);
}

async function loadCoinDetails(coinId) {
    try {
        let coinsData = await jsonFileParser('/data/full_coin_data.json');
        const coinsPerformance = await jsonFileParser('/data/coin_performance_data.json');
        const data_7d = await jsonFileParser('/data/data_7d.json');
        const data_24h = await jsonFileParser('/data/data_24h.json');
        const data_30d = await jsonFileParser('/data/data_30_days.json');

        coinsData = coinsData[0];
        for (const [symbol, data] of Object.entries(coinsData)) {
            // console.log('Checking coin:', symbol, data.coin_page_id);
            // console.log(typeof data.coin_page_id, typeof coinId);
            if (data.coin_page_id === coinId) {
                const performance = coinsPerformance.find(coin => coin.symbol === symbol) || {};
                const perf_7d = data_7d.find(coin => coin.symbol === symbol) || {};
                const perf_24h = data_24h.find(coin => coin.symbol === symbol) || {};
                const perf_30d = data_30d.find(coin => coin.symbol === symbol) || {};
                console.log('Coin Details:', {
                    ...data,
                    ...performance,
                    ...perf_7d,
                    ...perf_24h,
                    ...perf_30d
                });
                break;
            }
        }
    } catch (error) {
        console.error('Error loading coin details:', error);
    }
}