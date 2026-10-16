/* Fusion Console · 视图：总览（钛金影院风构图）
   左金：定投终值；右青：上证；中：粒子地球（外壳背景）；轨道条：实验室/安全/蜘蛛；
   下三分之一：融合信息流（三源交织）+ 实验室净值线。数据契约见 SPEC-A §6。 */
(function () {
  var F = window.Fusion;
  F.registerI18n('cinema', {
    zh: { raceFinal: '定投组合 · 终值', idxName: '上证指数', feed: '融合信息流', equity: '实验室净值', degenBal: '实验室余额', safetyToday: '今日安全精选', spiderSvc: '蜘蛛服务', pieces: '篇', record: '战绩', open: '持仓', srcFinance: '财经', srcSafety: '安全', srcDegen: '实验室' },
    en: { raceFinal: 'DCA PORTFOLIO · FINAL', idxName: 'SSE COMPOSITE', feed: 'UNIFIED FEED', equity: 'DEGEN LAB EQUITY', degenBal: 'LAB BALANCE', safetyToday: "TODAY'S SAFETY PICKS", spiderSvc: 'SPIDER SERVICE', pieces: ' picks', record: 'Record', open: 'Open', srcFinance: 'Markets', srcSafety: 'Safety', srcDegen: 'Degen' }
  });
  var feed = null, equity = null, timer = null;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function pctCls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); }
  function render(el) {
    var s = F.status; if (!s) return;
    el.querySelector('#ovRaceLabel').textContent = F.t('cinema.raceFinal');
    el.querySelector('#ovRaceValue').textContent = s.race.online ? F.fmtMoney(s.race.final_value) : '—';
    el.querySelector('#ovRaceSub').innerHTML = s.race.online ? '<span class="up">' + F.fmtFrac(s.race.port_ret) + '</span>' : '';
    el.querySelector('#ovRaceMini').textContent = s.race.online ? ('IRR ' + F.fmtFrac(s.race.irr) + ' · ' + F.fmtFrac(s.race.mdd)) : '';
    var i0 = (s.finance.indices || [])[0] || {}, i1 = (s.finance.indices || [])[1] || {};
    el.querySelector('#ovIdxLabel').textContent = F.lang === 'en' ? F.t('cinema.idxName') : (i0.name || F.t('cinema.idxName'));
    el.querySelector('#ovIdxValue').textContent = i0.price ? F.fmtNum(i0.price) : '—';
    el.querySelector('#ovIdxSub').innerHTML = i0.pct !== undefined ? '<span class="' + pctCls(i0.pct) + '">' + F.fmtPct(i0.pct) + '</span>' : '';
    el.querySelector('#ovIdxMini').textContent = i1.name ? (F.indexName(i1.name) + ' ' + F.fmtNum(i1.price) + ' · ' + F.fmtPct(i1.pct)) : '';
    function chip(k, v, sub) { return '<div class="orb-chip"><span class="k">' + k + '</span><span class="v num">' + v + '</span><span class="s num">' + sub + '</span></div>'; }
    el.querySelector('#ovOrbit').innerHTML =
      chip(F.t('cinema.degenBal'), s.degen.online ? F.fmtMoney(s.degen.bal, '$') : '—', s.degen.online ? (F.t('cinema.record') + ' ' + s.degen.wins + 'W/' + s.degen.losses + 'L · ' + F.t('cinema.open') + ' ' + s.degen.open) : F.t('core.offline')) +
      chip(F.t('cinema.safetyToday'), s.safety.online ? (s.safety.count + F.t('cinema.pieces')) : '—', s.safety.online ? s.safety.latest : F.t('core.offline')) +
      chip(F.t('cinema.spiderSvc'), s.spider.online ? F.t('core.online') : F.t('core.offline'), 'MCP · 4317');
    el.querySelector('#ovFeedTitle').textContent = F.t('cinema.feed');
    var srcMeta = { finance: ['#7fd8ff', 'cinema.srcFinance'], safety: ['#ff8d99', 'cinema.srcSafety'], degen: ['#ffd98a', 'cinema.srcDegen'] };
    var fl = el.querySelector('#ovFeedList');
    if (feed && feed.items) {
      fl.innerHTML = feed.items.slice(0, 7).map(function (it) {
        var m = srcMeta[it.source] || srcMeta.finance;
        var tt = it.url ? '<a href="' + it.url + '" target="_blank" rel="noopener">' + esc(it.title) + '</a>' : esc(it.title);
        return '<div class="feed-row"><span class="src"><i style="background:' + m[0] + '"></i>' + F.t(m[1]) + '</span><span class="tt">' + tt + '</span><span class="tm num">' + F.fmtTime(it.ts) + '</span></div>';
      }).join('');
    } else if (!fl.innerHTML) {
      fl.innerHTML = '<div class="skel" style="height:120px"></div>';
    }
    el.querySelector('#ovEqTitle').textContent = F.t('cinema.equity');
    if (equity) drawEquity(el, equity, s.degen);
  }
  function drawEquity(el, series, dg) {
    var c = el.querySelector('#ovEq'); if (!c || !series || series.length < 2) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight || 108;
    if (!w) return;
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
    el.querySelector('#ovEqFoot').innerHTML = '<span>' + (dg.online ? F.fmtMoney(dg.bal, '$') : '') + '</span><span>' + F.fmtNum(mn, 0) + ' — ' + F.fmtNum(mx, 0) + '</span><span>' + F.fmtNum(vs[vs.length - 1], 0) + '</span>';
  }
  function loadAux(el) {
    fetch('/api/fusion/feed?limit=14', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (f) { feed = f; render(el); }).catch(function () { if (!feed) feed = { items: [] }; render(el); });
    fetch('/api/fusion/degen-state', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (st) { equity = st.equity || null; render(el); }).catch(function () {});
  }
  F.views.overview = {
    mount: function (el) {
      el.innerHTML =
        '<div class="heroWrap">' +
          '<div class="hero-side left"><div class="hero-label" id="ovRaceLabel"></div><div class="hero-num gold num" id="ovRaceValue">—</div><div class="hero-sub num" id="ovRaceSub"></div><div class="hero-mini num" id="ovRaceMini"></div></div>' +
          '<div class="hero-side right"><div class="hero-label" id="ovIdxLabel"></div><div class="hero-num cyan num" id="ovIdxValue">—</div><div class="hero-sub num" id="ovIdxSub"></div><div class="hero-mini num" id="ovIdxMini"></div></div>' +
        '</div>' +
        '<div class="orbitStrip" id="ovOrbit"></div>' +
        '<div class="lowerThird">' +
          '<div class="glassPanel"><div class="panel-title" id="ovFeedTitle"></div><div id="ovFeedList"></div></div>' +
          '<div class="glassPanel"><div class="panel-title" id="ovEqTitle"></div><canvas id="ovEq"></canvas><div class="eq-foot num" id="ovEqFoot"></div></div>' +
        '</div>';
      render(el); loadAux(el);
      if (timer) clearInterval(timer);
      timer = setInterval(function () { if (el.classList.contains('active')) loadAux(el); }, 60000);
    },
    onStatus: function () {
      var el = document.getElementById('view-overview');
      if (el && el.classList.contains('active')) render(el);
    }
  };
})();
