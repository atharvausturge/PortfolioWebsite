# Atharva Usturge — Portfolio

A single-page portfolio built from scratch with plain HTML, CSS, and JavaScript.
No build step, no frameworks, no dependencies. Designed in the Swiss /
International Typographic style: strict grid, bold type, one red accent.

## Files

| File | What it is |
|------|------------|
| `index.html` | All content and structure (About, Work, Résumé, Contact) |
| `style.css`  | The full design system and responsive layout |
| `main.js`    | Mobile nav, scroll-spy, smooth scroll, reveal-on-scroll |
| `ticker.js`  | Live trading-bot ticker — self-contained module (see below) |
| `ticker.config.example.js` | Template for the local config file |
| `ticker.config.local.js` | **You create this.** Gitignored. Holds your API key. |
| `assets/`    | Project screenshots |
| `AtharvaUsturge-Resume.pdf` | Your résumé — **add this file** (see below) |

## Run it locally

Just open `index.html` in a browser. For the résumé preview/iframe to load,
serve the folder over HTTP instead of `file://`:

```bash
cd PortfolioWebsite
python3 -m http.server 8000
# then open http://localhost:8000
```

## Before you submit — fill in the TODOs

The page has a few clearly-marked yellow `TODO` boxes. Search the project for
`TODO` and resolve each:

1. **Add your résumé.** Place `AtharvaUsturge-Resume.pdf` in this folder. The
   Download button, "Open in new tab" link, and inline preview all point at that
   exact filename.
2. **Isolytics + Teddy Bear Clinic.** These repos had little documentation, so
   their *problem*, *what it does*, and *reflection* are placeholders. Fill in
   what each app does, your specific role on the team, and one challenge you
   overcame. (See `index.html`, the `#project-3` and `#project-4` articles.)
3. **Verify the two drafted reflections.** The write-ups for the Claude Trading
   Agent and Tavio were drafted from your repos — read them and rephrase in your
   own words so they're genuinely yours.
4. **Screenshots (optional but recommended).** Drop images into `assets/` and
   reference them inside the relevant project (e.g. a Discord P&L alert for the
   trading bot). There's a commented placeholder in `#project-1`.
5. **Confirm the school wording** in the About section (Morris County School of
   Technology + dual enrollment at County College of Morris).

## Live trading ticker

The black bar at the top of the page is driven entirely by `ticker.js`. It
self-updates: every 60 seconds it polls the `ClaudeTradingAgent` repo's public
`memory.json`, and if a new trade or snapshot is detected it re-renders the
ticker and briefly pulses the background.

### Configuration (top of `ticker.js`)

| Knob | What it does | Default |
|------|---------------|---------|
| `MEMORY_URL`        | URL of the bot's `memory.json`                          | repo `main` branch |
| `ALPHA_VANTAGE_KEY` | Your Alpha Vantage key. Empty = derive price from bot.  | `""` |
| `POLL_MS`           | How often to check for trades                           | 60 s |
| `PRICE_TTL_MS`      | How long to cache each symbol's live price (localStorage) | 10 min |
| `FLASH_MS`          | Visual pulse duration when data changes                 | 1.5 s |

### Adding your Alpha Vantage key (gitignored)

The ticker uses a split-config pattern so your key stays out of git:

1. Grab a free key at <https://www.alphavantage.co/support/#api-key>.
2. **Copy** `ticker.config.example.js` → `ticker.config.local.js`:
   ```bash
   cp ticker.config.example.js ticker.config.local.js
   ```
3. Open `ticker.config.local.js` and paste the key into `ALPHA_VANTAGE_KEY`.
4. Reload the page. Done.

`ticker.config.local.js` is in `.gitignore`, so it never gets committed.
You can also override any other knob (`POLL_MS`, `PRICE_TTL_MS`, etc.) by
setting it in the local file — only the keys you set override; the rest fall
back to the defaults in `ticker.js`.

> **What this protects:** the key isn't in git history and isn't visible to
> anyone reading the public repo.
>
> **What this does NOT protect:** anyone who visits your *deployed* site can
> still right-click → View Source if the file is deployed. Since
> `ticker.config.local.js` is gitignored, **it isn't deployed to GitHub Pages
> by default** — the live site falls back to derived prices.
>
> If you want live prices on the deployed site, the right answer is either
> (a) a small backend proxy (Cloudflare Worker, Vercel function) that holds
> the key server-side, or (b) a GitHub Actions workflow that injects the key
> from a repo Secret at deploy time. Both are doable; ask if you want either.

If `ticker.config.local.js` doesn't exist, dev tools logs a single 404 for
the file — harmless, and the ticker proceeds with defaults (derived prices).

### Disabling the ticker
Remove `<script src="ticker.js"></script>` from `index.html`. The static
"Now shipping" list in the HTML becomes the permanent ticker content.

### Debug
From your browser dev console:
```js
tradingTicker.refresh()  // force an immediate re-fetch + re-render
tradingTicker.stop()     // stop polling
tradingTicker.config     // see current settings
```

## Deploy to GitHub Pages

1. Create a new public repo (e.g. `portfolio`) and push these files:
   ```bash
   git init
   git add .
   git commit -m "Portfolio website"
   git branch -M main
   git remote add origin https://github.com/atharvausturge/portfolio.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment**.
   Set **Source** to *Deploy from a branch*, **Branch** to `main` / `root`, save.
3. Your site goes live at `https://atharvausturge.github.io/portfolio/` within a
   minute or two. All paths are relative, so it works without any extra config.

> Tip: if you name the repo `atharvausturge.github.io`, the site is served from
> the root URL `https://atharvausturge.github.io/` instead.
