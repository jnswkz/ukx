// UKX Chat Assistant
// Handles chat popup functionality across all pages

const CHAT_HISTORY_KEY = 'ukx_chat_history';
const MAX_HISTORY_MESSAGES = 50; // Limit stored messages to prevent localStorage bloat

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat assistant initialized');

    const chatBtn = document.getElementById('chat-button');
    const popup = document.getElementById('chat-popup');
    const closeBtn = document.getElementById('close-chat');
    const clearBtn = document.getElementById('clear-chat');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatBody = document.getElementById('chat-body');

    // Load chat history on page load
    loadChatHistory();

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

    // Save chat history to localStorage
    function saveChatHistory() {
        if (!chatBody) return;
        
        const messages = [];
        const messageElements = chatBody.querySelectorAll('.user-message, .bot-message:not(.is-waiting)');
        
        messageElements.forEach((msg, index) => {
            // Skip the initial greeting if it's the only bot message
            if (index === 0 && msg.classList.contains('bot-message') && 
                msg.textContent === 'Hello! How can I help you today?') {
                return;
            }
            
            messages.push({
                type: msg.classList.contains('user-message') ? 'user' : 'bot',
                content: msg.innerHTML // Use innerHTML to preserve coin previews and news links
            });
        });

        // Limit history size
        const limitedMessages = messages.slice(-MAX_HISTORY_MESSAGES);
        
        try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(limitedMessages));
        } catch (e) {
            console.warn('Could not save chat history:', e);
        }
    }

    // Load chat history from localStorage
    function loadChatHistory() {
        if (!chatBody) return;

        try {
            const saved = localStorage.getItem(CHAT_HISTORY_KEY);
            if (!saved) return;

            const messages = JSON.parse(saved);
            if (!Array.isArray(messages) || messages.length === 0) return;

            // Clear default greeting and add saved messages
            chatBody.innerHTML = '<div class="bot-message">Hello! How can I help you today?</div>';

            messages.forEach(msg => {
                const msgEl = document.createElement('div');
                msgEl.className = msg.type === 'user' ? 'user-message' : 'bot-message';
                msgEl.innerHTML = msg.content;
                chatBody.appendChild(msgEl);
            });

            // Scroll to bottom
            chatBody.scrollTop = chatBody.scrollHeight;
            console.log(`Loaded ${messages.length} messages from history`);
        } catch (e) {
            console.warn('Could not load chat history:', e);
        }
    }

    // Clear chat history
    function clearChatHistory() {
        if (!chatBody) return;

        // Clear localStorage
        try {
            localStorage.removeItem(CHAT_HISTORY_KEY);
        } catch (e) {
            console.warn('Could not clear chat history:', e);
        }

        // Reset chat body to initial state
        chatBody.innerHTML = '<div class="bot-message">Hello! How can I help you today?</div>';
        
        console.log('Chat history cleared');
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
            
            // Save chat history after each exchange
            saveChatHistory();
        }
    }

    // Event listeners
    if (chatBtn) chatBtn.addEventListener('click', () => {
        if (popup && popup.classList.contains('hidden')) openPopup();
        else if (popup) closePopup();
    });

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (clearBtn) clearBtn.addEventListener('click', clearChatHistory);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    if (userInput) userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    console.log('Chat assistant event listeners attached');
});