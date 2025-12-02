import { drawBarChart } from "../modules/graphjs/bar.js";
import { drawPieChart } from "../modules/graphjs/pie.js";
import { jsonFileParser } from "../modules/json/jsonFileParser.js";
import { API as ADMIN_AI_KEY } from "/env.js";

const sidebarToggle = document.getElementById("adminSidebarToggle");
const sidebar = document.querySelector(".admin-panel-sidebar");
const time = document.querySelector(".admin-panel-controls-time");

// AI DOM elements
const adminAiInput = document.getElementById("admin-ai-input");
const adminAiSubmit = document.getElementById("admin-ai-submit");
const adminAiStatus = document.getElementById("admin-ai-status");
const adminAiChartCanvas = document.getElementById("admin-ai-chart");
const adminAiChips = document.querySelectorAll(".admin-ai-chip");
const adminAiClearHistory = document.getElementById("admin-ai-clear-history");
const adminAiThread = document.getElementById("admin-ai-thread");

const ADMIN_AI_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const ADMIN_AI_TIMEOUT_MS = 22000;
const ADMIN_AI_HISTORY_KEY = "ukx_admin_ai_history";
let adminAiLastChart = null;
let adminAiInitialized = false;

let adminSessionCurren = window.localStorage.getItem("adminSession");
if (!adminSessionCurren || adminSessionCurren !== "true") {
  alert("You must be logged in as admin to access the admin panel.");
  window.location.href = "./login.html";
}

function getCurrentDateTime() {
  const now = new Date();
  return now.toLocaleString();
}

function updateTime() {
  if (!time) return;
  time.textContent = getCurrentDateTime();
}

function updateName() {
  const nameElement = document.querySelector(".admin-panel-username");
  if (!nameElement) return;
  let adminData = JSON.parse(window.localStorage.getItem("adminData")) || {};
  const storedName = adminData["name"] || "Admin";
  nameElement.textContent = storedName;
}

// tab switching logic
let loginChartDrawn = false;
let ageChartInstance = null;
let coinChartInstance = null;

function getLastXDays(X) {
  const days = [];
  const today = new Date();
  for (let i = X - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }
  return days;
}

const loginChartData = {
  x: getLastXDays(10),
  y: [562, 600, 580, 620, 700, 552, 800, 820, 900, 950],
};

function setActiveMenu(label) {
  document
    .querySelectorAll(".admin-panel-menu-item")
    .forEach((el) => el.classList.remove("active"));
  const match = Array.from(
    document.querySelectorAll(".admin-panel-menu-item")
  ).find(
    (el) =>
      el.querySelector(".text") &&
      el.querySelector(".text").textContent.trim().toLowerCase() === label
  );
  if (match) match.classList.add("active");
}

function switchSection(section) {
  const addHidden = (selectors) => {
    selectors.forEach((sel) => {
      document
        .querySelectorAll(`.${sel}`)
        .forEach((el) => el.classList.add("hidden"));
    });
  };
  const removeHidden = (selectors) => {
    selectors.forEach((sel) => {
      document
        .querySelectorAll(`.${sel}`)
        .forEach((el) => el.classList.remove("hidden"));
    });
  };

  if (section === "trade") {
    // Trade view
    addHidden([
      "admin-panel-age-chart",
      "admin-panel-coin-held-chart",
      "admin-panel-bar-chart-container",
      "admin-panel-users",
      "admin-panel-news",
      "admin-panel-coin-held-chart-title",
      "admin-panel-age-chart-title",
      "admin-panel-pie-charts",
      "admin-panel-pie-card",
      "admin-panel-ai",
    ]);
    removeHidden([
      "admin-panel-trade",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
      "admin-panel-top",
      "admin-panel-left",
      "admin-panel-card-right",
      "admin-panel-controls",
    ]);
  } else if (section === "users") {
    // Users view
    addHidden([
      "admin-panel-trade",
      "admin-panel-news",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
      "admin-panel-ai",
    ]);
    removeHidden([
      "admin-panel-age-chart",
      "admin-panel-users",
      "admin-panel-coin-held-chart",
      "admin-panel-bar-chart-container",
      "admin-panel-top",
      "admin-panel-left",
      "admin-panel-card-right",
      "admin-panel-coin-held-chart-title",
      "admin-panel-age-chart-title",
      "admin-panel-pie-charts",
      "admin-panel-pie-card",
      "admin-panel-controls",
    ]);
    if (!loginChartDrawn) {
      resizeCanvasToParent("admin-panel-login-chart");
      drawBarChart("admin-panel-login-chart", loginChartData);
      loginChartDrawn = true;
    }
    stabilizePieCharts();
  } else if (section === "news") {
    // News view
    addHidden([
      "admin-panel-trade",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
      "admin-panel-age-chart",
      "admin-panel-users",
      "admin-panel-coin-held-chart",
      "admin-panel-bar-chart-container",
      "admin-panel-top",
      "admin-panel-left",
      "admin-panel-card-right",
      "admin-panel-coin-held-chart-title",
      "admin-panel-age-chart-title",
      "admin-panel-pie-charts",
      "admin-panel-pie-card",
      "admin-panel-ai",
    ]);
    removeHidden(["admin-panel-news"]);
  } else if (section === "ai") {
    // AI view
    addHidden([
      "admin-panel-trade",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
      "admin-panel-age-chart",
      "admin-panel-users",
      "admin-panel-coin-held-chart",
      "admin-panel-bar-chart-container",
      "admin-panel-top",
      "admin-panel-left",
      "admin-panel-card-right",
      "admin-panel-coin-held-chart-title",
      "admin-panel-age-chart-title",
      "admin-panel-pie-charts",
      "admin-panel-pie-card",
      "admin-panel-news",
      "admin-panel-controls",
    ]);
    removeHidden(["admin-panel-ai"]);
    if (!adminAiInitialized) {
      initAdminAssistant();
      adminAiInitialized = true;
    }
    // Re-render chart on section switch
    setTimeout(() => renderAssistantChart(adminAiLastChart), 50);
  }
}

// Show Trade tab by default
switchSection("trade");
setActiveMenu("trade");

const storedTarget = window.localStorage.getItem("adminTargetSection");
if (storedTarget) {
  switchSection(storedTarget);
  setActiveMenu(storedTarget);
  window.localStorage.removeItem("adminTargetSection");
}

document.querySelectorAll(".admin-panel-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const labelSpan = item.querySelector(".text");
    if (!labelSpan) return;
    const label = labelSpan.textContent.trim().toLowerCase();
    
    // Update active state immediately
    document
      .querySelectorAll(".admin-panel-menu-item")
      .forEach((el) => el.classList.remove("active"));
    item.classList.add("active");
    
    if (label === "ai") {
      switchSection("ai");
    } else if (label === "trade") {
      switchSection("trade");
    } else if (label === "users") {
      switchSection("users");
    } else if (label === "news") {
      switchSection("news");
    }
  });
});
updateTime();
setInterval(updateTime, 1000);
updateName();

function updateToggleIcon() {
  if (!sidebarToggle || !sidebar) return;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  if (isMobile) {
    sidebarToggle.textContent = sidebar.classList.contains("collapsed")
      ? "☰"
      : "✕";
  } else {
    sidebarToggle.textContent = sidebar.classList.contains("collapsed")
      ? "❯"
      : "❮";
  }
}

updateToggleIcon();

// Restore sidebar state from localStorage
const savedSidebarState = window.localStorage.getItem("adminSidebarCollapsed");
if (savedSidebarState === "false" && sidebar?.classList.contains("collapsed")) {
  sidebar.classList.remove("collapsed");
  updateToggleIcon();
} else if (savedSidebarState === "true" && !sidebar?.classList.contains("collapsed")) {
  sidebar.classList.add("collapsed");
  updateToggleIcon();
}

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  window.localStorage.setItem("adminSidebarCollapsed", sidebar.classList.contains("collapsed"));
  updateToggleIcon();
});

window.addEventListener("resize", updateToggleIcon);

// Dynamic table
const tradeHeaders = [
  "Trade ID",
  "Trade Date",
  "From",
  "To",
  "Coin type",
  "Price",
  "Status",
];

const tradeCoinTypes = [
  "BTC",
  "ETH",
  "USDT",
  "LTC",
  "XRP",
  "SOL",
  "BNB",
  "ADA",
  "DOGE",
  "DOT",
];

let accountsDataPromise;
const tradeTableContainer = document.querySelector(".admin-panel-trade");
const TRADE_CHART_ID = "admin-panel-trade-chart";
const MAX_TRADES = 50;
const REALTIME_INTERVAL_MS = 8000;

let tradeState = { rows: [], chartData: { x: [], y: [] } };
let nextTradeId = 1;

function getRandomItem(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function getRandomPrice(coin) {
  const ranges = {
    BTC: [0.01, 2],
    ETH: [0.25, 15],
    USDT: [250, 5000],
    LTC: [5, 80],
    XRP: [500, 5000],
    SOL: [2, 50],
    BNB: [0.5, 15],
    ADA: [800, 8000],
    DOGE: [1500, 20000],
    DOT: [50, 400],
  };
  const [min, max] = ranges[coin] || [20, 1200];
  const price = Math.random() * (max - min) + min;
  return Number(price.toFixed(2));
}

function getRandomStatus() {
  const statusRoll = Math.random();
  if (statusRoll > 0.65) {
    return {
      type: "status",
      kind: "span",
      class: "completed",
      text: "Completed",
    };
  }
  const isPublic = Math.random() > 0.4;
  return {
    type: "status",
    kind: "button",
    class: isPublic ? "public" : "hide",
    text: isPublic ? "Public" : "Hide",
  };
}

function getRandomTradeDate(daysBack = 30) {
  const daysAgo = Math.floor(Math.random() * daysBack);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function formatChartDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function fetchAccountsData() {
  if (!accountsDataPromise) {
    accountsDataPromise = fetch("../data/accounts_data.json").then((res) =>
      res.json()
    );
  }
  return accountsDataPromise;
}

function buildTradeRow(id, date, accounts) {
  const fromUser = getRandomItem(accounts) || {};
  let toUser = getRandomItem(accounts) || {};
  const fromName = fromUser.name || fromUser.username || "User";
  let toName = toUser.name || toUser.username || "User";

  if (fromName === toName && accounts.length > 1) {
    while (toName === fromName) {
      toUser = getRandomItem(accounts) || {};
      toName = toUser.name || toUser.username || "User";
    }
  }

  const coin = getRandomItem(tradeCoinTypes) || "BTC";

  return {
    "Trade ID": id,
    "Trade Date": date.toLocaleDateString("en-US"),
    tradeDate: date.toISOString(),
    From: fromName,
    To: toName,
    "Coin type": coin,
    Price: getRandomPrice(coin),
    Status: getRandomStatus(),
  };
}

async function generateRandomTradeData(count = 20) {
  const accounts = (await fetchAccountsData()) || [];
  const desiredCount = Math.max(count, 5);
  const lastFiveDayLabels = getLastXDays(5);
  const trades = [];
  const now = new Date();
  const startId = Math.floor(Math.random() * 9000) + 1000;

  // Seed one trade per recent day so the chart never renders empty bars.
  lastFiveDayLabels.forEach((label, index) => {
    const date = new Date(now);
    const daysBack = lastFiveDayLabels.length - 1 - index;
    date.setDate(now.getDate() - daysBack);
    trades.push(buildTradeRow(startId + trades.length, date, accounts));
  });

  while (trades.length < desiredCount) {
    const date = getRandomTradeDate(30);
    trades.push(buildTradeRow(startId + trades.length, date, accounts));
  }

  trades.sort(
    (a, b) =>
      new Date(b["Trade Date"]).getTime() -
      new Date(a["Trade Date"]).getTime()
  );

  return { trades, nextId: startId + trades.length };
}

function computeTradeChartData(rows) {
  const labels = getLastXDays(5);
  const counts = Object.fromEntries(labels.map((label) => [label, 0]));

  rows.forEach((row) => {
    const rawDate = row.tradeDate || row["Trade Date"];
    const parsed = rawDate ? new Date(rawDate) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return;
    const label = formatChartDate(parsed);
    if (counts[label] !== undefined) counts[label] += 1;
  });

  return { x: labels, y: labels.map((label) => counts[label]) };
}

function renderTradeTable(rows) {
  if (!tradeTableContainer) return;
  tradeTableContainer.innerHTML = "";
  tradeTableContainer.appendChild(createAdminTable(tradeHeaders, rows));
  wireStatusButtons();
}

function drawTradeChart(chartData) {
  resizeCanvasToParent(TRADE_CHART_ID);
  drawBarChart(TRADE_CHART_ID, chartData);
}

function updateTradeUI() {
  renderTradeTable(tradeState.rows);
  tradeState.chartData = computeTradeChartData(tradeState.rows);
  drawTradeChart(tradeState.chartData);
}

async function addRealtimeTrade() {
  const accounts = (await fetchAccountsData()) || [];
  const newTrade = buildTradeRow(nextTradeId++, new Date(), accounts);
  tradeState.rows.unshift(newTrade);
  if (tradeState.rows.length > MAX_TRADES) {
    tradeState.rows.pop();
  }
  updateTradeUI();
}

function startRealtimeTrades() {
  setInterval(() => {
    addRealtimeTrade().catch((err) =>
      console.error("Realtime trade update failed", err)
    );
  }, REALTIME_INTERVAL_MS);
}

function createAdminTable(headerData, rowData) {
  const table = document.createElement("table");
  table.className = "admin-panel-table";

  // Create header section
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerData.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body section
  const tbody = document.createElement("tbody");

  rowData.forEach((row) => {
    const tr = document.createElement("tr");
    headerData.forEach((key) => {
      const td = document.createElement("td");
      const value = row[key];

      // If it's a status (object)
      if (typeof value === "object" && value.type === "status") {
        if (value.kind === "span") {
          const span = document.createElement("span");
          span.className = `admin-panel-status ${value.class}`;
          span.textContent = value.text;
          td.appendChild(span);
        } else if (value.kind === "button") {
          const btn = document.createElement("button");
          btn.className = `admin-panel-status-btn ${value.class}`;
          btn.textContent = value.text;
          td.appendChild(btn);
        }
      } else {
        td.textContent = value;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

async function getProcessedUserData() {
  const data = await fetchAccountsData();
  //  {user_id: 1, username: 'donamtrum@jns.co.it', password: '3nm155!%EKte', name: 'Đỗ Nam Trum'}

  let usersHeaders = ["user_id", "Username", "Name", "Online_status"];
  let usersRows = data.map((user) => {
    const isOnline = Math.random() > 0.5;
    return {
      user_id: user.user_id,
      Username: user.username,
      Name: user.name,
      Online_status: {
        type: "status",
        kind: "span",
        class: isOnline ? "online" : "offline",
        text: isOnline ? "Online" : "Offline",
      },
    };
  });
  return { usersHeaders, usersRows };
}

async function getProcessedNewsData() {
  const response = await fetch("../data/article_data.json");
  const data = await response.json();

  //  {title: 'Alternative Credit Scoring Systems', author: 'Crypto Monitor', date: '2024-11-03', tags: Array(4), filename: 'alternative-credit-scoring-systems.html'}
  let newsHeaders = [
    "news_id",
    "Title",
    "Author",
    "Date",
    "Views",
    "Ratings",
    "Status",
  ];
  let id = 1;
  let newsRows = data.map((article) => {
    const newStatus = Math.random() > 0.5;
    return {
      news_id: id++,
      Title: article.title,
      Author: article.author,
      Date: article.date,
      Views: Math.floor(Math.random() * 10000) + 100,
      Ratings: (Math.random() * 5).toFixed(0.5) + " / 5",
      Status: {
        type: "status",
        kind: "button",
        class: newStatus ? "hide" : "public",
        text: newStatus ? "Hide" : "Public",
      },
    };
  });
  return { newsHeaders, newsRows };
}
const { trades: tradeRows, nextId } = await generateRandomTradeData(24);
tradeState.rows = tradeRows;
nextTradeId = nextId;
updateTradeUI();
startRealtimeTrades();

const { usersHeaders, usersRows } = await getProcessedUserData();
document
  .querySelector(".admin-panel-users")
  .appendChild(createAdminTable(usersHeaders, usersRows));

const { newsHeaders, newsRows } = await getProcessedNewsData();
document
  .querySelector(".admin-panel-news")
  .appendChild(createAdminTable(newsHeaders, newsRows));

function wireStatusButtons() {
  document.querySelectorAll(".admin-panel-status-btn").forEach((btn) => {
    if (btn.dataset.wired === "true") return;
    btn.dataset.wired = "true";
    btn.addEventListener("click", () => {
      if (btn.classList.contains("public")) {
        btn.classList.remove("public");
        btn.classList.add("hide");
        btn.textContent = "Hide";
      } else {
        btn.classList.remove("hide");
        btn.classList.add("public");
        btn.textContent = "Public";
      }
    });
  });
}
wireStatusButtons();

// chart
function resizeCanvasToParent(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const parent = canvas.parentElement;
  if (!parent) return canvas;

  const { clientWidth, clientHeight } = parent;
  if (clientWidth && clientHeight) {
    canvas.width = clientWidth;
    canvas.height = clientHeight;
  }

  return canvas;
}

//"admin-panel-age-chart"
const user_data = await jsonFileParser("/data/users_data.json");

function buildAgeBucketsFromUsers(users = []) {
  const buckets = {
    "Under 18": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-54": 0,
    "55-64": 0,
    "65 and over": 0,
  };
  users.forEach((user) => {
    const age = Number(user.age);
    if (!Number.isFinite(age)) return;
    if (age < 18) buckets["Under 18"]++;
    else if (age <= 24) buckets["18-24"]++;
    else if (age <= 34) buckets["25-34"]++;
    else if (age <= 44) buckets["35-44"]++;
    else if (age <= 54) buckets["45-54"]++;
    else if (age <= 64) buckets["55-64"]++;
    else buckets["65 and over"]++;
  });
  const labels = Object.keys(buckets);
  const values = labels.map((label) => buckets[label]);
  return { buckets, labels, values };
}

function aggregateCoinHoldingsFromUsers(users = []) {
  const totals = {};
  users.forEach((user) => {
    if (!user.coin_holdings) return;
    Object.entries(user.coin_holdings).forEach(([coin, amount]) => {
      totals[coin] = (totals[coin] || 0) + Number(amount || 0);
    });
  });
  return totals;
}

function getTopCoinEntriesFromUsers(users = [], limit = 6) {
  const totals = aggregateCoinHoldingsFromUsers(users);
  return Object.entries(totals)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function getAverageAge(users = []) {
  const ages = users
    .map((user) => Number(user.age))
    .filter((age) => Number.isFinite(age));
  if (!ages.length) return null;
  const avg = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return Number(avg.toFixed(1));
}

function drawAgeDistributionChart(user_data) {
  const { labels, values } = buildAgeBucketsFromUsers(user_data);

  const dataset = labels
    .map((label, index) => ({ label, value: values[index] }))
    .filter((entry) => entry.value > 0);

  const canvasEl = resizeCanvasToParent("admin-panel-age-chart");
  if (!canvasEl || dataset.length === 0) {
    return;
  }

  if (ageChartInstance) {
    ageChartInstance.updateData(dataset);
    ageChartInstance.updateGeometry();
    ageChartInstance.draw();
  } else {
    ageChartInstance = drawPieChart({
      canvas: canvasEl,
      tooltip: "tooltip",
      dataset,
    });
  }
}

function drawCoinHoldingDistributionChart(user_data) {
  const coins = aggregateCoinHoldingsFromUsers(user_data);
  const coinLabels = Object.keys(coins);
  const coinValues = Object.values(coins);

  const dataset = coinLabels
    .map((label, index) => ({ label, value: coinValues[index] }))
    .filter((entry) => entry.value > 0);
  const canvasEl = resizeCanvasToParent("admin-panel-coin-held-chart");
  if (!canvasEl || dataset.length === 0) {
    return;
  }

  if (coinChartInstance) {
    coinChartInstance.updateData(dataset);
    coinChartInstance.updateGeometry();
    coinChartInstance.draw();
  } else {
    coinChartInstance = drawPieChart({
      canvas: canvasEl,
      tooltip: "tooltip2",
      dataset,
    });
  }
}

drawAgeDistributionChart(user_data);
drawCoinHoldingDistributionChart(user_data);

function stabilizePieCharts() {
  const ageCanvas = resizeCanvasToParent("admin-panel-age-chart");
  if (ageCanvas && ageChartInstance) {
    ageChartInstance.updateGeometry();
    ageChartInstance.draw();
  }
  const coinCanvas = resizeCanvasToParent("admin-panel-coin-held-chart");
  if (coinCanvas && coinChartInstance) {
    coinChartInstance.updateGeometry();
    coinChartInstance.draw();
  }
}

window.addEventListener("resize", () => {
  stabilizePieCharts();
  if (adminAiLastChart) {
    renderAssistantChart(adminAiLastChart);
  }
});

let logoutBtn = document.getElementById("admin-panel-logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "./login.html";
    window.localStorage.removeItem("adminSession");
  });
}

// ==================== AI ASSISTANT FUNCTIONS ====================

function summarizeTradeStateForAssistant(rows = tradeState.rows) {
  const statusCounts = { completed: 0, public: 0, hidden: 0 };
  const coinCounts = {};

  rows.forEach((row) => {
    const statusVal = row.Status;
    if (statusVal && statusVal.type === "status") {
      if (statusVal.class === "completed") statusCounts.completed += 1;
      else if (statusVal.class === "public") statusCounts.public += 1;
      else if (statusVal.class === "hide") statusCounts.hidden += 1;
    }
    const coin = row["Coin type"];
    if (coin) coinCounts[coin] = (coinCounts[coin] || 0) + 1;
  });

  const chartData = computeTradeChartData(rows);
  const topCoins = Object.entries(coinCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total: rows.length, status: statusCounts, topCoins, chartData };
}

function buildAssistantSnapshot() {
  const age = buildAgeBucketsFromUsers(user_data);
  const coinEntries = getTopCoinEntriesFromUsers(user_data, 6);
  const tradeSnapshot = summarizeTradeStateForAssistant();
  const loginSnapshot = { labels: loginChartData.x, values: loginChartData.y };
  const avgAge = getAverageAge(user_data);
  const estimatedOnline = Math.round(user_data.length * 0.6);

  return {
    age,
    coinEntries,
    tradeSnapshot,
    loginSnapshot,
    totalUsers: user_data.length,
    avgAge,
    estimatedOnline,
  };
}

function pickChartForQuestion(question) {
  const snapshot = buildAssistantSnapshot();
  const lower = (question || "").toLowerCase();
  
  if (lower.includes("login") || lower.includes("signin") || lower.includes("session") || lower.includes("active")) {
    return {
      title: "Daily logins (10d)",
      labels: snapshot.loginSnapshot.labels,
      values: snapshot.loginSnapshot.values,
      note: "User login sessions over the past 10 days",
    };
  }
  
  if (lower.includes("age") || lower.includes("demographic") || lower.includes("user mix") || lower.includes("generation")) {
    return {
      title: "User age distribution",
      labels: snapshot.age.labels,
      values: snapshot.age.values,
      note: `Average age: ${snapshot.avgAge ?? "N/A"}`,
    };
  }
  
  if (lower.includes("status") || lower.includes("public") || lower.includes("visibility") || lower.includes("hidden")) {
    const s = snapshot.tradeSnapshot.status;
    return {
      title: "Trade visibility breakdown",
      labels: ["Completed", "Public", "Hidden"],
      values: [s.completed, s.public, s.hidden],
      note: `Total trades: ${snapshot.tradeSnapshot.total}`,
    };
  }
  
  if (lower.includes("trade") || lower.includes("volume") || lower.includes("transaction") || lower.includes("activity")) {
    return {
      title: "Trades last 5 days",
      labels: snapshot.tradeSnapshot.chartData.x,
      values: snapshot.tradeSnapshot.chartData.y,
      note: "Daily trade count",
    };
  }
  
  if (lower.includes("momentum") || lower.includes("trend") || lower.includes("growth")) {
    return {
      title: "Login momentum (10d)",
      labels: snapshot.loginSnapshot.labels,
      values: snapshot.loginSnapshot.values,
      note: "Tracking user engagement trend",
    };
  }
  
  if (lower.includes("health") || lower.includes("summary") || lower.includes("overview") || lower.includes("snapshot")) {
    return {
      title: "Top coin holdings",
      labels: snapshot.coinEntries.map(([coin]) => coin),
      values: snapshot.coinEntries.map(([, value]) => Number(Number(value).toFixed(2))),
      note: `${snapshot.totalUsers} total users, ~${snapshot.estimatedOnline} online`,
    };
  }
  
  if (lower.includes("user") && (lower.includes("count") || lower.includes("how many") || lower.includes("total"))) {
    return {
      title: "User age distribution",
      labels: snapshot.age.labels,
      values: snapshot.age.values,
      note: `${snapshot.totalUsers} total users`,
    };
  }

  return {
    title: "Top coin holdings",
    labels: snapshot.coinEntries.map(([coin]) => coin),
    values: snapshot.coinEntries.map(([, value]) => Number(Number(value).toFixed(2))),
    note: "Most held cryptocurrencies by users",
  };
}

function buildOfflineSummary(snapshot) {
  const topCoins = snapshot.coinEntries
    .slice(0, 3)
    .map(([coin, value]) => `${coin}: ${Number(value).toFixed(1)}`)
    .join(", ");
  const tradeTotal = snapshot.tradeSnapshot.chartData.y.reduce((sum, val) => sum + val, 0);
  const loginValues = snapshot.loginSnapshot.values || [];
  const loginDelta = loginValues.length > 1 ? loginValues[loginValues.length - 1] - loginValues[0] : 0;

  return `Users: ${snapshot.totalUsers} (avg age ${snapshot.avgAge ?? "n/a"}). Top coins: ${topCoins || "n/a"}. Trades last 5 days: ${tradeTotal}. Login change: ${loginDelta >= 0 ? "+" : ""}${loginDelta}.`;
}

function buildOfflineBullets(snapshot, question) {
  const bullets = [];
  bullets.push(`Est. online users: ~${snapshot.estimatedOnline} of ${snapshot.totalUsers}.`);
  if (snapshot.tradeSnapshot.topCoins.length) {
    const topTrade = snapshot.tradeSnapshot.topCoins[0];
    bullets.push(`Most traded coin: ${topTrade[0]} with ${topTrade[1]} recent trades.`);
  }
  const loginValues = snapshot.loginSnapshot.values || [];
  if (loginValues.length) {
    const peak = Math.max(...loginValues);
    const peakIndex = loginValues.indexOf(peak);
    const peakDay = snapshot.loginSnapshot.labels?.[peakIndex] || "latest day";
    bullets.push(`Peak login day: ${peakDay} at ${peak} sessions.`);
  }
  if (question && question.toLowerCase().includes("age")) {
    const maxAgeIndex = snapshot.age.values.indexOf(Math.max(...snapshot.age.values));
    bullets.push(`Largest age band: ${snapshot.age.labels[maxAgeIndex]} (${snapshot.age.values[maxAgeIndex]} users).`);
  }
  const coinLine = snapshot.coinEntries
    .slice(0, 2)
    .map(([coin, value]) => `${coin}: ${Number(value).toFixed(1)}`)
    .join(", ");
  if (coinLine) bullets.push(`Top holdings: ${coinLine}.`);
  return bullets.filter(Boolean).slice(0, 5);
}

function resizeAiCanvasToParent(canvas) {
  const target = canvas || adminAiChartCanvas;
  if (!target) return null;
  const parent = target.parentElement;
  if (!parent) return target;
  const { clientWidth, clientHeight } = parent;
  if (clientWidth && clientHeight) {
    target.width = clientWidth;
    target.height = Math.max(260, clientHeight);
  }
  return target;
}

function renderAssistantChart(chart, animate = false) {
  adminAiLastChart = chart || null;
  if (!adminAiChartCanvas) return;
  
  const chartTitleEl = document.getElementById("admin-ai-chart-title");
  const chartNoteEl = document.getElementById("admin-ai-chart-note");
  const chartContainer = adminAiChartCanvas.closest(".admin-panel-ai-chart");
  
  if (chartTitleEl) chartTitleEl.textContent = chart?.title || "Chart";
  if (chartNoteEl) chartNoteEl.textContent = chart?.note || "";
  
  const canvas = resizeAiCanvasToParent(adminAiChartCanvas);
  if (!canvas || !chart || !Array.isArray(chart.labels) || !chart.labels.length) {
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  
  if (animate && chartContainer) {
    chartContainer.classList.add("admin-ai-chart-updating");
    setTimeout(() => chartContainer.classList.remove("admin-ai-chart-updating"), 600);
  }
  
  const sanitizedValues = (chart.values || []).map((val) => Number.isFinite(Number(val)) ? Number(val) : 0);
  drawBarChart(canvas, { x: chart.labels, y: sanitizedValues }, { maxLabelLength: 8, labelFont: "12px Inter, sans-serif", valueFont: "12px Inter, sans-serif" });
}

function setAssistantStatus(text, state = "ready") {
  if (!adminAiStatus) return;
  adminAiStatus.textContent = text;
  adminAiStatus.dataset.state = state;
}

function readHistory() {
  try {
    const raw = localStorage.getItem(ADMIN_AI_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return { q: item, ts: Date.now(), a: null };
      return item;
    });
  } catch (e) {
    return [];
  }
}

function persistHistory(list) {
  try {
    localStorage.setItem(ADMIN_AI_HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not persist admin AI history", e);
  }
}

function renderThread() {
  if (!adminAiThread) return;
  const entries = readHistory();
  adminAiThread.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "admin-ai-empty";
    empty.textContent = "Ask a question to start the thread.";
    adminAiThread.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const qWrap = document.createElement("div");
    qWrap.className = "admin-ai-msg question";
    const qLabel = document.createElement("div");
    qLabel.className = "label";
    qLabel.textContent = "Question";
    const qBubble = document.createElement("div");
    qBubble.className = "bubble";
    qBubble.textContent = entry.q;
    qWrap.appendChild(qLabel);
    qWrap.appendChild(qBubble);

    const aWrap = document.createElement("div");
    aWrap.className = "admin-ai-msg answer";
    const aLabel = document.createElement("div");
    aLabel.className = "label";
    aLabel.textContent = "Answer";
    const aBubble = document.createElement("div");
    aBubble.className = "bubble";
    if (entry.a && entry.a.summary) {
      aBubble.textContent = entry.a.summary;
      if (Array.isArray(entry.a.bullets) && entry.a.bullets.length) {
        const list = document.createElement("ul");
        entry.a.bullets.forEach((bullet) => {
          const li = document.createElement("li");
          li.textContent = bullet;
          list.appendChild(li);
        });
        aBubble.appendChild(list);
      }
    } else {
      aBubble.textContent = "Working on it...";
    }
    aWrap.appendChild(aLabel);
    aWrap.appendChild(aBubble);

    adminAiThread.appendChild(qWrap);
    adminAiThread.appendChild(aWrap);
  });
  adminAiThread.scrollTop = adminAiThread.scrollHeight;
}

function appendHistory(question) {
  const list = readHistory();
  list.push({ q: question, ts: Date.now(), a: null });
  const trimmed = list.slice(-25);
  persistHistory(trimmed);
  renderThread();
  return trimmed[trimmed.length - 1]?.ts;
}

function updateHistoryAnswer(ts, result) {
  const list = readHistory();
  const target = list.find((entry) => entry.ts === ts);
  if (target) {
    target.a = { summary: result.summary, bullets: result.bullets || [] };
  }
  persistHistory(list);
  renderThread();
}

function clearHistory() {
  persistHistory([]);
  renderThread();
}

function buildAssistantPrompt(question) {
  const snapshot = buildAssistantSnapshot();
  const coinLine = snapshot.coinEntries.map(([coin, value]) => `${coin}:${Number(value).toFixed(2)}`).join(", ");
  const ageLine = snapshot.age.labels.map((label, idx) => `${label}:${snapshot.age.values[idx]}`).join(", ");
  const tradeCoinLine = snapshot.tradeSnapshot.topCoins.map(([coin, count]) => `${coin}:${count}`).join(", ");

  return `Admin telemetry:
- Users: ${snapshot.totalUsers}, avg age ${snapshot.avgAge ?? "n/a"}, est online ${snapshot.estimatedOnline}
- Age buckets: ${ageLine}
- Top holdings: ${coinLine}
- Trades last 5 days: ${snapshot.tradeSnapshot.chartData.x.join(" / ")} counts ${snapshot.tradeSnapshot.chartData.y.join(", ")}
- Trade status counts: completed ${snapshot.tradeSnapshot.status.completed}, public ${snapshot.tradeSnapshot.status.public}, hidden ${snapshot.tradeSnapshot.status.hidden}
- Most traded coins: ${tradeCoinLine || "n/a"}
- Login trend (10d): ${snapshot.loginSnapshot.values.join(", ")}

Question: ${question}

Return JSON ONLY in this shape:
{"summary":"2-3 sentences","bullets":["short insight 1","short insight 2"],"chart":{"title":"short title","labels":[...],"values":[...],"note":"one-line context"}}
Use the provided numbers only, keep labels short, and do not add markdown or code fences.`;
}

async function callAdminAssistant(question) {
  if (!ADMIN_AI_KEY) {
    throw new Error("Missing AI API key");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_AI_TIMEOUT_MS);
  const payload = {
    model: "sonar",
    max_tokens: 500,
    stream: false,
    messages: [
      {
        role: "system",
        content: "You are the admin AI for UKX Wallet. Keep replies concise and always respond with JSON only using the provided schema. You can suggest a chart based on the telemetry you receive.",
      },
      { role: "user", content: buildAssistantPrompt(question) },
    ],
  };

  try {
    const response = await fetch(ADMIN_AI_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${ADMIN_AI_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`AI error ${response.status}: ${text.slice(0, 120)}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI request timed out");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAssistantResponseText(content) {
  if (!content) return null;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return { summary: content };
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    console.warn("Could not parse AI JSON, falling back to text", error);
    return { summary: content };
  }
}

function normalizeAssistantResponse(rawContent, question) {
  const parsed = typeof rawContent === "string" ? parseAssistantResponseText(rawContent) : rawContent;
  const snapshot = buildAssistantSnapshot();
  const fallbackChart = pickChartForQuestion(question);
  const fallbackBullets = buildOfflineBullets(snapshot, question);

  const summary = (parsed?.summary || parsed?.answer || parsed?.content || "").toString();
  const bulletsSource = (Array.isArray(parsed?.bullets) && parsed.bullets) || (Array.isArray(parsed?.insights) && parsed.insights) || [];
  const bullets = bulletsSource.map((item) => item && item.toString().trim()).filter(Boolean).slice(0, 5);

  let chart = null;
  if (parsed?.chart && Array.isArray(parsed.chart.labels) && Array.isArray(parsed.chart.values) && 
      parsed.chart.labels.length === parsed.chart.values.length && parsed.chart.labels.length > 0) {
    chart = {
      title: parsed.chart.title || fallbackChart.title,
      labels: parsed.chart.labels.slice(0, 10),
      values: parsed.chart.values.slice(0, 10).map((v) => Number(v) || 0),
      note: parsed.chart.note || fallbackChart.note || "",
    };
  }

  return {
    summary: summary || buildOfflineSummary(snapshot),
    bullets: bullets.length ? bullets : fallbackBullets,
    chart: chart || fallbackChart,
  };
}

function buildOfflineFallback(question) {
  const snapshot = buildAssistantSnapshot();
  return {
    summary: buildOfflineSummary(snapshot),
    bullets: buildOfflineBullets(snapshot, question),
    chart: pickChartForQuestion(question),
  };
}

async function handleAdminAiSubmit(promptOverride) {
  const question = (promptOverride ?? adminAiInput?.value ?? "").trim();
  if (!question) return;

  setAssistantStatus("Analyzing data...", "thinking");
  const historyKey = appendHistory(question);
  
  if (adminAiInput && !promptOverride) adminAiInput.value = "";
  
  const chartContainer = adminAiChartCanvas?.closest(".admin-panel-ai-chart");
  if (chartContainer) chartContainer.classList.add("admin-ai-chart-loading");

  try {
    const raw = await callAdminAssistant(question);
    const normalized = normalizeAssistantResponse(raw, question);
    updateHistoryAnswer(historyKey, normalized);
    if (chartContainer) chartContainer.classList.remove("admin-ai-chart-loading");
    renderAssistantChart(normalized.chart, true);
    setAssistantStatus("Ready for the next question", "ready");
  } catch (error) {
    console.error("Admin AI unavailable, using offline summary", error);
    setAssistantStatus("AI unavailable, showing offline summary.", "error");
    if (chartContainer) chartContainer.classList.remove("admin-ai-chart-loading");
    const fallback = buildOfflineFallback(question);
    updateHistoryAnswer(historyKey, fallback);
    renderAssistantChart(fallback.chart, true);
  }
}

function initAdminAssistant() {
  setAssistantStatus("Ready for a question", "ready");
  renderThread();

  if (adminAiSubmit) {
    adminAiSubmit.addEventListener("click", () => handleAdminAiSubmit());
  }
  if (adminAiInput) {
    adminAiInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleAdminAiSubmit();
      }
    });
  }
  adminAiChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt || chip.textContent;
      if (adminAiInput) adminAiInput.value = prompt;
      handleAdminAiSubmit(prompt);
    });
  });

  if (adminAiClearHistory) {
    adminAiClearHistory.addEventListener("click", clearHistory);
  }

  renderAssistantChart(pickChartForQuestion("coin holdings"), false);
}
