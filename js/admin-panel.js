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

// Toggle / insert dashboard submenu items when dashboard item clicked
const dashboardItem = document.querySelector(".admin-panel-menu-item.active");
const dashboardSubmenu = document.getElementById("dashboard-submenu");

function toggleDashboardSubmenu() {
  if (!dashboardSubmenu || !dashboardItem) return;

  const isOpen = dashboardSubmenu.childElementCount > 0; // Nếu không có con có nghĩa submenu k mở
  if (isOpen) {
    dashboardSubmenu.innerHTML = "";
    dashboardSubmenu.setAttribute("aria-hidden", "true");
    const arrow = dashboardItem.querySelector(".admin-panel-item-arrow");
    arrow.textContent = "▾";
  } else {
    const items = ["Users", "Trade", "New"];
    items.forEach((t) => {
      const div = document.createElement("div");
      div.className = "admin-panel-submenu-item";
      div.textContent = t;
      dashboardSubmenu.appendChild(div);
    });
    dashboardSubmenu.setAttribute("aria-hidden", "false");
    const arrow = dashboardItem.querySelector(".admin-panel-item-arrow");
    arrow.textContent = "▴";
  }
}

// attach click: clicking anywhere on the dashboard item toggles submenu
if (dashboardItem) {
  dashboardItem.addEventListener("click", (e) => {
    // prevent toggling when clicking links inside submenu area if expanded
    toggleDashboardSubmenu();
  });
}
