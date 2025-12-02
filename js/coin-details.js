import { jsonFileParser } from "/modules/json/jsonFileParser.js";
import { drawLineGraph } from "/modules/graphjs/line.js";
import { fetchCoinDetails } from "/modules/coingecko/api.js";

const DEFAULT_COIN_ID = 0;

let view = {}; // cached DOM elements populated by cacheDom()
let chartState = {
    period: "24h",
    datasets: {}
};
const coinState = {
    symbol: null,
    details: null,
    liveData: null,
    performance: null,
    basePriceUSD: 0,
    priceChange24h: null
};
const SKELETON_SELECTORS = [
    '[data-skeleton="coin-hero"]',
    '[data-skeleton="coin-chart"]',
    '[data-skeleton="coin-stats"]',
    '[data-skeleton="coin-converter"]',
    '[data-skeleton="coin-about"]',
    '[data-skeleton="coin-performance"]',
    '[data-skeleton="coin-tags"]',
    '[data-skeleton="coin-news"]'
];

// Re-render currency-dependent UI when the user preference changes elsewhere.
window.addEventListener("preferredCurrencyChange", handleCurrencyPreferenceChange);

document.addEventListener("DOMContentLoaded", () => {
    // Cache frequently-used DOM nodes, setup UI interactions and load the coin.
    view = cacheDom();
    bindTabScroll();
    observeThemeChanges();
    // Determine coin id from query string; fallback to DEFAULT_COIN_ID.
    const coinId = getCoinIdFromQuery() ?? DEFAULT_COIN_ID;
    loadCoinDetails(coinId);
});

function handleCurrencyPreferenceChange() {
    // Called when the app's preferred currency changes; re-render parts that rely on conversion.
    if (!coinState.symbol) return;
    renderOverview(coinState.symbol, coinState.details, coinState.liveData);
    renderStats(coinState.details, coinState.performance, coinState.liveData);
    setupConverter(coinState.basePriceUSD, coinState.symbol);
    drawChart();
}

function cacheDom() {
    // Return a map of DOM elements used by this module. Centralizing queries reduces redundant lookups.
    return {
        loader: document.getElementById("coinLoader"),
        error: document.getElementById("coinError"),
        coinName: document.getElementById("coinName"),
        coinSymbol: document.getElementById("coinSymbol"),
        coinBreadcrumb: document.getElementById("coinBreadcrumb"),
        coinIcon: document.getElementById("coinIcon"),
        coinPrice: document.getElementById("coinPrice"),
        coinChange: document.getElementById("coinChange"),
        coinHigh: document.getElementById("coinHigh"),
        coinLow: document.getElementById("coinLow"),
        chartTitle: document.getElementById("chartTitle"),
        chartCurrencyBtn: document.getElementById("chartCurrencyBtn"),
        chartButtons: document.querySelectorAll(".chart-period-btn"),
        coinLastUpdated: document.getElementById("coinLastUpdated"),
        statsMarketCap: document.getElementById("coinMarketCap"),
        statsSupply: document.getElementById("coinStatSupply"),
        statsAth: document.getElementById("coinStatAth"),
        statsVolume: document.getElementById("coinStatVolume"),
        statsNote: document.getElementById("coinPerformanceNote"),
        description: document.getElementById("coinDescription"),
        tags: document.getElementById("coinTags"),
        performanceSummary: document.getElementById("coinPerformanceSummary"),
        performanceGrid: document.getElementById("coinPerformanceGrid"),
        newsList: document.getElementById("coinNewsList"),
        converterCoinInput: document.getElementById("converterCoinInput"),
        converterFiatInput: document.getElementById("converterFiatInput"),
        converterSwap: document.getElementById("converterSwap"),
        converterCoinLabel: document.getElementById("converterCoinLabel"),
        converterCoinIcon: document.getElementById("converterCoinIcon"),
        converterFiatIcon: document.getElementById("converterFiatIcon"),
        converterFiatLabel: document.getElementById("converterFiatLabelValue"),
        converterFiatCode: document.getElementById("converterFiatCode"),
        tabs: document.querySelectorAll(".coin-tab")
    };
}

/*
  loadCoinDetails
  - Loads local JSON files for coin data, historical series and articles.
  - Attempts to fetch live data for the requested coin symbol. If the fetch fails,
    the page will gracefully fall back to local data.
  - Prepares chart datasets and binds UI controls.
*/
async function loadCoinDetails(coinId) {
    setLoading(true);
    setSkeletonState(true);
    hideError();

    try {
        // full_coin_data.json maps coin symbols to metadata including coin_page_id
        const fullCoinResponse = await jsonFileParser("/data/full_coin_data.json");
        const coins = fullCoinResponse[0] || {};

        // Find the entry whose coin_page_id matches the requested coinId
        let selectedEntry = Object.entries(coins).find(([, coin]) => coin.coin_page_id === coinId);
        if (!selectedEntry) {
            // Fallback to first coin in dataset if none matches
            selectedEntry = Object.entries(coins)[0];
        }

        if (!selectedEntry) {
            throw new Error("Unable to find any coin data.");
        }

        const [symbol, details] = selectedEntry;

        // Parallel load of performance, historical series, articles and live API data
        const [
            performanceData,
            sevenDayResponse,
            twentyFourResponse,
            thirtyDayResponse,
            articleData,
            liveData
        ] = await Promise.all([
            jsonFileParser("/data/coin_performance_data.json"),
            jsonFileParser("/data/data_7d.json"),
            jsonFileParser("/data/data_24h.json"),
            jsonFileParser("/data/data_30_days.json"),
            jsonFileParser("/data/article_data.json"),
            // fetchCoinDetails could fail (e.g. offline); catch and return null to continue gracefully
            fetchCoinDetails(symbol).catch((error) => {
                console.warn(`Unable to fetch live data for ${symbol}`, error);
                return null;
            })
        ]);

        // The JSON parsers return arrays (file content is wrapped) so we guard-access [0]
        const sevenDay = sevenDayResponse[0] || {};
        const twentyFour = twentyFourResponse[0] || {};
        const thirtyDay = thirtyDayResponse[0] || {};
        const articles = Array.isArray(articleData) ? articleData : [];

        // Find performance metadata record for this symbol if present
        const performance = performanceData.find(
            (record) => record.coin === symbol || record.symbol === symbol
        ) || null;

        // Update module state
        coinState.symbol = symbol;
        const safeDetails = details || {};
        coinState.details = safeDetails;
        coinState.liveData = liveData;
        coinState.performance = performance;
        // Prefer live current_price, else fallback to details.current_price, else 0
        coinState.basePriceUSD =
            liveData?.current_price ?? safeDetails.current_price ?? 0;

        // Render all sections using the available data (liveData takes precedence where present)
        renderOverview(symbol, safeDetails, liveData);
        renderStats(safeDetails, performance, liveData);
        renderDescription(liveData?.description || safeDetails.description);
        renderTags(safeDetails.categories);
        renderPerformance(performance);
        renderNews(articles, safeDetails.categories);
        setupConverter(coinState.basePriceUSD, symbol);

        // Prepare chart datasets from the JSON series for the symbol
        prepareChartDatasets({
            "24h": twentyFour[symbol],
            "7d": sevenDay[symbol],
            "30d": thirtyDay[symbol]
        });
        bindChartControls();
        drawChart();

        // Update page title to include the coin name
        document.title = `UKX - ${(liveData?.name || safeDetails.coin_name || symbol)} price`;
    } catch (error) {
        console.error("Error loading coin details:", error);
        showError("We could not load this coin right now. Please try again in a minute.");
    } finally {
        await finalizeLoadingState();
    }
}

/*
  Render helpers
  - Each function below updates parts of the page based on the data provided.
  - Functions expect that the 'view' map has been populated by cacheDom().
*/

function renderOverview(symbol, details, liveData) {
    if (!details && !liveData) return;

    // Prefer values from liveData (fresh API) but fall back to static details
    const coinName = liveData?.name || details?.coin_name || symbol;
    const iconUrl = liveData?.image || details?.img_url || "/assets/crypto-default.png";
    // Prefer live API values when available; fall back to bundled dataset to stay resilient offline.
    const currentPrice = liveData?.current_price ?? details?.current_price ?? 0;
    const priceChange = liveData?.price_change_24h ?? details?.price_change_24h ?? 0;
    const high24h = liveData?.high_24h ?? details?.high_24h ?? currentPrice;
    const low24h = liveData?.low_24h ?? details?.low_24h ?? currentPrice;

    if (view.coinName) {
        view.coinName.textContent = coinName;
    }
    if (view.coinSymbol) {
        view.coinSymbol.textContent = symbol;
    }
    if (view.coinBreadcrumb) {
        view.coinBreadcrumb.textContent = coinName;
    }

    // Icon updates for both header and converter
    if (view.coinIcon) {
        view.coinIcon.src = iconUrl;
        view.coinIcon.alt = `${coinName} logo`;
    }
    if (view.converterCoinIcon) {
        view.converterCoinIcon.src = iconUrl;
        view.converterCoinIcon.alt = `${coinName} icon`;
    }

    // Update base price used by converter
    coinState.basePriceUSD = currentPrice;
    coinState.priceChange24h = Number.isFinite(Number(priceChange))
        ? Number(priceChange)
        : null;
    view.coinPrice.textContent = formatCurrency(currentPrice);
    updateChangeBadge(view.coinChange, priceChange);
    
    if (view.coinHigh) {
        view.coinHigh.textContent = formatCurrency(high24h);
    }
    if (view.coinLow) {
        view.coinLow.textContent = formatCurrency(low24h);
    }

    // Update last-updated label; use liveData last_updated when available
    if (view.coinLastUpdated) {
        const timestamp = liveData?.last_updated ? new Date(liveData.last_updated) : new Date();
        view.coinLastUpdated.textContent = `Updated ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    
    // Chart title and currency button reflect current currency meta
    if (view.chartTitle) {
        const currencyMeta = getCurrencyMeta();
        view.chartTitle.textContent = `${coinName} price in ${currencyMeta.code}`;
        if (view.chartCurrencyBtn) {
            view.chartCurrencyBtn.textContent = currencyMeta.code;
            view.chartCurrencyBtn.setAttribute(
                "aria-label",
                `${currencyMeta.label} selected`
            );
        }
    }
}

function renderStats(details, performance, liveData) {
    if (!details && !liveData) return;

    // Market cap — prefer local dataset to stay in sync with markets table; show rank from live when present
    const marketCapValue = details?.market_cap ?? liveData?.market_cap;
    const marketCapRank = liveData?.market_cap_rank;
    if (view.statsMarketCap) {
        view.statsMarketCap.textContent = formatCompactCurrency(marketCapValue);
        if (Number.isFinite(marketCapRank)) {
            const rankBadge = document.createElement("span");
            rankBadge.className = "coin-stat-rank";
            rankBadge.textContent = `#${marketCapRank}`;
            view.statsMarketCap.appendChild(rankBadge);
        }
    }

    // Supply (current / max) displayed compactly
    if (view.statsSupply) {
        view.statsSupply.textContent = formatSupplyValue(
            details?.circulating_supply ?? liveData?.circulating_supply,
            details?.max_supply ?? liveData?.max_supply
        );
    }

    // All-time-high (ath) fallback if missing
    if (view.statsAth) {
        const athValue = details?.high_24h ?? liveData?.ath;
        view.statsAth.textContent = Number.isFinite(athValue) ? formatCurrency(athValue) : "—";
    }

    // Volume uses local data first to mirror markets, with live fallback
    if (view.statsVolume) {
        const volumeValue =
            details?.total_volume ??
            details?.volume_24h ??
            liveData?.volume_24h ??
            liveData?.total_volume;
        view.statsVolume.textContent = volumeValue ? formatCompactCurrency(volumeValue) : "—";
    }

    // Short performance note or fallback text
    if (view.statsNote) {
        view.statsNote.textContent = performance?.performance || "Watching market momentum";
    }
}

function renderDescription(description = "") {
    if (!view.description) return;
    // Remove HTML and normalize whitespace for safe display
    const cleaned = sanitizeDescription(description);
    view.description.textContent = cleaned || "No description provided for this asset.";
}

function renderTags(categories = []) {
    // Render up to 12 categories as small chips. If none, show "General".
    view.tags.innerHTML = "";
    if (!Array.isArray(categories) || categories.length === 0) {
        const chip = document.createElement("span");
        chip.className = "coin-tag";
        chip.textContent = "General";
        view.tags.appendChild(chip);
        return;
    }

    const fragment = document.createDocumentFragment();
    categories.slice(0, 12).forEach((category) => {
        const tag = document.createElement("span");
        tag.className = "coin-tag";
        tag.textContent = category;
        fragment.appendChild(tag);
    });
    view.tags.appendChild(fragment);
}

function renderPerformance(performance) {
    // Renders a small grid showing the performance across several timeframes.
    if (!performance) {
        view.performanceSummary.textContent = "No historical comparison available.";
        view.performanceGrid.innerHTML = "";
        return;
    }

    view.performanceSummary.textContent = performance.performance || "Stable performance.";

    const timeframes = [
        { key: "past_year", label: "Past year" },
        { key: "3_months", label: "3 months" },
        { key: "30_days", label: "30 days" },
        { key: "7_days", label: "7 days" }
    ];

    view.performanceGrid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    timeframes.forEach(({ key, label }) => {
        const frame = performance[key];
        if (!frame) return;

        // Build a compact performance item; classes indicate positive/negative styling
        const item = document.createElement("div");
        item.className = "coin-performance-item";
        item.innerHTML = `
            <h3>${label}</h3>
            <div class="value">${frame.value || "—"}</div>
            <div class="change ${frame.percentage >= 0 ? "positive" : "negative"}">
                ${formatPercent(frame.percentage)}
            </div>
        `;
        fragment.appendChild(item);
    });

    view.performanceGrid.appendChild(fragment);
}

function renderNews(articles, categories = []) {
    // Show up to 3 most relevant articles. Relevance is based on tag matches and recency.
    view.newsList.innerHTML = "";
    if (!Array.isArray(articles) || articles.length === 0) {
        view.newsList.innerHTML = `<p class="muted">No news to show yet.</p>`;
        return;
    }

    // Create a set of category tags to match against article tags (case-insensitive)
    const normalizedTags = new Set(
        (categories || []).map((tag) => tag.toLowerCase())
    );

    const enriched = articles
        .map((article) => {
            const matches = (article.tags || []).filter((tag) =>
                normalizedTags.has(tag.toLowerCase())
            ).length;
            return {
                ...article,
                matches,
                dateValue: Number(new Date(article.date))
            };
        })
        .sort((a, b) => {
            // Sort primarily by number of matches, then by date (newer first)
            if (b.matches === a.matches) {
                return b.dateValue - a.dateValue;
            }
            return b.matches - a.matches;
        })
        .slice(0, 3);

    const fragment = document.createDocumentFragment();
    enriched.forEach((article) => {
        const item = document.createElement("article");
        item.className = "coin-news-card-item";
        item.innerHTML = `
            <span class="muted">${formatDate(article.date)}</span>
            <h3>${article.title}</h3>
            <p class="muted">by ${article.author}</p>
            <a href="/pages/news/${article.filename}">Read</a>
        `;
        fragment.appendChild(item);
    });

    view.newsList.appendChild(fragment);
}

/*
  Converter setup
  - Simple two-input converter between 1 coin unit and selected fiat currency.
  - Uses window.UKXCurrency.convertCurrency when available to convert base USD price to selected fiat.
  - Keeps inputs synchronized (coin -> fiat and fiat -> coin).
*/
function setupConverter(priceUSD, symbol) {
    if (!view.converterCoinInput || !view.converterFiatInput) return;

    const basePrice = Number.isFinite(Number(priceUSD)) ? Number(priceUSD) : 0;
    const currencyMeta = getCurrencyMeta();
    const localizedBasePrice =
        window.UKXCurrency?.convertCurrency?.(
            basePrice,
            "USD",
            currencyMeta.code
        ) ?? basePrice;

    if (view.converterCoinLabel) {
        view.converterCoinLabel.textContent = symbol;
    }
    if (view.converterFiatLabel) {
        view.converterFiatLabel.textContent = currencyMeta.code;
    }
    if (view.converterFiatCode) {
        view.converterFiatCode.textContent = currencyMeta.code;
    }
    if (view.converterFiatIcon) {
        view.converterFiatIcon.textContent = currencyMeta.flag || "";
        view.converterFiatIcon.setAttribute("aria-label", currencyMeta.label);
    }

    // Default converter starts with 1 coin
    view.converterCoinInput.value = "1";
    view.converterFiatInput.value = formatInput(localizedBasePrice);

    let syncing = false; // guard to avoid infinite update loops

    const updateFiat = () => {
        if (syncing) return;
        syncing = true;
        const coinValue = parseFloat(view.converterCoinInput.value) || 0;
        view.converterFiatInput.value = formatInput(
            coinValue * localizedBasePrice
        );
        syncing = false;
    };

    const updateCoin = () => {
        if (syncing) return;
        syncing = true;
        const fiatValue = parseFloat(view.converterFiatInput.value) || 0;
        view.converterCoinInput.value = formatInput(
            fiatValue / (localizedBasePrice || 1),
            6
        );
        syncing = false;
    };

    view.converterCoinInput.oninput = updateFiat;
    view.converterFiatInput.oninput = updateCoin;
    view.converterSwap.onclick = () => {
        // Swap values between coin and fiat inputs (note: swap does not change which currency is displayed)
        const coinValue = parseFloat(view.converterCoinInput.value) || 0;
        const fiatValue = parseFloat(view.converterFiatInput.value) || 0;
        view.converterCoinInput.value = formatInput(
            fiatValue / (localizedBasePrice || 1),
            6
        );
        view.converterFiatInput.value = formatInput(
            coinValue * localizedBasePrice
        );
    };

    updateFiat();
}

/*
  Chart data preparation and rendering
  - The JSON historical data is converted into series objects with arrays x[] and y[].
  - localizeDataset will convert USD values to the user's preferred currency when unit === "currency".
*/
function prepareChartDatasets(sources) {
    chartState.datasets = {
        "24h": {
            ...buildSeriesFromObject(sources["24h"], formatHourLabel),
            unit: "currency"
        },
        "7d": {
            ...buildSeriesFromSevenDay(sources["7d"]),
            unit: "currency"
        },
        "30d": {
            ...buildSeriesFromObject(sources["30d"], formatSequentialLabel),
            unit: "number"
        }
    };
    // Ensure selected period exists, otherwise default to 24h
    if (!chartState.datasets[chartState.period]) {
        chartState.period = "24h";
    }
}

function localizeDataset(dataset) {
    // Convert dataset y-values from USD to preferred currency using global UKXCurrency manager if available.
    if (!dataset) return dataset;
    if (dataset.unit !== "currency") {
        return { ...dataset };
    }
    const currencyMeta = getCurrencyMeta();
    const converter = window.UKXCurrency?.convertCurrency;
    const convertedValues = Array.isArray(dataset.y)
        ? dataset.y.map((value) => {
              const numeric = Number(value);
              if (!Number.isFinite(numeric)) return 0;
              if (typeof converter === "function") {
                  return converter(numeric, "USD", currencyMeta.code);
              }
              return numeric;
          })
        : [];
    return {
        ...dataset,
        y: convertedValues,
        currency: currencyMeta.code
    };
}

function drawChart() {
    // Get the dataset for the currently selected period, localize values and draw with drawLineGraph()
    const dataset = chartState.datasets[chartState.period];
    if (!dataset) return;

    const localizedDataset = localizeDataset(dataset);
    const trendIsPositive = Number.isFinite(coinState.priceChange24h)
        ? coinState.priceChange24h >= 0
        : isPositiveTrend(localizedDataset);
    const theme = getChartTheme(trendIsPositive);

    drawLineGraph("coinPriceChart", localizedDataset, theme);
}

function bindChartControls() {
    // Attach click handlers to chart period buttons (24h/7d/30d).
    view.chartButtons.forEach((button) => {
        if (button.dataset.bound === "true") return; // avoid double-binding
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            if (button.classList.contains("active")) return;
            view.chartButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
            chartState.period = button.dataset.period;
            drawChart();
        });
    });
}

function bindTabScroll() {
    // Bind action to coin-tab elements that smooth-scroll to a page section.
    const tabs = view.tabs ? Array.from(view.tabs) : [];
    tabs.forEach((button) => {
        const target = button?.dataset?.scroll;
        if (!target) return;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            tabs.forEach((tab) => tab.classList.remove("active"));
            button.classList.add("active");
            const destination = document.querySelector(target);
            if (destination) {
                scrollToSection(destination);
            }
        });
    });
}

/*
  Series builders
  - buildSeriesFromObject: takes a mapping of keys -> values, sorts numeric-like keys and returns x,y arrays
  - buildSeriesFromSevenDay: groups readings keyed by "day{n}_time{m}" and averages per day
*/
function buildSeriesFromObject(obj = {}, labelFn = (v) => v) {
    const entries = Object.entries(obj || {}).sort(
        ([a], [b]) => parseNumericKey(a) - parseNumericKey(b)
    );
    const x = [];
    const y = [];
    entries.forEach(([key, value], index) => {
        x.push(labelFn(key, index, entries.length));
        y.push(Number(value));
    });
    return { x, y };
}

function buildSeriesFromSevenDay(obj = {}) {
    // Some datasets record values for day/time buckets like "day0_time3". We average by day index.
    const buckets = new Map();
    Object.entries(obj || {}).forEach(([key, value]) => {
        const [dayIndex] = parseSevenDayKey(key);
        if (!Number.isFinite(dayIndex)) return;
        if (!buckets.has(dayIndex)) {
            buckets.set(dayIndex, []);
        }
        buckets.get(dayIndex).push(Number(value));
    });

    const x = [];
    const y = [];
    Array.from(buckets.keys())
        .sort((a, b) => a - b)
        .forEach((dayIndex) => {
            // Compute average for the day; filter out non-finite values
            const values = buckets.get(dayIndex).filter((val) => Number.isFinite(val));
            const average =
                values.length > 0
                    ? values.reduce((sum, val) => sum + val, 0) / values.length
                    : 0;
            x.push(`Day ${dayIndex + 1}`);
            // Round to 2 decimal places for display consistency
            y.push(Number(average.toFixed(2)));
        });

    return { x, y, unit: "currency" };
}

function parseSevenDayKey(key = "") {
    // Extract day and time numbers from keys like "day0_time12"
    const match = key.match(/day(\d+)_time(\d+)/);
    if (!match) return [0, 0];
    return [Number(match[1]), Number(match[2])];
}

function parseNumericKey(key = "") {
    // Remove non-digit/decimal characters and coerce to Number. Used for sorting series keys.
    const numeric = Number(key.replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
}

/*
  Label formatters for chart x-axis
  - formatHourLabel: for 24h series (expects hour numbers)
  - formatSequentialLabel: for datasets where index is meaningful (30d)
*/
function formatHourLabel(key) {
    const hour = Number(key) || 0;
    return `${String(hour).padStart(2, "0")}:00`;
}

function formatSequentialLabel(_, index) {
    return String(index + 1);
}

/*
  Utility display helpers
  - updateChangeBadge: sets element content and positive/negative classes based on numeric change
  - sanitizeDescription: strips HTML, normalizes whitespace
  - formatCompactCurrency/formatCompactNumber: compact representations (K/M/B/T)
  - formatCurrency: uses global currency formatter if present, otherwise falls back to USD formatting
  - formatPercent: formats percent with sign and two decimals
  - formatInput: used by converter inputs to format numeric strings with fixed decimal places
  - formatDate: human-friendly date formatting
*/
function updateChangeBadge(element, changeValue) {
    if (!element) return;
    element.classList.remove("positive", "negative");
    const numeric = Number(changeValue);
    const formatted = formatPercent(numeric);
    if (Number.isFinite(numeric)) {
        element.classList.add(numeric >= 0 ? "positive" : "negative");
    }
    element.textContent = formatted;
}

function sanitizeDescription(raw = "") {
    if (typeof raw !== "string") return "";
    // Convert </p> to paragraph breaks, <br> to newlines, strip remaining tags,
    // normalize CRLFs and collapse excessive blank lines.
    return raw
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\r\n|\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function formatCompactCurrency(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const formatter = window.UKXCurrency?.formatCurrency;
    if (typeof formatter === "function") {
        return formatter(numeric, {
            fromCurrency: "USD",
            notation: "compact",
            maximumFractionDigits: 2
        });
    }
    const absolute = Math.abs(numeric);
    const units = [
        { threshold: 1e12, suffix: "T" },
        { threshold: 1e9, suffix: "B" },
        { threshold: 1e6, suffix: "M" },
        { threshold: 1e3, suffix: "K" }
    ];
    const unit = units.find((entry) => absolute >= entry.threshold);
    if (unit) {
        return `$${(numeric / unit.threshold).toFixed(2)}${unit.suffix}`;
    }
    return formatCurrency(numeric);
}

function formatCompactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const absolute = Math.abs(numeric);
    const units = [
        { threshold: 1e12, suffix: "T" },
        { threshold: 1e9, suffix: "B" },
        { threshold: 1e6, suffix: "M" },
        { threshold: 1e3, suffix: "K" }
    ];
    const unit = units.find((entry) => absolute >= entry.threshold);
    if (unit) {
        return `${(numeric / unit.threshold).toFixed(2)}${unit.suffix}`;
    }
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatSupplyValue(current, max) {
    const currentNumeric = Number(current);
    const maxNumeric = Number(max);
    if (!Number.isFinite(currentNumeric)) return "—";
    const currentLabel = formatCompactNumber(currentNumeric);
    if (Number.isFinite(maxNumeric) && maxNumeric > 0) {
        return `${currentLabel} / ${formatCompactNumber(maxNumeric)}`;
    }
    return currentLabel;
}

function getCurrencyMeta(code) {
    // Return currency metadata (code, label, symbol, flag). Falls back to USD.
    const fallback = {
        code: "USD",
        label: "US Dollar",
        symbol: "$",
        flag: "🇺🇸"
    };
    const manager = window.UKXCurrency;
    if (!manager) return fallback;
    return manager.getCurrencyMetadata?.(code) || fallback;
}

function formatCurrency(amount = 0) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return "$0.00";
    const formatter = window.UKXCurrency?.formatCurrency;
    if (typeof formatter === "function") {
        return formatter(numeric, { fromCurrency: "USD" });
    }
    // Default fallback to en-US USD formatting
    return numeric.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    });
}

function formatPercent(value) {
    if (!Number.isFinite(value)) return "0.00%";
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatInput(amount, fractionDigits = 2) {
    return (Number.isFinite(amount) ? amount : 0).toFixed(fractionDigits);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.valueOf())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/*
  UI helpers for loading/error states
*/
function setLoading(isLoading) {
    if (view.loader) {
        view.loader.style.display = isLoading ? "block" : "none";
    }
}

function setSkeletonState(isLoading) {
    SKELETON_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            element.classList.toggle("skeleton", isLoading);
            element.classList.toggle("is-loaded", !isLoading);
            element.setAttribute("aria-busy", isLoading ? "true" : "false");
        });
    });
}

async function finalizeLoadingState() {
    try {
        await waitForCriticalAssets();
    } catch (error) {
        console.warn("Asset wait skipped:", error);
    }
    setSkeletonState(false);
    setLoading(false);
}

function waitForImage(el) {
    return new Promise((resolve) => {
        if (!el || el.complete) {
            resolve();
            return;
        }
        const cleanup = () => {
            el.removeEventListener("load", cleanup);
            el.removeEventListener("error", cleanup);
            resolve();
        };
        el.addEventListener("load", cleanup);
        el.addEventListener("error", cleanup);
        setTimeout(cleanup, 1500);
    });
}

async function waitForCriticalAssets() {
    const assets = [];
    if (view.coinIcon) assets.push(waitForImage(view.coinIcon));
    if (view.converterCoinIcon && view.converterCoinIcon !== view.coinIcon) {
        assets.push(waitForImage(view.converterCoinIcon));
    }
    await Promise.all(assets);
}

function showError(message) {
    if (view.error) {
        view.error.textContent = message;
        view.error.hidden = false;
    }
}

function hideError() {
    if (view.error) {
        view.error.hidden = true;
        view.error.textContent = "";
    }
}

/*
  Query parsing and small utilities
*/
function getCoinIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const coinIdParam = params.get("coin_id");
    if (coinIdParam === null) return null;
    const parsed = Number.parseInt(coinIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function isPositiveTrend(dataset) {
    // Determine whether the dataset trend is positive by comparing last and first y-values.
    const values = Array.isArray(dataset?.y)
        ? dataset.y.map(Number).filter((value) => Number.isFinite(value))
        : [];
    if (values.length < 2) {
        // Default to positive when insufficient data to avoid negative visual tone by default
        return true;
    }
    return values[values.length - 1] >= values[0];
}

function getChartTheme(isTrendPositive = true) {
    // Choose chart color palette based on trend and document theme (light/dark).
    const isLightTheme =
        document.documentElement.getAttribute("data-theme") === "light";

    const rootStyle = getComputedStyle(document.documentElement);
    const positiveLine =
        rootStyle.getPropertyValue("--color-chart-positive").trim() ||
        "rgba(47, 122, 85, 1)";
    const positivePoint =
        rootStyle.getPropertyValue("--color-chart-positive-strong").trim() ||
        "rgba(36, 94, 67, 1)";
    const negativeLine =
        rootStyle.getPropertyValue("--color-chart-negative").trim() ||
        "rgba(191, 97, 106, 1)";
    const negativePoint =
        rootStyle.getPropertyValue("--color-chart-negative-strong").trim() ||
        "rgba(167, 69, 80, 1)";

    const trendColors = isTrendPositive
        ? {
              line: positiveLine,
              point: positivePoint,
              tooltipLabel: positiveLine
          }
        : {
              line: negativeLine,
              point: negativePoint,
              tooltipLabel: negativeLine
          };

    if (isLightTheme) {
        return {
            background: "rgba(245, 247, 250, 1)",
            line: trendColors.line,
            point: trendColors.point,
            grid: "rgba(0, 0, 0, 0.08)",
            text: "rgba(46, 52, 64, 0.75)",
            tooltip: {
                bg: "rgba(255, 255, 255, 0.96)",
                border: "rgba(46, 52, 64, 0.1)",
                text: "rgba(46, 52, 64, 1)",
                label: trendColors.tooltipLabel
            }
        };
    }

    return {
        background: "rgba(59, 66, 82, 1)",
        line: trendColors.line,
        point: trendColors.point,
        grid: "rgba(255, 255, 255, 0.05)",
        text: "rgba(236, 239, 244, 0.7)",
        tooltip: {
            bg: "rgba(59, 66, 82, 0.95)",
            border: "rgba(255, 255, 255, 0.08)",
            text: "rgba(236, 239, 244, 1)",
            label: trendColors.tooltipLabel
        }
    };
}

let themeObserverRegistered = false;

/*
  observeThemeChanges
  - Observes changes to the document's data-theme attribute and triggers a chart redraw
    so the chart colors match the new theme (light/dark). A MutationObserver is used
    to avoid polling and to only react to relevant attribute changes.
*/
function observeThemeChanges() {
    if (themeObserverRegistered || typeof MutationObserver === "undefined") {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        const shouldRedraw = mutations.some(
            (mutation) =>
                (mutation.type === "attributes" && mutation.attributeName === "data-theme")
        );
        if (shouldRedraw && chartState.datasets[chartState.period]) {
            drawChart();
        }
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
    });

    themeObserverRegistered = true;
}

/*
  Scrolling helpers:
  - scrollToSection ensures the targeted element is scrolled to with a calculated offset
    that considers a sticky header and the coin hero area for consistent positioning.
*/
function scrollToSection(element) {
    const offset = getStickyHeaderOffset();
    const documentOffset = element.getBoundingClientRect().top + window.pageYOffset;
    const targetPosition = Math.max(documentOffset - offset, 0);
    window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
    });
}

function getStickyHeaderOffset() {
    // Computes an offset to compensate for a sticky top navigation + hero area to avoid hiding content.
    const navHeight = getCssVariableNumber("--nav-height") ?? 0;
    const navHidden = document.body.classList.contains("nav-hidden");
    const navOffset = navHidden ? 0 : navHeight;

    const hero = document.querySelector(".coin-hero");
    const heroHeight = hero?.offsetHeight ?? 0;
    const heroMargin = hero ? Number.parseFloat(getComputedStyle(hero).marginBottom) || 0 : 0;

    const reserveGap = 16; // small visual gap so content isn't flush to header
    return navOffset + heroHeight + heroMargin + reserveGap;
}

function getCssVariableNumber(name) {
    // Read a numeric CSS variable (e.g. --nav-height) and parse it to a number.
    const styles = getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue(name);
    const numeric = Number.parseFloat(value);
    return Number.isNaN(numeric) ? null : numeric;
}
