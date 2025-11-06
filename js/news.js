import { jsonFileParser } from '../modules/json/jsonFileParser.js';

function sortByDateDesc(a, b) {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
}


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
    // Sort articles by date descending
    articles.sort(sortByDateDesc);

    // DOM containers
    const featuredContainer = document.getElementById('news-featured');
    const listContainer = document.getElementById('news-list');
    const tagFiltersContainer = document.getElementById('tag-filters');
    const searchInput = document.getElementById('news-search');
    const clearButton = document.getElementById('clear-filters');
    const noResults = document.getElementById('no-results');
    const itemsPerPageSelect = document.getElementById('items-per-page');

    // State
    let selectedTags = new Set();
    let searchQuery = '';
    let currentPage = 1;
    let itemsPerPage = 13; // 1 featured + 12 in grid (default)
    let showAllTags = false;
    const maxVisibleTags = 15; // Limit initial visible tags

    // Build unique tag list with frequency count
    const tagFrequency = {};
    articles.forEach(a => {
        a.tags.forEach(tag => {
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
    });
    
    // Sort tags by frequency (most common first), then alphabetically
    const allTags = Object.keys(tagFrequency).sort((a, b) => {
        if (tagFrequency[b] !== tagFrequency[a]) {
            return tagFrequency[b] - tagFrequency[a]; // Higher frequency first
        }
        return a.localeCompare(b); // Alphabetical for same frequency
    });

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
            currentPage = 1; // Reset to first page when filter changes
            render();
        });

        return btn;
    }

    // Render tag buttons with show more/less functionality
    function renderTags() {
        tagFiltersContainer.innerHTML = '';
        
        const tagsToShow = showAllTags ? allTags : allTags.slice(0, maxVisibleTags);
        
        tagsToShow.forEach(tag => {
            tagFiltersContainer.appendChild(createTagButton(tag));
        });
        
        // Add "Show More/Less" button if there are more tags
        if (allTags.length > maxVisibleTags) {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'tag-button tag-toggle-button';
            toggleBtn.textContent = showAllTags ? '− Show Less' : `+ Show More (${allTags.length - maxVisibleTags})`;
            toggleBtn.addEventListener('click', () => {
                showAllTags = !showAllTags;
                renderTags();
            });
            tagFiltersContainer.appendChild(toggleBtn);
        }
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

    // Render function with pagination
    // Track last page to detect explicit pagination navigation
    let lastPage = 1;

    function render({ fromPagination = false } = {}) {
        const results = filterArticles();

        // featured: pick the first result as featured (if any)
        featuredContainer.innerHTML = '';
        listContainer.innerHTML = '';

        if (results.length === 0) {
            noResults.style.display = 'block';
            document.getElementById('pagination-container')?.remove();
            return;
        } else {
            noResults.style.display = 'none';
        }

        // Check if showing all items
        const showAll = itemsPerPageSelect && itemsPerPageSelect.value === 'all';

        if (showAll) {
            // Show all results without pagination
            const [first, ...rest] = results;
            if (first) {
                featuredContainer.appendChild(createFeatured(first));
            }
            rest.forEach(a => {
                listContainer.appendChild(createCard(a));
            });
            // Remove pagination if exists
            document.getElementById('pagination-container')?.remove();
        } else {
            // Calculate pagination
            const totalPages = Math.ceil(results.length / itemsPerPage);
            const startIdx = (currentPage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const pageResults = results.slice(startIdx, endIdx);

            const [first, ...rest] = pageResults;
            if (first) {
                featuredContainer.appendChild(createFeatured(first));
            }

            // Render remaining articles in grid
            rest.forEach(a => {
                listContainer.appendChild(createCard(a));
            });

            // Render pagination controls
            renderPagination(totalPages, results.length);

            // Only scroll when navigating via pagination controls
            if (fromPagination && currentPage > 1) {
                document.querySelector('.news-featured')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        lastPage = currentPage;
    }

    // Render pagination controls
    function renderPagination(totalPages, totalResults) {
        // Remove existing pagination
        document.getElementById('pagination-container')?.remove();
        
        if (totalPages <= 1) return; // Don't show pagination if only one page
        
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.className = 'pagination-container';
        
        // Results info
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalResults);
        
        const resultsInfo = document.createElement('div');
        resultsInfo.className = 'pagination-info';
        resultsInfo.textContent = `Showing ${startItem}-${endItem} of ${totalResults} articles`;
        paginationContainer.appendChild(resultsInfo);
        
        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                render({ fromPagination: true });
            }
        });
        paginationControls.appendChild(prevBtn);
        
        // Page numbers
        const pageNumbers = document.createElement('div');
        pageNumbers.className = 'pagination-numbers';
        
        // Show first page, current page range, and last page with ellipsis
        const pagesToShow = [];
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
                pagesToShow.push(i);
            }
        } else {
            // Always show first page
            pagesToShow.push(1);
            
            // Show pages around current page
            if (currentPage > 3) {
                pagesToShow.push('...');
            }
            
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pagesToShow.includes(i)) {
                    pagesToShow.push(i);
                }
            }
            
            if (currentPage < totalPages - 2) {
                pagesToShow.push('...');
            }
            
            // Always show last page
            if (!pagesToShow.includes(totalPages)) {
                pagesToShow.push(totalPages);
            }
        }
        
        pagesToShow.forEach(page => {
            if (page === '...') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pageNumbers.appendChild(ellipsis);
            } else {
                const pageBtn = document.createElement('button');
                pageBtn.type = 'button';
                pageBtn.className = 'pagination-number';
                if (page === currentPage) {
                    pageBtn.classList.add('active');
                }
                pageBtn.textContent = page;
                pageBtn.addEventListener('click', () => {
                    currentPage = page;
                    render({ fromPagination: true });
                });
                pageNumbers.appendChild(pageBtn);
            }
        });
        
        paginationControls.appendChild(pageNumbers);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = 'Next →';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                render({ fromPagination: true });
            }
        });
        paginationControls.appendChild(nextBtn);
        
        paginationContainer.appendChild(paginationControls);
        
        // Insert after news grid
        const newsGridSection = document.querySelector('.news-grid-section');
        newsGridSection.appendChild(paginationContainer);
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
            currentPage = 1; // Reset to first page on search
            render();
        }, 180));
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            selectedTags.clear();
            searchQuery = '';
            currentPage = 1; // Reset to first page when clearing filters
            if (searchInput) searchInput.value = '';
            // reset aria state for tag buttons
            Array.from(tagFiltersContainer.querySelectorAll('button')).forEach(b => {
                b.setAttribute('aria-pressed', 'false');
            });
            render();
        });
    }

    // Items per page selector
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'all') {
                itemsPerPage = Infinity; // Will show all items
            } else {
                itemsPerPage = parseInt(value, 10);
            }
            currentPage = 1; // Reset to first page when changing items per page
            render();
        });
    }

    // Initial render
    renderTags();
    render();
});
