/* Fusion Console · Markets view (SPEC-A 3.2)
   Index ticker, watchlist + quotes, K-line canvas, analyze, CYQ,
   sectors tabs, news feed, morning picks. All copy via i18n. */
(function () {
  var F = window.Fusion;

  F.registerI18n('markets', {
    zh: {
      band: '指数滚动带', watch: '自选股', stock: '个股',
      colName: '名称', colCode: '代码', colPrice: '现价', colChg: '涨跌幅',
      colOpen: '今开', colHigh: '最高', colLow: '最低',
      kline: '日K线', daily: '日线', volume: '成交量',
      analyze: '技术分析', cyq: '筹码分布',
      cyqMissing: '筹码环境未建：需先在服务端运行 setup_cyqenv.sh 搭建筹码数据环境。',
      sectors: '板块榜', tabConcept: '概念', tabIndustry: '行业',
      news: '财经快讯', picks: '早间选股',
      score: '评分', noKline: '暂无K线数据', watchEmpty: '自选股为空，请先在 FinSight 添加。',
      anClose: '最新价', anChange: '涨跌幅', anMA5: 'MA5', anMA20: 'MA20', anMA60: 'MA60',
      anMACD: 'MACD', anDIF: 'DIF', anDEA: 'DEA', anK: 'K', anD: 'D', anJ: 'J',
      anRSI: 'RSI', anBollUp: '布林上轨', anBollMid: '布林中轨', anBollLow: '布林下轨',
      anVolRatio: '量比(5日)', anHigh20: '20日高点', anLow20: '20日低点'
    },
    en: {
      band: 'Index Ticker', watch: 'Watchlist', stock: 'Stock',
      colName: 'Name', colCode: 'Symbol', colPrice: 'Price', colChg: 'Change',
      colOpen: 'Open', colHigh: 'High', colLow: 'Low',
      kline: 'Daily K-Line', daily: 'Daily', volume: 'Volume',
      analyze: 'Technical Analysis', cyq: 'Chip Distribution',
      cyqMissing: 'Chip environment not set up: run setup_cyqenv.sh on the server first to build chip data.',
      sectors: 'Sectors', tabConcept: 'Concept', tabIndustry: 'Industry',
      news: 'Market News', picks: 'Morning Picks',
      score: 'Score', noKline: 'No K-line data', watchEmpty: 'Watchlist is empty. Add symbols in FinSight first.',
      anClose: 'Last', anChange: 'Change', anMA5: 'MA5', anMA20: 'MA20', anMA60: 'MA60',
      anMACD: 'MACD', anDIF: 'DIF', anDEA: 'DEA', anK: 'K', anD: 'D', anJ: 'J',
      anRSI: 'RSI', anBollUp: 'Bollinger Upper', anBollMid: 'Bollinger Mid', anBollLow: 'Bollinger Lower',
      anVolRatio: 'Vol ratio (5d)', anHigh20: '20-day high', anLow20: '20-day low'
    }
  });

  var state = { symbol: null, kline: null, canvas: null, sectorKind: 'concept' };
  var mountSeq = 0, resizeBound = false;
  function t(k) { return F.t('markets.' + k); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function skel(el, n) {
    var h = '';
    for (var i = 0; i < (n || 3); i++) h += '<div class="skel" style="height:14px;margin:8px 0"></div>';
    el.innerHTML = h;
  }
  function zoneEmpty(el) { el.innerHTML = '<div class="empty">' + F.t('core.empty') + '</div>'; }
  function zoneErr(el) { el.innerHTML = '<div class="empty">' + F.t('core.unreachable') + '</div>'; }
  function get(url, seq) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  /* ---- 1. index ticker band ---- */
  function bandItem(it) {
    var pct = (it.change_pct == null ? 0 : Number(it.change_pct));
    return '<div class="card" style="flex:0 0 auto;min-width:148px;padding:10px 14px;border-radius:10px">' +
      '<div style="font-size:12px;color:var(--dim)">' + esc(F.indexName(it.name)) + '</div>' +
      '<div class="num" style="font-size:17px;font-weight:700;margin-top:4px">' + F.fmtNum(it.price, 2) + '</div>' +
      '<div class="num ' + F.cls(pct) + '" style="font-size:12.5px;margin-top:2px">' + F.fmtPct(pct) + '</div></div>';
  }
  function loadBand(el, seq) {
    skel(el, 1);
    Promise.all([get('/api/finance/indices').catch(function () { return { items: [] }; }),
                 get('/api/finance/global').catch(function () { return { items: [] }; })])
      .then(function (res) {
        if (seq !== mountSeq) return;
        var all = (res[0].items || []).concat(res[1].items || []);
        if (!all.length) { zoneErr(el); return; }
        el.innerHTML = all.map(bandItem).join('');
      });
  }

  /* ---- 2. watchlist + quotes ---- */
  var watchQuotes = {};
  function loadWatch(el, seq) {
    skel(el, 5);
    get('/api/finance/watchlist').then(function (w) {
      var list = (w && w.items) || [];
      if (!list.length) { zoneEmpty(el); el.innerHTML = '<div class="empty">' + t('watchEmpty') + '</div>'; return; }
      var syms = list.map(function (x) { return x.symbol; }).join(',');
      return get('/api/finance/quotes?symbols=' + encodeURIComponent(syms)).then(function (q) {
        return { list: list, quotes: (q && q.items) || [] };
      }).catch(function () { return { list: list, quotes: [] }; });
    }).then(function (res) {
      if (seq !== mountSeq || !res) return;
      watchQuotes = {};
      res.quotes.forEach(function (q) { watchQuotes[q.symbol] = q; });
      var rows = res.list.map(function (w) {
        var q = watchQuotes[w.symbol] || {};
        var name = q.name || w.name || w.symbol;
        var price = q.price, pct = q.change_pct;
        var cls = q.price != null && pct != null ? F.cls(Number(pct)) : 'flat';
        return '<tr class="clickable" data-sym="' + esc(w.symbol) + '"' +
          (w.symbol === state.symbol ? ' style="background:rgba(79,214,255,.07)"' : '') + '>' +
          '<td>' + esc(name) + '</td><td class="num">' + esc(w.symbol) + '</td>' +
          '<td class="num">' + F.fmtNum(price, 2) + '</td>' +
          '<td class="num ' + cls + '">' + F.fmtPct(pct) + '</td>' +
          '<td class="num">' + F.fmtNum(q.open, 2) + '</td>' +
          '<td class="num">' + F.fmtNum(q.high, 2) + '</td>' +
          '<td class="num">' + F.fmtNum(q.low, 2) + '</td></tr>';
      }).join('');
      el.innerHTML = '<table class="tbl"><thead><tr><th>' + t('colName') + '</th><th>' + t('colCode') + '</th><th>' +
        t('colPrice') + '</th><th>' + t('colChg') + '</th><th>' + t('colOpen') + '</th><th>' +
        t('colHigh') + '</th><th>' + t('colLow') + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
      var tb = el.querySelectorAll('tr.clickable');
      tb.forEach(function (tr) {
        tr.addEventListener('click', function () { selectStock(tr.getAttribute('data-sym')); });
      });
      if (!state.symbol && res.list.length) selectStock(res.list[0].symbol);
      else if (state.symbol) highlightRow(el);
    }).catch(function () { if (seq === mountSeq) zoneErr(el); });
  }
  function highlightRow(el) {
    el.querySelectorAll('tr.clickable').forEach(function (tr) {
      tr.style.background = tr.getAttribute('data-sym') === state.symbol ? 'rgba(79,214,255,.07)' : '';
    });
  }
  function selectStock(sym) {
    state.symbol = sym;
    var tbl = document.getElementById('mk-watch-body');
    if (tbl) highlightRow(tbl);
    loadKline(); loadAnalyze(); loadCyq();
  }

  /* ---- 3. K-line canvas ---- */
  function maOf(closes, n, i) {
    if (i + 1 < n) return null;
    var s = 0; for (var k = i - n + 1; k <= i; k++) s += closes[k];
    return s / n;
  }
  function drawKline() {
    var cv = state.canvas, rows = state.kline;
    if (!cv || !rows) return;
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 600, h = 300;
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var volH = 54, padR = 52, ph = h - volH - 8;
    var closes = rows.map(function (r) { return r.close; });
    var lo = Math.min.apply(null, rows.map(function (r) { return r.low; }));
    var hi = Math.max.apply(null, rows.map(function (r) { return r.high; }));
    if (hi === lo) { hi = lo + 1; }
    var n = rows.length, cw = (w - padR) / n;
    var px = function (p) { return 6 + (hi - p) / (hi - lo) * (ph - 12); };
    var vmax = Math.max.apply(null, rows.map(function (r) { return r.volume || 0; })) || [1];
    ctx.font = '10px system-ui'; ctx.fillStyle = '#5b667f';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var p = hi - f * (hi - lo), y = px(p);
      ctx.strokeStyle = 'rgba(30,39,64,.6)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillText(F.fmtNum(p, 2), w - padR + 6, y + 3);
    });
    rows.forEach(function (r, i) {
      var up = r.close >= r.open, x = i * cw + cw / 2;
      var c = up ? '#2bd97c' : '#ff5c5c';
      ctx.strokeStyle = c; ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(x, px(r.high)); ctx.lineTo(x, px(r.low)); ctx.stroke();
      var bw = Math.max(1, cw * 0.6);
      var y1 = px(r.open), y2 = px(r.close);
      ctx.fillRect(x - bw / 2, Math.min(y1, y2), bw, Math.max(1, Math.abs(y2 - y1)));
      var vh = (r.volume || 0) / (vmax || 1) * (volH - 8);
      ctx.fillRect(x - bw / 2, h - 4 - vh, bw, vh);
    });
    [['#4fd6ff', 5], ['#e8b866', 20], ['#f34a87', 60]].forEach(function (cfg) {
      ctx.strokeStyle = cfg[0]; ctx.lineWidth = 1; ctx.beginPath();
      var started = false;
      rows.forEach(function (r, i) {
        var v = maOf(closes, cfg[1], i);
        if (v == null) return;
        var x = i * cw + cw / 2;
        if (!started) { ctx.moveTo(x, px(v)); started = true; } else ctx.lineTo(x, px(v));
      });
      ctx.stroke(); ctx.lineWidth = 1;
    });
  }
  function loadKline() {
    var body = document.getElementById('mk-kline-body');
    if (!body) return;
    var seq = mountSeq;
    body.innerHTML = '<div class="skel" style="height:300px"></div>';
    get('/api/finance/kline?symbol=' + encodeURIComponent(state.symbol) + '&period=daily').then(function (d) {
      if (seq !== mountSeq) return;
      var rows = (d && d.kline) || [];
      rows = rows.filter(function (r) { return r.open != null && r.close != null && r.high != null && r.low != null; });
      if (!rows.length) { body.innerHTML = '<div class="empty">' + t('noKline') + '</div>'; state.kline = null; return; }
      state.kline = rows;
      body.innerHTML = '<canvas class="chart" style="height:300px"></canvas>' +
        '<div class="sub"><span class="chip" style="color:#4fd6ff;border-color:#4fd6ff">MA5</span>' +
        '<span class="chip" style="color:#e8b866;border-color:#e8b866">MA20</span>' +
        '<span class="chip" style="color:#f34a87;border-color:#f34a87">MA60</span>' +
        '<span style="margin-left:8px">' + t('daily') + ' · ' + esc(state.symbol) + '</span></div>';
      state.canvas = body.querySelector('canvas');
      drawKline();
    }).catch(function () { if (seq === mountSeq) zoneErr(body); });
  }

  /* ---- 3b. analyze + cyq ---- */
  function fieldRow(label, value) {
    if (value == null || value === '') return '';
    return '<div><div style="font-size:11px;color:var(--dim)">' + label + '</div>' +
      '<div class="num" style="font-size:14px;font-weight:600;margin-top:2px">' + value + '</div></div>';
  }
  function loadAnalyze() {
    var body = document.getElementById('mk-an-body');
    if (!body) return;
    var seq = mountSeq;
    skel(body, 3);
    get('/api/finance/analyze?symbol=' + encodeURIComponent(state.symbol)).then(function (d) {
      if (seq !== mountSeq) return;
      var ind = (d && d.indicators) || {};
      var ma = ind.ma || {}, macd = ind.macd || {}, kdj = ind.kdj || {}, boll = ind.boll || {}, hl = ind.high_low || {}, vol = ind.volume || {};
      var rows = '';
      rows += fieldRow(t('anClose'), F.fmtNum(ind.close, 2));
      rows += fieldRow(t('anChange'), '<span class="' + F.cls(ind.change_pct) + '">' + F.fmtPct(ind.change_pct) + '</span>');
      rows += fieldRow(t('anMA5'), F.fmtNum(ma.MA5, 2));
      rows += fieldRow(t('anMA20'), F.fmtNum(ma.MA20, 2));
      rows += fieldRow(t('anMA60'), F.fmtNum(ma.MA60, 2));
      rows += fieldRow(t('anMACD'), F.fmtNum(macd.MACD, 2));
      rows += fieldRow(t('anDIF'), F.fmtNum(macd.DIF, 2));
      rows += fieldRow(t('anDEA'), F.fmtNum(macd.DEA, 2));
      rows += fieldRow(t('anK') + '/D/J', F.fmtNum(kdj.K, 1) + ' / ' + F.fmtNum(kdj.D, 1) + ' / ' + F.fmtNum(kdj.J, 1));
      rows += fieldRow(t('anRSI'), F.fmtNum(ind.rsi, 1));
      rows += fieldRow(t('anBollUp'), F.fmtNum(boll.upper, 2));
      rows += fieldRow(t('anBollMid'), F.fmtNum(boll.mid, 2));
      rows += fieldRow(t('anBollLow'), F.fmtNum(boll.lower, 2));
      rows += fieldRow(t('anVolRatio'), F.fmtNum(vol.vol_ratio_5, 2));
      rows += fieldRow(t('anHigh20'), F.fmtNum(hl.high_20, 2));
      rows += fieldRow(t('anLow20'), F.fmtNum(hl.low_20, 2));
      body.innerHTML = rows ? '<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px">' + rows + '</div>' : '<div class="empty">' + F.t('core.empty') + '</div>';
    }).catch(function () { if (seq === mountSeq) zoneErr(body); });
  }
  function loadCyq() {
    var body = document.getElementById('mk-cyq-body');
    if (!body) return;
    var seq = mountSeq;
    skel(body, 2);
    get('/api/finance/cyq?symbol=' + encodeURIComponent(state.symbol)).then(function (d) {
      if (seq !== mountSeq) return;
      if (d && d.ok) {
        var txt = typeof d === 'object' ? JSON.stringify(d) : String(d);
        body.innerHTML = '<div class="sub">' + esc(txt.slice(0, 400)) + '</div>';
      } else {
        body.innerHTML = '<div class="empty" style="border-style:dashed">' + t('cyqMissing') + '</div>';
      }
    }).catch(function () { if (seq === mountSeq) zoneErr(body); });
  }

  /* ---- 4. sectors + news ---- */
  function loadSectors(el, seq) {
    function fill(kind) {
      var list = document.getElementById('mk-sec-list');
      if (!list) return;
      skel(list, 3);
      get('/api/finance/sectors?kind=' + kind).then(function (d) {
        if (seq !== mountSeq) return;
        var items = (d && d.items) || [];
        if (!items.length) { zoneEmpty(list); return; }
        list.innerHTML = items.map(function (s) {
          var pct = Number(s.change_pct) || 0;
          return '<div style="display:flex;justify-content:space-between;padding:7px 2px;border-bottom:1px solid rgba(30,39,64,.55)">' +
            '<span>' + esc(s.name || s.code) + '</span>' +
            '<span class="num ' + F.cls(pct) + '">' + F.fmtPct(pct) + '</span></div>';
        }).join('');
      }).catch(function () { if (seq === mountSeq) zoneErr(list); });
    }
    el.innerHTML = '<div class="tabs" style="margin-bottom:10px">' +
      '<button data-k="concept" class="on" style="--ac:var(--c-fin)">' + t('tabConcept') + '</button>' +
      '<button data-k="industry" style="--ac:var(--c-fin)">' + t('tabIndustry') + '</button></div>' +
      '<div id="mk-sec-list"></div>';
    el.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.sectorKind = b.getAttribute('data-k');
        el.querySelectorAll('.tabs button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); fill(state.sectorKind);
      });
    });
    fill(state.sectorKind);
  }
  function loadNews(el, seq) {
    skel(el, 4);
    get('/api/finance/news').then(function (d) {
      if (seq !== mountSeq) return;
      var items = (d && d.items) || [];
      if (!items.length) { zoneEmpty(el); return; }
      el.innerHTML = '<div class="feed">' + items.slice(0, 12).map(function (n) {
        return '<div class="fi"><div class="ft"><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
          esc(n.title) + '</a></div>' +
          '<div class="ftime">' + esc(n.time || '') + '</div></div>';
      }).join('') + '</div>';
    }).catch(function () { if (seq === mountSeq) zoneErr(el); });
  }

  /* ---- 5. morning picks strip ---- */
  function loadPicks(el, seq) {
    skel(el, 1);
    get('/api/finance/picks?top=6').then(function (d) {
      if (seq !== mountSeq) return;
      var items = (d && d.picks) || [];
      if (!items.length) { zoneEmpty(el); return; }
      el.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">' +
        items.map(function (p) {
          var r = (p.reasons || [])[0] || '';
          return '<div class="card" style="padding:12px 14px;border-radius:10px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b>' + esc(p.name || p.symbol) + '</b>' +
            '<span class="chip">' + t('score') + ' ' + F.fmtNum(p.score, 0) + '</span></div>' +
            '<div class="sub" style="margin-top:6px">' + esc(String(r).slice(0, 60)) + '</div></div>';
        }).join('') + '</div>';
    }).catch(function () { if (seq === mountSeq) zoneErr(el); });
  }

  /* ---- mount ---- */
  function mount(root) {
    mountSeq++;
    var seq = mountSeq;
    root.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr">' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + t('band') + '</h3>' +
      '<div id="mk-band" style="display:flex;gap:10px;overflow-x:auto;padding-top:12px"></div></div></div>' +
      '<div class="grid" style="grid-template-columns:5fr 7fr;margin-top:16px">' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + t('watch') + '</h3>' +
      '<div id="mk-watch-body" style="padding-top:8px;overflow-x:auto"></div></div>' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + t('stock') + '</h3>' +
      '<div id="mk-kline-body" style="padding-top:10px"></div>' +
      '<div style="margin-top:14px"><div class="sub" style="margin-bottom:6px">' + t('analyze') + '</div><div id="mk-an-body"></div></div>' +
      '<div style="margin-top:14px"><div class="sub" style="margin-bottom:6px">' + t('cyq') + '</div><div id="mk-cyq-body"></div></div></div></div>' +
      '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + t('sectors') + '</h3>' +
      '<div id="mk-sec" style="padding-top:8px"></div></div>' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + t('news') + '</h3>' +
      '<div id="mk-news" style="padding-top:8px;max-height:380px;overflow-y:auto"></div></div></div>' +
      '<div class="card" style="--ac:var(--c-fin);margin-top:16px"><h3><span class="bar"></span>' + t('picks') + '</h3>' +
      '<div id="mk-picks" style="padding-top:10px"></div></div>';
    state.symbol = null;
    loadBand(document.getElementById('mk-band'), seq);
    loadWatch(document.getElementById('mk-watch-body'), seq);
    loadSectors(document.getElementById('mk-sec'), seq);
    loadNews(document.getElementById('mk-news'), seq);
    loadPicks(document.getElementById('mk-picks'), seq);
    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener('resize', function () {
        if (state.kline && state.canvas) drawKline();
      });
    }
  }

  F.registerView('markets', { mount: mount });
})();
