/* Fusion Console · 安全视图
   AI 安全日报（四栏目 MD 渲染）+ 每日 30 篇精选论文。
   数据实时读取自 AISafetyHot-Hub 数据仓（浏览器端直取 raw.githubusercontent.com），
   本视图不存储、不镜像任何内容。日期状态保持在模块变量，切语言不重置。 */
(function () {
  var F = window.Fusion;
  var RAW = 'https://raw.githubusercontent.com/ZHANGFA88/AISafetyHot-Hub/main';

  F.registerI18n('safety', {
    zh: {
      title: 'AI 安全情报',
      prev: '← 前一天',
      next: '后一天 →',
      latest: '回到最新',
      statusLoading: '读取中…',
      statusUpdated: '已更新 · 数据来自 AISafetyHot-Hub',
      dailyTitle: '今日日报',
      dailyEmpty: '这一天没有日报文件（可能尚未发布）。',
      papersTitle: '每日精选论文',
      count: '{n} 篇',
      papersEmpty: '这一天没有精选文件。',
      noData12: '近 12 天内未找到数据',
      errPapers: '精选读取失败',
      authorsEtc: '{a} 等 {n} 人',
      linkOriginal: '原文',
      linkSite: '站内页',
      foot: '数据来源：{hub}（fork 自 wuyoscar） · 内容遵循 {license}（署名 — 非商业性使用）· 官网：{site}'
    },
    en: {
      title: 'AI Safety Intel',
      prev: '← Prev day',
      next: 'Next day →',
      latest: 'Back to latest',
      statusLoading: 'Loading…',
      statusUpdated: 'Updated · source: AISafetyHot-Hub',
      dailyTitle: "Today's Briefing",
      dailyEmpty: 'No daily file for this date (may not be published yet).',
      papersTitle: 'Daily Paper Picks',
      count: '{n} papers',
      papersEmpty: 'No picks file for this date.',
      noData12: 'No data in the last 12 days',
      errPapers: 'Failed to load paper picks',
      authorsEtc: '{a}, and {n} more',
      linkOriginal: 'Original',
      linkSite: 'Site page',
      foot: 'Source: {hub} (forked from wuyoscar) · Content under {license} (attribution, non-commercial) · Website: {site}'
    }
  });

  var cur = null;  // 当前日期 yyyy-mm-dd，切语言时保持并重渲染
  var seq = 0;     // mount 令牌：新 mount 使旧的在途请求失效，保证幂等

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inlineMd(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  // 极简 MD 渲染（沿用 B 版阅读页规则；日报正文本身是数据原文，不随语言翻译）
  function mdRender(md) {
    var html = '', inQuote = false;
    md.split('\n').forEach(function (raw) {
      var s = raw.trim();
      if (s.charAt(0) === '>') {
        if (!inQuote) {
          html += '<blockquote style="border-left:3px solid var(--line);padding:2px 12px;color:var(--dim);margin:8px 0">';
          inQuote = true;
        }
        html += '<p style="margin:6px 0;line-height:1.8">' + inlineMd(s.replace(/^>\s?/, '')) + '</p>';
        return;
      }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
      if (!s) return;
      if (s === '---') { html += '<hr style="border:none;border-top:1px solid var(--line);margin:16px 0">'; return; }
      if (s.indexOf('### ') === 0) { html += '<h3 style="font-size:15.5px;margin:18px 0 6px;color:var(--c-safety)">' + inlineMd(s.slice(4)) + '</h3>'; return; }
      if (s.indexOf('## ') === 0) { html += '<h2 style="font-size:17px;margin:20px 0 8px;color:var(--c-race)">' + inlineMd(s.slice(3)) + '</h2>'; return; }
      if (s.indexOf('# ') === 0) { html += '<h1 style="font-size:21px;margin-bottom:6px">' + inlineMd(s.slice(2)) + '</h1>'; return; }
      html += '<p style="margin:7px 0;line-height:1.85">' + inlineMd(s) + '</p>';
    });
    if (inQuote) html += '</blockquote>';
    return html;
  }

  function getText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    });
  }
  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function todayIso() { return iso(new Date()); }
  function shift(ds, days) { var d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + days); return iso(d); }
  function fmtDate(ds) {
    return new Date(ds + 'T12:00:00').toLocaleDateString(F.locale(), { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  // 向 Hub 仓回溯 12 天找最新有精选 JSON 的日期（与 B 版阅读页逻辑一致）
  function findLatest() {
    var d = new Date(), i = 0;
    function step() {
      if (i >= 12) return Promise.reject(new Error('no-data'));
      var ds = iso(d); i++;
      return getText(RAW + '/daily-papers/' + ds.slice(0, 4) + '/' + ds + '.json').then(
        function () { return ds; },
        function () { d.setDate(d.getDate() - 1); return step(); }
      );
    }
    return step();
  }

  function paperCard(p) {
    var zh = F.lang === 'zh';
    var main = zh ? (p.titleZh || p.title || '') : (p.title || p.titleZh || '');
    var alt = zh ? (p.title || '') : (p.titleZh || '');
    var authors = p.authors || [];
    var aTxt = authors.length > 3
      ? F.t('safety.authorsEtc', { a: authors.slice(0, 3).join(zh ? '、' : ', '), n: authors.length })
      : authors.join(zh ? '、' : ', ');
    var chips = '';
    if (p.venue) chips += '<span class="chip">' + esc(p.venue) + '</span>';
    if (p.date) chips += '<span class="chip">' + esc(p.date) + '</span>';
    (p.topics || []).forEach(function (x) { chips += '<span class="chip">' + esc(x) + '</span>'; });
    var links = '';
    if (p.url) links += '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + F.t('safety.linkOriginal') + '</a>';
    if (p.site) links += (links ? ' · ' : '') + '<a href="' + esc(p.site) + '" target="_blank" rel="noopener">' + F.t('safety.linkSite') + '</a>';
    return '<article class="card" style="display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-size:15.5px;font-weight:600;line-height:1.5">' + esc(main) + '</div>' +
      ((alt && alt !== main) ? '<div style="font-size:12.5px;color:var(--dim);line-height:1.5">' + esc(alt) + '</div>' : '') +
      '<div class="sub" style="flex:1">' + esc(p.line || '') + '</div>' +
      (chips ? '<div>' + chips + '</div>' : '') +
      (aTxt ? '<div style="font-size:12px;color:var(--dim);line-height:1.5">' + esc(aTxt) + '</div>' : '') +
      (links ? '<div style="font-size:13px">' + links + '</div>' : '') +
      '</article>';
  }

  function footHtml() {
    return F.t('safety.foot', {
      hub: '<a href="https://github.com/ZHANGFA88/AISafetyHot-Hub" target="_blank" rel="noopener">AISafetyHot-Hub</a>',
      license: 'CC BY-NC 4.0',
      site: '<a href="https://aisafetyhot.com" target="_blank" rel="noopener">aisafetyhot.com</a>'
    });
  }

  function skeletons(ui) {
    ui.daily.innerHTML =
      '<div class="skel" style="height:16px;margin:10px 0"></div>' +
      '<div class="skel" style="height:16px;margin:10px 0;width:82%"></div>' +
      '<div class="skel" style="height:16px;margin:10px 0;width:64%"></div>';
    var c = '<div class="card"><div class="skel" style="height:18px;margin-bottom:10px"></div>' +
      '<div class="skel" style="height:14px;width:70%"></div></div>';
    ui.papers.innerHTML = c + c + c;
    ui.count.textContent = '';
  }

  function mount(el) {
    var my = ++seq;
    el.innerHTML =
      '<div class="card" style="--ac:var(--c-safety)">' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">' +
          '<button type="button" class="btn" data-a="prev">' + F.t('safety.prev') + '</button>' +
          '<span class="num" data-a="date" style="font-size:15px;font-weight:600;min-width:120px;text-align:center">…</span>' +
          '<button type="button" class="btn" data-a="next">' + F.t('safety.next') + '</button>' +
          '<button type="button" class="btn" data-a="latest">' + F.t('safety.latest') + '</button>' +
          '<span class="sub" data-a="status" style="margin-left:auto"></span>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="--ac:var(--c-safety);margin-top:16px">' +
        '<h3><span class="bar"></span>' + F.t('safety.dailyTitle') + '</h3>' +
        '<div data-a="daily" style="margin-top:12px;line-height:1.85;font-size:14px"></div>' +
      '</div>' +
      '<div style="margin-top:22px;display:flex;align-items:center;gap:10px">' +
        '<h3 style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim);font-weight:600;letter-spacing:.14em;text-transform:uppercase"><span style="width:8px;height:8px;border-radius:3px;background:var(--c-safety)"></span>' + F.t('safety.papersTitle') + '</h3>' +
        '<span class="sub num" data-a="count"></span>' +
      '</div>' +
      '<div class="grid" data-a="papers" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr));margin-top:12px"></div>' +
      '<div class="foot-note" data-a="foot"></div>';

    function q(k) { return el.querySelector('[data-a="' + k + '"]'); }
    var ui = {
      prev: q('prev'), next: q('next'), latest: q('latest'), date: q('date'),
      status: q('status'), daily: q('daily'), papers: q('papers'), count: q('count'), foot: q('foot')
    };
    ui.foot.innerHTML = footHtml();

    function load(ds) {
      var my2 = seq;
      cur = ds;
      ui.date.textContent = fmtDate(ds);
      ui.status.textContent = F.t('safety.statusLoading');
      ui.next.disabled = ds >= todayIso();
      skeletons(ui);
      var year = ds.slice(0, 4);
      // 日报：四栏目 MD 渲染
      getText(RAW + '/daily/' + year + '/' + ds + '.md').then(function (md) {
        if (my2 !== seq) return;
        ui.daily.innerHTML = mdRender(md);
      }, function () {
        if (my2 !== seq) return;
        ui.daily.innerHTML = '<div class="empty">' + esc(F.t('safety.dailyEmpty')) + '</div>';
      });
      // 精选：30 篇卡片
      getJSON(RAW + '/daily-papers/' + year + '/' + ds + '.json').then(function (papers) {
        if (my2 !== seq) return;
        ui.count.textContent = F.t('safety.count', { n: papers.length });
        ui.papers.innerHTML = papers.map(paperCard).join('');
        ui.status.textContent = F.t('safety.statusUpdated');
      }, function () {
        if (my2 !== seq) return;
        ui.count.textContent = '';
        ui.papers.innerHTML = '<div class="empty">' + esc(F.t('safety.papersEmpty')) + '</div>';
        ui.status.textContent = F.t('safety.errPapers');
      });
    }

    ui.prev.onclick = function () { if (cur) load(shift(cur, -1)); };
    ui.next.onclick = function () { if (cur) load(shift(cur, 1)); };
    ui.latest.onclick = function () {
      ui.status.textContent = F.t('safety.statusLoading');
      findLatest().then(function (ds) { if (my === seq) load(ds); }, function () {
        if (my === seq) ui.status.textContent = F.t('safety.noData12');
      });
    };

    if (cur) {
      load(cur); // 切语言：保持当前日期重渲染
    } else {
      skeletons(ui);
      findLatest().then(function (ds) { if (my === seq) load(ds); }, function () {
        if (my !== seq) return;
        ui.date.textContent = '—';
        ui.daily.innerHTML = '<div class="empty">' + esc(F.t('safety.noData12')) + '</div>';
        ui.papers.innerHTML = '<div class="empty">' + esc(F.t('safety.noData12')) + '</div>';
        ui.status.textContent = F.t('safety.noData12');
      });
    }
  }

  F.registerView('safety', { mount: mount });
})();
