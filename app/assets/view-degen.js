/* Fusion Console · Degen Lab 视图
   数据直读上游 state.json（Vazolini/grokbot-jev-dashboard data 分支），每 20 秒刷新。
   契约：Fusion.registerView('degen', {mount(el)})；mount 可重入（语言切换会重调），
   定时器在开头清掉旧的并存 el._timer；仅当 el 可见时拉数据。 */
(function () {
  var F = window.Fusion;
  var URL = 'https://raw.githubusercontent.com/Vazolini/grokbot-jev-dashboard/data/state.json';
  var PROXY = '/api/fusion/degen-state'; // 主干同源代理优先，直连作兜底（避免跨域/第三方可用性问题）
  var REFRESH = 20000;

  /* 机器人角色双语字典（8 个已知代号；未知代号只显示代号本身） */
  var ROLES = {
    CHIEF:     { zh: '总指挥', en: 'Commander-in-Chief' },
    SCAN:      { zh: '扫描',   en: 'Scanner' },
    RISK:      { zh: '风控',   en: 'Risk Control' },
    CRAWLER:   { zh: '爬虫',   en: 'Crawler' },
    SOCIAL:    { zh: '社交',   en: 'Social Sentinel' },
    NARRATIVE: { zh: '叙事',   en: 'Narrative' },
    WHALE:     { zh: '鲸鱼',   en: 'Whale Watch' },
    SNIPER:    { zh: '狙击',   en: 'Sniper' }
  };

  F.registerI18n('degen', {
    zh: {
      title: '实验室',
      srcLine: '数据直读上游 state.json · 每 20 秒刷新',
      kBal: '账户余额', kEq: '净值', kWr: '战绩', kOpen: '当前持仓',
      w: '胜', l: '负', wr: '胜率', pts: '{n} 个数据点', updatedAt: '更新于 {t}',
      eqTitle: '净值曲线', agentsTitle: '机器人墙', latest: '最新动态',
      tradesTitle: '交易', tabOpen: '持仓中', tabClosed: '已平仓',
      cTok: '代币', cEntry: '入场', cCur: '现价', cSize: '数量', cFlt: '浮动', cExit: '出场', cPnl: '盈亏', cRes: '结果',
      win: '胜', loss: '负',
      vetoTitle: '否决蛛网', vetoTop: '高频否决键', vetoEmpty: '暂无否决数据',
      logsTitle: '决策日志',
      estNote: '「~」为估算值：上游未给出该笔盈亏，按 (出场−入场)/入场×数量估算',
      isOnline: '在线', isOffline: '离线'
    },
    en: {
      title: 'Degen Lab',
      srcLine: 'Live from upstream state.json · refreshes every 20s',
      kBal: 'Balance', kEq: 'Equity', kWr: 'Record', kOpen: 'Open positions',
      w: 'W', l: 'L', wr: 'Win rate', pts: '{n} points', updatedAt: 'Updated {t}',
      eqTitle: 'Equity curve', agentsTitle: 'Agent wall', latest: 'Latest',
      tradesTitle: 'Trades', tabOpen: 'Open', tabClosed: 'Closed',
      cTok: 'Token', cEntry: 'Entry', cCur: 'Price', cSize: 'Size', cFlt: 'Float %', cExit: 'Exit', cPnl: 'P&L', cRes: 'Result',
      win: 'Win', loss: 'Loss',
      vetoTitle: 'Veto web', vetoTop: 'Top veto keys', vetoEmpty: 'No veto data',
      logsTitle: 'Decision log',
      estNote: '"~" marks an estimate: upstream gave no P&L for this trade; estimated as (exit−entry)/entry×size',
      isOnline: 'Online', isOffline: 'Offline'
    }
  });

  function t(k, vars) { return F.t('degen.' + k, vars); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function msTime(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleString(F.locale(), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function fmtPrice(v) {
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v), d = a < 1e-4 ? 8 : (a < 0.01 ? 6 : (a < 1 ? 4 : 2));
    return F.fmtNum(v, d);
  }
  function shortAddr(addr) {
    var a = String(addr || '');
    return a.length > 10 ? a.slice(0, 8) + '…' : a;
  }
  function priceOf(tokens, addr) {
    if (!tokens || !addr) return null;
    var a = String(addr).toLowerCase();
    for (var i = 0; i < tokens.length; i++) {
      var x = tokens[i];
      var xa = String(x.addr || x.address || '').toLowerCase();
      if (xa && xa === a) {
        var p = x.price; if (p == null) p = x.priceUsd; if (p == null) p = x.last; if (p == null) p = x.p;
        return (typeof p === 'number' && isFinite(p)) ? p : null;
      }
    }
    return null;
  }
  function closedPnl(c) {
    if (typeof c.pnl === 'number' && isFinite(c.pnl)) return { v: c.pnl, est: false };
    if (c.entry && c.last && c.size) return { v: (c.last - c.entry) / c.entry * c.size, est: true };
    return { v: null, est: false };
  }

  function fitCanvas(cv, h) {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 600;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawEquity(cv, eq) {
    var g = fitCanvas(cv, 220), ctx = g.ctx, W = g.w, H = g.h;
    ctx.clearRect(0, 0, W, H);
    if (!eq || eq.length < 2) return;
    var padL = 10, padR = 10, padT = 16, padB = 24;
    var vs = eq.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
    if (mx === mn) { mx = mn + 1; mn = mn - 1; }
    var X = function (i) { return padL + i / (vs.length - 1) * (W - padL - padR); };
    var Y = function (v) { return padT + (1 - (v - mn) / (mx - mn)) * (H - padT - padB); };
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.fillStyle = '#5b667f'; ctx.font = '10px system-ui';
    for (var gi = 0; gi <= 2; gi++) {
      var gv = mn + (mx - mn) * gi / 2, gy = Y(gv);
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
      ctx.fillText('$' + F.fmtNum(gv, 0), padL + 2, gy - 3);
    }
    ctx.setLineDash([]);
    var grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, 'rgba(255,210,63,.30)'); grad.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.beginPath(); ctx.moveTo(X(0), Y(vs[0]));
    for (var i = 1; i < vs.length; i++) ctx.lineTo(X(i), Y(vs[i]));
    ctx.lineTo(X(vs.length - 1), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(X(0), Y(vs[0]));
    for (var j = 1; j < vs.length; j++) ctx.lineTo(X(j), Y(vs[j]));
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.stroke();
    var lx = X(vs.length - 1), ly = Y(vs[vs.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffd23f'; ctx.fill();
    ctx.fillStyle = '#8b96ad';
    ctx.fillText(msTime(eq[0].t), padL, H - 8);
    var last = msTime(eq[eq.length - 1].t);
    ctx.fillText(last, W - padR - ctx.measureText(last).width, H - 8);
  }

  function drawVeto(cv, top) {
    var g = fitCanvas(cv, 300), ctx = g.ctx, W = g.w, H = g.h;
    ctx.clearRect(0, 0, W, H);
    if (!top || !top.length) return;
    var n = top.length, cx = W / 2, cy = H / 2 + 6;
    var R = Math.min(W, H) / 2 - 52;
    var max = top[0].count || 1;
    var pt = function (i, r) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
    for (var ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) { var q = pt(i % n, R * ring / 3); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.stroke();
    }
    ctx.font = '10.5px system-ui'; ctx.fillStyle = '#8b96ad';
    for (var k = 0; k < n; k++) {
      var e = pt(k, R + 16), a2 = -Math.PI / 2 + k * 2 * Math.PI / n;
      var label = top[k].key.length > 14 ? top[k].key.slice(0, 13) + '…' : top[k].key;
      var wL = ctx.measureText(label).width;
      ctx.fillText(label, e[0] - (Math.abs(Math.cos(a2)) < 0.35 ? wL / 2 : (Math.cos(a2) > 0 ? 2 : wL + 2)), e[1] + 3);
      var s2 = pt(k, R);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(s2[0], s2[1]);
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.stroke();
    }
    ctx.beginPath();
    for (var m = 0; m <= n; m++) { var v = pt(m % n, R * (top[m % n].count / max)); m ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,210,63,.22)'; ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    for (var d = 0; d < n; d++) { var dp = pt(d, R * (top[d].count / max)); ctx.beginPath(); ctx.arc(dp[0], dp[1], 3, 0, Math.PI * 2); ctx.fill(); }
  }

  function kpiCard(title, big, sub) {
    return '<div class="card" style="--ac:var(--c-degen)"><h3><span class="bar"></span>' + esc(title) + '</h3>' +
      '<div class="big num">' + big + '</div><div class="sub">' + sub + '</div></div>';
  }

  function skeleton(el) {
    var sk = '<div class="skel" style="height:34px"></div><div class="skel" style="height:14px;margin-top:8px"></div>';
    el.innerHTML =
      '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('title')) + '</h3>' +
      '<div class="sub">' + esc(t('srcLine')) + '</div></div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:16px">' +
      '<div class="card">' + sk + '</div><div class="card">' + sk + '</div><div class="card">' + sk + '</div><div class="card">' + sk + '</div></div>' +
      '<div class="card" style="margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('eqTitle')) + '</h3><div class="skel" style="height:220px;margin-top:12px"></div></div>' +
      '<div class="card"><h3><span class="bar"></span>' + esc(t('agentsTitle')) + '</h3><div class="skel" style="height:120px;margin-top:12px"></div></div>';
  }

  function setStatus(el, ok, ts) {
    var s = el.querySelector('[data-degen-status]');
    if (!s) return;
    s.innerHTML = '<span class="dot ' + (ok ? 'ok' : 'bad') + '"></span> ' +
      (ok ? esc(t('updatedAt', { t: msTime(ts) })) : esc(F.t('core.unreachable')));
  }

  function render(el, d) {
    var lang = F.lang;
    var eq = d.equity || [], open = d.open || [], closed = d.closed || [], logs = d.logs || [];
    var agents = d.agents || {}, finals = d.finals || {};
    var bal = d.bal, wins = d.wins || 0, losses = d.losses || 0;
    var eqLast = eq.length ? eq[eq.length - 1].v : null;
    var tot = wins + losses, wr = tot > 0 ? (wins / tot * 100).toFixed(2) + '%' : '—'; // 胜率不带 + 号

    var html = '';
    html += '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('title')) + '</h3>' +
      '<div class="more" data-degen-status></div><div class="sub">' + esc(t('srcLine')) + '</div></div>';

    html += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:16px">';
    html += kpiCard(t('kBal'), esc(F.fmtMoney(bal, '$')), 'USD');
    html += kpiCard(t('kEq'), esc(F.fmtMoney(eqLast, '$')), esc(t('pts', { n: eq.length })));
    html += kpiCard(t('kWr'), '<span class="num">' + wins + t('w') + ' / ' + losses + t('l') + '</span>',
      esc(t('wr')) + ': <b class="num">' + esc(wr) + '</b>');
    html += kpiCard(t('kOpen'), '<span class="num">' + open.length + '</span>', esc(t('tradesTitle')));
    html += '</div>';

    html += '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('eqTitle')) + '</h3>' +
      (eq.length >= 2 ? '<canvas class="chart" data-cv="eq"></canvas>' : '<div class="empty">' + esc(F.t('core.empty')) + '</div>') + '</div>';

    var codes = Object.keys(agents);
    html += '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('agentsTitle')) + '</h3>';
    if (!codes.length) { html += '<div class="empty">' + esc(F.t('core.empty')) + '</div>'; }
    else {
      html += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));margin-top:12px">';
      codes.forEach(function (code) {
        var a = agents[code] || {};
        var role = ROLES[code];
        var on = !!a.on;
        html += '<div class="card" style="padding:14px 16px"><div style="display:flex;align-items:center;gap:8px">' +
          '<span class="dot ' + (on ? 'ok' : '') + '"></span><b>' + esc(code) + '</b>' +
          '<span class="sub" style="margin:0">' + esc(role ? role[lang] : '') + '</span>' +
          '<span style="margin-left:auto;font-size:12px;color:var(--dim)">' + esc(on ? t('isOnline') : t('isOffline')) + '</span></div>' +
          (a.last ? '<div style="margin-top:8px"><span class="chip">' + esc(t('latest')) + '</span></div>' +
            '<div style="font-size:12.5px;color:var(--dim);line-height:1.6;margin-top:4px">' + esc(a.last) + '</div>' : '') +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    var tab = el._tab || 'open';
    html += '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('tradesTitle')) + '</h3>' +
      '<div class="tabs" style="margin:12px 0" data-degen-tabs>' +
      '<button type="button" data-tab="open" class="' + (tab === 'open' ? 'on' : '') + '" style="--ac:var(--c-degen)">' + esc(t('tabOpen')) + ' (' + open.length + ')</button>' +
      '<button type="button" data-tab="closed" class="' + (tab === 'closed' ? 'on' : '') + '" style="--ac:var(--c-degen)">' + esc(t('tabClosed')) + ' (' + closed.length + ')</button></div>';

    var openRows = open.map(function (o) {
      var cur = priceOf(d.tokens, o.addr);
      var flt = (cur != null && o.entry) ? F.fmtPct((cur - o.entry) / o.entry * 100) : '—';
      var fltCls = (cur != null && o.entry) ? F.cls((cur - o.entry) / o.entry) : 'flat';
      return '<tr><td>' + esc(o.name || shortAddr(o.addr)) + '</td><td>' + esc(fmtPrice(o.entry)) + '</td>' +
        '<td class="num">' + esc(cur != null ? fmtPrice(cur) : '—') + '</td><td class="num">' + esc(F.fmtNum(o.size, 2)) + '</td>' +
        '<td class="num ' + fltCls + '">' + esc(flt) + '</td></tr>';
    }).join('');
    html += '<div data-pane="open" style="display:' + (tab === 'open' ? '' : 'none') + '">' +
      (openRows ? '<table class="tbl"><thead><tr><th>' + esc(t('cTok')) + '</th><th>' + esc(t('cEntry')) + '</th><th>' + esc(t('cCur')) + '</th><th>' + esc(t('cSize')) + '</th><th>' + esc(t('cFlt')) + '</th></tr></thead><tbody>' + openRows + '</tbody></table>'
        : '<div class="empty">' + esc(F.t('core.empty')) + '</div>') + '</div>';

    var closedRows = closed.map(function (c) {
      var p = closedPnl(c);
      var money = p.v == null ? '—' : (p.est ? '~' : '') + F.fmtMoney(p.v, '$');
      var res = p.v == null ? '<span class="flat">—</span>' : '<span class="' + F.cls(p.v) + '">' + esc(p.v >= 0 ? t('win') : t('loss')) + '</span>';
      return '<tr><td>' + esc(c.name || shortAddr(c.addr)) + '</td><td>' + esc(fmtPrice(c.entry)) + '</td>' +
        '<td>' + esc(fmtPrice(c.last)) + '</td><td class="num ' + F.cls(p.v || 0) + '">' + esc(money) + '</td><td>' + res + '</td></tr>';
    }).join('');
    html += '<div data-pane="closed" style="display:' + (tab === 'closed' ? '' : 'none') + '">' +
      (closedRows ? '<table class="tbl"><thead><tr><th>' + esc(t('cTok')) + '</th><th>' + esc(t('cEntry')) + '</th><th>' + esc(t('cExit')) + '</th><th>' + esc(t('cPnl')) + '</th><th>' + esc(t('cRes')) + '</th></tr></thead><tbody>' + closedRows + '</tbody></table>' +
        '<div class="sub">' + esc(t('estNote')) + '</div>'
        : '<div class="empty">' + esc(F.t('core.empty')) + '</div>') + '</div>';
    html += '</div>';

    var counts = {};
    Object.keys(finals).forEach(function (addr) {
      var ks = finals[addr] && finals[addr].keys;
      if (Array.isArray(ks)) ks.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    var top = Object.keys(counts).map(function (k) { return { key: k, count: counts[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 8);
    html += '<div class="card" style="--ac:var(--c-degen);margin-bottom:16px"><h3><span class="bar"></span>' + esc(t('vetoTitle')) + '</h3>';
    if (!top.length) { html += '<div class="empty">' + esc(t('vetoEmpty')) + '</div>'; }
    else {
      html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px"><div style="flex:1 1 340px;min-width:280px"><canvas class="chart" data-cv="veto"></canvas></div>' +
        '<div style="flex:0 1 260px"><div class="sub" style="margin:0 0 8px">' + esc(t('vetoTop')) + '</div>' +
        top.map(function (x) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(30,39,64,.55)">' +
            '<span class="chip">' + esc(x.key) + '</span><span class="num" style="margin-left:auto;color:var(--c-degen)">' + x.count + '</span></div>';
        }).join('') + '</div></div>';
    }
    html += '</div>';

    var tail = logs.slice(-30).reverse();
    html += '<div class="card" style="--ac:var(--c-degen)"><h3><span class="bar"></span>' + esc(t('logsTitle')) + '</h3>';
    if (!tail.length) { html += '<div class="empty">' + esc(F.t('core.empty')) + '</div>'; }
    else {
      html += '<div class="feed" style="margin-top:8px">' + tail.map(function (l) {
        return '<div class="fi"><span class="ftime num">' + esc(msTime(l.t)) + '</span>' +
          '<span class="src"><span class="chip">' + esc(l.tag || '') + '</span></span>' +
          '<span class="ft">' + esc(l.msg || '') + '</span></div>';
      }).join('') + '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
    el._data = d;
    setStatus(el, true, Date.now());
    el.querySelectorAll('[data-degen-tabs] button').forEach(function (b) {
      b.addEventListener('click', function () {
        el._tab = b.getAttribute('data-tab');
        el.querySelectorAll('[data-degen-tabs] button').forEach(function (x) { x.classList.toggle('on', x === b); });
        el.querySelectorAll('[data-pane]').forEach(function (p) { p.style.display = p.getAttribute('data-pane') === el._tab ? '' : 'none'; });
      });
    });
    drawCanvases(el);
  }

  function drawCanvases(el) {
    var d = el._data;
    if (!d) return;
    el.querySelectorAll('canvas[data-cv="eq"]').forEach(function (cv) { drawEquity(cv, d.equity || []); });
    var counts = {};
    Object.keys(d.finals || {}).forEach(function (addr) {
      var ks = d.finals[addr] && d.finals[addr].keys;
      if (Array.isArray(ks)) ks.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    var top = Object.keys(counts).map(function (k) { return { key: k, count: counts[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 8);
    el.querySelectorAll('canvas[data-cv="veto"]').forEach(function (cv) { drawVeto(cv, top); });
  }

  function renderError(el) {
    if (el._data) { setStatus(el, false); return; }
    el.innerHTML = '<div class="empty"><span class="dot bad" style="display:inline-block;margin-right:8px"></span>' +
      esc(F.t('core.unreachable')) + '</div>';
  }

  function tick(el) {
    // 可见性判定用 .active 类（外壳路由维护）：offsetParent 在无布局环境或
    // fixed 祖先下会误判为 null，导致视图静默不渲染，故不用它。
    if (!el.isConnected || !el.classList.contains('active') || document.hidden) return;
    fetch(PROXY, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function () {
      return fetch(URL, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
    }).then(function (d) {
      if (!el.isConnected || !el.classList.contains('active')) return;
      render(el, d || {});
    }).catch(function () {
      if (!el.isConnected || !el.classList.contains('active')) return;
      renderError(el);
    });
  }

  F.registerView('degen', {
    mount: function (el) {
      if (el._timer) { clearInterval(el._timer); el._timer = null; }
      if (el._onResize) { window.removeEventListener('resize', el._onResize); el._onResize = null; }
      skeleton(el);
      el._onResize = function () { drawCanvases(el); };
      window.addEventListener('resize', el._onResize);
      tick(el);
      el._timer = setInterval(function () { tick(el); }, REFRESH);
    }
  });
})();
