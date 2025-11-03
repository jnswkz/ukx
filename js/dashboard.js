// UKX Crypto Wallet - Dashboard Page Logic
import { jsonFileParser } from '/modules/json/jsonFileParser.js';
import { drawLineGraph } from '/modules/graphjs/line.js';

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
    
    let userData = {};
    const chartContainer = document.querySelector('[data-skeleton="chart"]');
    const portfolioTotal = document.querySelector('[data-skeleton="portfolio-total"]');
    const balancesList = document.getElementById('balancesList');
    const transactionsList = document.getElementById('transactionsList');

    try {
        await sleep(1000);
        const raw = localStorage.getItem('userData');
        userData = raw ? JSON.parse(raw) : {};
    }    
    catch (e) {
        console.error('Error parsing user data from localStorage:', e);
        userData = {};
    }

    drawBalanceChart(userData, chartContainer);
    // Initialize wallet dashboard
    initializeWalletDashboard();
    await populateWalletData(userData, {
        balancesList,
        transactionsList,
        portfolioTotal
    });
});

/**
 * Draw balance chart
 */
async function drawBalanceChart(userData = {}, chartContainer) {

    const daily_assets_value = Array.isArray(userData?.daily_asset_values) ? userData.daily_asset_values : [];
    //drawLineGraph(canvasID, data, backgroundColor, lineColor, pointColor)
    // daily_asset_values": [
    //   {
    //     "date": "2025-09-02",
    //     "total_asset_value": 284635.2942377
    //   },
    //   {
    const labels = [];
    const values = [];
    for (const entry of daily_assets_value) {
        labels.push(entry['date']);
        const value = Number(entry['total_asset_value']);
        values.push(Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0);
    }

    if (labels.length && values.length) {
        const data  = {
            x: labels,
            y: values
        }; 
        drawLineGraph('balanceChart', data, 'rgba(59, 66, 82, 1)', 'rgba(163, 190, 140, 1)', 'rgba(180, 142, 173, 1)');
    }

    if (chartContainer) {
        markSkeletonLoaded(chartContainer);
    }
}

/**
 * Initialize wallet dashboard functionality
 */
function initializeWalletDashboard() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Navigate back to landing page
            window.location.href = 'index.html';
        });
    }

    // Send and Receive buttons
    const sendBtn = document.getElementById('sendBtn');
    const receiveBtn = document.getElementById('receiveBtn');

    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            alert('Send functionality coming soon!');
        });
    }

    if (receiveBtn) {
        receiveBtn.addEventListener('click', function() {
            alert('Receive functionality coming soon!');
        });
    }

    console.log('Wallet dashboard initialized');
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
            transactionsList.innerHTML = transactions.map(tx => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-icon">${tx.type === 'send' ? '↑' : '↓'}</div>
                        <div class="transaction-details">
                            <h4>${tx.type === 'send' ? 'Sent' : 'Received'} ${tx.asset}</h4>
                            <p>${tx.address} • ${formatTimeAgo(tx.timestamp)}</p>
                        </div>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount" style="color: ${tx.amount > 0 ? 'var(--color-green-50)' : 'var(--color-grey-90)'}">${tx.amount > 0 ? '+' : ''}${tx.amount} ${tx.asset}</span>
                        <span class="status">${tx.status}</span>
                    </div>
                </div>
            `).join('');
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
