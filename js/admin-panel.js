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

updateTime();
setInterval(updateTime, 1000);
updateName();

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebarToggle.textContent = sidebar.classList.contains("collapsed")
    ? "❯"
    : "❮";

  // close dashboard submenu when collapsing
  if (sidebar.classList.contains("collapsed")) {
    const dashboardSub = document.getElementById("dashboard-submenu");
    if (dashboardSub) {
      dashboardSub.innerHTML = "";
      dashboardSub.setAttribute("aria-hidden", "true");
      const arrow = document.querySelector(
        "#dashboard-item .admin-panel-item-arrow"
      );
      if (arrow) arrow.setAttribute("aria-expanded", "false");
    }
  }
});

document.querySelectorAll(".admin-panel-status-btn").forEach((btn) => {
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

// Bảng động
// ====== Ví dụ dữ liệu ======
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

  // ====== Tạo phần header ======
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerData.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ====== Tạo phần body ======
  const tbody = document.createElement("tbody");

  rowData.forEach((row) => {
    const tr = document.createElement("tr");

    headerData.forEach((key) => {
      const td = document.createElement("td");
      const value = row[key];

      // Nếu là object đặc biệt, ví dụ có type/status/button
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

document
  .querySelector(".admin-panel")
  .appendChild(createAdminTable(headers, rows));
