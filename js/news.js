import { jsonFileParser } from '../modules/json/jsonFileParser.js';

// News page: render articles, search and tag filters
document.addEventListener('DOMContentLoaded', async function() {
    // Sample data (provided by user)
    let articles = [
        {
            title: "Exploring Cross-Chain Yield Farming in Decentralized Finance",
            author: "News Feeder",
            date: "2025-05-23",
            tags: ["Cross-Chain", "Yield Farming", "DeFi", "Blockchain"],
            filename: "exploring-cross-chain-yield-farming-in-decentralized-finance.html",
            image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=500&fit=crop",
            excerpt: "A practical look at how yield farming works across chains and what risks/rewards to expect."
        },
        {
            title: "Understanding Layer 2 Scaling Solutions for Ethereum",
            author: "Blockchain Reporter",
            date: "2025-06-21",
            tags: ["Layer-2", "Ethereum", "Scaling", "Blockchain"],
            filename: "understanding-layer-2-scaling-solutions-for-ethereum.html",
            image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=500&fit=crop",
            excerpt: "An explainer of rollups, optimistic and zk approaches to scaling Ethereum."
        }
    ];

    const data  = await jsonFileParser('/data/article_data.json');
    // console.log('Loaded article data:', data);
    articles = [];
    data.forEach(item => articles.push(item));

    // DOM containers
    const featuredContainer = document.getElementById('news-featured');
    const listContainer = document.getElementById('news-list');
    const tagFiltersContainer = document.getElementById('tag-filters');
    const searchInput = document.getElementById('news-search');
    const clearButton = document.getElementById('clear-filters');
    const noResults = document.getElementById('no-results');

    // State
    let selectedTags = new Set();
    let searchQuery = '';

    // Build unique tag list
    const allTags = Array.from(new Set(articles.flatMap(a => a.tags))).sort();

    function createTagButton(tag) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-button';
        btn.textContent = tag;
        btn.setAttribute('aria-pressed', 'false');

        btn.addEventListener('click', () => {
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
                btn.setAttribute('aria-pressed', 'false');
            } else {
                selectedTags.add(tag);
                btn.setAttribute('aria-pressed', 'true');
            }
            render();
        });

        return btn;
    }

    // Render tag buttons
    function renderTags() {
        tagFiltersContainer.innerHTML = '';
        allTags.forEach(tag => {
            tagFiltersContainer.appendChild(createTagButton(tag));
        });
    }

    // Navigation helper (articles are in same folder as news.html)
    function goToArticle(filename) {
        // From pages/news.html, article files are expected in same folder
        window.location.href = `./news/${filename}`;
    }

    // Create article card element
    function createCard(article) {
        const articleEl = document.createElement('article');
        articleEl.className = 'news-card';

        articleEl.tabIndex = 0;
        articleEl.setAttribute('role', 'link');

        articleEl.innerHTML = `
            <div class="news-card-image">
                <img src="https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=500&fit=crop" alt="${escapeHtml(article.title)}">
            </div>
            <div class="news-card-content">
                <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                <p class="news-card-excerpt">${escapeHtml(article.excerpt)}</p>
            </div>
        `;

        articleEl.addEventListener('click', () => goToArticle(article.filename));
        articleEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToArticle(article.filename);
            }
        });

        return articleEl;
    }

    // Create featured article element
    function createFeatured(article) {
        const art = document.createElement('article');
        art.className = 'news-featured-card';
        art.tabIndex = 0;
        art.setAttribute('role', 'link');

        art.innerHTML = `
            <div class="news-featured-image">
                <img src="https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=500&fit=crop" alt="${escapeHtml(article.title)}">
            </div>
            <div class="news-featured-content">
                <h2 class="news-featured-title">${escapeHtml(article.title)}</h2>
                <p class="news-featured-date">${escapeHtml(article.date)} • ${escapeHtml(article.author)}</p>
                <p class="news-featured-excerpt">${escapeHtml(article.excerpt)}</p>
            </div>
        `;

        art.addEventListener('click', () => goToArticle(article.filename));
        art.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToArticle(article.filename);
            }
        });

        return art;
    }

    // Escape helper to avoid accidental HTML injection from data
    function escapeHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Filter logic
    function filterArticles() {
        const q = searchQuery.trim().toLowerCase();
        return articles.filter(a => {
            // tag filter: if any tags selected, article must include all selected tags (logical AND)
            if (selectedTags.size > 0) {
                for (const t of selectedTags) {
                    if (!a.tags.map(x => x.toLowerCase()).includes(t.toLowerCase())) return false;
                }
            }

            if (!q) return true;

            const inTitle = a.title.toLowerCase().includes(q);
            const inAuthor = (a.author || '').toLowerCase().includes(q);
            const inTags = a.tags.join(' ').toLowerCase().includes(q);

            return inTitle || inAuthor || inTags;
        });
    }

    // Render function
    function render() {
        const results = filterArticles();

        // featured: pick the first result as featured (if any)
        featuredContainer.innerHTML = '';
        listContainer.innerHTML = '';

        if (results.length === 0) {
            noResults.style.display = 'block';
            return;
        } else {
            noResults.style.display = 'none';
        }

        const [first, ...rest] = results;
        if (first) {
            featuredContainer.appendChild(createFeatured(first));
        }

        // Render remaining articles in grid
        const toShow = rest.length ? rest : results.slice(1); // if only one result, grid will be empty
        toShow.forEach(a => {
            listContainer.appendChild(createCard(a));
        });
    }

    // Debounce for search input
    function debounce(fn, wait = 200) {
        let t = null;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchQuery = e.target.value || '';
            render();
        }, 180));
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            selectedTags.clear();
            searchQuery = '';
            if (searchInput) searchInput.value = '';
            // reset aria state for tag buttons
            Array.from(tagFiltersContainer.querySelectorAll('button')).forEach(b => {
                b.setAttribute('aria-pressed', 'false');
            });
            render();
        });
    }

    // Initial render
    renderTags();
    render();
});
