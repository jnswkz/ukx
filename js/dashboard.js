// UKX Crypto Wallet - Dashboard Page Logic
import { jsonFileParser } from '/modules/json/jsonFileParser.js';
import { drawLineGraph } from '/modules/graphjs/line.js';
import { callApi } from '../modules/api-call/api.js';

async function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

function markSkeletonLoaded(element) {
    if (!element) return;
    if (element.classList.contains('skeleton')) {
        element.classList.add('is-loaded');
        element.classList.remove('skeleton');
    }
    element.querySelectorAll('.skeleton').forEach(child => {
        child.classList.add('is-loaded');
        child.classList.remove('skeleton');
    });
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderMarkdown(md = '') {
    if (!md) return '';
    // If DOMPurify + marked are available, prefer them
    if (window.marked && window.DOMPurify) {
        const raw = window.marked.parse(md);
        return window.DOMPurify.sanitize(raw);
    }

    // Fallback: escape then apply a few markdown transforms (safe)
    let text = escapeHtml(md);

    // Code blocks ```...```
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
    });

    // Inline code `...`
    text = text.replace(/`([^`]+?)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`);

    // Headings: ###, ##, #
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Lists: convert lines starting with - or * into <ul>
    // collect consecutive list items and wrap them
    text = text.replace(/(^((?:[-*] .+\n?)+))/gm, (m) => {
        const items = m.trim().split(/\n/).map(l => l.replace(/^[-*] /, '').trim());
        return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    });

    // Line breaks -> <br>
    text = text.replace(/\n/g, '<br>');

    return text;
}


async function getAnswerFromApi(question) {
    const answer = await callApi(question);
    return renderMarkdown(answer);
}

function formatCurrency(amount) {
    if (!Number.isFinite(amount)) return '$0.00';
    return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function to_usd(id){
    const parsed = await jsonFileParser('/data/full_coin_data.json');
    const coins_data = Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
    if (!coins_data[id] || typeof coins_data[id] !== 'object') return null;
    return coins_data[id]['current_price'];
}

async function to_coin_name(id){
    const parsed = await jsonFileParser('/data/full_coin_data.json');
    const coins_data = Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
    if (!coins_data[id] || typeof coins_data[id] !== 'object') return null;
    return coins_data[id]['coin_name'];
}

async function to_coin_image(id){
    const parsed = await jsonFileParser('/data/full_coin_data.json');
    const coins_data = Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
    if (!coins_data[id] || typeof coins_data[id] !== 'object') return null;
    return coins_data[id]['img_url'];
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('UKX Dashboard initialized');
    

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
        const userMsg = document.createElement('div');
        userMsg.className = 'user-message';
        userMsg.textContent = text;
        chatBody.appendChild(userMsg);
        userInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

    // optional demo bot reply

        const botMsg = document.createElement('div');
        botMsg.className = 'bot-message';
        // getAnswerFromApi returns sanitized HTML (via renderMarkdown). Insert as HTML so tags render.
        const answerHtml = await getAnswerFromApi(text) || renderMarkdown("I'm sorry, I couldn't process your request at this time.");
        botMsg.innerHTML = answerHtml;
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    if (chatBtn) chatBtn.addEventListener('click', () => {
        if (popup && popup.classList.contains('hidden')) openPopup();
        else if (popup) closePopup();
    });
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (userInput) userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });


    let userData = {};
    const chartContainer = document.querySelector('[data-skeleton="chart"]');
    const portfolioTotal = document.querySelector('[data-skeleton="portfolio-total"]');
    const balancesList = document.getElementById('balancesList');
    const transactionsList = document.getElementById('transactionsList');
    const portfolioTitle = document.getElementById('portfolioTitle');

    try {
        await sleep(1000);
        const raw = localStorage.getItem('userData');
        userData = raw ? JSON.parse(raw) : {};
    }    
    catch (e) {
        console.error('Error parsing user data from localStorage:', e);
        userData = {};
    }
    portfolioTitle.textContent = `Welcome back, ${userData?.name || 'User'}`;

    // Initialize chart with default time period
    let currentTimePeriod = '5d';
    const currentTheme = document.documentElement.getAttribute('data-theme');
    drawBalanceChart(userData, chartContainer, currentTheme, currentTimePeriod);
    
    // Time period button handlers
    const timePeriodButtons = document.querySelectorAll('.time-period-btn');
    timePeriodButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            timePeriodButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update time period and redraw chart
            currentTimePeriod = this.dataset.period;
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            drawBalanceChart(userData, chartContainer, theme, currentTimePeriod);
        });
    });
    
    // Theme observer
    const themeObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.attributeName === 'data-theme') {
                const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
                drawBalanceChart(userData, chartContainer, newTheme, currentTimePeriod);
            }
        }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Initialize wallet dashboard
    initializeWalletDashboard();
    await populateWalletData(userData, {
        balancesList,
        transactionsList,
        portfolioTotal
    });
});

/**
 * Draw balance chart with time period filter
 */
async function drawBalanceChart(userData = {}, chartContainer, colorScheme = 'light', timePeriod = '5d') {

    const daily_assets_value = Array.isArray(userData?.daily_asset_values) ? userData.daily_asset_values : [];
    //drawLineGraph(canvasID, data, backgroundColor, lineColor, pointColor)
    // daily_asset_values": [
    //   {
    //     "date": "2025-09-02",
    //     "total_asset_value": 284635.2942377
    //   },
    //   {
    
    // Filter data based on time period
    let filteredData = daily_assets_value;
    if (timePeriod !== 'all') {
        const days = parseInt(timePeriod);
        if (!isNaN(days) && days > 0) {
            filteredData = daily_assets_value.slice(-days);
        }
    }
    
    const labels = [];
    const values = [];
    for (const entry of filteredData) {
        labels.push(entry['date']);
        const value = Number(entry['total_asset_value']);
        values.push(Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0);
    }

    if (labels.length && values.length) {
        const data  = {
            x: labels,
            y: values
        };
        
        // Theme-aware color palettes
        const colors = {
            light: {
                background: 'rgba(236, 239, 244, 1)',     // --nord6: light background
                line: 'rgba(94, 129, 172, 1)',            // --nord10: deep blue line
                point: 'rgba(129, 161, 193, 1)',          // --nord9: lighter blue point
                grid: 'rgba(76, 86, 106, 0.1)',           // --nord3: subtle grid
                text: 'rgba(46, 52, 64, 0.8)',            // --nord0: dark text
                tooltip: {
                    bg: 'rgba(255, 255, 255, 0.95)',
                    border: 'rgba(216, 222, 233, 0.8)',
                    text: 'rgba(46, 52, 64, 1)',
                    label: 'rgba(76, 86, 106, 0.9)'
                }
            },
            dark: {
                background: 'rgba(59, 66, 82, 1)',        // --nord1: dark background
                line: 'rgba(163, 190, 140, 1)',           // --nord14: green line
                point: 'rgba(180, 142, 173, 1)',          // --nord15: purple point
                grid: 'rgba(255, 255, 255, 0.05)',        // subtle white grid
                text: 'rgba(216, 222, 233, 0.8)',         // --nord4: light text
                tooltip: {
                    bg: 'rgba(40, 42, 46, 0.95)',
                    border: 'rgba(60, 62, 66, 0.8)',
                    text: 'rgba(255, 255, 255, 1)',
                    label: 'rgba(160, 160, 160, 0.9)'
                }
            }
        };
        
        const theme = colorScheme === 'light' ? colors.light : colors.dark;
        drawLineGraph('balanceChart', data, theme);
    }

    if (chartContainer) {
        markSkeletonLoaded(chartContainer);
    }
}

let currentFilter = 'all'; // 'all', 'send', 'receive'

/**
 * Initialize wallet dashboard functionality
 */
function initializeWalletDashboard() {
    // Send and Receive buttons
    const sendBtn = document.getElementById('sendBtn');
    const receiveBtn = document.getElementById('receiveBtn');

    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            // Toggle send filter
            if (currentFilter === 'send') {
                currentFilter = 'all';
                sendBtn.classList.remove('active');
            } else {
                currentFilter = 'send';
                sendBtn.classList.add('active');
                receiveBtn.classList.remove('active');
            }
            filterTransactions(currentFilter);
        });
    }

    if (receiveBtn) {
        receiveBtn.addEventListener('click', function() {
            // Toggle receive filter
            if (currentFilter === 'receive') {
                currentFilter = 'all';
                receiveBtn.classList.remove('active');
            } else {
                currentFilter = 'receive';
                receiveBtn.classList.add('active');
                sendBtn.classList.remove('active');
            }
            filterTransactions(currentFilter);
        });
    }

    console.log('Wallet dashboard initialized');
}

/**
 * Filter transactions by type
 */
function filterTransactions(filter) {
    const transactionItems = document.querySelectorAll('.transaction-item');
    
    transactionItems.forEach(item => {
        const transactionIcon = item.querySelector('.transaction-icon');
        const isSend = transactionIcon && transactionIcon.classList.contains('send');
        const isReceive = transactionIcon && transactionIcon.classList.contains('receive');
        
        if (filter === 'all') {
            item.style.display = 'flex';
        } else if (filter === 'send' && isSend) {
            item.style.display = 'flex';
        } else if (filter === 'receive' && isReceive) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Populate wallet dashboard with sample data
 */
async function populateWalletData(userData = {}, uiRefs = {}) {

    const { balancesList, transactionsList, portfolioTotal } = uiRefs;
    const balances = [];
    const coinHoldings = userData?.coin_holdings || {};

    for (const key in coinHoldings) {
        if (!Object.prototype.hasOwnProperty.call(coinHoldings, key)) continue;

        const availableAmount = Number(coinHoldings[key]) || 0;
        const usdPrice = await to_usd(key);
        const usdValue = Number.isFinite(availableAmount) ? availableAmount * (usdPrice ?? 0) : 0;
        balances.push({
            symbol: key,
            name: (await to_coin_name(key)) || key, 
            available: availableAmount,
            locked: Math.random() < 0.5 ? parseFloat((Math.random() * 0.1).toFixed(4)) : 0.0, // Random locked 
            usdValue: Number.isFinite(usdValue) ? usdValue : 0,
            imgUrl: (await to_coin_image(key)) || ''
        });
    }
    
    // Sample transaction data
    const transactions = [
        {
            type: 'send',
            asset: 'BTC',
            amount: -0.1,
            address: '1A2B3C...4D5E6F',
            timestamp: Date.now() - 86400000, // 1 day ago
            status: 'completed'
        }
    ];

    const userTransactions = Array.isArray(userData?.transactions) ? userData.transactions : [];
    for (const tx of userTransactions){
        const amount = parseFloat(tx['amount']);
        transactions.push({
            type: amount < 0 ? 'send' : 'receive',
            asset: tx['coin_type'],
            amount: amount,
            address: tx['counterparty_wallet_id'],
            transaction_date: tx['transaction_date'],
            timestamp: new Date(tx['transaction_date']).getTime(),
            status: ['completed', 'pending'][Math.floor(Math.random() * 2)]
        });
    }


    // Populate balances
    if (balancesList) {
        if (balances.length) {
            balancesList.innerHTML = balances.map(balance => `
                <div class="balance-item">
                    <div class="balance-info">
                        <div class="balance-icon">${balance.imgUrl ? `<img src="${balance.imgUrl}" alt="${balance.name} logo">` : balance.symbol.slice(0, 3).toUpperCase()}</div>
                        <div class="balance-details">
                            <h3>${balance.name}</h3>
                            <p>${balance.symbol}</p>
                        </div>
                    </div>
                    <div class="balance-amounts">
                        <span class="balance-amount">${formatCurrency(balance.usdValue)}</span>
                        <span class="balance-locked">${balance.available.toFixed(4)} available${balance.locked > 0 ? `, ${balance.locked.toFixed(4)} locked` : ''}</span>
                    </div>
                </div>
            `).join('');
        } else {
            balancesList.innerHTML = '';
        }
        markSkeletonLoaded(balancesList);
    }

    // Populate transactions
    if (transactionsList) {
        if (transactions.length) {
            transactionsList.innerHTML = transactions.map(tx => {
                const sendIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15V5M10 5L6 9M10 5L14 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;
                const receiveIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 5V15M10 15L14 11M10 15L6 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;
                
                return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-icon ${tx.type}">${tx.type === 'send' ? sendIcon : receiveIcon}</div>
                        <div class="transaction-details">
                            <h4>${tx.type === 'send' ? 'Sent' : 'Received'} ${tx.asset}</h4>
                            <p>${tx.address} • ${formatTimeAgo(tx.timestamp)}</p>
                        </div>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount ${tx.amount > 0 ? 'positive' : 'negative'}">${tx.amount > 0 ? '+' : ''}${tx.amount} ${tx.asset}</span>
                        <span class="status" data-status="${tx.status}">${tx.status}</span>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            transactionsList.innerHTML = '';
        }
        markSkeletonLoaded(transactionsList);
    }

    // Calculate and update total balance
    const totalBalance = balances.reduce((sum, balance) => sum + balance.usdValue, 0);
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatCurrency(totalBalance);
        const wrapper = portfolioTotal || totalBalanceElement.closest('.portfolio-total');
        markSkeletonLoaded(wrapper);
    }
}

/**
 * Format timestamp to "X hours/days ago"
 */
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}
