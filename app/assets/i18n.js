/* Fusion Console · i18n 框架 + 核心字典
   视图通过 Fusion.registerI18n('view', {zh:{...}, en:{...}}) 注册自己的词条，
   模板里只许用 Fusion.t('view.key')，不许写死文案。 */
(function () {
  var dict = { zh: {}, en: {} };
  var lang = localStorage.getItem('fusion_lang') || 'zh';
  if (lang !== 'en') lang = 'zh';

  function registerI18n(ns, pack) {
    ['zh', 'en'].forEach(function (L) {
      if (!pack[L]) return;
      Object.keys(pack[L]).forEach(function (k) { dict[L][ns + '.' + k] = pack[L][k]; });
    });
  }
  function t(key, vars) {
    var s = (dict[lang] && dict[lang][key]) || dict.zh[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function locale() { return lang === 'en' ? 'en-US' : 'zh-CN'; }
  function fmtNum(v, dec) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString(locale(), { minimumFractionDigits: dec || 0, maximumFractionDigits: dec === undefined ? 2 : dec });
  }
  function fmtPct(v, dec) { // v 为百分数数值（0.45 表示 +0.45%）
    if (v === null || v === undefined || isNaN(v)) return '—';
    var n = Number(v); return (n > 0 ? '+' : '') + n.toFixed(dec === undefined ? 2 : dec) + '%';
  }
  function fmtFrac(v, dec) { // v 为小数（3.5324 表示 +353.24%）
    if (v === null || v === undefined || isNaN(v)) return '—';
    return fmtPct(Number(v) * 100, dec);
  }
  function fmtMoney(v, sym) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return (sym || '¥') + Number(v).toLocaleString(locale(), { maximumFractionDigits: 0 });
  }
  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts * 1000);
    return d.toLocaleString(locale(), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function cls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : 'flat'); }

  var INDEX_NAMES = {
    '上证指数': 'SSE Composite', '深证成指': 'SZSE Component', '创业板指': 'ChiNext',
    '科创50': 'STAR 50', '恒生指数': 'Hang Seng', '纳斯达克': 'Nasdaq', '纳指': 'Nasdaq',
    '标普500': 'S&P 500', '道琼斯': 'Dow Jones', '日经225': 'Nikkei 225', '比特币': 'Bitcoin'
  };
  function indexName(n) { return lang === 'en' ? (INDEX_NAMES[n] || n) : n; }

  registerI18n('core', {
    zh: {
      brand: 'FUSION 控制台', tagline: '个人情报中枢', overview: '总览', markets: '行情', degen: '实验室',
      race: '定投赛跑', spider: '机械蜘蛛', safety: 'AI 安全',
      loading: '加载中', empty: '暂无数据', unreachable: '数据源不可达', retry: '重试中',
      enter: '进入', online: '在线', offline: '离线', updated: '更新于',
      disclaimer: '数据来自公开来源，可能延迟或有误；本控制台仅供个人学习与信息整理，不构成投资建议。',
      mktOpen: '交易中', mktClosed: '已收盘', langName: 'EN',
      keyFinance: '全球行情与自选', keyDegen: '纸面交易实验', keyRace: '18 年定投回测',
      keySpider: '提示词可视化', keySafety: '每日安全情报', keyOverview: '一眼全局'
    },
    en: {
      brand: 'FUSION CONSOLE', tagline: 'Personal intelligence hub', overview: 'Overview', markets: 'Markets', degen: 'Degen Lab',
      race: 'DCA Race', spider: 'Spider', safety: 'AI Safety',
      loading: 'Loading', empty: 'No data', unreachable: 'Source unreachable', retry: 'Retrying',
      enter: 'Open', online: 'Online', offline: 'Offline', updated: 'Updated',
      disclaimer: 'Data comes from public sources and may be delayed or inaccurate. For personal learning only — not investment advice.',
      mktOpen: 'Market open', mktClosed: 'Market closed', langName: '中文',
      keyFinance: 'Global markets & watchlist', keyDegen: 'Paper-trading experiment', keyRace: '18-year DCA backtest',
      keySpider: 'Prompt visualization', keySafety: 'Daily safety intel', keyOverview: 'Everything at a glance'
    }
  });

  window.Fusion = {
    registerI18n: registerI18n, t: t,
    get lang() { return lang; },
    setLang: function (L) { lang = L; localStorage.setItem('fusion_lang', L); },
    fmtNum: fmtNum, fmtPct: fmtPct, fmtFrac: fmtFrac, fmtMoney: fmtMoney, fmtTime: fmtTime,
    cls: cls, indexName: indexName, locale: locale,
    views: {}, registerView: function (name, def) { this.views[name] = def; },
    status: null
  };
})();
