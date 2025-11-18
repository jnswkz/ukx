# UKX Wallet

UKX Wallet is a multi-page, data-driven marketing and dashboard experience for a fictional crypto investing platform. The site is completely static (HTML/CSS/vanilla JS) but simulates live behavior through JSON data files, CoinGecko market requests, and an AI assistant backed by the Perplexity API. The project ships with reusable components, custom canvas-based charts, news/article generation tooling, and multiple product surfaces (dashboard, buy/sell flows, calculator, simulator, admin panel, etc.).

## Highlights
- **Full product funnel** – landing page, auth screens, dashboard, markets, calculators, simulator, payment, and admin tooling under `pages/`.
- **Reusable UI primitives** – navbar, footer, chat popup, and currency manager loaded once via `js/components.js` across every page.
- **Dynamic data** – local JSON datasets in `/data`, optional CoinGecko lookups (`modules/coingecko`), and a Perplexity-powered assistant (`modules/api-call`).
- **Custom visualization layer** – high-performance `<canvas>` renderer in `modules/graphjs/line.js` for spark-lines, crosshairs, tooltips, and skeleton states.
- **Editorial workflow** – Markdown + frontmatter articles transformed into fully styled news pages with `script.py`.

## Tech Stack
- Semantic HTML5, vanilla ES modules, and modular CSS (split per feature under `css/`).
- Canvas-based charts and animated network/particle backgrounds (`modules/net-bg`, `js/particles.js`).
- External services: CoinGecko public markets API and Perplexity Chat Completions (Sonar models).
- Python tooling (`script.py`) with `python-frontmatter`, `markdown-it-py`, and `beautifulsoup4` for content generation.

## Repository Layout
```
.
├── assets/                     # Videos, hero imagery, icons
├── components/                 # Shared HTML fragments (navbar, footer, chat)
├── css/                        # Page-specific and shared styles (base, layout, responsive, modules)
├── data/                       # Mock/backfilled JSON used across dashboards & calculators
├── js/                         # Page entry scripts (dashboard, markets, payments, etc.)
├── modules/
│   ├── api-call/               # Perplexity integration (uses env.js API key)
│   ├── auth/                   # Mock OAuth flow, localStorage persistence
│   ├── coingecko/              # Re-usable CoinGecko data fetchers
│   ├── graphjs/                # Canvas line chart renderer
│   ├── json/                   # Thin JSON file fetch helper
│   ├── login-check/            # Redirect logic for auth-only pages
│   └── net-bg/                 # Animated network background experiments
├── pages/                      # All secondary pages (dashboard, markets, news, etc.)
├── env.js                      # Stores the Perplexity API token (do **not** commit real keys)
├── script.py                   # Markdown → news article pipeline
├── template.md                 # Example article input file
└── index.html                  # Marketing home page entry point
```

## Getting Started
### Prerequisites
- A modern browser that supports ES modules (`import` in the browser).
- Any static HTTP server (Python, `serve`, `http-server`, nginx, etc.). Directly opening files via `file://` will break `fetch()` calls for JSON/components.
- Optional: Python 3.10+ if you plan to run the news/article generator.

### 1. Clone the repo
```bash
git clone <repo-url>
cd ukx
```

### 2. Configure the Perplexity API key
`modules/api-call/api.js` imports `API` from `env.js`. Replace the placeholder token with your Perplexity key:
```js
// env.js
export const API = 'pplx-XXXXXXXXXXXXXXXXXXXXXXXX';
```
Keep the file out of version control when committing real credentials.

### 3. (Optional) Install Python tooling for articles
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install python-frontmatter markdown-it-py beautifulsoup4
```

### 4. Run a local static server from the repo root
Pick any option:
```bash
# Option A: Python
python -m http.server 4173
# Option B: npx http-server
npx http-server -p 4173
# Option C: serve (npm i -g serve)
serve -l 4173
```
Navigate to `http://localhost:4173/index.html`. Because scripts use absolute paths (`/modules/...`), make sure the server root is the project root.

### 5. Deploying
Deployment is static: upload the repo to a host such as Netlify, Vercel Static, GitHub Pages, S3/CloudFront, etc. Ensure `env.js` is populated (or swapped with an environment-specific build step) on the target host.

## Running Playwright Tests

End-to-end smoke coverage for the main product surfaces lives under `tests/`. To run it locally:

1. Install Node deps and Playwright browsers once:
   ```bash
   npm install
   npx playwright install
   ```
2. Execute the headless suite:
   ```bash
   npm test
   ```
3. For interactive debugging you can launch the inspector UI:
   ```bash
   npm run test:ui   # headed mode
   npm run test:debug # headed & paused on first step
   ```

The Playwright config (`playwright.config.js`) automatically serves the static site via `python3 -m http.server 4173`, stubs external CoinGecko calls, and captures traces/screenshots on failure.

## Data & Content Sources
- **Local JSON (`/data`)** – `full_coin_data.json`, `coin_performance_data.json`, `data_24h.json`, `data_7d.json`, `data_30_days.json`, `users_data.json`, etc. They drive dashboard widgets, the calculator, buy/sell screens, and coin details.
- **News metadata (`data/article_data.json`)** – consumed by `pages/news.html` and coin-detail related articles.
- **CoinGecko (`modules/coingecko/api.js`)** – optional live fetch for quote, ATH, supply, and historical candles per symbol. Falls back to local JSON if the request fails.
- **Perplexity assistant (`modules/api-call/api.js`)** – powers `js/chat.js` and dashboard assistant prompts. Attaches GitHub-hosted JSON files as context to keep responses grounded.
- **Currency state (`window.UKXCurrency`)** – defined in `js/components.js`, persists preferred currency (USD/VND) in `localStorage` and emits `preferredCurrencyChange` events consumed by multiple pages.

### Handling JSON updates
1. Edit the relevant file under `/data` (keep shapes consistent with existing entries).
2. If you add keys, update the consuming UI (e.g., `js/dashboard.js`, `js/coin-details.js`, `js/crypto-calculator.js`).
3. If serving from GitHub Pages, remember the Perplexity prompts reference specific raw URLs; update `modules/api-call/api.js` if the repo owner/branch changes.

## Pages & Entry Scripts
| Surface | HTML | JS Entrypoint | Notes |
| --- | --- | --- | --- |
| Landing / marketing | `index.html` | `js/main.js`, `js/components.js`, `js/particles.js` | Hero video, feature grids, FAQ accordion, CTA form, theme toggle, animated stats. |
| Dashboard | `pages/dashboard.html` | `js/dashboard.js` | Portfolio cards, currency-aware totals, AI assistant, watchlists, skeleton loaders, custom charts. |
| Coin details | `pages/coin-details.html` | `js/coin-details.js` | Deep-dive per coin, multi-period chart, converter, news feed, CoinGecko live data fallback. |
| Markets | `pages/markets.html` | `js/markets.js` | Market table, filters, detail modals fed by `data/full_coin_data.json`. |
| Crypto calculator | `pages/crypto-calculator.html` | `js/crypto-calculator.js` | Dual crypto/fiat converter with searchable dropdowns and login-aware CTAs. |
| Trading simulator | `pages/trading-simulator.html` | `js/trading-simulator.js` | Simulated orders, risk metrics, and pseudo-PnL scenarios. |
| Buy & Sell | `pages/buynsell.html` | `js/buynsell.js` | Guided buy/sell steps, balance checks, order preview. |
| Payment & checkout | `pages/payment.html` | `js/payment.js` | Wallet selection, invoice summary, and confirmation flows. |
| News hub | `pages/news.html` + `pages/news/*.html` | `js/news.js` | Lists generated articles (`data/article_data.json`) and links to rendered HTML pages. |
| Auth | `pages/login.html`, `pages/signup.html` | `js/login.js`, `js/signup.js`, `modules/auth/mockOAuth.js` | LocalStorage-based login, email/password validation, mock OAuth prompts. |
| Admin | `pages/admin-panel.html` | `js/admin-panel.js` | User/accounts table hooked to `data/accounts_data.json`. |
| Misc utility pages | `pages/thankyou.html`, `pages/article.html`, etc. | Matching JS files | Lightweight confirmation or reader experiences. |

Every page loads `js/components.js` to inject the navbar/footer/chat markup and to initialize shared behaviors (currency toggle, component fetches, chat popup shell, etc.).

## Component & Theming System
- **Theme** – `js/main.js` sets the `data-theme` attribute based on `localStorage` and exposes `initializeThemeToggle()` for the navbar toggle button.
- **Currency manager** – `window.UKXCurrency` (in `js/components.js`) normalizes formatting/conversion and emits events for consumers like the dashboard, markets, and coin details.
- **Reusable components** – HTML fragments in `/components` are fetched at runtime and injected into placeholders. Update these files once to reflect across the entire site.
- **Chat popup** – `components/chat-popup.html` + `js/chat.js`; automatically wires to the Perplexity backend when present.

## Generating News Articles
1. Drop Markdown files with YAML frontmatter (see `template.md`) into an `md/` directory.
2. Activate your virtual environment (see “Prerequisites”).
3. Run `python script.py`.
4. For each Markdown file the script will:
   - Parse metadata (title, author, date, tags).
   - Merge the HTML into `pages/newspaper_template.html` to create `pages/news/<slug>.html`.
   - Append the article metadata to `data/article_data.json` (used by the news list and coin detail pages).
5. Commit the generated HTML + updated JSON if you want the article to appear in production.

## External Services & Environment
| Service | Location | Notes |
| --- | --- | --- |
| CoinGecko REST | `modules/coingecko/api.js` | Public requests are rate limited (~50 req/min). Handle errors to avoid blocking UI; modules already fail gracefully. |
| Perplexity Chat Completions | `modules/api-call/api.js` | Requires a valid `pplx-` key. Requests attach project JSON files for grounding; update URLs if the repo/branch changes. |
| LocalStorage keys | `theme`, `ukxPreferredCurrency`, `isLoggedIn`, `ukx::oauthUsers` | Clear them to reset theme/currency/auth state while testing. |

## Development Tips
- Always run from the repo root so absolute fetch paths (`/data/...`, `/components/...`) resolve correctly.
- When adding a new page, include `<script type="module" src="/js/components.js"></script>` so shared components and currency management remain consistent.
- Use `window.UKXCurrency.formatCurrency()` instead of manual formatting to keep conversions and precision aligned with the rest of the app.
- Keep JSON structures backward-compatible; page scripts expect specific keys (see `js/dashboard.js`, `js/coin-details.js`, etc.).
- For additional datasets, consider extending `data/` and updating `modules/api-call/api.js` if you want the AI assistant to read them.

## Troubleshooting
- **Component fetch failures** – Verify you are not on `file://` and that the server root is the repo root; otherwise `/components/...` returns 404.
- **Assistant errors / 401** – Confirm `env.js` exports a valid Perplexity key and that the model name allowed by your plan (default: `sonar`).
- **CoinGecko throttling** – The public API enforces strict limits. Cache responses or lean on the local JSON files when developing offline.
- **Login redirect loops** – `modules/login-check/login-check.js` guards `dashboard.html`. Remove or adjust it if you build additional private pages.
- **Currency mismatch** – If conversions look wrong, clear the `ukxPreferredCurrency` key in your browser storage.

## License
No explicit license file is provided. Treat the contents as proprietary unless the repository owner specifies otherwise.
