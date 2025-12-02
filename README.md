[![DeepScan grade](https://deepscan.io/api/teams/28275/projects/30501/branches/980424/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=28275&pid=30501&bid=980424)
# UKX Wallet

UKX Wallet is a static, multi-page experience for a fictional crypto investing platform. Everything runs in the browser (HTML/CSS/vanilla JS) but feels live through JSON data, CoinGecko lookups, and an AI assistant powered by Perplexity. The repo ships reusable components, a custom canvas chart engine, Playwright smoke tests, and a Markdown-to-news pipeline.

## Features
- Landing → auth → dashboard funnel plus markets, buy/sell, payment, simulator, calculator, news, and admin pages under `pages/`.
- Shared navbar/footer/chat + currency manager injected via `js/components.js` across every page.
- Data-backed UI using local JSON in `data/` with optional CoinGecko fetchers in `modules/coingecko/`.
- Perplexity-backed assistant used by the chat popup and dashboard helper (`modules/api-call/`).
- Canvas sparkline/line renderer with crosshairs and tooltips in `modules/graphjs/`.
- Editorial workflow: Markdown + frontmatter turned into styled news pages via `script.py`.

## Stack
- Semantic HTML5, modular CSS per feature (`css/`), ES modules in `js/`.
- Canvas visuals and particle/network backgrounds (`modules/net-bg`, `js/particles.js`).
- External services: CoinGecko REST + Perplexity Chat Completions.
- Playwright for E2E smoke coverage (`tests/`), Python tooling for article generation.

## Project Structure
```
.
├── assets/            # Videos, hero art, icons
├── components/        # Navbar, footer, chat popup fragments
├── css/               # Base + page-specific styles
├── data/              # JSON datasets powering the UI
├── js/                # Page entry scripts (dashboard, markets, auth, etc.)
├── modules/           # Reusable logic (api-call, auth, coingecko, graphjs, login-check, net-bg)
├── pages/             # All HTML pages (dashboard, markets, news, admin, etc.)
├── env.js             # Exports the Perplexity API key (keep real keys private)
├── script.py          # Markdown → news HTML generator
├── template.md        # Example article input
└── playwright.config.js
```

## Pages and Entrypoints
- Landing: `index.html` + `js/main.js`, `js/components.js`, `js/particles.js`
- Dashboard: `pages/dashboard.html` + `js/dashboard.js`
- Markets: `pages/markets.html` + `js/markets.js`
- Coin details: `pages/coin-details.html` + `js/coin-details.js`
- Calculator: `pages/crypto-calculator.html` + `js/crypto-calculator.js`
- Trading simulator: `pages/trading-simulator.html` + `js/trading-simulator.js`
- Buy/Sell + Payment: `pages/buynsell.html`, `pages/payment.html` + `js/buynsell.js`, `js/payment.js`
- News hub and generated articles: `pages/news.html`, `pages/news/*.html` + `js/news.js`
- Auth: `pages/login.html`, `pages/signup.html` + `js/login.js`, `js/signup.js`, `modules/auth/mockOAuth.js`
- Admin: `pages/admin-panel.html` + `js/admin-panel.js` (driven by `data/accounts_data.json`)

Every page loads `js/components.js` to inject shared UI, manage currency, and wire the chat shell.

## Setup
### Prerequisites
- Any modern browser.
- Static HTTP server (Python `http.server`, `npx http-server`, `serve`, nginx, etc.). Opening files with `file://` will break `fetch()` calls.
- Optional: Node 18+ for Playwright tests, Python 3.10+ for the news generator.

### 1) Clone
```bash
git clone <repo-url>
cd ukx
```

### 2) Configure the Perplexity API key
`modules/api-call/api.js` imports `API` from `env.js`. Replace the placeholder with your key and keep real credentials out of version control:
```js
// env.js
export const API = 'pplx-XXXXXXXXXXXXXXXXXXXXXXXX';
```

### 3) Serve the site
Run from the repo root so absolute fetch paths work:
```bash
# Python (default for tests)
python3 -m http.server 5500
# or
npx http-server -p 5500
# or
serve -l 5500
```
Then open `http://127.0.0.1:5500/index.html` (or matching port).

### 4) Optional: install Python deps for news generation
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install python-frontmatter markdown-it-py beautifulsoup4
```

## Running Tests (Playwright)
```bash
npm install
npx playwright install
npm test          # headless
npm run test:ui   # headed inspector
npm run test:debug # headed + pause on first step
```
`playwright.config.js` auto-starts `python3 -m http.server 5500`, stubs external CoinGecko traffic, and saves traces/screenshots on failure.

## Content Workflow (News)
1. Drop Markdown files with YAML frontmatter into `md/` (see `template.md`).
2. Activate the virtualenv (if using one).
3. Run `python script.py`.
4. The script renders `pages/news/<slug>.html` using `pages/newspaper_template.html` and appends metadata to `data/article_data.json`.

## Data and Services
- Local JSON: `data/full_coin_data.json`, `data/coin_performance_data.json`, `data/data_24h.json`, `data/data_7d.json`, `data/data_30_days.json`, `data/users_data.json`, `data/accounts_data.json`, `data/article_data.json`.
- CoinGecko: optional live fetchers in `modules/coingecko/api.js`; UI falls back to JSON when calls fail or are throttled.
- Perplexity assistant: `modules/api-call/api.js` powers `js/chat.js` and dashboard prompts; grounding files are referenced via GitHub raw URLs—update if the repo path changes.
- Currency state: `window.UKXCurrency` (in `js/components.js`) normalizes conversion/formatting and emits `preferredCurrencyChange`.

### Updating JSON
1. Edit the relevant file under `data/` (keep shapes consistent).
2. Update consuming scripts if you add fields (`js/dashboard.js`, `js/coin-details.js`, `js/crypto-calculator.js`, etc.).
3. If hosting elsewhere (e.g., GitHub Pages), adjust grounding URLs in `modules/api-call/api.js` if the owner/branch changes.

## Dev Tips
- Always serve from the repo root to avoid 404s on `/components` and `/data`.
- Use `window.UKXCurrency.formatCurrency()` instead of manual number formatting.
- When adding pages, include `<script type="module" src="/js/components.js"></script>` to stay consistent with shared UI and currency handling.
- Playwright tests assume port 5500; update `playwright.config.js` if you change it.

## Troubleshooting
- Components not loading: ensure you are not on `file://` and that the server root is the repo root.
- Assistant errors/401: verify `env.js` contains a valid `pplx-` key and the model is allowed by your plan.
- CoinGecko rate limits: rely on bundled JSON while developing.
- Auth loops: `modules/login-check/login-check.js` guards the dashboard; adjust if you add new private routes.
- Currency mismatch: clear `ukxPreferredCurrency` in localStorage.

## License
No license file is present; treat the contents as proprietary unless the owner states otherwise.
