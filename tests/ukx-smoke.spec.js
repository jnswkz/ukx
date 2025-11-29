const { test, expect } = require('@playwright/test');

const MOCK_COIN_PAYLOAD = {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Mock Bitcoin',
    image: {
        large: '/assets/logo-light.png'
    },
    description: {
        en: 'Deterministic Bitcoin payload used during automated tests.'
    },
    market_cap_rank: 1,
    market_data: {
        current_price: { usd: 64250.43 },
        price_change_percentage_24h: 2.15,
        high_24h: { usd: 65010.22 },
        low_24h: { usd: 63880.11 },
        market_cap: { usd: 123_456_789_012 },
        total_volume: { usd: 4_567_890_123 },
        circulating_supply: 19_450_000,
        max_supply: 21_000_000,
        ath: { usd: 69000.0 },
        last_updated: new Date().toISOString()
    },
    last_updated: new Date().toISOString()
};

const MOCK_MARKET_LISTINGS = [
    {
        id: 'mock-hot-1',
        name: 'Mock Rocket',
        symbol: 'MRK',
        current_price: 12.34,
        price_change_percentage_24h: 9.87,
        total_volume: 12500000,
        market_cap: 750000000,
        low_24h: 10.5,
        high_24h: 14.2,
        image: '/assets/logo-light.png'
    },
    {
        id: 'mock-hot-2',
        name: 'Mock Orbit',
        symbol: 'ORB',
        current_price: 2.1,
        price_change_percentage_24h: -3.5,
        total_volume: 5120000,
        market_cap: 250000000,
        low_24h: 1.8,
        high_24h: 2.8,
        image: '/assets/logo-dark.png'
    },
    {
        id: 'mock-hot-3',
        name: 'Mock Pulse',
        symbol: 'PULSE',
        current_price: 0.45,
        price_change_percentage_24h: 1.23,
        total_volume: 890000,
        market_cap: 125000000,
        low_24h: 0.4,
        high_24h: 0.52,
        image: '/assets/logo-light.png'
    }
];

const FIXTURE_LOGIN_USER = {
    email: 'donamtrum@jns.co.it',
    password: '3nm155!%EKte',
    displayName: 'Đỗ Nam Trum'
};

const ADMIN_CREDENTIALS = {
    email: 'admin@ukx.com',
    password: 'admin123',
    name: 'Nguyễn Trần Đức Bo'
};

const MOCK_FULL_COIN_DATA = {
    BTC: {
        coin_name: 'Bitcoin',
        current_price: 25000,
        img_url: '/assets/logo-light.png',
        market_cap: 123456789
    },
    USDT: {
        coin_name: 'Tether',
        current_price: 1,
        img_url: '/assets/logo-dark.png',
        market_cap: 987654321
    }
};

const MOCK_USER_DATA = {
    name: 'Playwright QA',
    coin_holdings: {
        BTC: 0.42,
        ETH: 3.5
    },
    transactions: [
        {
            coin_type: 'BTC',
            amount: '-0.05',
            counterparty_wallet_id: 'bc1qa-playwright-btc',
            transaction_date: '2024-04-20T12:00:00Z'
        },
        {
            coin_type: 'ETH',
            amount: '1.25',
            counterparty_wallet_id: '0xplaywrighteth',
            transaction_date: '2024-04-21T15:30:00Z'
        }
    ]
};

test.describe('UKX smoke journey', () => {
    test('landing hero and FAQ sections render interactive content', async ({ page }) => {
        await page.goto('/');

        const heroTitle = page.getByRole('heading', { level: 1, name: 'Smart Investment Strong Future' });
        await expect(heroTitle).toBeVisible();

        const emailInput = page.getByPlaceholder('Enter your email');
        await emailInput.fill('qa@example.com');
        await page.getByRole('button', { name: 'Start' }).click();

        await expect(page.getByRole('heading', { level: 2, name: 'Features' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: 'Frequently Asked Question' })).toBeVisible();

        const firstFaqToggle = page.getByRole('button', { name: 'Toggle answer' }).first();
        await firstFaqToggle.click();
        await expect(firstFaqToggle).toHaveAttribute('aria-expanded', 'true');
    });

    test('coin details page hydrates with mocked CoinGecko data', async ({ page }) => {
        await mockCoinGeckoApi(page);
        await page.goto('/pages/coin-details.html');

        await page.locator('#coinLoader').waitFor({ state: 'hidden' });

        await expect(page.locator('[data-skeleton="coin-hero"]')).toHaveClass(/is-loaded/);
        await expect(page.locator('[data-skeleton="coin-chart"]')).toHaveClass(/is-loaded/);
        await expect(page.locator('[data-skeleton="coin-hero"]')).not.toHaveClass(/skeleton/);
        await expect(page.locator('[data-skeleton="coin-chart"]')).not.toHaveClass(/skeleton/);

        await expect(page.locator('#coinName')).toHaveText(/Mock Bitcoin/i);
        await expect(page.locator('#coinPrice')).toContainText('64,250.43');
        await expect(page.locator('#coinChange')).toContainText('+2.15%');

        await expect(page.locator('.coin-news-card-item').first()).toBeVisible();

        await page.getByRole('button', { name: '7d' }).click();
        await expect(page.getByRole('button', { name: '7d' })).toHaveClass(/active/);
    });

    test('dashboard shows personalized portfolio data for logged-in users', async ({ page }) => {
        await authenticateDashboardUser(page, MOCK_USER_DATA);
        await page.goto('/pages/dashboard.html');

        await expect(page.getByRole('heading', { level: 1, name: /Welcome back/ })).toContainText('Playwright QA');

        await expect(page.locator('[data-skeleton="portfolio-total"]')).toHaveClass(/is-loaded/);
        await expect(page.locator('[data-skeleton="balances"] .balance-item')).toHaveCount(2);

        await expect(page.locator('.transaction-item').first()).toBeVisible();
    });

    test('login form validates credentials against bundled dataset', async ({ page }) => {
        const dialogMessages = captureDialogs(page);
        await page.goto('/pages/login.html');
        await disableNativeValidation(page);
        const submitButton = page.getByRole('button', { name: 'LOGIN', exact: true });

        await submitButton.click();
        await expect.poll(() => dialogMessages.at(-1)).toBe('Please enter your email address.');

        await page.fill('#email', 'invalid@' );
        await submitButton.click();
        await expect.poll(() => dialogMessages.at(-1)).toBe('Please enter a valid email address.');

        await page.fill('#email', FIXTURE_LOGIN_USER.email);
        await submitButton.click();
        await expect.poll(() => dialogMessages.at(-1)).toBe('Please enter your password.');

        await page.fill('#password', FIXTURE_LOGIN_USER.password);
        await submitButton.click();
        await page.waitForURL('**/pages/dashboard.html');
        await expect.poll(() => dialogMessages.at(-1)).toContain('Login successful!');
        await expect(page.getByRole('heading', { level: 1 })).toContainText(FIXTURE_LOGIN_USER.displayName);
    });

    test('login form rejects invalid credentials', async ({ page }) => {
        const dialogMessages = captureDialogs(page);
        await page.goto('/pages/login.html');
        await disableNativeValidation(page);

        await page.fill('#email', FIXTURE_LOGIN_USER.email);
        await page.fill('#password', 'wrong-password');
        await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

        await expect.poll(() => dialogMessages.at(-1)).toBe('Invalid email or password.');
        await expect(page).toHaveURL(/\/pages\/login\.html$/);
    });

    test('dashboard enforces authentication redirect when not logged in', async ({ page }) => {
        const dialogMessages = captureDialogs(page);
        await page.goto('/pages/dashboard.html');

        await expect.poll(() => dialogMessages.at(-1)).toBe('You must be logged in to access this page.');
        await page.waitForURL('**/pages/login.html');
        await expect(page).toHaveURL(/\/pages\/login\.html$/);
    });

    test('markets page renders data grids, filter tags, and CoinGecko cards', async ({ page }) => {
        await mockCoinGeckoApi(page);
        await page.goto('/pages/markets.html');

        await page.locator('#marketsTableBody tr').first().waitFor();
        await expect(page.locator('#marketsTableBody tr')).toHaveCount(5);
        await expect(page.locator('.markets-card').first().locator('.markets-card-item')).toHaveCount(3);
        await expect(page.locator('.markets-card').nth(1).locator('.markets-card-item')).toHaveCount(3);

        await page.getByRole('button', { name: 'Meme' }).click();
        await expect(page.getByRole('button', { name: 'Meme' })).toHaveClass(/active/);
        await expect(page.locator('#marketsTableBody')).toContainText(/Dogecoin/i);
    });

    test('crypto calculator converts between BTC and USDT', async ({ page }) => {
        await mockCalculatorPrices(page);
        await page.goto('/pages/crypto-calculator.html');

        const fromInput = page.locator('#fromAmount');
        const toInput = page.locator('#toAmount');

        await fromInput.fill('2');
        await expect.poll(async () => {
            const value = await toInput.inputValue();
            return Number(value || '0');
        }).toBeGreaterThan(0);
        await expect.poll(async () => {
            const value = await toInput.inputValue();
            return Number(value || '0');
        }).toBeCloseTo(50000, 5);

        const toBeforeSwap = await toInput.inputValue();
        await page.click('#swapBtn');
        await expect(page.locator('#fromCurrency')).toHaveText('USDT');
        await expect(page.locator('#toCurrency')).toHaveText('BTC');
        await expect(fromInput).toHaveValue(toBeforeSwap);
        await expect.poll(async () => {
            const value = await page.locator('#toAmount').inputValue();
            return Number(value || '0');
        }).toBeCloseTo(2, 5);
    });

    test('signup happy path stores session and redirects to dashboard', async ({ page }) => {
        const dialogs = captureDialogs(page);
        await page.goto('/pages/signup.html');
        await disableSignupValidation(page);

        await page.fill('#firstName', 'Test');
        await page.fill('#lastName', 'User');
        await page.fill('#email', 'test.user@example.com');
        await page.fill('#password', 'secret1');
        await page.fill('#confirmPassword', 'secret1');
        await page.getByRole('button', { name: 'SIGN UP', exact: true }).click();

        await expect.poll(() => dialogs.at(-1)).toBe('Registration successful! Welcome to UKX.');
        await page.waitForURL('**/pages/dashboard.html');
        await expect(page).toHaveURL(/dashboard/);
    });

    test('admin panel enforces admin session and renders widgets', async ({ page }) => {
        await authenticateAdmin(page, ADMIN_CREDENTIALS);
        await page.goto('/pages/admin-panel.html');

        await page.locator('#adminSidebarToggle').click();
        await page.locator('.admin-panel-menu-item .text', { hasText: 'Users' }).click();
        await expect(page.locator('.admin-panel-users .admin-panel-table')).toBeVisible();
        await page.locator('.admin-panel-menu-item .text', { hasText: 'News' }).click();
        await expect(page.locator('.admin-panel-news .admin-panel-table')).toBeVisible();
    });
});

async function mockCoinGeckoApi(page) {
    await page.route('**/api.coingecko.com/api/v3/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/coins/markets')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_MARKET_LISTINGS)
            });
            return;
        }

        if (url.includes('/coins/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_COIN_PAYLOAD)
            });
            return;
        }

        await route.continue();
    });
}

async function authenticateDashboardUser(page, userData) {
    await page.addInitScript((storedUser) => {
        window.localStorage.setItem('isLoggedIn', 'true');
        window.localStorage.setItem('userData', JSON.stringify(storedUser));
    }, userData);
}

function captureDialogs(page) {
    const messages = [];
    page.on('dialog', async (dialog) => {
        messages.push(dialog.message());
        await dialog.accept();
    });
    return messages;
}

async function disableNativeValidation(page) {
    await page.evaluate(() => {
        const form = document.getElementById('loginForm');
        if (form) {
            form.setAttribute('novalidate', 'true');
            form.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));
        }
    });
}

async function disableSignupValidation(page) {
    await page.evaluate(() => {
        const form = document.getElementById('signupForm');
        if (form) {
            form.setAttribute('novalidate', 'true');
            form.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));
            form.querySelectorAll('[minlength]').forEach((el) => el.removeAttribute('minlength'));
        }
    });
}

async function mockCalculatorPrices(page) {
    await page.route('**/data/full_coin_data.json', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_FULL_COIN_DATA)
        });
    });
}

async function authenticateAdmin(page, adminData) {
    await page.addInitScript((data) => {
        window.localStorage.setItem('adminSession', 'true');
        window.localStorage.setItem('adminData', JSON.stringify(data));
    }, adminData);
}
