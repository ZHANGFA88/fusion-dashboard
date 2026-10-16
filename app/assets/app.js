/* Fusion Console · 外壳：导航、路由（hash）、时钟、全局状态轮询、语言切换 */
(function () {
  var F = window.Fusion;
  var NAV = [
    { v: 'overview', ac: 'var(--brand)', key: 'core.keyOverview' },
    { v: 'markets', ac: 'var(--c-fin)', key: 'core.keyFinance' },
    { v: 'degen', ac: 'var(--c-degen)', key: 'core.keyDegen' },
    { v: 'race', ac: 'var(--c-race)', key: 'core.keyRace' },
    { v: 'spider', ac: 'var(--c-spider)', key: 'core.keySpider' },
    { v: 'safety', ac: 'var(--c-safety)', key: 'core.keySafety' }
  ];
  var current = null, mounted = {};

  function navKey(v) {
    var s = (F.status || {});
    try {
      if (v === 'markets') { var i = (s.finance.indices || [])[0]; return i ? F.indexName(i.name) + ' ' + F.fmtNum(i.price) : F.t('core.keyFinance'); }
      if (v === 'degen') return s.degen && s.degen.online ? F.fmtMoney(s.degen.bal, '$') + ' · ' + s.degen.wins + 'W/' + s.degen.losses + 'L' : F.t('core.keyDegen');
      if (v === 'race') return s.race && s.race.online ? F.fmtMoney(s.race.final_value) + ' · ' + F.fmtFrac(s.race.port_ret) : F.t('core.keyRace');
      if (v === 'safety') return s.safety && s.safety.online ? s.safety.latest + ' · ' + s.safety.count + '' : F.t('core.keySafety');
      if (v === 'spider') return s.spider ? (s.spider.online ? F.t('core.online') : F.t('core.offline')) : F.t('core.keySpider');
    } catch (e) {}
    return F.t('core.keyOverview');
  }

  function renderChrome() {
    document.getElementById('brandTx').textContent = F.t('core.brand');
    document.getElementById('tagTx').textContent = F.t('core.tagline');
    document.getElementById('langBtn').textContent = F.t('core.langName');
    document.title = F.t('core.brand');
    var rail = document.getElementById('rail');
    rail.innerHTML = NAV.map(function (n) {
      return '<a class="nav-item' + (current === n.v ? ' active' : '') + '" style="--ac:' + n.ac + '" href="#' + n.v + '">' +
        '<span class="n-name"><span class="n-ico"></span>' + F.t('core.' + n.v) + '</span>' +
        '<span class="n-key num">' + navKey(n.v) + '</span></a>';
    }).join('') + '<div id="railFoot">Fusion Console · V1 Cinema<br>8770 / 4317</div>';
    var ts = document.getElementById('topStatus');
    var s = F.status;
    function dot(ok, label) { return '<span class="tstat"><span class="dot ' + (ok === null ? 'warn' : ok ? 'ok' : 'bad') + '"></span>' + label + '</span>'; }
    if (!s) { ts.innerHTML = dot(null, '···'); }
    else {
      ts.innerHTML =
        dot(s.finance && s.finance.indices && s.finance.indices.length > 0, F.t('core.markets')) +
        dot(s.degen && s.degen.online, F.t('core.degen')) +
        dot(s.race && s.race.online, F.t('core.race')) +
        dot(s.spider && s.spider.online, F.t('core.spider')) +
        dot(s.safety && s.safety.online, F.t('core.safety'));
    }
  }

  function activate(v) {
    if (!F.views[v]) v = 'overview';
    current = v;
    document.querySelectorAll('.view').forEach(function (el) { el.classList.toggle('active', el.id === 'view-' + v); });
    if (window.__globeRun) window.__globeRun(v === 'overview'); // 非总览视图地球静帧，省 GPU（蜘蛛/赛跑各有自己的舞台动画）
    renderChrome();
    var def = F.views[v];
    var el = document.getElementById('view-' + v);
    if (def && def.mount) { def.mount(el); mounted[v] = true; }
  }

  function route() {
    var v = (location.hash || '#overview').slice(1);
    activate(v);
  }

  function tickClock() {
    var d = new Date();
    document.getElementById('clock').textContent =
      d.toLocaleDateString(F.locale(), { month: '2-digit', day: '2-digit', weekday: 'short' }) + ' ' +
      d.toLocaleTimeString(F.locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    // 粗判 A 股交易时段（北京 9:30–11:30 / 13:00–15:00，工作日）仅作顶栏提示
    var bj = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
    var mins = bj.getHours() * 60 + bj.getMinutes(), wd = bj.getDay();
    var open = wd >= 1 && wd <= 5 && ((mins >= 570 && mins <= 690) || (mins >= 780 && mins <= 900));
    var ms = document.getElementById('mktState');
    ms.textContent = open ? F.t('core.mktOpen') : F.t('core.mktClosed');
    ms.style.color = open ? 'var(--up)' : 'var(--dim)';
  }

  function pollStatus() {
    fetch('/api/fusion/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) {
      F.status = s; renderChrome();
      if (current && F.views[current] && F.views[current].onStatus) F.views[current].onStatus(s);
    }).catch(function () { /* 下个周期再试 */ });
  }

  document.getElementById('langBtn').addEventListener('click', function () {
    F.setLang(F.lang === 'zh' ? 'en' : 'zh');
    mounted = {};
    renderChrome(); tickClock();
    if (current) { var def = F.views[current]; if (def && def.mount) def.mount(document.getElementById('view-' + current)); }
  });

  window.addEventListener('hashchange', route);
  route(); tickClock(); pollStatus();
  setInterval(tickClock, 1000);
  setInterval(pollStatus, 30000);
})();

/* 钛金影院风 · 粒子地球背景（全站共享，缓慢自转；reduced-motion 时静帧） */
(function () {
  var cv = document.getElementById('globe'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, pts = [], stars = [], hubs = [];
  var N = 1750, ga = Math.PI * (3 - Math.sqrt(5)), i;
  for (i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i;
    pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, g: Math.random() < 0.24 });
  }
  for (i = 0; i < 170; i++) stars.push({ x: Math.random(), y: Math.random(), a: 0.12 + Math.random() * 0.5, r: Math.random() * 1.3 + 0.3 });
  hubs = [{ la: 0.62, lo: 2.0 }, { la: 0.95, lo: 2.6 }, { la: 0.35, lo: -1.9 }, { la: 0.9, lo: 0.35 }, { la: -0.5, lo: 3.4 }, { la: 0.55, lo: -2.9 }]
    .map(function (h) { return { x: Math.cos(h.la) * Math.sin(h.lo), y: Math.sin(h.la), z: Math.cos(h.la) * Math.cos(h.lo) }; });
  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();
  function rot(p, a) { var c = Math.cos(a), s = Math.sin(a); return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c }; }
  var t0 = Date.now(), running = true, rafId = null;
  window.__globeRun = function (on) {
    if (reduced) return;
    if (on && !running) { running = true; draw(); }
    else if (!on && running) { running = false; if (rafId) cancelAnimationFrame(rafId); }
  };
  function draw() {
    var t = (Date.now() - t0) / 1000, ang = reduced ? 0.6 : t * 0.03;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(28,44,84,.55)'); g.addColorStop(0.5, 'rgba(10,16,36,.25)'); g.addColorStop(1, 'rgba(4,6,13,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.globalAlpha = s.a; ctx.fillStyle = '#cfe4ff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    var cx = W * 0.5, cy = H * 0.42, R = Math.min(W, H) * 0.365;
    [1.22, 1.38].forEach(function (k, i2) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.32 - i2 * 0.13); ctx.scale(1, 0.36);
      var og = ctx.createLinearGradient(-R * k, 0, R * k, 0);
      og.addColorStop(0, 'rgba(127,216,255,0)'); og.addColorStop(0.5, i2 ? 'rgba(255,217,138,.4)' : 'rgba(127,216,255,.42)'); og.addColorStop(1, 'rgba(127,216,255,0)');
      ctx.strokeStyle = og; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, R * k, 0, 7); ctx.stroke(); ctx.restore();
    });
    var sg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
    sg.addColorStop(0, 'rgba(64,110,190,.14)'); sg.addColorStop(0.75, 'rgba(40,70,140,.08)'); sg.addColorStop(1, 'rgba(40,70,140,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(127,180,255,.13)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    pts.forEach(function (p) {
      var q = rot(p, ang); if (q.z <= -0.12) return;
      ctx.globalAlpha = (0.14 + 0.86 * ((q.z + 0.12) / 1.12)) * 0.95;
      ctx.fillStyle = p.g ? '#ffd98a' : '#8fd2ff';
      ctx.beginPath(); ctx.arc(cx + q.x * R, cy + q.y * R, p.g ? 1.7 : 1.4, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    var hp = hubs.map(function (h) { var q = rot(h, ang); return { q: q, x: cx + q.x * R, y: cy + q.y * R }; });
    ctx.lineWidth = 1.1;
    for (var a = 0; a < hp.length; a++) for (var b = a + 1; b < hp.length; b++) {
      var A = hp[a], B = hp[b]; if (A.q.z <= 0 || B.q.z <= 0) continue;
      ctx.strokeStyle = 'rgba(255,217,138,.4)'; ctx.beginPath(); ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo((A.x + B.x) / 2, (A.y + B.y) / 2 - R * 0.24, B.x, B.y); ctx.stroke();
    }
    hp.forEach(function (h, i3) {
      if (h.q.z <= 0) return;
      var pulse = reduced ? 0.5 : (Math.sin(t * 1.6 + i3 * 1.3) + 1) / 2;
      ctx.strokeStyle = 'rgba(255,217,138,.65)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 5 + pulse * 8, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ffe9bb'; ctx.beginPath(); ctx.arc(h.x, h.y, 2.3, 0, 7); ctx.fill();
    });
    if (!reduced && running) rafId = requestAnimationFrame(draw);
  }
  draw();
})();
