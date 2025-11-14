// Immediately apply theme from localStorage to prevent flash
(function() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
})();

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

    // ========== Intro Reveal ==========
    initializeLandingIntro();

    // ========== FAQ Accordion Functionality ==========
    initializeFAQ();

    // ========== Navigation Interactions ==========
    initializeNavigation();

    // ========== Button Actions ==========
    initializeButtons();

    // ========== Live Hero Stats ==========
    initializeHeroStatsCounter();

    // ========== Platform Showcase Animations ==========
    initializePlatformShowcase();

    // ========== CTA Media ==========
    initializeCTAVideo();

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
        const answer = item.querySelector('.faq-answer');
        if (answer && !answer.hasAttribute('hidden')) {
            answer.setAttribute('hidden', '');
        }
        if (toggle && !toggle.hasAttribute('aria-expanded')) {
            toggle.setAttribute('aria-expanded', 'false');
        }
        
        if (toggle && answer) {
            toggle.addEventListener('click', function() {
                const isOpen = item.classList.contains('open');

                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    if (otherItem === item) {
                        return;
                    }
                    otherItem.classList.remove('open');
                    const otherToggle = otherItem.querySelector('.faq-toggle');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherToggle) {
                        otherToggle.setAttribute('aria-expanded', 'false');
                    }
                    if (otherAnswer && !otherAnswer.hasAttribute('hidden')) {
                        otherAnswer.setAttribute('hidden', '');
                    }
                });
                
                // Toggle current item
                if (isOpen) {
                    item.classList.remove('open');
                    toggle.setAttribute('aria-expanded', 'false');
                    answer.setAttribute('hidden', '');
                } else {
                    item.classList.add('open');
                    toggle.setAttribute('aria-expanded', 'true');
                    answer.removeAttribute('hidden');
                }
            });
        }
    });
    
    console.log('FAQ accordion initialized');
}

/**
 * Initialize Chat popup component
 */

// function initializeChatPopup() {
//     const chatPlaceholder = document.getElementById('chat-placeholder');
//     if (chatPlaceholder) {
//         const chatPopup = document.createElement('chat-popup');
//         chatPlaceholder.appendChild(chatPopup);
//         console.log('Chat popup component initialized');
//     } else {
//         console.warn('Chat placeholder not found in DOM');
//     }
// }


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

    // Logout button
    // Removed duplicate logout handler; handled in components.js
    
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
            if (featureTitle === 'Dashboard'){
                window.location.href = '/pages/dashboard.html';
            }
            else {
                if (featureTitle === 'Newspaper'){
                    window.location.href = '/pages/news.html';
                }
                else{
                    window.location.href = '/pages/trading-simulator.html';
                }
            }
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
 * Live "currently winning big" hero stats incrementer
 * Increases the number at random intervals and amounts, keeping the suffix text.
 */
function initializeHeroStatsCounter() {
    if (window.__heroStatsInitialized) return;
    window.__heroStatsInitialized = true;

    const el = document.querySelector('.hero-stats');
    if (!el) {
        console.warn('Hero stats element not found');
        return;
    }

    const original = el.textContent.trim();
    const match = original.match(/^([\d,]+)/);
    let value = match ? parseInt(match[1].replace(/,/g, ''), 10) : 3621336;
    const suffix = match ? original.slice(match[1].length).trim() : 'currently winning big';
    const formatter = new Intl.NumberFormat('en-US');
    let running = true;
    let scheduled = false;

    function scheduleNext() {
        if (scheduled) return;
        scheduled = true;
        const nextDelay = Math.floor(Math.random() * 5000) + 1500; // 1.5s - 6.5s
        setTimeout(() => {
            scheduled = false;
            tick();
        }, nextDelay);
    }

    function tick() {
        if (!running) return;
        const increment = 50 + Math.floor(Math.random() * 450); // 50-499
        value += increment;
        el.textContent = `${formatter.format(value)} ${suffix}`;
        scheduleNext();
    }

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) {
            scheduleNext();
        }
    });

    // Start the schedule
    scheduleNext();
}

const Ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
};

function tween({ duration = 600, delay = 0, ease = 'outCubic', onUpdate, onComplete }) {
    const easingFn = typeof ease === 'function' ? ease : Ease[ease] || Ease.outCubic;
    let startTime = null;

    function step(now) {
        if (startTime === null) {
            startTime = now + delay;
        }

        if (now < startTime) {
            requestAnimationFrame(step);
            return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easingFn(progress);

        if (onUpdate) {
            onUpdate(eased, progress);
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else if (onComplete) {
            onComplete();
        }
    }

    requestAnimationFrame(step);
}

function setInitialElementState(element, { x = 0, y = 0, scale = 1, opacity = 0 } = {}) {
    if (!element) return;
    element.style.willChange = 'transform, opacity';
    element.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    element.style.opacity = opacity;
}

function animateTransform(element, { from = {}, to = {}, duration = 800, delay = 0, ease = 'outCubic' } = {}) {
    if (!element) return;
    const start = {
        x: from.x ?? 0,
        y: from.y ?? 0,
        scale: from.scale ?? 1,
        opacity: from.opacity ?? (parseFloat(getComputedStyle(element).opacity) || 0)
    };

    const end = {
        x: to.x ?? start.x,
        y: to.y ?? start.y,
        scale: to.scale ?? start.scale,
        opacity: to.opacity ?? start.opacity
    };

    element.style.transform = `translate(${start.x}px, ${start.y}px) scale(${start.scale})`;
    element.style.opacity = start.opacity;

    tween({
        duration,
        delay,
        ease,
        onUpdate: (eased) => {
            const current = {
                x: start.x + (end.x - start.x) * eased,
                y: start.y + (end.y - start.y) * eased,
                scale: start.scale + (end.scale - start.scale) * eased,
                opacity: start.opacity + (end.opacity - start.opacity) * eased
            };

            element.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
            element.style.opacity = current.opacity;
        }
    });
}

/**
 * Showcase animation controller for the Hyperliquid-style section
 */
function initializePlatformShowcase() {
    const showcase = document.querySelector('.platform-showcase');
    if (!showcase) {
        return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const featureBlocks = Array.from(showcase.querySelectorAll('.platform-feature'));
    const videoShell = showcase.querySelector('.platform-showcase__video-shell');
    const heading = showcase.querySelector('.platform-showcase__eyebrow');

    featureBlocks.forEach((block, index) => {
        const delay = 120 * index;
        block.dataset.animDelay = String(delay);
        block.style.setProperty('--feature-seq-delay', `${delay}ms`);
        setInitialElementState(block, {
            x: block.closest('.platform-showcase__features--left') ? -40 : 40,
            y: 60,
            scale: 0.9,
            opacity: 0
        });
    });

    setInitialElementState(videoShell, { y: 80, scale: 0.92, opacity: 0 });
    setInitialElementState(heading, { y: 30, opacity: 0 });

    const playFeatureAnimation = (el, delay = 0) => {
        if (!el || el.dataset.animState === 'done') return;
        el.dataset.animState = 'done';

        if (reduceMotion) {
            el.classList.add('is-revealed');
            el.style.opacity = '';
            el.style.transform = '';
            return;
        }

        const fromX = el.closest('.platform-showcase__features--left') ? -40 : 40;
        animateTransform(el, {
            duration: 900,
            delay,
            ease: 'outExpo',
            from: { x: fromX, y: 60, scale: 0.9, opacity: 0 },
            to: { x: 0, y: 0, scale: 1, opacity: 1 }
        });
    };

    const playShellAnimation = () => {
        if (!videoShell || videoShell.dataset.animState === 'done') return;
        videoShell.dataset.animState = 'done';

        if (reduceMotion) {
            videoShell.style.opacity = '';
            videoShell.style.transform = '';
            return;
        }

        animateTransform(videoShell, {
            duration: 1100,
            ease: 'outExpo',
            from: { y: 80, scale: 0.92, opacity: 0 },
            to: { y: 0, scale: 1, opacity: 1 }
        });
    };

    const playHeadingAnimation = () => {
        if (!heading || heading.dataset.animState === 'done') return;
        heading.dataset.animState = 'done';

        if (reduceMotion) {
            heading.style.opacity = '';
            heading.style.transform = '';
            return;
        }

        animateTransform(heading, {
            duration: 800,
            ease: 'outCubic',
            from: { y: 30, opacity: 0 },
            to: { y: 0, opacity: 1 }
        });
    };

    const reveal = () => {
        showcase.classList.add('is-visible');
        playShellAnimation();
        playHeadingAnimation();
    };

    const startFeatureSequence = () => {
        if (startFeatureSequence.started || !featureBlocks.length) {
            return;
        }
        startFeatureSequence.started = true;

        featureBlocks.forEach(block => {
            const delay = parseInt(block.dataset.animDelay || '0', 10);
            playFeatureAnimation(block, delay);
        });
    };

    if (!('IntersectionObserver' in window)) {
        reveal();
        startFeatureSequence();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                reveal();
                startFeatureSequence();
                observer.disconnect();
            }
        });
    }, { threshold: 0.25 });

    observer.observe(showcase);
}

function initializeCTAVideo() {
    const video = document.querySelector('.cta-video[data-video-src]');
    if (!video) {
        return;
    }

    const overlay = video.closest('.cta-media')?.querySelector('.cta-video-overlay');
    const setOverlayVisibility = (isPlaying) => {
        if (!overlay) {
            return;
        }
        overlay.classList.toggle('is-hidden', isPlaying);
    };

    const loadVideo = () => {
        if (video.dataset.videoLoaded === 'true') {
            return;
        }
        const sources = [];
        const webmSrc = video.dataset.videoSrcWebm;
        if (webmSrc) {
            sources.push({ src: webmSrc, type: 'video/webm' });
        }

        const mp4Src = video.dataset.videoSrcMp4 || video.dataset.videoSrc;
        if (mp4Src) {
            sources.push({ src: mp4Src, type: 'video/mp4' });
        }

        if (sources.length === 0) {
            return;
        }

        sources.forEach(({ src, type }) => {
            const source = document.createElement('source');
            source.src = src;
            if (type) {
                source.type = type;
            }
            video.appendChild(source);
        });
        video.load();
        video.dataset.videoLoaded = 'true';
        // Removed autoplay - video will only play when user clicks play button
        // video.play()
        //     .then(() => setOverlayVisibility(true))
        //     .catch(() => setOverlayVisibility(false));
    };

    video.addEventListener('playing', () => setOverlayVisibility(true));
    video.addEventListener('pause', () => setOverlayVisibility(false));
    video.addEventListener('ended', () => setOverlayVisibility(false));

    if (!('IntersectionObserver' in window)) {
        loadVideo();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadVideo();
                observer.disconnect();
            }
        });
    }, { threshold: 0.4 });

    observer.observe(video);
}

function initializeLandingIntro() {
    const landingPage = document.querySelector('.landing-page');
    if (!landingPage) {
        document.body.classList.remove('landing-intro-lock');
        return;
    }

    const releaseIntro = () => {
        if (releaseIntro.released) {
            return;
        }
        releaseIntro.released = true;
        landingPage.classList.remove('landing-page--intro');
        document.body.classList.remove('landing-intro-lock');
    };

    const startRevealTimer = () => {
        if (startRevealTimer.started) {
            return;
        }
        startRevealTimer.started = true;
        setTimeout(releaseIntro, 1000);
    };

    const heroVideo = document.querySelector('.hero-video-background');
    if (!heroVideo) {
        startRevealTimer();
        return;
    }

    if (!heroVideo.paused && heroVideo.readyState >= 2) {
        startRevealTimer();
    } else {
        heroVideo.addEventListener('playing', startRevealTimer, { once: true });
        heroVideo.addEventListener('error', startRevealTimer, { once: true });
        heroVideo.addEventListener('stalled', startRevealTimer, { once: true });
        heroVideo.play().catch(() => startRevealTimer());
    }

    setTimeout(startRevealTimer, 1000);
}

// /**
//  * Placeholder for future wallet functionality
//  */
// window.UKX = {
//     wallet: {
//         balance: null,
//         transactions: [],
        
//         init: function() {
//             console.log('Wallet module initialized (placeholder)');
//             // TODO: Implement wallet dashboard when needed
//         },
        
//         send: function(address, amount, token) {
//             console.log('Send:', { address, amount, token });
//             // TODO: Implement send flow
//         },
        
//         receive: function() {
//             console.log('Receive clicked');
//             // TODO: Show receive modal with QR code
//         }
//     },
    
//     chart: {
//         init: function(canvas, data) {
//             console.log('Chart module initialized (placeholder)');
//             // TODO: Integrate with modules/graphjs/graph.js
//         }
//     }
// };

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.UKX;
}
