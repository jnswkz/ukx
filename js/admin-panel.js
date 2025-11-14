import { drawBarChart } from "../modules/graphjs/bar.js";

const sidebarToggle = document.getElementById("adminSidebarToggle");
const sidebar = document.querySelector(".admin-panel-sidebar");
const time = document.querySelector(".admin-panel-controls-time");

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
  let userData = JSON.parse(window.localStorage.getItem("userData")) || {};
  const storedName = userData["name"] || "Admin";
  nameElement.textContent = storedName;
}

// Menu item switching logic
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
    ]);
    // Vẽ chart tt users khi chuyển sang tab Users
    resizeCanvasToParent("admin-panel-login-chart");
    drawBarChart("admin-panel-login-chart", loginChartData);
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
    ]);
    removeHidden(["admin-panel-news"]);
  }
}

// Mặc định hiển thị tab Trade
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

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebarToggle.textContent = sidebar.classList.contains("collapsed")
    ? "❯"
    : "❮";
});

// Bảng động
// ====== dữ liệu mẫu cho bảng trade ======
const headers = [
  "Trade ID",
  "Trade Date",
  "From",
  "To",
  "Coin type",
  "Price",
  "Status",
];

const rows = [
  {
    "Trade ID": 12,
    "Trade Date": "11/11/2020",
    From: "Mẫn Dần",
    To: "Quý Bửu",
    "Coin type": "BTC",
    Price: 0.01,
    Status: {
      type: "status",
      kind: "span",
      class: "completed",
      text: "Completed",
    },
  },
  {
    "Trade ID": 13,
    "Trade Date": "11/11/2020",
    From: "Ngọc Duy",
    To: "Basupeso",
    "Coin type": "ETH",
    Price: 2.5,
    Status: { type: "status", kind: "button", class: "public", text: "Public" },
  },
  {
    "Trade ID": 14,
    "Trade Date": "12/11/2020",
    From: "Phúc Lâm",
    To: "Hồng Hà",
    "Coin type": "USDT",
    Price: 1500,
    Status: { type: "status", kind: "button", class: "hide", text: "Hide" },
  },
];

function createAdminTable(headerData, rowData) {
  const table = document.createElement("table");
  table.className = "admin-panel-table";

  // Tạo phần header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerData.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Tạo phần body
  const tbody = document.createElement("tbody");

  rowData.forEach((row) => {
    const tr = document.createElement("tr");
    headerData.forEach((key) => {
      const td = document.createElement("td");
      const value = row[key];

      // Nếu là status(object)
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
  const response = await fetch("../data/accounts_data.json");
  const data = await response.json();
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
document
  .querySelector(".admin-panel-trade")
  .appendChild(createAdminTable(headers, rows));

const { usersHeaders, usersRows } = await getProcessedUserData();
document
  .querySelector(".admin-panel-users")
  .appendChild(createAdminTable(usersHeaders, usersRows));

const { newsHeaders, newsRows } = await getProcessedNewsData();
document
  .querySelector(".admin-panel-news")
  .appendChild(createAdminTable(newsHeaders, newsRows));

// nút status
document.querySelectorAll(".admin-panel-status-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    console.log("Clicked");
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

// chart
function resizeCanvasToParent(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

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

const tradeChartData = {
  x: getLastXDays(5),
  y: [1242, 1350, 1420, 1282, 1100],
};

const loginChartData = {
  x: getLastXDays(10),
  y: [562, 600, 580, 620, 700, 552, 800, 820, 900, 950],
};

resizeCanvasToParent("admin-panel-trade-chart");
drawBarChart("admin-panel-trade-chart", tradeChartData);
