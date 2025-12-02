import { drawBarChart } from "../modules/graphjs/bar.js";
import { jsonFileParser } from "../modules/json/jsonFileParser.js";
import { API as ADMIN_AI_KEY } from "/env.js";

const sidebarToggle = document.getElementById("adminSidebarToggle");
const sidebar = document.querySelector(".admin-panel-sidebar");
const time = document.querySelector(".admin-panel-controls-time");
const adminAiInput = document.getElementById("admin-ai-input");
const adminAiSubmit = document.getElementById("admin-ai-submit");
const adminAiResponse = document.getElementById("admin-ai-response");
const adminAiStatus = document.getElementById("admin-ai-status");
const adminAiChartCanvas = document.getElementById("admin-ai-chart");
const adminAiChips = document.querySelectorAll(".admin-ai-chip");
const logoutBtn = document.getElementById("admin-panel-logout");

const ADMIN_AI_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const ADMIN_AI_TIMEOUT_MS = 22000;
let adminAiLastChart = null;

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

sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  updateToggleIcon();
});

window.addEventListener("resize", updateToggleIcon);

document.querySelectorAll(".admin-panel-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const labelSpan = item.querySelector(".text");
    if (!labelSpan) return;
    const label = labelSpan.textContent.trim().toLowerCase();
    if (label === "ai") return;
    if (["trade", "users", "news"].includes(label)) {
      window.localStorage.setItem("adminTargetSection", label);
      window.location.href = "./admin-panel.html";
    }
  });
});

updateTime();
setInterval(updateTime, 1000);
updateName();

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "./login.html";
    window.localStorage.removeItem("adminSession");
  });
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

const user_data = await jsonFileParser("/data/users_data.json");

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
  "MATIC",
  "AVAX",
];

function getRandomItem(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
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

function buildSyntheticTrades(count = 20) {
  const rows = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - Math.floor(Math.random() * 5));
    rows.push({
      tradeDate: date.toISOString(),
      "Coin type": getRandomItem(tradeCoinTypes) || "BTC",
      Status: getRandomStatus(),
    });
  }
  return rows;
}

function computeTradeChartData(rows) {
  const labels = getLastXDays(5);
  const counts = Object.fromEntries(labels.map((label) => [label, 0]));

  rows.forEach((row) => {
    const rawDate = row.tradeDate || row["Trade Date"];
    const parsed = rawDate ? new Date(rawDate) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return;
    const label = parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (counts[label] !== undefined) counts[label] += 1;
  });

  return { x: labels, y: labels.map((label) => counts[label]) };
}

const syntheticTrades = buildSyntheticTrades(24);

function summarizeTradeStateForAssistant(rows = syntheticTrades) {
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
  if (lower.includes("login") || lower.includes("signin")) {
    return {
      title: "Daily logins (10d)",
      labels: snapshot.loginSnapshot.labels,
      values: snapshot.loginSnapshot.values,
    };
  }
  if (lower.includes("age") || lower.includes("demographic")) {
    return {
      title: "User age mix",
      labels: snapshot.age.labels,
      values: snapshot.age.values,
    };
  }
  if (lower.includes("status") || lower.includes("public")) {
    const s = snapshot.tradeSnapshot.status;
    return {
      title: "Trade visibility mix",
      labels: ["Completed", "Public", "Hidden"],
      values: [s.completed, s.public, s.hidden],
    };
  }
  if (lower.includes("trade") || lower.includes("volume")) {
    return {
      title: "Trades last 5 days",
      labels: snapshot.tradeSnapshot.chartData.x,
      values: snapshot.tradeSnapshot.chartData.y,
    };
  }

  return {
    title: "Top coin holdings",
    labels: snapshot.coinEntries.map(([coin]) => coin),
    values: snapshot.coinEntries.map(([, value]) =>
      Number(Number(value).toFixed(2))
    ),
  };
}

function buildOfflineSummary(snapshot) {
  const topCoins = snapshot.coinEntries
    .slice(0, 3)
    .map(([coin, value]) => `${coin}: ${Number(value).toFixed(1)}`)
    .join(", ");
  const tradeTotal = snapshot.tradeSnapshot.chartData.y.reduce(
    (sum, val) => sum + val,
    0
  );
  const loginValues = snapshot.loginSnapshot.values || [];
  const loginDelta =
    loginValues.length > 1
      ? loginValues[loginValues.length - 1] - loginValues[0]
      : 0;

  return `Users: ${snapshot.totalUsers} (avg age ${snapshot.avgAge ?? "n/a"}). Top coins: ${topCoins || "n/a"}. Trades last 5 days: ${tradeTotal}. Login change: ${
    loginDelta >= 0 ? "+" : ""
  }${loginDelta}.`;
}

function buildOfflineBullets(snapshot, question) {
  const bullets = [];
  bullets.push(
    `Est. online users: ~${snapshot.estimatedOnline} of ${snapshot.totalUsers}.`
  );
  if (snapshot.tradeSnapshot.topCoins.length) {
    const topTrade = snapshot.tradeSnapshot.topCoins[0];
    bullets.push(
      `Most traded coin: ${topTrade[0]} with ${topTrade[1]} recent trades.`
    );
  }
  const loginValues = snapshot.loginSnapshot.values || [];
  if (loginValues.length) {
    const peak = Math.max(...loginValues);
    const peakIndex = loginValues.indexOf(peak);
    const peakDay = snapshot.loginSnapshot.labels?.[peakIndex] || "latest day";
    bullets.push(`Peak login day: ${peakDay} at ${peak} sessions.`);
  }
  if (question && question.toLowerCase().includes("age")) {
    const maxAgeIndex = snapshot.age.values.indexOf(
      Math.max(...snapshot.age.values)
    );
    bullets.push(
      `Largest age band: ${snapshot.age.labels[maxAgeIndex]} (${snapshot.age.values[maxAgeIndex]} users).`
    );
  }
  const coinLine = snapshot.coinEntries
    .slice(0, 2)
    .map(([coin, value]) => `${coin}: ${Number(value).toFixed(1)}`)
    .join(", ");
  if (coinLine) bullets.push(`Top holdings: ${coinLine}.`);
  return bullets.filter(Boolean).slice(0, 5);
}

function renderAssistantResponse(result) {
  if (!adminAiResponse) return;
  adminAiResponse.innerHTML = "";

  const summaryEl = document.createElement("p");
  summaryEl.textContent = result.summary || "No response available yet.";
  adminAiResponse.appendChild(summaryEl);

  if (Array.isArray(result.bullets) && result.bullets.length) {
    const list = document.createElement("ul");
    result.bullets.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    adminAiResponse.appendChild(list);
  }
}

function renderAssistantChart(chart) {
  adminAiLastChart = chart || null;
  if (!adminAiChartCanvas) return;
  const canvas = resizeCanvasToParent(adminAiChartCanvas);
  if (!canvas || !chart || !Array.isArray(chart.labels) || !chart.labels.length) {
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const sanitizedValues = (chart.values || []).map((val) =>
    Number.isFinite(Number(val)) ? Number(val) : 0
  );
  drawBarChart(canvas, { x: chart.labels, y: sanitizedValues }, { maxLabelLength: 8, labelFont: "12px Inter, sans-serif", valueFont: "12px Inter, sans-serif" });
}

function setAssistantStatus(text, state = "ready") {
  if (!adminAiStatus) return;
  adminAiStatus.textContent = text;
  adminAiStatus.dataset.state = state;
}

function buildAssistantPrompt(question) {
  const snapshot = buildAssistantSnapshot();
  const coinLine = snapshot.coinEntries
    .map(([coin, value]) => `${coin}:${Number(value).toFixed(2)}`)
    .join(", ");
  const ageLine = snapshot.age.labels
    .map((label, idx) => `${label}:${snapshot.age.values[idx]}`)
    .join(", ");
  const tradeCoinLine = snapshot.tradeSnapshot.topCoins
    .map(([coin, count]) => `${coin}:${count}`)
    .join(", ");

  return `Admin telemetry:
- Users: ${snapshot.totalUsers}, avg age ${snapshot.avgAge ?? "n/a"}, est online ${snapshot.estimatedOnline}
- Age buckets: ${ageLine}
- Top holdings: ${coinLine}
- Trades last 5 days: ${snapshot.tradeSnapshot.chartData.x.join(
    " / "
  )} counts ${snapshot.tradeSnapshot.chartData.y.join(", ")}
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
        content:
          "You are the admin AI for UKX Wallet. Keep replies concise and always respond with JSON only using the provided schema. You can suggest a chart based on the telemetry you receive.",
      },
      {
        role: "user",
        content: buildAssistantPrompt(question),
      },
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
    if (error.name === "AbortError") {
      throw new Error("AI request timed out");
    }
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
  const parsed =
    typeof rawContent === "string"
      ? parseAssistantResponseText(rawContent)
      : rawContent;
  const snapshot = buildAssistantSnapshot();
  const fallbackChart = pickChartForQuestion(question);
  const fallbackBullets = buildOfflineBullets(snapshot, question);

  const summary = (
    parsed?.summary ||
    parsed?.answer ||
    parsed?.content ||
    ""
  ).toString();

  const bulletsSource =
    (Array.isArray(parsed?.bullets) && parsed.bullets) ||
    (Array.isArray(parsed?.insights) && parsed.insights) ||
    [];
  const bullets = bulletsSource
    .map((item) => item && item.toString().trim())
    .filter(Boolean)
    .slice(0, 5);

  let chart = null;
  if (
    parsed?.chart &&
    Array.isArray(parsed.chart.labels) &&
    Array.isArray(parsed.chart.values) &&
    parsed.chart.labels.length === parsed.chart.values.length &&
    parsed.chart.labels.length > 0
  ) {
    chart = {
      title: parsed.chart.title || fallbackChart.title,
      labels: parsed.chart.labels.slice(0, 10),
      values: parsed.chart.values.slice(0, 10).map((v) => Number(v) || 0),
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
  if (adminAiResponse) {
    adminAiResponse.textContent = "Consulting the assistant...";
  }

  try {
    const raw = await callAdminAssistant(question);
    const normalized = normalizeAssistantResponse(raw, question);
    renderAssistantResponse(normalized);
    renderAssistantChart(normalized.chart);
    setAssistantStatus("Ready for the next question", "ready");
  } catch (error) {
    console.error("Admin AI unavailable, using offline summary", error);
    setAssistantStatus("AI unavailable, showing offline summary.", "error");
    const fallback = buildOfflineFallback(question);
    renderAssistantResponse(fallback);
    renderAssistantChart(fallback.chart);
  }
}

function initAdminAssistant() {
  if (!adminAiResponse) return;
  setAssistantStatus("Ready for a question", "ready");

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

  renderAssistantChart(pickChartForQuestion("coin holdings"));
}

initAdminAssistant();

window.addEventListener("resize", () => {
  renderAssistantChart(adminAiLastChart);
});

function resizeCanvasToParent(canvas) {
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
