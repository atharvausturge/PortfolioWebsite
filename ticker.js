/* =============================================================================
   Live trading ticker — atharvausturge/ClaudeTradingAgent

   What this does:
     1. Polls the bot's public memory.json every 60s.
     2. When trade_history or the latest snapshot changes (new buy/sell, new
        snapshot), re-renders the marquee at the top of the page.
     3. If an Alpha Vantage key is configured, fetches the real current price
        for each open position (cached locally to stay under the free quota).
        Otherwise derives the price from the bot's stored entry + pl_pct.

   Modular by design: this file owns one feature end-to-end.
     - main.js does not know it exists.
     - Disable the ticker = remove this file's <script> tag from index.html.
     - All knobs live in CONFIG at the top.
   ========================================================================== */
(function () {
  "use strict";

  /* ============================== CONFIG ==============================
     Defaults below. To override (e.g. add your Alpha Vantage key) without
     touching this file, create `ticker.config.local.js` from the
     `ticker.config.example.js` template — it's gitignored. Any keys it
     defines on `window.TICKER_CONFIG` win over the defaults here.
     ==================================================================== */
  var DEFAULTS = {
    MEMORY_URL:
      "https://raw.githubusercontent.com/atharvausturge/ClaudeTradingAgent/main/memory.json",
    ALPHA_VANTAGE_KEY: "",            // empty = derived prices from the bot
    POLL_MS:        60 * 1000,        // how often to check for new trades
    PRICE_TTL_MS:   10 * 60 * 1000,   // per-symbol price cache lifetime
    FLASH_MS:       1500,             // visual flash duration when data changes
    MEMORY_BUST_MS: 30 * 1000         // memory.json URL cache-bust granularity
  };
  // Shallow merge — only the keys you set in the local file override defaults.
  var CONFIG = {};
  for (var k in DEFAULTS) CONFIG[k] = DEFAULTS[k];
  var overrides = (typeof window !== "undefined" && window.TICKER_CONFIG) || {};
  for (var k2 in overrides) CONFIG[k2] = overrides[k2];

  /* =========================== formatting =========================== */
  function fmtMoney(v) {
    return "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function fmtPct(v) {
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* =========================== memory.json =========================== */
  function fetchMemory() {
    var bust = Math.floor(Date.now() / CONFIG.MEMORY_BUST_MS);
    var url = CONFIG.MEMORY_URL + "?t=" + bust;
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // Walk trade_history backwards; the latest filled BUY is the entry we use
  // to derive a current price from pl_pct when live prices aren't available.
  function entryPriceFor(trades, symbol) {
    for (var i = trades.length - 1; i >= 0; i--) {
      var t = trades[i];
      if (t && t.symbol === symbol && t.action === "BUY" &&
          typeof t.price === "number") {
        return t.price;
      }
    }
    return null;
  }

  // Compact fingerprint that changes whenever a trade or snapshot is added.
  // Lets us skip the price-fetch + render when nothing has changed.
  function memoryFingerprint(data) {
    var th = (data && data.trade_history) || [];
    var snaps = (data && data.portfolio_snapshots) || [];
    var lastTrade = th[th.length - 1] || {};
    var lastSnap = snaps[snaps.length - 1] || {};
    return [
      th.length,
      lastTrade.time, lastTrade.action, lastTrade.symbol, lastTrade.price,
      snaps.length,
      lastSnap.time, lastSnap.portfolio_value
    ].join("|");
  }

  /* ======================= Alpha Vantage prices ======================= */
  function readCache(sym) {
    try {
      var raw = localStorage.getItem("av:" + sym);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (Date.now() - v.ts > CONFIG.PRICE_TTL_MS) return null;
      return typeof v.price === "number" ? v.price : null;
    } catch (e) { return null; }
  }
  function writeCache(sym, price) {
    try {
      localStorage.setItem("av:" + sym,
        JSON.stringify({ price: price, ts: Date.now() }));
    } catch (e) {}
  }

  function fetchAlphaVantagePrice(symbol) {
    if (!CONFIG.ALPHA_VANTAGE_KEY) return Promise.resolve(null);
    var cached = readCache(symbol);
    if (cached != null) return Promise.resolve(cached);

    var url = "https://www.alphavantage.co/query" +
              "?function=GLOBAL_QUOTE" +
              "&symbol=" + encodeURIComponent(symbol) +
              "&apikey=" + encodeURIComponent(CONFIG.ALPHA_VANTAGE_KEY);

    return fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        // When over quota, Alpha Vantage returns "Note" or "Information"
        // (HTTP 200) instead of a "Global Quote" payload — px stays NaN, null is returned.
        var q = d && d["Global Quote"];
        var px = q && parseFloat(q["05. price"]);
        if (!px || isNaN(px)) return null;
        writeCache(symbol, px);
        return px;
      })
      .catch(function () { return null; });
  }

  // Sequential to stay under the free-tier 5 req/min burst limit.
  // Cache-only lookups are instant; only un-cached symbols hit the network.
  function getLivePrices(symbols) {
    var out = {};
    return symbols.reduce(function (p, sym) {
      return p.then(function () {
        return fetchAlphaVantagePrice(sym).then(function (px) {
          if (px != null) out[sym] = px;
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  /* ============================== render ============================== */
  function buildItems(snapshot, trades, livePrices) {
    var positions = (snapshot && snapshot.positions) || [];
    var asOf = ((snapshot && snapshot.time) || "").slice(0, 10);
    var pv = snapshot && snapshot.portfolio_value;
    var parts = [];

    parts.push('<span class="ticker__item ticker__item--lead">&#9656; Live positions</span>');
    parts.push('<span class="ticker__sep">/</span>');

    if (typeof pv === "number") {
      parts.push(
        '<span class="ticker__item">Port. value ' +
        '<span class="ticker__price">' + fmtMoney(pv) + '</span></span>'
      );
      parts.push('<span class="ticker__sep">/</span>');
    }

    if (asOf) {
      parts.push('<span class="ticker__item ticker__item--meta">as of ' +
                 escapeHtml(asOf) + '</span>');
      parts.push('<span class="ticker__sep">/</span>');
    }

    var rendered = 0;
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var entry = entryPriceFor(trades, p.symbol);
      if (entry == null) continue;

      var price, plPct;
      var live = livePrices[p.symbol];
      if (live != null) {
        // Live price wins — recompute pl_pct from it so the % matches the price.
        price = live;
        plPct = (price - entry) / entry * 100;
      } else if (typeof p.pl_pct === "number") {
        // Fall back to bot-derived: price = entry * (1 + pl_pct/100).
        plPct = p.pl_pct;
        price = entry * (1 + plPct / 100);
      } else {
        continue;
      }

      var dir = plPct >= 0 ? "up" : "down";
      var arrow = plPct >= 0 ? "&#9650;" : "&#9660;"; // ▲ / ▼
      parts.push(
        '<span class="ticker__item">' +
          '<b class="ticker__sym">' + escapeHtml(p.symbol) + '</b> ' +
          '<span class="ticker__price">' + fmtMoney(price) + '</span> ' +
          '<span class="ticker__pnl ticker__pnl--' + dir + '">' +
            arrow + ' ' + fmtPct(plPct) +
          '</span>' +
        '</span>'
      );
      parts.push('<span class="ticker__sep">/</span>');
      rendered++;
    }
    return rendered > 0 ? parts.join("") : null;
  }

  function render(html) {
    var track = document.querySelector(".ticker__track");
    if (!track) return;
    track.innerHTML = html + html; // duplicate so the marquee loop is seamless
  }

  function flash() {
    var bar = document.querySelector(".ticker");
    if (!bar) return;
    bar.classList.remove("ticker--flash");   // restart the animation
    void bar.offsetWidth;                    // force reflow
    bar.classList.add("ticker--flash");
    setTimeout(function () { bar.classList.remove("ticker--flash"); },
               CONFIG.FLASH_MS);
  }

  /* =========================== orchestrator =========================== */
  var lastFingerprint = null;
  var isFirstRun = true;

  function tick() {
    return fetchMemory().then(function (data) {
      if (!data) return;
      var fp = memoryFingerprint(data);
      if (fp === lastFingerprint) return; // no trade, nothing to do

      var snaps = data.portfolio_snapshots || [];
      var snap = snaps[snaps.length - 1];
      if (!snap) return;

      var symbols = (snap.positions || []).map(function (p) { return p.symbol; });
      return getLivePrices(symbols).then(function (prices) {
        var html = buildItems(snap, data.trade_history || [], prices);
        if (!html) return;
        render(html);
        if (!isFirstRun) flash();
        lastFingerprint = fp;
        isFirstRun = false;
      });
    });
  }

  /* ============================== start ============================== */
  var timer = null;
  function start() {
    tick();
    timer = setInterval(tick, CONFIG.POLL_MS);
  }
  function stop() {
    if (timer != null) { clearInterval(timer); timer = null; }
  }

  // Pause polling when the tab is in the background; resume on return.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stop();
    } else {
      tick();
      if (timer == null) timer = setInterval(tick, CONFIG.POLL_MS);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  // Tiny debug handle so you can force a refresh from the dev console.
  window.tradingTicker = {
    refresh: function () { lastFingerprint = null; return tick(); },
    stop: stop,
    config: CONFIG
  };
})();
