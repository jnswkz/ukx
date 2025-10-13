import { initializeButtons } from './main.js';

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

// Render initially once DOM is ready
document.addEventListener('DOMContentLoaded', () => renderTagsFromDataAttr());

// Expose helpers for console/testing
window.ukxNews = {
    addTag,
    removeTag,
    renderTagsFromDataAttr
};

