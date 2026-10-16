/* Fusion Console · 钛金影院风总览样板：粒子地球 + 真数据（SPEC-A 数据契约不变） */
(function () {
  var F = window.Fusion;
  F.registerI18n('cinema', {
    zh: { raceFinal: '定投组合 · 终值', idxName: '上证指数', feed: '融合信息流', equity: '实验室净值', degenBal: '实验室余额', safetyToday: '今日安全精选', spiderSvc: '蜘蛛服务', pieces: '篇', record: '战绩', open: '持仓', foot: 'FUSION CONSOLE · CINEMA 样板 · 数据为实时真实值' },
    en: { raceFinal: 'DCA PORTFOLIO · FINAL', idxName: 'SSE COMPOSITE', feed: 'UNIFIED FEED', equity: 'DEGEN LAB EQUITY', degenBal: 'LAB BALANCE', safetyToday: "TODAY'S SAFETY PICKS", spiderSvc: 'SPIDER SERVICE', pieces: ' picks', record: 'Record', open: 'Open', foot: 'FUSION CONSOLE · CINEMA SAMPLE · LIVE REAL DATA' }
  });
  var NAV = [['overview', 'core.overview', '#'], ['markets', 'core.markets', '/#markets'], ['degen', 'core.degen', '/#degen'], ['race', 'core.race', '/#race'], ['spider', 'core.spider', '/#spider'], ['safety', 'core.safety', '/#safety']];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 粒子地球 ---------------- */
  var cv = document.getElementById('globe'), ctx = cv.getContext('2d');
  var W = 0, H = 0, pts = [], stars = [], hubs = [];
  (function buildSphere() {
    var N = 1750, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i;
      pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, g: Math.random() < 0.24 });
    }
    for (var s = 0; s < 170; s++) stars.push({ x: Math.random(), y: Math.random(), a: 0.12 + Math.random() * 0.5, r: Math.random() * 1.3 + 0.3 });
    hubs = [
      { la: 0.62, lo: 2.0 }, { la: 0.95, lo: 2.6 }, { la: 0.35, lo: -1.9 },
      { la: 0.9, lo: 0.35 }, { la: -0.5, lo: 3.4 }, { la: 0.55, lo: -2.9 }
    ].map(function (h) {
      return { x: Math.cos(h.la) * Math.sin(h.lo), y: Math.sin(h.la), z: Math.cos(h.la) * Math.cos(h.lo) };
    });
  })();
  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();
  function rot(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
  }
  var t0 = Date.now();
  function drawGlobe() {
    var t = (Date.now() - t0) / 1000, ang = reduced ? 0.6 : t * 0.03;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(28,44,84,.55)'); g.addColorStop(0.5, 'rgba(10,16,36,.25)'); g.addColorStop(1, 'rgba(4,6,13,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.globalAlpha = s.a; ctx.fillStyle = '#cfe4ff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    var cx = W * 0.5, cy = H * 0.42, R = Math.min(W, H) * 0.365;
    // 光轨椭圆
    [1.22, 1.38].forEach(function (k, i) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.32 - i * 0.13); ctx.scale(1, 0.36);
      var og = ctx.createLinearGradient(-R * k, 0, R * k, 0);
      og.addColorStop(0, 'rgba(127,216,255,0)'); og.addColorStop(0.5, i ? 'rgba(255,217,138,.4)' : 'rgba(127,216,255,.42)'); og.addColorStop(1, 'rgba(127,216,255,0)');
      ctx.strokeStyle = og; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, R * k, 0, 7); ctx.stroke(); ctx.restore();
    });
    // 球面辉光
    var sg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
    sg.addColorStop(0, 'rgba(64,110,190,.14)'); sg.addColorStop(0.75, 'rgba(40,70,140,.08)'); sg.addColorStop(1, 'rgba(40,70,140,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
    // 球体轮廓（极淡描边+内辉，给粒子云一个「球」的边界）
    ctx.strokeStyle = 'rgba(127,180,255,.13)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    // 粒子
    pts.forEach(function (p) {
      var q = rot(p, ang); if (q.z <= -0.12) return;
      var a = 0.14 + 0.86 * ((q.z + 0.12) / 1.12);
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = p.g ? '#ffd98a' : '#8fd2ff';
      ctx.beginPath(); ctx.arc(cx + q.x * R, cy + q.y * R, p.g ? 1.7 : 1.4, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 枢纽与弧线
    var hp = hubs.map(function (h) { var q = rot(h, ang); return { q: q, x: cx + q.x * R, y: cy + q.y * R }; });
    ctx.lineWidth = 1.1;
    for (var i = 0; i < hp.length; i++) for (var j = i + 1; j < hp.length; j++) {
      var A = hp[i], B = hp[j]; if (A.q.z <= 0 || B.q.z <= 0) continue;
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - R * 0.24;
      ctx.strokeStyle = 'rgba(255,217,138,.4)'; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
    }
    hp.forEach(function (h, i) {
      if (h.q.z <= 0) return;
      var pulse = reduced ? 0.5 : (Math.sin(t * 1.6 + i * 1.3) + 1) / 2;
      ctx.strokeStyle = 'rgba(255,217,138,.65)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 5 + pulse * 8, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ffe9bb'; ctx.beginPath(); ctx.arc(h.x, h.y, 2.3, 0, 7); ctx.fill();
    });
    if (!reduced) requestAnimationFrame(drawGlobe);
  }
  drawGlobe();

  /* ---------------- 数据 ---------------- */
  function pctCls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); }
  function render(s, feed, equity) {
    document.getElementById('cBrand').textContent = 'FUSION';
    document.getElementById('cTag').textContent = F.t('core.tagline');
    document.getElementById('cLang').textContent = F.t('core.langName');
    document.getElementById('cNav').innerHTML = NAV.map(function (n, i) {
      return '<a href="' + n[2] + '"' + (i === 0 ? ' class="on"' : '') + '>' + F.t(n[1]) + '</a>';
    }).join('');
    var dots = [['markets', s.finance.indices.length > 0], ['degen', s.degen.online], ['race', s.race.online], ['spider', s.spider.online], ['safety', s.safety.online]];
    document.getElementById('cDots').innerHTML = dots.map(function (d) { return '<span class="cdot ' + (d[1] ? 'ok' : 'bad') + '" title="' + d[0] + '"></span>'; }).join('');
    // 英雄数字：左=赛跑终值（金），右=上证（青）
    document.getElementById('raceLabel').textContent = F.t('cinema.raceFinal');
    document.getElementById('raceValue').textContent = s.race.online ? F.fmtMoney(s.race.final_value) : '—';
    document.getElementById('raceSub').innerHTML = s.race.online ? '<span class="up">' + F.fmtFrac(s.race.port_ret) + '</span>' : '';
    document.getElementById('raceMini').textContent = s.race.online ? ('IRR ' + F.fmtFrac(s.race.irr) + ' · ' + F.fmtFrac(s.race.mdd)) : '';
    var i0 = s.finance.indices[0] || {};
    document.getElementById('idxLabel').textContent = F.lang === 'en' ? F.t('cinema.idxName') : (i0.name || F.t('cinema.idxName'));
    document.getElementById('idxValue').textContent = i0.price ? F.fmtNum(i0.price) : '—';
    document.getElementById('idxSub').innerHTML = i0.pct !== undefined ? '<span class="' + pctCls(i0.pct) + '">' + F.fmtPct(i0.pct) + '</span>' : '';
    var i1 = s.finance.indices[1] || {};
    document.getElementById('idxMini').textContent = i1.name ? (F.indexName(i1.name) + ' ' + F.fmtNum(i1.price) + ' · ' + F.fmtPct(i1.pct)) : '';
    // 轨道条：实验室 / 安全 / 蜘蛛
    function chip(k, v, sub) { return '<div class="orb-chip"><span class="k">' + k + '</span><span class="v num">' + v + '</span><span class="s num">' + sub + '</span></div>'; }
    document.getElementById('orbitStrip').innerHTML =
      chip(F.t('cinema.degenBal'), s.degen.online ? F.fmtMoney(s.degen.bal, '$') : '—', s.degen.online ? (F.t('cinema.record') + ' ' + s.degen.wins + 'W/' + s.degen.losses + 'L · ' + F.t('cinema.open') + ' ' + s.degen.open) : F.t('core.offline')) +
      chip(F.t('cinema.safetyToday'), s.safety.online ? (s.safety.count + F.t('cinema.pieces')) : '—', s.safety.online ? s.safety.latest : F.t('core.offline')) +
      chip(F.t('cinema.spiderSvc'), s.spider.online ? F.t('core.online') : F.t('core.offline'), 'MCP · 4317');
    // 信息流
    document.getElementById('feedTitle').textContent = F.t('cinema.feed');
    var srcMeta = { finance: ['#7fd8ff', 'overview.srcFinance'], safety: ['#ff8d99', 'overview.srcSafety'], degen: ['#ffd98a', 'overview.srcDegen'] };
    var fl = document.getElementById('feedList');
    if (feed && feed.items) {
      fl.innerHTML = feed.items.slice(0, 7).map(function (it) {
        var m = srcMeta[it.source] || srcMeta.finance;
        var tt = it.url ? '<a href="' + it.url + '" target="_blank" rel="noopener">' + it.title + '</a>' : it.title;
        return '<div class="feed-row"><span class="src"><i style="background:' + m[0] + '"></i>' + F.t(m[1]) + '</span><span class="tt" style="flex:1">' + tt + '</span><span class="tm num">' + F.fmtTime(it.ts) + '</span></div>';
      }).join('');
    }
    document.getElementById('eqTitle').textContent = F.t('cinema.equity');
    if (equity) drawEquity(equity, s.degen);
    document.getElementById('c-foot').textContent = F.t('cinema.foot') + ' · ' + F.fmtTime(s.ts);
  }
  function drawEquity(series, dg) {
    var c = document.getElementById('eqCanvas'); if (!c || !series || series.length < 2) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight || 108;
    c.width = w * dpr; c.height = h * dpr;
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    var vs = series.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), rg = (mx - mn) || 1;
    var grad = x.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,217,138,.30)'); grad.addColorStop(1, 'rgba(255,217,138,0)');
    x.beginPath();
    vs.forEach(function (v, i) { var px = i / (vs.length - 1) * (w - 6) + 3, py = h - 8 - (v - mn) / rg * (h - 18); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = '#ffd98a'; x.lineWidth = 1.8; x.shadowColor = 'rgba(255,217,138,.55)'; x.shadowBlur = 8; x.stroke();
    x.shadowBlur = 0; x.lineTo(w - 3, h); x.lineTo(3, h); x.closePath(); x.fillStyle = grad; x.fill();
    var last = vs[vs.length - 1];
    document.getElementById('eqFoot').innerHTML = '<span>' + (dg.online ? F.fmtMoney(dg.bal, '$') : '') + '</span><span>' + F.fmtNum(mn, 0) + ' — ' + F.fmtNum(mx, 0) + '</span><span>' + F.fmtNum(last, 0) + '</span>';
  }
  var S = null, FEED = null, EQ = null;
  function load() {
    fetch('/api/fusion/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) { S = s; F.status = s; if (FEED) render(S, FEED, EQ); }).catch(function () {});
    fetch('/api/fusion/feed?limit=14', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (f) { FEED = f; if (S) render(S, FEED, EQ); }).catch(function () { FEED = { items: [] }; if (S) render(S, FEED, EQ); });
    fetch('/api/fusion/degen-state', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (st) { EQ = st.equity || null; if (S && FEED) render(S, FEED, EQ); }).catch(function () {});
  }
  function tickClock() {
    var d = new Date();
    document.getElementById('cClock').textContent = d.toLocaleDateString(F.locale(), { month: '2-digit', day: '2-digit', weekday: 'short' }) + ' ' + d.toLocaleTimeString(F.locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  document.getElementById('cLang').addEventListener('click', function () {
    F.setLang(F.lang === 'zh' ? 'en' : 'zh');
    if (S) render(S, FEED, EQ); tickClock();
  });
  // overview.* 词条在 view-overview.js 里注册；样板页独立加载时在此补注册来源名
  F.registerI18n('overview', {
    zh: { srcFinance: '财经', srcSafety: '安全', srcDegen: '实验室' },
    en: { srcFinance: 'Markets', srcSafety: 'Safety', srcDegen: 'Degen' }
  });
  load(); tickClock(); setInterval(tickClock, 1000); setInterval(load, 60000);
})();
