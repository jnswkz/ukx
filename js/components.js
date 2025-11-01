/**
 * Component Loader - Loads reusable HTML components
 * This allows us to keep components like navbar in separate files
 * and include them across multiple pages
 */

// Load navbar component
async function loadNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (!navbarPlaceholder) return;

    try {
        const response = await fetch('/components/navbar.html');
        if (!response.ok) throw new Error('Failed to load navbar');
        
        const html = await response.text();
        navbarPlaceholder.innerHTML = html;
        
        // Initialize navbar functionality after loading
        initializeNavbar();
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Load footer component
async function loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;

    try {
        const response = await fetch('/components/footer.html');
        if (!response.ok) throw new Error('Failed to load footer');
        const html = await response.text();
        footerPlaceholder.innerHTML = html;
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Initialize navbar event listeners and functionality
function initializeNavbar() {
    // Hamburger menu logic
    const hamburger = document.getElementById('navHamburger');
    const mobileMenu = document.getElementById('navMobileMenu');
    const mobileClose = document.getElementById('navMobileClose');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.add('open');
        });
    }
    if (mobileClose && mobileMenu) {
        mobileClose.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    }
    // Mobile login/signup
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    if (loginBtnMobile) {
        loginBtnMobile.addEventListener('click', () => {
            window.location.href = '/pages/login.html';
        });
    }
    const signupBtnMobile = document.getElementById('signupBtnMobile');
    if (signupBtnMobile) {
        signupBtnMobile.addEventListener('click', () => {
            window.location.href = '/pages/signup.html';
        });
    }
    // Theme toggle functionality is now handled in main.js
    console.log('Checking for initializeThemeToggle:', typeof window.initializeThemeToggle);
    if (typeof window.initializeThemeToggle === 'function') {
        console.log('Calling initializeThemeToggle from components.js');
        window.initializeThemeToggle();
    } else {
        console.warn('initializeThemeToggle not available yet, will be initialized by main.js');
    }

    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/pages/login.html';
        });
    }

    // Signup button
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            window.location.href = '/pages/signup.html';
        });
    }

    // Load saved theme preference is now handled in main.js
        // Logo click: go to landing page
        const navLogo = document.querySelector('.nav-logo');
        if (navLogo) {
            navLogo.style.cursor = 'pointer';
            navLogo.addEventListener('click', () => {
                window.location.href = '/index.html';
            });
        }
}

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load components in parallel for faster initial page load
    Promise.all([loadNavbar(), loadFooter()]).catch(error => {
        console.error('Error loading components:', error);
    });
});
