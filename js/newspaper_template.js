fetch('/components/navbar.html')
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(html => {
        const placeholder = document.getElementById('navbar-placeholder') || document.getElementById('nav-placeholder');
        if (placeholder) {
            placeholder.innerHTML = html;
            // initializeButtons depends on elements inside the navbar; call safely
            try { initializeButtons(); } catch (e) { console.warn('initializeButtons failed', e); }
        } else {
            console.warn('No navbar placeholder found to inject navbar');
        }
    })
    .catch(err => console.warn('Could not load navbar', err));

// --- Tag rendering helpers for the newspaper page ---
function renderTagsFromDataAttr() {
    const el = document.getElementById('meta-tags');
    if (!el) return;

    const raw = el.getAttribute('data-tags') || '';
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean);

    el.innerHTML = '';
    if (tags.length === 0) return;

    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'newspaper-tag';
        span.textContent = tag;
        el.appendChild(span);
    });
}

function addTag(tag) {
    const el = document.getElementById('meta-tags');
    if (!el || !tag) return;
    const raw = el.getAttribute('data-tags') || '';
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.includes(tag)) {
        tags.push(tag);
        el.setAttribute('data-tags', tags.join(','));
        renderTagsFromDataAttr();
    }
}

function removeTag(tag) {
    const el = document.getElementById('meta-tags');
    if (!el || !tag) return;
    const tags = (el.getAttribute('data-tags') || '').split(',').map(t => t.trim()).filter(Boolean);
    const filtered = tags.filter(t => t !== tag);
    el.setAttribute('data-tags', filtered.join(','));
    renderTagsFromDataAttr();
}

/* Render initially once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
    renderTagsFromDataAttr();
    initSidebarToc();
});

/* Expose helpers for console/testing */
window.ukxNews = {
    addTag,
    removeTag,
    renderTagsFromDataAttr
};

/* --- H2 Sidebar (TOC) for the Newspaper page --- */
function initSidebarToc() {
    const container = document.getElementById('Newspaper');
    const sidebar = document.getElementById('sidebar');
    if (!container || !sidebar) return;

    // Ensure sidebar gets proper styling from CSS (.sidebar rules)
    sidebar.classList.add('sidebar');

    const state = {
        observer: null,
        mutationObserver: null,
        linksById: new Map(),
        currentActive: null
    };

    const setActive = (id) => {
        if (state.currentActive === id) return;
        if (state.currentActive && state.linksById.has(state.currentActive)) {
            state.linksById.get(state.currentActive).classList.remove('active');
        }
        const link = state.linksById.get(id);
        if (link) {
            link.classList.add('active');
            state.currentActive = id;
        }
    };

    const rebuild = () => {
        const headings = Array.from(container.querySelectorAll('h2'))
            .filter(h => h.getAttribute('data-toc') !== 'false');

        // Assign stable unique IDs
        const used = new Set(headings.map(h => h.id).filter(Boolean));
        headings.forEach(h => {
            if (!h.id) {
                const base = slugifyBase(h.textContent);
                const id = ensureUniqueId(base, used);
                h.id = id;
                used.add(id);
            }
        });

        // Reset any previous observers and state
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
        state.linksById.clear();
        state.currentActive = null;

        // Render sidebar content
        sidebar.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'sidebar-title';
        title.textContent = 'On this page';
        sidebar.appendChild(title);

        if (headings.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No sections';
            sidebar.appendChild(empty);
            return;
        }

        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'On this page');

        const ul = document.createElement('ul');
        ul.className = 'sidebar-toc';

        headings.forEach(h => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${h.id}`;
            a.textContent = (h.textContent || '').trim();
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(h.id);
                if (target) {
                    // Smooth scroll; CSS scroll-margin-top ensures offset
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Keep URL hash in sync without jumping
                    history.replaceState(null, '', `#${h.id}`);
                }
                setActive(h.id);
            });
            li.appendChild(a);
            ul.appendChild(li);
            state.linksById.set(h.id, a);
        });

        nav.appendChild(ul);
        sidebar.appendChild(nav);

        // Scroll spy using IntersectionObserver
        const navHeight = getNavHeightPx();
        const topOffset = navHeight + 12; // match scroll-margin-top
        state.observer = new IntersectionObserver((entries) => {
            // Pick the intersecting heading nearest to the top
            let candidate = null;
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                if (!candidate || entry.boundingClientRect.top < candidate.boundingClientRect.top) {
                    candidate = entry;
                }
            }
            if (candidate && candidate.target && candidate.target.id) {
                setActive(candidate.target.id);
            } else {
                // Fallback: choose the heading whose top is closest to the navbar line
                const nearest = headings
                    .slice()
                    .sort((a, b) => Math.abs(a.getBoundingClientRect().top - topOffset) - Math.abs(b.getBoundingClientRect().top - topOffset))[0];
                if (nearest) setActive(nearest.id);
            }
        }, {
            root: null,
            rootMargin: `${-topOffset}px 0px -60% 0px`,
            threshold: [0, 0.1, 0.5, 1.0]
        });

        headings.forEach(h => state.observer.observe(h));
    };

    const debouncedRebuild = debounce(rebuild, 160);

    // Initial build
    rebuild();

    // Watch for dynamic content changes
    state.mutationObserver = new MutationObserver(() => debouncedRebuild());
    state.mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });
}

function getNavHeightPx() {
    const css = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();
    const num = parseInt(css.replace('px', ''), 10);
    return Number.isFinite(num) ? num : 88; // default fallback
}

function slugifyBase(text) {
    return (text || '')
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'section';
}

function ensureUniqueId(base, used) {
    let id = base || 'section';
    let i = 2;
    while (used.has(id) || document.getElementById(id)) {
        id = `${base}-${i++}`;
    }
    return id;
}

function debounce(fn, wait) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

