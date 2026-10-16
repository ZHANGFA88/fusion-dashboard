/* Fusion Console · 赛跑：壳内嵌 V3 全片舞台 + 关键数字条 + 六单投排行（SPEC-A 3.4） */
(function () {
  var F = window.Fusion;
  F.registerI18n('race', {
    zh: { stage: '全片回测 · FRAME_SPEC_V3', final: '组合终值', irr: '年化 IRR', mdd: '最大回撤', eq: '六等分对照', solo: '单投终值排行', note: '数字全部取引擎真实数据（engine.json），与原视频印刷值如有出入以引擎为准，差异清单见 modules/race/README.md。在下方舞台内点击播放，全片约 117 秒。', openFull: '全屏打开原页' },
    en: { stage: 'Full Backtest Film · FRAME_SPEC_V3', final: 'Portfolio Final', irr: 'IRR', mdd: 'Max Drawdown', eq: 'Equal-Weight', solo: 'Solo Finals Ranking', note: 'All figures come from the real engine data (engine.json). Where they differ from the original video’s printed values, the engine prevails — see modules/race/README.md. Press play in the stage below; the film runs about 117 seconds.', openFull: 'Open standalone page' }
  });
  var NAMES = { qqq: ['纳指100', 'Nasdaq-100'], spy: ['标普500', 'S&P 500'], csi: ['沪深300', 'CSI 300'], n225: ['日经225', 'Nikkei 225'], dax: ['德国DAX', 'DAX'], cac: ['法国CAC40', 'CAC 40'] };

  function stat(label, val, ac) {
    return '<div class="card" style="--ac:' + ac + '"><h3><span class="bar"></span>' + label + '</h3><div class="big num" style="font-size:24px">' + val + '</div></div>';
  }
  function statsHtml(rc) {
    return stat(F.t('race.final'), rc.online ? F.fmtMoney(rc.final_value) : '—', 'var(--c-race)') +
      stat(F.t('race.irr'), rc.online ? F.fmtFrac(rc.irr) : '—', 'var(--c-race)') +
      stat(F.t('race.mdd'), rc.online ? F.fmtFrac(rc.mdd) : '—', 'var(--c-race)') +
      stat(F.t('race.eq'), rc.online ? F.fmtFrac(rc.eq_ret) : '—', 'var(--c-race)');
  }
  function mount(el) {
    var s = F.status, rc = (s && s.race) || {};
    el.innerHTML =
      '<div class="grid" id="raceStats" style="grid-template-columns:repeat(4,1fr)">' + statsHtml(rc) + '</div>' +
      '<div class="card" style="margin-top:16px;--ac:var(--c-race)"><h3><span class="bar"></span>' + F.t('race.stage') + '</h3>' +
      '<a class="more" href="/modules/race/index.html" target="_blank" rel="noopener">' + F.t('race.openFull') + ' ↗</a>' +
      '<div class="stage" style="height:min(72vh,760px);margin-top:12px"><iframe src="/modules/race/index.html" title="DCA Race" loading="lazy"></iframe></div>' +
      '<div class="sub" style="margin-top:10px">' + F.t('race.note') + '</div></div>' +
      '<div class="card" style="margin-top:16px;--ac:var(--c-race)"><h3><span class="bar"></span>' + F.t('race.solo') + '</h3><div id="raceSolos" style="margin-top:10px"><div class="skel" style="height:90px"></div></div></div>';
    fetch('/modules/race/data/engine.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (eng) {
      var rows = Object.keys(eng.finals || {}).map(function (k) { return { k: k, v: eng.finals[k] }; })
        .sort(function (a, b) { return b.v.solo_ret - a.v.solo_ret; });
      var box = document.getElementById('raceSolos');
      if (box) box.innerHTML = rows.map(function (r) {
        var nm = NAMES[r.k] ? NAMES[r.k][F.lang === 'en' ? 1 : 0] : r.k;
        return '<div style="display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid rgba(30,39,64,.55)"><span style="width:110px">' + nm + '</span><span style="flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.05);overflow:hidden"><span style="display:block;height:100%;width:' + Math.max(3, r.v.solo_ret / 5.7489 * 100) + '%;background:var(--c-race)"></span></span><span class="num" style="width:170px;text-align:right">' + F.fmtMoney(r.v.solo_value) + ' · <span class="' + F.cls(r.v.solo_ret) + '">' + F.fmtFrac(r.v.solo_ret) + '</span></span></div>';
      }).join('');
    }).catch(function () {});
  }
  F.registerView('race', {
    mount: mount,
    onStatus: function (s) {
      var box = document.getElementById('raceStats');
      if (box && s && s.race) box.innerHTML = statsHtml(s.race);
    }
  });
})();
