import { drawBarChart } from "../modules/graphjs/bar.js";
import { drawPieChart } from "../modules/graphjs/pie.js";
import { jsonFileParser } from "../modules/json/jsonFileParser.js";

const sidebarToggle = document.getElementById("adminSidebarToggle");
const sidebar = document.querySelector(".admin-panel-sidebar");
const time = document.querySelector(".admin-panel-controls-time");

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
    ]);
    removeHidden([
      "admin-panel-trade",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
      "admin-panel-top",
      "admin-panel-left",
      "admin-panel-card-right",
    ]);
  } else if (section === "users") {
    // Users view
    addHidden([
      "admin-panel-trade",
      "admin-panel-news",
      "calculator-container",
      "admin-panel-trade-chart",
      "admin-panel-trade-chart-title",
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
    ]);
    removeHidden(["admin-panel-news"]);
  }
}

// Show Trade tab by default
switchSection("trade");

document.querySelectorAll(".admin-panel-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    document
      .querySelectorAll(".admin-panel-menu-item")
      .forEach((el) => el.classList.remove("active"));
    item.classList.add("active");
    const labelSpan = item.querySelector(".text");
    if (!labelSpan) return;
    const label = labelSpan.textContent.trim().toLowerCase();
    if (label === "trade") switchSection("trade");
    else if (label === "users") switchSection("users");
    else if (label === "news") switchSection("news");
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

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
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

//"admin-panel-age-chart"
const user_data = await jsonFileParser("/data/users_data.json");

function drawAgeDistributionChart(user_data) {
  let age = [];
  for (let user of user_data) {
    if (user.age) age.push(user.age);
  }
  const ageGroups = {
    "Under 18": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-54": 0,
    "55-64": 0,
    "65 and over": 0,
  };
  for (let a of age) {
    if (a < 18) ageGroups["Under 18"]++;
    else if (a <= 24) ageGroups["18-24"]++;
    else if (a <= 34) ageGroups["25-34"]++;
    else if (a <= 44) ageGroups["35-44"]++;
    else if (a <= 54) ageGroups["45-54"]++;
    else if (a <= 64) ageGroups["55-64"]++;
    else ageGroups["65 and over"]++;
  }

  const ageLabels = Object.keys(ageGroups);
  const ageValues = Object.values(ageGroups);

  const dataset = ageLabels
    .map((label, index) => ({ label, value: ageValues[index] }))
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
  let coins = {};
  for (let user of user_data) {
    /**
     * "coin_holdings": {
      "XRP": 1571.672,
      "LTC": 2206.459,
      "BTC": 1.867138,
      "DOT": 7969.737
    }
     */
    if (user.coin_holdings) {
      for (let coin in user.coin_holdings) {
        if (!coins.hasOwnProperty(coin)) coins[coin] = user.coin_holdings[coin];
        else coins[coin] += user.coin_holdings[coin];
      }
    }
  }
  // console.log(coins);
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

window.addEventListener("resize", stabilizePieCharts);

let logoutBtn = document.getElementById("admin-panel-logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "./login.html";
    window.localStorage.removeItem("adminSession");
  });
}
