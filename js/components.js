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

// Initialize navbar event listeners and functionality
function initializeNavbar() {
    // Theme toggle functionality is now handled in main.js
    if (typeof window.initializeThemeToggle === 'function') {
        window.initializeThemeToggle();
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
    loadNavbar();
});
