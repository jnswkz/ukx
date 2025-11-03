/**
 * Component Loader - Loads reusable HTML components
 * This allows us to keep components like navbar in separate files
 * and include them across multiple pages
 */

// Load navbar component
async function loadNavbar() {
  const navbarPlaceholder = document.getElementById("navbar-placeholder");
  if (!navbarPlaceholder) return;

  try {
    const response = await fetch("/components/navbar.html");
    if (!response.ok) throw new Error("Failed to load navbar");

    const html = await response.text();
    navbarPlaceholder.innerHTML = html;

    // Initialize navbar functionality after loading
    initializeNavbar();
  } catch (error) {
    console.error("Error loading navbar:", error);
  }
}

// Load footer component
async function loadFooter() {
  const footerPlaceholder = document.getElementById("footer-placeholder");
  if (!footerPlaceholder) return;

  try {
    const response = await fetch("/components/footer.html");
    if (!response.ok) throw new Error("Failed to load footer");
    const html = await response.text();
    footerPlaceholder.innerHTML = html;
  } catch (error) {
    console.error("Error loading footer:", error);
  }
}

// Load chat-popup component
async function loadChatPopup() {
  const chatPopupPlaceholder = document.getElementById(
    "chat-popup-placeholder"
  );
  if (!chatPopupPlaceholder) return;

  try {
    const response = await fetch("/components/chat-popup.html");
    if (!response.ok) throw new Error("Failed to load chat-popup");
    const html = await response.text();
    chatPopupPlaceholder.innerHTML = html;
    initializeChat();
  } catch (error) {
    console.error("Error loading chat-popup:", error);
  }
}

// Initialize navbar event listeners and functionality
function initializeNavbar() {
  // Hamburger menu logic
  const hamburger = document.getElementById("navHamburger");
  const mobileMenu = document.getElementById("navMobileMenu");
  const mobileClose = document.getElementById("navMobileClose");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.add("open");
    });
  }
  if (mobileClose && mobileMenu) {
    mobileClose.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
    });
  }
  // Mobile login/signup
  const loginBtnMobile = document.getElementById("loginBtnMobile");
  if (loginBtnMobile) {
    loginBtnMobile.addEventListener("click", () => {
      window.location.href = "/pages/login.html";
    });
  }
  const signupBtnMobile = document.getElementById("signupBtnMobile");
  if (signupBtnMobile) {
    signupBtnMobile.addEventListener("click", () => {
      window.location.href = "/pages/signup.html";
    });
  }
  // Theme toggle functionality is now handled in main.js
  console.log(
    "Checking for initializeThemeToggle:",
    typeof window.initializeThemeToggle
  );
  if (typeof window.initializeThemeToggle === "function") {
    console.log("Calling initializeThemeToggle from components.js");
    window.initializeThemeToggle();
  } else {
    console.warn(
      "initializeThemeToggle not available yet, will be initialized by main.js"
    );
  }

  // Login button
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/pages/login.html";
    });
  }

  // Signup button
  const signupBtn = document.getElementById("signupBtn");
  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      window.location.href = "/pages/signup.html";
    });
  }

  // Load saved theme preference is now handled in main.js
  // Logo click: go to landing page
  const navLogo = document.querySelector(".nav-logo");
  if (navLogo) {
    navLogo.style.cursor = "pointer";
    navLogo.addEventListener("click", () => {
      window.location.href = "/index.html";
    });
  }
}

function initializeChat() {
  // Elements
  const chatButton = document.getElementById("chat-button");
  const chatPopup = document.getElementById("chat-popup");
  const closeChat = document.getElementById("close-chat");
  const sendBtn = document.getElementById("send-btn");
  const userInput = document.getElementById("user-input");
  const chatBody = document.getElementById("chat-body");

  // Bật chat
  chatButton.onclick = () => {
    chatPopup.classList.remove("hidden");
    chatButton.classList.add("hidden");
  };

  closeChat.onclick = () => {
    chatPopup.classList.add("hidden");
    chatButton.classList.remove("hidden");
  };

  // Gửi tin
  sendBtn.onclick = sendMessage;
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    const userMsg = document.createElement("div");
    userMsg.className = "user-message";
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    userInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Cho bé si nghũy
    const botMsg = document.createElement("div");
    botMsg.className = "bot-message ";
    botMsg.textContent = "Đang suy nghĩ";
    chatBody.appendChild(botMsg);

    let dots = 0;
    const maxDots = 3;
    const interval = setInterval(() => {
      dots = (dots + 1) % (maxDots + 1);
      botMsg.textContent = "Đang suy nghĩ" + ".".repeat(dots);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);

    // Giả lập 2s chờ API
    setTimeout(() => {
      clearInterval(interval);
      botMsg.textContent = botReply(text);
    }, 2000);
  }

  function botReply(message) {
    // Gọi API ở đây
    return "Placeholder";
  }
  console.log("Chat popup initialized");
}

// Auto-load components when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load components in parallel for faster initial page load
  Promise.all([loadNavbar(), loadFooter(), loadChatPopup()]).catch((error) => {
    console.error("Error loading components:", error);
  });
});
