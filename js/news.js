// News page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle news card clicks - navigate to article page
    const newsCards = document.querySelectorAll('.news-featured-card, .news-card, .news-bottom-card');
    
    newsCards.forEach(card => {
        card.addEventListener('click', function() {
            const articleId = this.getAttribute('data-article-id');
            // Navigate to article page with ID parameter
            window.location.href = `article.html?id=${articleId}`;
        });
        
        // Add keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'link');
        
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
});
