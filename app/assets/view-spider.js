/* Fusion Console · 蜘蛛：壳内嵌本体舞台 + 状态/工具/接入侧栏（SPEC-A 3.5） */
(function () {
  var F = window.Fusion;
  F.registerI18n('spider', {
    zh: {
      stage: '蜘蛛本体 · 实时舞台', svc: '服务状态', tools: 'MCP 工具（11）', how: '让 Agent 接入（三步）',
      step1: '在仓库根目录执行：cd modules/spider/mcp && npm ci（只需一次）',
      step2: '把仓库根 .mcp.json 里的 prompt-spider 路径改成你机器上的绝对路径',
      step3: '在支持 MCP 的客户端里打开本仓库，调用 spider_create_session 开会话',
      open4317: '在新标签打开 :4317', via: '工具清单来自 modules/spider/docs/mcp.md，语义以该文档为准。'
    },
    en: {
      stage: 'Spider Stage · Live', svc: 'Service Status', tools: 'MCP Tools (11)', how: 'Connect an Agent (3 steps)',
      step1: 'From the repo root: cd modules/spider/mcp && npm ci (once)',
      step2: 'Point the prompt-spider path in the repo-root .mcp.json to the absolute path on your machine',
      step3: 'Open this repo in an MCP-capable client and call spider_create_session',
      open4317: 'Open :4317 in a new tab', via: 'Tool list per modules/spider/docs/mcp.md — see that doc for semantics.'
    }
  });
  var TOOLS = [
    ['spider_create_session', '创建可视化会话', 'Create a visualization session'],
    ['spider_get_session', '读取会话状态', 'Get session state'],
    ['spider_list_sessions', '列出全部会话', 'List sessions'],
    ['spider_close_session', '关闭会话', 'Close a session'],
    ['spider_update_events', '推送逐词事件', 'Push per-token events'],
    ['spider_complete_session', '完成并收尾会话', 'Complete a session'],
    ['spider_configure_session', '调整会话外观/配置', 'Configure a session'],
    ['spider_control_playback', '控制回放（暂停/定位）', 'Control playback'],
    ['spider_export_session', '导出会话', 'Export a session'],
    ['spider_import_session', '导入会话', 'Import a session'],
    ['spider_export_project', '导出整个项目', 'Export the project']
  ];
  function mount(el) {
    var s = F.status, sp = (s && s.spider) || {};
    var url = 'http://' + location.hostname + ':4317/';
    el.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr 320px;align-items:start">' +
      '<div class="card" style="--ac:var(--c-spider)"><h3><span class="bar"></span>' + F.t('spider.stage') + '</h3>' +
      '<a class="more" href="' + url + '" target="_blank" rel="noopener">' + F.t('spider.open4317') + ' ↗</a>' +
      '<div class="stage" style="height:min(74vh,780px);margin-top:12px"><iframe src="' + url + '" title="Prompt Spider" loading="lazy"></iframe></div></div>' +
      '<div>' +
      '<div class="card" style="--ac:var(--c-spider)"><h3><span class="bar"></span>' + F.t('spider.svc') + '</h3>' +
      '<div class="big num" style="font-size:22px"><span class="dot ' + (sp.online ? 'ok' : 'bad') + '" style="display:inline-block;margin-right:8px"></span>' + (sp.online ? F.t('core.online') : F.t('core.offline')) + '</div>' +
      '<div class="sub">node server.mjs · :4317</div></div>' +
      '<div class="card" style="margin-top:16px;--ac:var(--c-spider)"><h3><span class="bar"></span>' + F.t('spider.tools') + '</h3><div style="margin-top:8px">' +
      TOOLS.map(function (x) { return '<div style="padding:6px 0;border-bottom:1px solid rgba(30,39,64,.55)"><div class="num" style="font-size:12.5px;color:var(--c-spider)">' + x[0] + '</div><div style="font-size:13px;margin-top:2px">' + (F.lang === 'en' ? x[2] : x[1]) + '</div></div>'; }).join('') +
      '<div class="sub" style="margin-top:8px">' + F.t('spider.via') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px;--ac:var(--c-spider)"><h3><span class="bar"></span>' + F.t('spider.how') + '</h3>' +
      '<div style="margin-top:8px;line-height:1.9;font-size:13.5px">1. ' + F.t('spider.step1') + '<br>2. ' + F.t('spider.step2') + '<br>3. ' + F.t('spider.step3') + '</div></div>' +
      '</div></div>';
  }
  F.registerView('spider', { mount: mount });
})();
