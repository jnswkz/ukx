// UKX Chat Assistant
// Handles chat popup functionality across all pages

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat assistant initialized');

    const chatBtn = document.getElementById('chat-button');
    const popup = document.getElementById('chat-popup');
    const closeBtn = document.getElementById('close-chat');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatBody = document.getElementById('chat-body');

    function openPopup() {
        if (!popup) return;
        popup.classList.remove('hidden');
        userInput && userInput.focus();
        chatBody && (chatBody.scrollTop = chatBody.scrollHeight);
    }

    function closePopup() {
        if (!popup) return;
        popup.classList.add('hidden');
    }

    async function sendMessage() {
        if (!userInput || !chatBody) return;
        const text = userInput.value.trim();
        if (!text) return;

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'user-message';
        userMsg.textContent = text;
        chatBody.appendChild(userMsg);
        userInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

        // Add typing indicator
        const botMsg = document.createElement('div');
        botMsg.className = 'bot-message is-waiting';
        botMsg.textContent = '.';
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;

        let dots = 1;
        const typingInterval = setInterval(() => {
            dots = dots === 3 ? 1 : dots + 1;
            botMsg.textContent = '.'.repeat(dots);
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 350);

        try {
            // Import the API call function dynamically
            const { callApi } = await import('/modules/api-call/api.js');
            const answer = await callApi(text);
            botMsg.innerHTML = answer || "I'm sorry, I couldn't process your request at this time.";
        } catch (error) {
            console.error('Error fetching assistant reply:', error);
            botMsg.textContent = error?.message || "Sorry, I'm having trouble responding right now.";
        } finally {
            clearInterval(typingInterval);
            botMsg.classList.remove('is-waiting');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    // Event listeners
    if (chatBtn) chatBtn.addEventListener('click', () => {
        if (popup && popup.classList.contains('hidden')) openPopup();
        else if (popup) closePopup();
    });

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    if (userInput) userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    console.log('Chat assistant event listeners attached');
});