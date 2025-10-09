// UKX Crypto Wallet - Dashboard Page Logic

document.addEventListener('DOMContentLoaded', function() {
    console.log('UKX Dashboard initialized');

    // Initialize wallet dashboard
    initializeWalletDashboard();
    populateWalletData();
});

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
function populateWalletData() {
    // Sample balance data
    const balances = [
        {
            symbol: 'BTC',
            name: 'Bitcoin',
            available: 0.5432,
            locked: 0.0123,
            usdValue: 28450.67
        },
        {
            symbol: 'ETH',
            name: 'Ethereum',
            available: 12.4567,
            locked: 0.0,
            usdValue: 2345.89
        },
        {
            symbol: 'USDT',
            name: 'Tether',
            available: 5678.90,
            locked: 123.45,
            usdValue: 5678.90
        }
    ];

    // Sample transaction data
    const transactions = [
        {
            type: 'send',
            asset: 'BTC',
            amount: -0.1,
            address: '1A2B3C...4D5E6F',
            timestamp: Date.now() - 86400000, // 1 day ago
            status: 'completed'
        },
        {
            type: 'receive',
            asset: 'ETH',
            amount: 2.5,
            address: '0x1234...5678',
            timestamp: Date.now() - 172800000, // 2 days ago
            status: 'completed'
        },
        {
            type: 'send',
            asset: 'USDT',
            amount: -1000,
            address: 'TRX123...XYZ789',
            timestamp: Date.now() - 259200000, // 3 days ago
            status: 'pending'
        }
    ];

    // Populate balances
    const balancesList = document.getElementById('balancesList');
    if (balancesList) {
        balancesList.innerHTML = balances.map(balance => `
            <div class="balance-item">
                <div class="balance-info">
                    <div class="balance-icon">${balance.symbol}</div>
                    <div class="balance-details">
                        <h3>${balance.name}</h3>
                        <p>${balance.symbol}</p>
                    </div>
                </div>
                <div class="balance-amounts">
                    <span class="balance-amount">$${balance.usdValue.toFixed(2)}</span>
                    <span class="balance-locked">${balance.available.toFixed(4)} available${balance.locked > 0 ? `, ${balance.locked.toFixed(4)} locked` : ''}</span>
                </div>
            </div>
        `).join('');
    }

    // Populate transactions
    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
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
    }

    // Calculate and update total balance
    const totalBalance = balances.reduce((sum, balance) => sum + balance.usdValue, 0);
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = `$${totalBalance.toFixed(2)}`;
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