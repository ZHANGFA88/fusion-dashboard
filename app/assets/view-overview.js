/* Fusion Console · 总览：KPI 条 + 融合信息流 + 五模块预览卡（SPEC-A 3.1） */
(function () {
  var F = window.Fusion;
  F.registerI18n('overview', {
    zh: { feed: '融合信息流', srcFinance: '财经', srcSafety: '安全', srcDegen: '实验室', balance: '实验余额', record: '战绩', open: '持仓', finalValue: '赛跑组合终值', papers: '今日安全精选', spiderState: '蜘蛛服务', viewAll: '进入', raceTop: '单投终值排行', safetyTop: '今日精选 Top', equity: '净值曲线', pieces: '篇', asOf: '截至' },
    en: { feed: 'Unified Feed', srcFinance: 'Markets', srcSafety: 'Safety', srcDegen: 'Degen', balance: 'Lab Balance', record: 'Record', open: 'Open', finalValue: 'Race Portfolio Final', papers: "Today's Safety Picks", spiderState: 'Spider Service', viewAll: 'Open', raceTop: 'Solo Finals Ranking', safetyTop: "Today's Top Picks", equity: 'Equity Curve', pieces: '', asOf: 'as of' }
  });
  var lastRender = 0, degenCache = null, degenTs = 0;

  function kpi(label, big, sub, ac) {
    return '<div class="card" style="--ac:' + ac + '"><h3><span class="bar"></span>' + label + '</h3><div class="big num">' + big + '</div><div class="sub">' + sub + '</div></div>';
  }
  function skelCards(n) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="card"><div class="skel" style="height:64px"></div></div>'; return s; }

  function sparkline(canvas, series, color) {
    if (!canvas || !series || series.length < 2) return;
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight || 56;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var c = canvas.getContext('2d'); c.scale(dpr, dpr);
    var vs = series.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), rg = (mx - mn) || 1;
    c.beginPath();
    vs.forEach(function (v, i) {
      var x = i / (vs.length - 1) * (w - 4) + 2, y = h - 6 - (v - mn) / rg * (h - 12);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.strokeStyle = color; c.lineWidth = 1.6; c.stroke();
    c.lineTo(w - 2, h); c.lineTo(2, h); c.closePath();
    c.fillStyle = color + '22'; c.fill();
  }

  function render(el, s, feed) {
    var idx = (s.finance && s.finance.indices) || [];
    var i0 = idx[0] || {}, i1 = idx[1] || {};
    var dg = s.degen || {}, rc = s.race || {}, sf = s.safety || {}, sp = s.spider || {};
    var html = '<div class="grid kpis">' +
      kpi(F.indexName(i0.name || '上证指数'), F.fmtNum(i0.price), '<span class="' + F.cls(i0.pct) + '">' + F.fmtPct(i0.pct) + '</span>', 'var(--c-fin)') +
      kpi(F.indexName(i1.name || '深证成指'), F.fmtNum(i1.price), '<span class="' + F.cls(i1.pct) + '">' + F.fmtPct(i1.pct) + '</span>', 'var(--c-fin)') +
      kpi(F.t('overview.balance'), dg.online ? F.fmtMoney(dg.bal, '$') : '—', dg.online ? F.t('overview.record') + ' ' + dg.wins + 'W / ' + dg.losses + 'L · ' + F.t('overview.open') + ' ' + dg.open : F.t('core.offline'), 'var(--c-degen)') +
      kpi(F.t('overview.finalValue'), rc.online ? F.fmtMoney(rc.final_value) : '—', rc.online ? F.fmtFrac(rc.port_ret) + ' · IRR ' + F.fmtFrac(rc.irr) : F.t('core.offline'), 'var(--c-race)') +
      kpi(F.t('overview.papers'), sf.online ? sf.count + ' ' + F.t('overview.pieces') : '—', sf.online ? sf.latest : F.t('core.offline'), 'var(--c-safety)') +
      kpi(F.t('overview.spiderState'), sp.online ? F.t('core.online') : F.t('core.offline'), 'MCP · 4317', 'var(--c-spider)') +
      '</div>';

    // 融合信息流
    var srcMeta = { finance: ['var(--c-fin)', 'overview.srcFinance'], safety: ['var(--c-safety)', 'overview.srcSafety'], degen: ['var(--c-degen)', 'overview.srcDegen'] };
    var feedHtml;
    if (!feed) feedHtml = '<div class="skel" style="height:120px"></div>';
    else if (!feed.items.length) feedHtml = '<div class="empty">' + F.t('core.empty') + '</div>';
    else feedHtml = '<div class="feed">' + feed.items.map(function (it) {
      var m = srcMeta[it.source] || srcMeta.finance;
      var title = it.url ? '<a href="' + it.url + '" target="_blank" rel="noopener">' + it.title + '</a>' : it.title;
      return '<div class="fi"><span class="src"><i style="background:' + m[0] + '"></i>' + F.t(m[1]) + '</span><div style="flex:1"><div class="ft">' + title + '</div>' + (it.desc ? '<div class="fd">' + it.desc + '</div>' : '') + '</div><span class="ftime">' + F.fmtTime(it.ts) + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="card" style="margin-top:16px;--ac:var(--brand)"><h3><span class="bar"></span>' + F.t('overview.feed') + '</h3><div style="margin-top:8px">' + feedHtml + '</div></div>';

    // 预览卡：行情（迷你指数列）+ 实验（净值曲线）
    var miniIdx = idx.map(function (i) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(30,39,64,.55)"><span>' + F.indexName(i.name) + '</span><span class="num">' + F.fmtNum(i.price) + ' <span class="' + F.cls(i.pct) + '">' + F.fmtPct(i.pct) + '</span></span></div>';
    }).join('');
    html += '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">' +
      '<div class="card" style="--ac:var(--c-fin)"><h3><span class="bar"></span>' + F.t('core.markets') + '</h3><a class="more" href="#markets">' + F.t('overview.viewAll') + ' →</a><div style="margin-top:6px">' + (miniIdx || '<div class="empty">' + F.t('core.empty') + '</div>') + '</div></div>' +
      '<div class="card" style="--ac:var(--c-degen)"><h3><span class="bar"></span>' + F.t('core.degen') + ' · ' + F.t('overview.equity') + '</h3><a class="more" href="#degen">' + F.t('overview.viewAll') + ' →</a><canvas id="ovSpark" class="chart" style="height:86px;margin-top:10px"></canvas><div class="sub">' + (dg.online ? F.t('overview.balance') + ' ' + F.fmtMoney(dg.bal, '$') + ' · ' + dg.wins + 'W / ' + dg.losses + 'L' : F.t('core.offline')) + '</div></div>' +
      '</div>';

    // 预览卡：赛跑 + 安全 + 蜘蛛
    var solos = '';
    html += '<div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:16px">' +
      '<div class="card" style="--ac:var(--c-race)"><h3><span class="bar"></span>' + F.t('core.race') + '</h3><a class="more" href="#race">' + F.t('overview.viewAll') + ' →</a><div class="big num">' + (rc.online ? F.fmtMoney(rc.final_value) : '—') + '</div><div class="sub">' + (rc.online ? F.t('overview.finalValue') + ' · ' + F.fmtFrac(rc.port_ret) + ' · ' + (rc.range ? rc.range[0].slice(0, 4) + '–' + rc.range[1].slice(0, 4) : '') : '') + '</div></div>' +
      '<div class="card" style="--ac:var(--c-safety)"><h3><span class="bar"></span>' + F.t('overview.safetyTop') + '</h3><a class="more" href="#safety">' + F.t('overview.viewAll') + ' →</a><div style="margin-top:8px">' + ((sf.top || []).slice(0, 3).map(function (p) { return '<div style="padding:5px 0;border-bottom:1px solid rgba(30,39,64,.55);font-size:13px;line-height:1.5">' + p.titleZh + '</div>'; }).join('') || '<div class="empty">' + F.t('core.empty') + '</div>') + '</div></div>' +
      '<div class="card" style="--ac:var(--c-spider)"><h3><span class="bar"></span>' + F.t('core.spider') + '</h3><a class="more" href="#spider">' + F.t('overview.viewAll') + ' →</a><div class="big num">' + (sp.online ? F.t('core.online') : F.t('core.offline')) + '</div><div class="sub">11 MCP tools · :4317</div></div>' +
      '</div>';
    html += '<div class="foot-note">' + F.t('core.updated') + ' ' + F.fmtTime(s.ts) + ' · ' + F.t('core.disclaimer') + '</div>';
    el.innerHTML = html;
    if (degenCache) sparkline(document.getElementById('ovSpark'), degenCache, '#ffd23f');
  }

  function mount(el) {
    el.innerHTML = '<div class="grid kpis">' + skelCards(6) + '</div>';
    var s = F.status, feed = null;
    function go() { if (s) render(el, s, feed); }
    fetch('/api/fusion/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { s = j; F.status = j; go(); }).catch(go);
    fetch('/api/fusion/feed?limit=30', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { feed = j; go(); }).catch(function () { feed = { items: [] }; go(); });
    if (!degenCache || Date.now() - degenTs > 60000) {
      fetch('/api/fusion/degen-state', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('proxy'); return r.json(); })
        .catch(function () { return fetch('https://raw.githubusercontent.com/Vazolini/grokbot-jev-dashboard/data/state.json', { cache: 'no-store' }).then(function (r) { return r.json(); }); })
        .then(function (st) { degenCache = st.equity || null; degenTs = Date.now(); if (s) render(el, s, feed); }).catch(function () {});
    }
    lastRender = Date.now();
  }

  F.registerView('overview', {
    mount: mount,
    onStatus: function () { if (Date.now() - lastRender > 25000) { var el = document.getElementById('view-overview'); if (el && el.classList.contains('active')) mount(el); } }
  });
})();
