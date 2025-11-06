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
  // Check if user is logged in and update navbar UI
  updateNavbarAuthState();

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
  // Mobile logout
  const logoutBtnMobile = document.getElementById("logoutBtnMobile");
  if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener("click", handleLogout);
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

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
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

  // Currency selector click: go to calculator page
  const currencySelectors = document.querySelectorAll(".nav-actions .currency-selector");
  currencySelectors.forEach(selector => {
    selector.style.cursor = "pointer";
    selector.addEventListener("click", () => {
      window.location.href = "/pages/crypto-calculator.html";
    });
  });
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

/**
 * Update navbar UI based on authentication state
 */
function updateNavbarAuthState() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  // Desktop buttons
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Mobile buttons
  const loginBtnMobile = document.getElementById('loginBtnMobile');
  const signupBtnMobile = document.getElementById('signupBtnMobile');
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');
  
  if (isLoggedIn) {
    // User is logged in - show logout, hide login/signup
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    
    if (loginBtnMobile) loginBtnMobile.style.display = 'none';
    if (signupBtnMobile) signupBtnMobile.style.display = 'none';
    if (logoutBtnMobile) logoutBtnMobile.style.display = 'block';
  } else {
    // User is not logged in - show login/signup, hide logout
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    if (loginBtnMobile) loginBtnMobile.style.display = 'block';
    if (signupBtnMobile) signupBtnMobile.style.display = 'block';
    if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';
  }
}

/**
 * Handle user logout
 */
function handleLogout() {
  // Clear authentication data
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userData');
  
  // Redirect to landing page
  window.location.href = '/index.html';
}

// Auto-load components when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load components in parallel for faster initial page load
  Promise.all([loadNavbar(), loadFooter(), loadChatPopup()]).catch((error) => {
    console.error("Error loading components:", error);
  });
});
