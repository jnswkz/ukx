// Shared UKX bootstrap: handles global theme application + toggle wiring.
(function applySavedTheme() {
    const storedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', storedTheme);
})();

function initializeThemeToggle() {
    if (window.__themeToggleInitialized) {
        return;
    }

    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) {
        return;
    }

    window.__themeToggleInitialized = true;
    const syncTheme = () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        localStorage.setItem('theme', theme);
    };

    const applyTheme = (nextTheme) => {
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
    });

    // Keep storage in sync if theme changes externally.
    const observer = new MutationObserver(() => syncTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

window.initializeThemeToggle = initializeThemeToggle;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('themeToggle')) {
        initializeThemeToggle();
    }
});
