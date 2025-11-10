import { jsonFileParser } from "/modules/json/jsonFileParser.js";
import { drawLineGraph } from "/modules/graphjs/line.js";
import { fetchCoinDetails } from "/modules/coingecko/api.js";

const DEFAULT_COIN_ID = 0;

let view = {};
let chartState = {
    period: "24h",
    datasets: {}
};

document.addEventListener("DOMContentLoaded", () => {
    view = cacheDom();
    bindTabScroll();
    const coinId = getCoinIdFromQuery() ?? DEFAULT_COIN_ID;
    loadCoinDetails(coinId);
});

function cacheDom() {
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
        tabs: document.querySelectorAll(".coin-tab")
    };
}

async function loadCoinDetails(coinId) {
    setLoading(true);
    hideError();

    try {
        const fullCoinResponse = await jsonFileParser("/data/full_coin_data.json");
        const coins = fullCoinResponse[0] || {};

        let selectedEntry = Object.entries(coins).find(([, coin]) => coin.coin_page_id === coinId);
        if (!selectedEntry) {
            selectedEntry = Object.entries(coins)[0];
        }

        if (!selectedEntry) {
            throw new Error("Unable to find any coin data.");
        }

        const [symbol, details] = selectedEntry;

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
            fetchCoinDetails(symbol).catch((error) => {
                console.warn(`Unable to fetch live data for ${symbol}`, error);
                return null;
            })
        ]);

        const sevenDay = sevenDayResponse[0] || {};
        const twentyFour = twentyFourResponse[0] || {};
        const thirtyDay = thirtyDayResponse[0] || {};
        const articles = Array.isArray(articleData) ? articleData : [];

        const performance = performanceData.find(
            (record) => record.coin === symbol || record.symbol === symbol
        ) || null;

        renderOverview(symbol, details, liveData);
        renderStats(details, performance, liveData);
        renderDescription(liveData?.description || details.description);
        renderTags(details.categories);
        renderPerformance(performance);
        renderNews(articles, details.categories);
        setupConverter(
            liveData?.current_price ?? details.current_price,
            symbol
        );
        prepareChartDatasets(symbol, {
            "24h": twentyFour[symbol],
            "7d": sevenDay[symbol],
            "30d": thirtyDay[symbol]
        });
        bindChartControls();
        drawChart();

        document.title = `UKX - ${(liveData?.name || details.coin_name)} price`;
        setLoading(false);
    } catch (error) {
        console.error("Error loading coin details:", error);
        showError("We could not load this coin right now. Please try again in a minute.");
        setLoading(false);
    }
}

function renderOverview(symbol, details, liveData) {
    if (!details && !liveData) return;
    const coinName = liveData?.name || details?.coin_name || symbol;
    const iconUrl = liveData?.image || details?.img_url || "/assets/crypto-default.png";
    const currentPrice = liveData?.current_price ?? details?.current_price ?? 0;
    const priceChange = liveData?.price_change_24h ?? details?.price_change_24h ?? 0;
    const high24h = liveData?.high_24h ?? details?.high_24h ?? currentPrice;
    const low24h = liveData?.low_24h ?? details?.low_24h ?? currentPrice;

    view.coinName.textContent = coinName;
    view.coinSymbol.textContent = symbol;
    view.coinBreadcrumb.textContent = coinName;

    if (view.coinIcon) {
        view.coinIcon.src = iconUrl;
        view.coinIcon.alt = `${coinName} logo`;
    }
    if (view.converterCoinIcon) {
        view.converterCoinIcon.src = iconUrl;
        view.converterCoinIcon.alt = `${coinName} icon`;
    }

    view.coinPrice.textContent = formatCurrency(currentPrice);
    updateChangeBadge(view.coinChange, priceChange);
    
    if (view.coinHigh) {
        view.coinHigh.textContent = formatCurrency(high24h);
    }
    if (view.coinLow) {
        view.coinLow.textContent = formatCurrency(low24h);
    }

    if (view.coinLastUpdated) {
        const timestamp = liveData?.last_updated ? new Date(liveData.last_updated) : new Date();
        view.coinLastUpdated.textContent = `Updated ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    
    if (view.chartTitle) {
        view.chartTitle.textContent = `${coinName} price in USD`;
    }
}

function renderStats(details, performance, liveData) {
    if (!details && !liveData) return;

    const marketCapValue = liveData?.market_cap ?? details?.market_cap;
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

    if (view.statsSupply) {
        view.statsSupply.textContent = formatSupplyValue(
            liveData?.circulating_supply,
            liveData?.max_supply
        );
    }

    if (view.statsAth) {
        const athValue = liveData?.ath ?? details?.high_24h;
        view.statsAth.textContent = Number.isFinite(athValue) ? formatCurrency(athValue) : "—";
    }

    if (view.statsVolume) {
        const volumeValue = liveData?.volume_24h ?? liveData?.total_volume;
        view.statsVolume.textContent = formatCompactCurrency(volumeValue);
    }

    if (view.statsNote) {
        view.statsNote.textContent = performance?.performance || "Watching market momentum";
    }
}

function renderDescription(description = "") {
    if (!view.description) return;
    const cleaned = sanitizeDescription(description);
    view.description.textContent = cleaned || "No description provided for this asset.";
}

function renderTags(categories = []) {
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
    view.newsList.innerHTML = "";
    if (!Array.isArray(articles) || articles.length === 0) {
        view.newsList.innerHTML = `<p class="muted">No news to show yet.</p>`;
        return;
    }

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

function setupConverter(price, symbol) {
    if (!view.converterCoinInput || !view.converterFiatInput) return;

    const basePrice = Number.isFinite(Number(price)) ? Number(price) : 0;

    view.converterCoinLabel.textContent = symbol;
    if (view.converterFiatIcon) {
        view.converterFiatIcon.textContent = "🇺🇸";
        view.converterFiatIcon.setAttribute("aria-label", "United States flag");
    }
    view.converterCoinInput.value = "1";
    view.converterFiatInput.value = formatInput(basePrice);

    let syncing = false;

    const updateFiat = () => {
        if (syncing) return;
        syncing = true;
        const coinValue = parseFloat(view.converterCoinInput.value) || 0;
        view.converterFiatInput.value = formatInput(coinValue * basePrice);
        syncing = false;
    };

    const updateCoin = () => {
        if (syncing) return;
        syncing = true;
        const fiatValue = parseFloat(view.converterFiatInput.value) || 0;
        view.converterCoinInput.value = formatInput(fiatValue / (basePrice || 1), 6);
        syncing = false;
    };

    view.converterCoinInput.oninput = updateFiat;
    view.converterFiatInput.oninput = updateCoin;
    view.converterSwap.onclick = () => {
        const coinValue = parseFloat(view.converterCoinInput.value) || 0;
        const fiatValue = parseFloat(view.converterFiatInput.value) || 0;
        view.converterCoinInput.value = formatInput(fiatValue / (basePrice || 1), 6);
        view.converterFiatInput.value = formatInput(coinValue * basePrice);
    };
}

function prepareChartDatasets(symbol, sources) {
    chartState.datasets = {
        "24h": {
            ...buildSeriesFromObject(sources["24h"], formatHourLabel),
            unit: "currency"
        },
        "7d": {
            ...buildSeriesFromSevenDay(sources["7d"])
        },
        "30d": {
            ...buildSeriesFromObject(sources["30d"], formatSequentialLabel),
            unit: "number"
        }
    };
    if (!chartState.datasets[chartState.period]) {
        chartState.period = "24h";
    }
}

function drawChart() {
    const dataset = chartState.datasets[chartState.period];
    if (!dataset) return;

    const theme = {
        background: "rgba(59, 66, 82, 1)",
        line: "rgba(136, 192, 208, 1)",
        point: "rgba(180, 142, 173, 1)",
        grid: "rgba(255, 255, 255, 0.05)",
        text: "rgba(236, 239, 244, 0.7)",
        tooltip: {
            bg: "rgba(59, 66, 82, 0.95)",
            border: "rgba(255, 255, 255, 0.08)",
            text: "rgba(236, 239, 244, 1)",
            label: "rgba(216, 222, 233, 0.65)"
        }
    };

    drawLineGraph("coinPriceChart", dataset, theme);
}

function bindChartControls() {
    view.chartButtons.forEach((button) => {
        if (button.dataset.bound === "true") return;
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
    const tabs = view.tabs ? Array.from(view.tabs) : [];
    tabs.forEach((button) => {
        const target = button?.dataset?.scroll;
        if (!target) return;
        button.addEventListener("click", () => {
            tabs.forEach((tab) => tab.classList.remove("active"));
            button.classList.add("active");
            const destination = document.querySelector(target);
            if (destination) {
                destination.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

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
            const values = buckets.get(dayIndex).filter((val) => Number.isFinite(val));
            const average =
                values.length > 0
                    ? values.reduce((sum, val) => sum + val, 0) / values.length
                    : 0;
            x.push(`Day ${dayIndex + 1}`);
            y.push(Number(average.toFixed(2)));
        });

    return { x, y, unit: "currency" };
}

function parseSevenDayKey(key = "") {
    const match = key.match(/day(\d+)_time(\d+)/);
    if (!match) return [0, 0];
    return [Number(match[1]), Number(match[2])];
}

function parseNumericKey(key = "") {
    const numeric = Number(key.replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
}

function formatHourLabel(key) {
    const hour = Number(key) || 0;
    return `${String(hour).padStart(2, "0")}:00`;
}

function formatDayLabel(key) {
    const day = Number(key.replace("day", "")) || 0;
    return `Day ${day + 1}`;
}

function formatSequentialLabel(_, index) {
    return String(index + 1);
}

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

function formatCurrency(amount = 0) {
    if (!Number.isFinite(amount)) return "$0.00";
    return amount.toLocaleString("en-US", {
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

function setLoading(isLoading) {
    if (view.loader) {
        view.loader.style.display = isLoading ? "block" : "none";
    }
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

function getCoinIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const coinIdParam = params.get("coin_id");
    if (coinIdParam === null) return null;
    const parsed = Number.parseInt(coinIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
}
