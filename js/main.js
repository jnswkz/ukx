// UKX Crypto Wallet - Main Application Logic
// Landing Page Interactions and Event Handlers

console.log('main.js: Script loaded');

/**
 * Initialize theme toggle functionality
 * DEFINED FIRST so it's available immediately when components.js needs it
 */
function initializeThemeToggle() {
    console.log('initializeThemeToggle called');
    const themeToggle = document.getElementById('themeToggle');
    
    // Check for saved theme preference or default to dark
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        console.log('Theme toggle button found, adding event listener');
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            console.log('Theme switched to:', newTheme);
        });
    } else {
        console.warn('Theme toggle button not found in DOM');
    }
    
    console.log('Theme toggle initialized, current theme:', currentTheme);
}

// Expose the function globally IMMEDIATELY
window.initializeThemeToggle = initializeThemeToggle;
console.log('main.js: initializeThemeToggle exposed on window');

document.addEventListener('DOMContentLoaded', function() {
    console.log('UKX Landing Page initialized');

    // ========== FAQ Accordion Functionality ==========
    initializeFAQ();

    // ========== Navigation Interactions ==========
    initializeNavigation();

    // ========== Button Actions ==========
    initializeButtons();

    // ========== Theme Toggle ==========
    // Theme toggle is now initialized in components.js after navbar loads
    // to ensure the button exists in the DOM before we try to access it
    
    // ========== Smooth Scroll ==========
    // Smooth scroll is handled by CSS scroll-behavior.
});

/**
 * Initialize FAQ accordion behavior
 */
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const toggle = item.querySelector('.faq-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', function() {
                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('open')) {
                        otherItem.classList.remove('open');
                    }
                });
                
                // Toggle current item
                item.classList.toggle('open');
            });
        }
    });
    
    console.log('FAQ accordion initialized');
}

/**
 * Initialize navigation menu interactions
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // If it's an anchor link, prevent default and smooth scroll
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
        
        // Hover effect
        link.addEventListener('mouseenter', function() {
            console.log('Navigating to:', this.textContent);
        });
    });
    
    // Sticky header on scroll
    let lastScrollTop = 0;
    const navBar = document.querySelector('.nav-bar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (navBar) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                navBar.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                navBar.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);
    
    console.log('Navigation initialized');
}

/**
 * Initialize all button click handlers
 */
function initializeButtons() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            console.log('Login clicked');
            // Only redirect if not already on login page
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = '/pages/login.html';
            }
        });
    }
    
    // Signup buttons (multiple on page)
    const signupBtns = [
        document.getElementById('signupBtn'),
        document.getElementById('ctaSignupBtn')
    ];
    
    signupBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                console.log('Signup clicked');
                // Navigate to signup page
                window.location.href = '/pages/signup.html';
            });
        }
    });
    
    // Hero buttons
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            console.log('Start clicked');
            // Scroll to features section
            const featuresSection = document.querySelector('.features-section');
            if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    const contactBtn = document.getElementById('contactBtn');
    if (contactBtn) {
        contactBtn.addEventListener('click', function() {
            console.log('Contact clicked');
            // Scroll to footer
            const footer = document.querySelector('.footer-section');
            if (footer) {
                footer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Feature Learn More buttons
    const featureBtns = document.querySelectorAll('.btn-feature');
    featureBtns.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const featureCard = this.closest('.feature-card');
            const featureTitle = featureCard.querySelector('.feature-title').textContent;
            console.log('Learn more about:', featureTitle);
            // TODO: Implement feature detail modal or redirect
            alert(`Learn more about ${featureTitle} - Coming soon!`);
        });
    });
    
    console.log('Buttons initialized');
}

/**
 * Initialize smooth scroll behavior
 */
function initializeSmoothScroll() {
    // This is handled by CSS scroll-behavior, but adding for completeness
    console.log('Smooth scroll enabled');
}

/**
 * Utility: Add entrance animations on scroll
 */
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all feature cards, FAQ items, etc.
    const animatedElements = document.querySelectorAll('.feature-card, .faq-item, .cta-container');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    console.log('Scroll animations initialized');
}

// Call scroll animations after a short delay to ensure DOM is ready
setTimeout(initializeScrollAnimations, 100);

/**
 * Placeholder for future wallet functionality
 */
window.UKX = {
    wallet: {
        balance: null,
        transactions: [],
        
        init: function() {
            console.log('Wallet module initialized (placeholder)');
            // TODO: Implement wallet dashboard when needed
        },
        
        send: function(address, amount, token) {
            console.log('Send:', { address, amount, token });
            // TODO: Implement send flow
        },
        
        receive: function() {
            console.log('Receive clicked');
            // TODO: Show receive modal with QR code
        }
    },
    
    chart: {
        init: function(canvas, data) {
            console.log('Chart module initialized (placeholder)');
            // TODO: Integrate with modules/graphjs/graph.js
        }
    }
};

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.UKX;
}
