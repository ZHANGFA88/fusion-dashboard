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
    }).join('') + '<div id="railFoot">Fusion Console · A<br>8770 / 4317</div>';
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
