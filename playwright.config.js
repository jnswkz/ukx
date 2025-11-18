const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 60 * 1000,
    expect: {
        timeout: 15 * 1000
    },
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:5500/',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    webServer: {
        command: 'python3 -m http.server 5500',
        cwd: __dirname,
        url: 'http://127.0.0.1:5500/',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
    }
});

