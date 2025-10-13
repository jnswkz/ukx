// Article page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get article ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    // Sample article data (in a real app, this would come from an API)
    const articles = {
        '1': {
            title: '99% NGƯỜI THẤT BẠI THƯỜNG CÓ BIỂU HIỆN GÌ?',
            author: 'Nguyễn Văn A',
            date: 'Nov 10, 2024',
            image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=600&fit=crop',
            content: [
                {
                    heading: 'Thiếu Kỷ Luật Trong Đầu Tư',
                    paragraphs: [
                        'Không phải ai cũng có dễ dàng, những 1% người chơi đã tìm ra công thức chiến thắng. Hãy xem họ tư duy - và hành động - như thế nào. Trong thị trường đầy biến động, việc có một chiến lược rõ ràng là yếu tố quyết định thành công.',
                        'Những người chiến thắng luôn có điểm chung: họ không chỉ theo đuổi lợi nhuận ngắn hạn mà còn xây dựng chiến lược dài hạn. Họ hiểu rõ rằng thành công không đến từ may mắn, mà đến từ sự chuẩn bị kỹ lưỡng và kiên nhẫn.'
                    ]
                },
                {
                    heading: 'Quản Lý Rủi Ro Kém',
                    paragraphs: [
                        'Đầu tư thông minh không chỉ là đặt tiền vào thị trường và chờ đợi. Đó là nghệ thuật phân tích, đánh giá rủi ro, và đưa ra quyết định dựa trên dữ liệu thực tế. Các nhà đầu tư thành công luôn dành thời gian nghiên cứu kỹ lưỡng trước khi hành động.',
                        'Họ biết cách đọc biểu đồ, hiểu xu hướng thị trường, và quan trọng nhất là kiểm soát cảm xúc của mình. Trong khi 99% người chơi để cảm xúc chi phối quyết định, 1% còn lại luôn giữ được sự bình tĩnh và lý trí.'
                    ]
                }
            ]
        },
        '2': {
            title: '99% NGƯỜI THẤT BẠI THƯỜNG ...',
            author: 'Trần Thị B',
            date: 'Nov 9, 2024',
            image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=600&fit=crop',
            content: [
                {
                    heading: 'Thiếu Kiên Nhẫn',
                    paragraphs: [
                        'Thành công không đến trong một đêm. Những người thất bại thường mong muốn kết quả nhanh chóng và từ bỏ khi không thấy tiến triển ngay lập tức.',
                        'Kiên nhẫn là chìa khóa để vượt qua những thời điểm khó khăn và giữ vững niềm tin vào chiến lược của mình.'
                    ]
                }
            ]
        }
    };
    
    // Load article data if ID exists
    if (articleId && articles[articleId]) {
        const article = articles[articleId];
        
        // Update article title
        const titleElement = document.querySelector('.article-title');
        if (titleElement) {
            titleElement.textContent = article.title;
        }
        
        // Update breadcrumb
        const breadcrumbCurrent = document.querySelector('.breadcrumb-current');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = article.title.substring(0, 30) + '...';
        }
        
        // Update meta information
        const authorElement = document.querySelector('.article-author');
        if (authorElement) {
            authorElement.textContent = article.author;
        }
        
        const dateElement = document.querySelector('.article-date');
        if (dateElement) {
            dateElement.textContent = article.date;
        }
        
        // Update featured image
        const featuredImage = document.querySelector('.article-featured-image img');
        if (featuredImage) {
            featuredImage.src = article.image;
            featuredImage.alt = article.title;
        }
        
        // Update article body with dynamic content
        const articleBody = document.querySelector('.article-body');
        if (articleBody && article.content) {
            articleBody.innerHTML = article.content.map(section => `
                <section class="article-section">
                    <h2 class="article-section-title">${section.heading}</h2>
                    ${section.paragraphs.map(p => `<p class="article-paragraph">${p}</p>`).join('')}
                </section>
            `).join('');
        }
    }
    
    // Handle related article clicks
    const relatedCards = document.querySelectorAll('.article-related-card');
    relatedCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // In a real app, you'd get the article ID from the card's data attribute
            // For now, we'll just reload with a random ID
            const randomId = Math.floor(Math.random() * 9) + 1;
            window.location.href = `article.html?id=${randomId}`;
        });
    });
});
