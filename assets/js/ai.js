const AI = (function () {
  let panel, statusEl, resultEl, targetLangEl, jdEl, rawTextEl, providerModeEl, providerBaseEl, providerKeyEl, providerModelEl;
  let activeTask = 'translate';
  let phase = 'setup';
  let pendingResume = null;
  let latestSuggestions = [];
  let currentImageMap = {};
  let currentPrivateMap = {};
  let localProviderAvailable = null;
  const PRIVACY_KEY = 'cv_generator_ai_privacy_ack_v1';
  const CONFIG_KEY = 'cv_generator_ai_provider_v1';
  const AI_TEXT = {
    zh: {
      panelTitle: '简历助手',
      subtitle: '翻译、优化与评分集中处理',
      config: '配置',
      close: '关闭',
      translate: '翻译',
      translateSmall: '双语版本',
      optimize: '优化',
      optimizeSmall: '逐项建议',
      score: '评分',
      scoreSmall: '综合诊断',
      fill: '填充',
      fillSmall: '文本解析',
      targetLang: '翻译目标',
      jobDesc: '岗位 JD（可选）',
      rawText: '简历文本',
      jobPlaceholder: '粘贴目标岗位描述，建议和评分会更贴近岗位',
      privacyTitle: 'AI 隐私说明',
      privacyP1: '我们不会使用您的姓名、邮箱、手机号、地址、头像、个人主页等身份联系方式数据；除此之外的简历数据会被发送至您的模型提供服务商，用于翻译、优化建议或评分分析。',
      privacyP2: 'API Key 只会保存到本地。',
      loadingFallback: '正在生成',
      loadingCopy: '正在整理当前简历内容，结果会在这里替换显示。',
      acknowledge: '我知道了',
      configTitle: '模型服务配置',
      configNote: '填写自定义兼容接口。API Key 仅保存在当前浏览器。',
      mode: '调用方式',
      localMode: '本地代理（读取 .env）',
      compatibleMode: '自定义 OpenAI 兼容接口',
      model: '模型',
      configIncomplete: '请填写完整模型配置',
      configSaved: '模型配置已保存',
      configFailed: '保存配置失败',
      later: '稍后',
      saveConfig: '保存配置',
      tasks: {
        translate: ['一键翻译', '中英文版本', '将当前简历转换为目标语言，并同步板块标题语言。', '生成译文', '生成后可先下载 JSON，再决定是否应用到当前简历。'],
        optimize: ['逐项优化', '结构 / 措辞 / 匹配度', '按简历字段给出可应用、可忽略的中文修改建议。', '生成建议', '粘贴目标岗位 JD 后，建议会更贴近申请方向。'],
        score: ['简历评分', '质量 / 风险 / 快速改进', '从内容完整度、表达质量和岗位匹配度给出中文评估。', '开始评分', '评分结果用于定位优先改进项，不会自动修改简历。'],
        fill: ['智能填充', '纯文本解析', '粘贴一段简历文本，自动整理为可编辑字段。', '解析并填充', '生成后可预览字段数量，再决定是否应用。']
      }
    },
    en: {
      panelTitle: 'Resume Assistant',
      subtitle: 'Translate, optimize, and score in one place',
      config: 'Settings',
      close: 'Close',
      translate: 'Translate',
      translateSmall: 'Bilingual',
      optimize: 'Improve',
      optimizeSmall: 'Suggestions',
      score: 'Score',
      scoreSmall: 'Diagnosis',
      fill: 'Fill',
      fillSmall: 'Parse text',
      targetLang: 'Target language',
      jobDesc: 'Job description (optional)',
      rawText: 'Resume text',
      jobPlaceholder: 'Paste a target job description for more relevant suggestions and scoring',
      privacyTitle: 'AI Privacy Notice',
      privacyP1: 'We do not use your name, email, phone number, address, avatar, personal website, or other identity/contact data. Other resume content will be sent to your model provider for translation, suggestions, or scoring.',
      privacyP2: 'Your API key is stored locally only.',
      loadingFallback: 'Generating',
      loadingCopy: 'Preparing the current resume. The result will replace this area.',
      acknowledge: 'Got it',
      configTitle: 'Model Provider',
      configNote: 'Fill in a custom compatible endpoint. The API key is stored only in this browser.',
      mode: 'Mode',
      localMode: 'Local proxy (.env)',
      compatibleMode: 'Custom OpenAI-compatible API',
      model: 'Model',
      configIncomplete: 'Please complete the model settings',
      configSaved: 'Model settings saved',
      configFailed: 'Failed to save settings',
      later: 'Later',
      saveConfig: 'Save settings',
      tasks: {
        translate: ['Translate', 'Bilingual version', 'Convert the current resume to the target language and sync section headings.', 'Generate translation', 'Download the JSON first, then decide whether to apply it.', 'Generating translation'],
        optimize: ['Improve', 'Structure / wording / fit', 'Generate field-level suggestions that can be applied or ignored.', 'Generate suggestions', 'Paste a target JD to make suggestions more relevant.', 'Generating suggestions'],
        score: ['Score', 'Quality / risks / quick wins', 'Assess completeness, writing quality, and role fit.', 'Start scoring', 'Scoring only identifies improvement priorities. It will not edit the resume.', 'Generating score'],
        fill: ['Smart Fill', 'Parse text', 'Paste plain resume text and convert it into editable fields.', 'Parse and fill', 'Review the parsed result before applying it.', 'Parsing resume']
      }
    }
  };

  const TASKS = {
    translate: {
      title: '一键翻译',
      meta: '中英文版本',
      desc: '将当前简历转换为目标语言，并同步板块标题语言。',
      action: '生成译文',
      loading: '正在生成译文',
      hint: '生成后可先下载 JSON，再决定是否应用到当前简历。'
    },
    optimize: {
      title: '逐项优化',
      meta: '结构 / 措辞 / 匹配度',
      desc: '按简历字段给出可应用、可忽略的中文修改建议。',
      action: '生成建议',
      loading: '正在生成建议',
      hint: '粘贴目标岗位 JD 后，建议会更贴近申请方向。'
    },
    score: {
      title: '简历评分',
      meta: '质量 / 风险 / 快速改进',
      desc: '从内容完整度、表达质量和岗位匹配度给出中文评估。',
      action: '开始评分',
      loading: '正在生成评分',
      hint: '评分结果用于定位优先改进项，不会自动修改简历。'
    },
    fill: {
      title: '智能填充',
      meta: '纯文本解析',
      desc: '粘贴一段简历文本，自动整理为可编辑字段。',
      action: '解析并填充',
      loading: '正在解析简历',
      hint: '生成后可预览字段数量，再决定是否应用。'
    }
  };

  function init() {
    const btn = document.getElementById('btnAI');
    if (!btn) return;
    buildPanel();
    btn.addEventListener('click', open);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('show')) close();
    });
  }

  function buildPanel() {
    panel = document.createElement('aside');
    panel.className = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-head">
        <div>
          <div class="ai-title-row">
            <span class="ai-badge">AI</span>
            <span class="ai-kicker">Resume Assistant</span>
          </div>
          <h2>简历助手</h2>
          <p class="ai-subtitle">翻译、优化与评分集中处理</p>
        </div>
        <div class="ai-head-actions">
          <button type="button" class="btn btn-sm btn-ghost ai-config-btn" id="aiConfigBtn">配置</button>
          <button type="button" class="icon-btn" id="aiClose" title="关闭">×</button>
        </div>
      </div>
      <div class="ai-body">
        <div class="ai-tabs" role="tablist" aria-label="AI 功能">
          <button type="button" class="ai-tab" data-ai-task="translate" role="tab">
            <span>翻译</span>
            <small>双语版本</small>
          </button>
          <button type="button" class="ai-tab" data-ai-task="optimize" role="tab">
            <span>优化</span>
            <small>逐项建议</small>
          </button>
          <button type="button" class="ai-tab" data-ai-task="score" role="tab">
            <span>评分</span>
            <small>综合诊断</small>
          </button>
          <button type="button" class="ai-tab" data-ai-task="fill" role="tab">
            <span>填充</span>
            <small>文本解析</small>
          </button>
        </div>
        <div class="ai-task-card">
          <div class="ai-task-topline">
            <span id="aiTaskTitle"></span>
            <em id="aiTaskMeta"></em>
          </div>
          <p class="ai-task-desc" id="aiTaskDesc"></p>
          <div class="ai-task-panel" data-task-panel="translate">
            <label class="fld">
              <span class="fld-lab">翻译目标</span>
              <select class="inp" id="aiTargetLang">
                <option value="English">英文</option>
                <option value="Simplified Chinese">中文</option>
              </select>
            </label>
          </div>
          <div class="ai-jd-panel" data-ai-jd-panel>
            <label class="fld">
              <span class="fld-lab">岗位 JD（可选）</span>
              <textarea class="inp" id="aiJobDescription" rows="5"></textarea>
            </label>
          </div>
          <div class="ai-task-panel" data-task-panel="fill">
            <label class="fld">
              <span class="fld-lab">简历文本</span>
              <textarea class="inp" id="aiRawText" rows="9"></textarea>
            </label>
          </div>
        </div>
        <button type="button" class="ai-run" id="aiRun">
          <span id="aiRunLabel"></span>
          <small id="aiRunHint"></small>
        </button>
        <div class="ai-status" id="aiStatus"></div>
        <div class="ai-result" id="aiResult"></div>
      </div>
      <div class="ai-privacy-modal" id="aiPrivacyModal" hidden>
        <div class="ai-privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="aiPrivacyTitle">
          <div class="ai-privacy-kicker">Privacy Notice</div>
          <h3 id="aiPrivacyTitle">AI 隐私说明</h3>
          <p>我们不会使用您的姓名、邮箱、手机号、地址、头像、个人主页等身份联系方式数据；除此之外的简历数据会被发送至您的模型提供服务商，用于翻译、优化建议或评分分析。</p>
          <p>API Key 只会保存到本地。</p>
          <button type="button" class="btn btn-primary" id="aiPrivacyAccept">我知道了</button>
        </div>
      </div>
      <div class="ai-config-modal" id="aiConfigModal" hidden>
        <div class="ai-config-dialog" role="dialog" aria-modal="true" aria-labelledby="aiConfigTitle">
          <div class="ai-privacy-kicker">Model Provider</div>
          <h3 id="aiConfigTitle">模型服务配置</h3>
          <p class="ai-config-note">本地代理会自动读取 .env；如果没有本地配置，或部署在 GitHub Pages，可填写自定义兼容接口。API Key 仅保存在当前浏览器。</p>
          <label class="fld">
            <span class="fld-lab">调用方式</span>
            <select class="inp" id="aiProviderMode">
              <option value="local">本地代理（读取 .env）</option>
              <option value="compatible">自定义 OpenAI 兼容接口</option>
            </select>
          </label>
          <div class="ai-provider-fields" id="aiProviderFields">
            <label class="fld">
              <span class="fld-lab">Base URL</span>
              <input class="inp" id="aiProviderBase" type="text" />
            </label>
            <label class="fld">
              <span class="fld-lab">API Key</span>
              <input class="inp" id="aiProviderKey" type="password" />
            </label>
            <label class="fld">
              <span class="fld-lab">模型</span>
              <input class="inp" id="aiProviderModel" type="text" />
            </label>
          </div>
          <div class="ai-config-actions">
            <button type="button" class="btn btn-ghost" id="aiConfigClose">稍后</button>
            <button type="button" class="btn btn-primary" id="aiConfigSave">保存配置</button>
          </div>
        </div>
      </div>`;
    (document.querySelector('.workspace') || document.body).appendChild(panel);

    statusEl = panel.querySelector('#aiStatus');
    resultEl = panel.querySelector('#aiResult');
    targetLangEl = panel.querySelector('#aiTargetLang');
    jdEl = panel.querySelector('#aiJobDescription');
    rawTextEl = panel.querySelector('#aiRawText');
    providerModeEl = panel.querySelector('#aiProviderMode');
    providerBaseEl = panel.querySelector('#aiProviderBase');
    providerKeyEl = panel.querySelector('#aiProviderKey');
    providerModelEl = panel.querySelector('#aiProviderModel');

    panel.querySelector('#aiClose').addEventListener('click', close);
    panel.querySelector('#aiPrivacyAccept').addEventListener('click', acceptPrivacy);
    panel.querySelector('#aiConfigBtn').addEventListener('click', () => showConfigModal(false));
    panel.querySelector('#aiConfigClose').addEventListener('click', hideConfigModal);
    panel.querySelector('#aiConfigSave').addEventListener('click', saveModelConfig);
    providerModeEl.addEventListener('change', syncProviderFields);
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => {
      btn.addEventListener('click', () => setTask(btn.dataset.aiTask));
    });
    panel.querySelector('#aiRun').addEventListener('click', runActiveTask);
    resultEl.addEventListener('click', onResultClick);
    document.addEventListener('cv:langchange', updateLanguage);
    document.addEventListener('cv:editorvisibility', syncDockMode);
    setTask(activeTask);
    updateLanguage();
  }

  function setTask(task) {
    if (phase === 'loading') return;
    if (!TASKS[task]) return;
    activeTask = task;
    phase = 'setup';
    const meta = taskText(task);
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => {
      const active = btn.dataset.aiTask === task;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panel.querySelectorAll('[data-task-panel]').forEach((node) => {
      node.classList.toggle('active', node.dataset.taskPanel === task);
    });
    const jdPanel = panel.querySelector('[data-ai-jd-panel]');
    if (jdPanel) jdPanel.classList.toggle('active', task !== 'translate' && task !== 'fill');
    panel.querySelector('#aiTaskTitle').textContent = meta.title;
    panel.querySelector('#aiTaskMeta').textContent = meta.meta;
    panel.querySelector('#aiTaskDesc').textContent = meta.desc;
    panel.querySelector('#aiRunLabel').textContent = meta.action;
    panel.querySelector('#aiRunHint').textContent = meta.hint;
    resultEl.innerHTML = '';
    panel.classList.remove('ai-result-mode');
    setIdle('');
  }

  function lang() {
    return window.App && App.currentLang && App.currentLang() === 'en' ? 'en' : 'zh';
  }

  function aiText(key) {
    return (AI_TEXT[lang()] && AI_TEXT[lang()][key]) || AI_TEXT.zh[key] || key;
  }

  function taskText(task) {
    const item = (AI_TEXT[lang()].tasks && AI_TEXT[lang()].tasks[task]) || AI_TEXT.zh.tasks[task];
    return {
      title: item[0],
      meta: item[1],
      desc: item[2],
      action: item[3],
      hint: item[4],
      loading: item[5] || (TASKS[task] && TASKS[task].loading) || item[3]
    };
  }

  function updateLanguage() {
    if (!panel) return;
    const set = (selector, value) => {
      const el = panel.querySelector(selector);
      if (el) el.textContent = value;
    };
    set('.ai-head h2', aiText('panelTitle'));
    set('.ai-subtitle', aiText('subtitle'));
    set('#aiConfigBtn', aiText('config'));
    const close = panel.querySelector('#aiClose');
    if (close) close.title = aiText('close');
    const tabs = panel.querySelectorAll('.ai-tab');
    [['translate', 'translateSmall'], ['optimize', 'optimizeSmall'], ['score', 'scoreSmall'], ['fill', 'fillSmall']].forEach((keys, index) => {
      const tab = tabs[index];
      if (!tab) return;
      const span = tab.querySelector('span');
      const small = tab.querySelector('small');
      if (span) span.textContent = aiText(keys[0]);
      if (small) small.textContent = aiText(keys[1]);
    });
    const targetLabel = panel.querySelector('[data-task-panel="translate"] .fld-lab');
    if (targetLabel) targetLabel.textContent = aiText('targetLang');
    if (targetLangEl && targetLangEl.options.length >= 2) {
      targetLangEl.options[0].textContent = lang() === 'en' ? 'English' : '英文';
      targetLangEl.options[1].textContent = lang() === 'en' ? 'Simplified Chinese' : '中文';
    }
    const jdLabel = panel.querySelector('[data-ai-jd-panel] .fld-lab');
    if (jdLabel) jdLabel.textContent = aiText('jobDesc');
    if (jdEl) jdEl.removeAttribute('placeholder');
    const rawLabel = panel.querySelector('[data-task-panel="fill"] .fld-lab');
    if (rawLabel) rawLabel.textContent = aiText('rawText');
    set('#aiPrivacyTitle', aiText('privacyTitle'));
    const privacyPs = panel.querySelectorAll('.ai-privacy-dialog p');
    if (privacyPs[0]) privacyPs[0].textContent = aiText('privacyP1');
    if (privacyPs[1]) privacyPs[1].textContent = aiText('privacyP2');
    set('#aiPrivacyAccept', aiText('acknowledge'));
    set('#aiConfigTitle', aiText('configTitle'));
    const configNote = panel.querySelector('.ai-config-note');
    if (configNote) configNote.textContent = aiText('configNote');
    const modeLabel = panel.querySelector('#aiProviderMode') && panel.querySelector('#aiProviderMode').closest('.fld').querySelector('.fld-lab');
    if (modeLabel) modeLabel.textContent = aiText('mode');
    if (providerModeEl && providerModeEl.options.length >= 2) {
      providerModeEl.options[0].textContent = aiText('localMode');
      providerModeEl.options[1].textContent = aiText('compatibleMode');
    }
    syncProviderModeOptions();
    const modelLabel = panel.querySelector('#aiProviderModel') && panel.querySelector('#aiProviderModel').closest('.fld').querySelector('.fld-lab');
    if (modelLabel) modelLabel.textContent = aiText('model');
    set('#aiConfigClose', aiText('later'));
    set('#aiConfigSave', aiText('saveConfig'));
    setTask(activeTask);
  }

  function runActiveTask() {
    if (activeTask === 'translate') return translate();
    if (activeTask === 'optimize') return optimize();
    if (activeTask === 'score') return score();
    return fillResume();
  }

  function open() {
    panel.classList.add('show');
    syncDockMode();
    maybeShowPrivacy();
  }

  function close() {
    panel.classList.remove('show');
    syncDockMode();
  }

  function syncDockMode() {
    const docked = !!(panel && panel.classList.contains('show') && window.App && App.isEditorHidden && App.isEditorHidden());
    document.body.classList.toggle('ai-docked', docked);
    if (panel) panel.classList.toggle('is-docked', docked);
  }

  function setBusy(msg) {
    statusEl.textContent = msg || '';
    panel.classList.add('is-busy');
  }

  function setIdle(msg) {
    statusEl.textContent = '';
    panel.classList.remove('is-busy');
  }

  function maybeShowPrivacy() {
    let acknowledged = false;
    try {
      acknowledged = localStorage.getItem(PRIVACY_KEY) === '1';
    } catch (e) {
      acknowledged = false;
    }
    const modal = panel.querySelector('#aiPrivacyModal');
    if (modal) modal.hidden = acknowledged;
    if (acknowledged) maybeShowConfig();
  }

  function acceptPrivacy() {
    try {
      localStorage.setItem(PRIVACY_KEY, '1');
    } catch (e) {

    }
    const modal = panel.querySelector('#aiPrivacyModal');
    if (modal) modal.hidden = true;
    maybeShowConfig();
  }

  async function maybeShowConfig() {
    await detectLocalProvider();
    if (!localProviderAvailable && !getModelConfig()) showConfigModal(true);
  }

  function getModelConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      if (cfg && cfg.mode === 'local' && localProviderAvailable) return cfg;
      if (cfg && cfg.mode === 'compatible' && cfg.baseUrl && cfg.apiKey && cfg.model) return cfg;
    } catch (e) {
      return null;
    }
    return null;
  }

  function loadConfigForm() {
    let cfg = null;
    try { cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch (e) { cfg = null; }
    cfg = cfg || { mode: localProviderAvailable ? 'local' : 'compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' };
    providerModeEl.value = (cfg.mode === 'local' && !localProviderAvailable) ? 'compatible' : (cfg.mode || 'compatible');
    providerBaseEl.value = cfg.baseUrl || '';
    providerKeyEl.value = cfg.apiKey || '';
    providerModelEl.value = cfg.model || 'qwen-plus';
    syncProviderFields();
  }

  function syncProviderFields() {
    syncProviderModeOptions();
    const fields = panel.querySelector('#aiProviderFields');
    if (fields) fields.hidden = providerModeEl.value !== 'compatible';
  }

  function syncProviderModeOptions() {
    if (!providerModeEl) return;
    const localOption = Array.from(providerModeEl.options).find((option) => option.value === 'local');
    if (localOption) localOption.hidden = localProviderAvailable === false;
    if (localProviderAvailable === false && providerModeEl.value === 'local') providerModeEl.value = 'compatible';
  }

  async function detectLocalProvider() {
    if (isStaticPage()) {
      localProviderAvailable = false;
      syncProviderModeOptions();
      return false;
    }
    try {
      const res = await fetch('/api/config', { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      localProviderAvailable = !!(res.ok && json && json.hasLocalProvider);
    } catch (e) {
      localProviderAvailable = false;
    }
    syncProviderModeOptions();
    return localProviderAvailable;
  }

  function showConfigModal(required) {
    loadConfigForm();
    const modal = panel.querySelector('#aiConfigModal');
    if (modal) {
      modal.hidden = false;
      modal.dataset.required = required ? '1' : '0';
    }
  }

  function hideConfigModal() {
    const modal = panel.querySelector('#aiConfigModal');
    if (modal) modal.hidden = true;
  }

  function saveModelConfig() {
    const mode = providerModeEl.value === 'compatible' ? 'compatible' : 'local';
    const cfg = mode === 'local'
      ? { mode: 'local' }
      : {
          mode,
          baseUrl: providerBaseEl.value.trim().replace(/\/+$/, ''),
          apiKey: providerKeyEl.value.trim(),
          model: providerModelEl.value.trim()
        };
    if (mode === 'compatible' && (!cfg.baseUrl || !cfg.apiKey || !cfg.model)) {
      setIdle(aiText('configIncomplete'));
      return;
    }
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
      hideConfigModal();
      setIdle(aiText('configSaved'));
    } catch (e) {
      setIdle(aiText('configFailed'));
    }
  }

  function snapshotPayload(task) {
    const stripped = stripImages(Store.data);
    const privacy = stripPrivateFields(stripped.data);
    currentImageMap = stripped.images;
    currentPrivateMap = privacy.privateFields;
    const payload = {
      task,
      data: privacy.data,
      outputLang: lang() === 'en' ? 'English' : 'Simplified Chinese',
      jobDescription: jdEl.value.trim(),
      rawText: rawTextEl ? rawTextEl.value.trim() : ''
    };
    if (task === 'translate') payload.targetLang = targetLangEl.value;
    return payload;
  }

  async function callAI(task) {
    const payload = snapshotPayload(task);
    await detectLocalProvider();
    const cfg = getModelConfig() || { mode: 'local' };
    if (cfg.mode === 'local' && !localProviderAvailable) {
      showConfigModal(true);
      throw new Error(lang() === 'en' ? 'No local model configuration was detected. Fill in a custom compatible endpoint.' : '未检测到本地模型配置，请填写自定义兼容接口。');
    }
    if (cfg.mode === 'compatible') return callCompatibleAI(task, payload, cfg);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        if (res.status === 404 || res.status === 405) {
          showConfigModal(true);
          throw new Error('未检测到本地 AI 代理，请填写模型服务配置。');
        }
        if (/QWEN_API_KEY|DASHSCOPE_API_KEY|Missing/i.test(json.error || '')) {
          showConfigModal(true);
          throw new Error('未检测到本地模型密钥，请填写模型服务配置，或在 .env 中配置 QWEN_API_KEY。');
        }
        throw new Error(json.error || 'AI 请求失败');
      }
      return json.result;
    } catch (err) {
      if (/Failed to fetch|NetworkError|Load failed/i.test(err.message || '')) {
        showConfigModal(true);
        throw new Error('未检测到本地 AI 代理，请填写模型服务配置。');
      }
      throw err;
    }
  }

  function isStaticPage() {
    return location.protocol === 'file:' ||
      /\.github\.io$/i.test(location.hostname) ||
      !['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  }

  async function callCompatibleAI(task, payload, cfg) {
    const body = {
      model: cfg.model,
      temperature: task === 'score' ? 0.2 : 0.35,
      enable_thinking: false,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: providerSystemPrompt(payload.outputLang) },
        { role: 'user', content: providerTaskPrompt(task, payload) }
      ]
    };
    const endpoint = /\/chat\/completions$/i.test(cfg.baseUrl) ? cfg.baseUrl : cfg.baseUrl + '/chat/completions';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : '模型服务请求失败');
    const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!content) throw new Error('模型没有返回内容');
    return parseJsonContent(content);
  }

  function currentYearContextLines() {
    const year = new Date().getFullYear();
    return [
      `当前日期语境：今天是 ${year} 年。`,
      '日期判断规则：',
      '- 结束时间写「至今」「现在」「present」「current」「Now」或留空，表示仍在进行，不是未来时间，也不是错误。',
      `- 起始年为 ${year} 且结束为「至今」或等效表述，表示当前在职/在读，完全合理。`,
      '- 不要把「YYYY-至今」在起始年≤当前年时判为时间冲突、未来时间或逻辑错误。',
      '- 只有明确晚于当前年的起止时间（如结束年在未来且无「至今」类表述）才可提示时间风险。'
    ];
  }

  function providerSystemPrompt(outputLang) {
    return [
      'You edit structured resume JSON for VitaLoom. Return valid JSON only—no markdown, no text outside JSON.',
      '',
      'Principles:',
      '- Ground every judgment in the supplied JSON. Do not invent employers, schools, dates, metrics, awards, or credentials.',
      '- Name, email, phone, location, website, avatar, and personal links may be omitted on purpose. Never treat that as a flaw or suggest adding them.',
      '- Keep JSON keys, image data URLs, links, dates, and numbers unless the task explicitly rewrites prose.',
      '- Translate and parse faithfully: natural, professional wording; preserve meaning without hype or compression.',
      '- Optimize and score objectively: specific, balanced, evidence-based. Avoid generic praise, fear-mongering, or buzzwords.',
      `- User-facing explanations (reason, summary, comments, dimension names) must be in ${outputLang}.`,
      '- proposal text must stay in the same language as the original field. Switching resume language is not an optimization.',
      '- Date checks use the current calendar year from the task rules. "至今"/"present"/empty end means ongoing—not a future date or conflict when start year ≤ current year.'
    ].join('\n');
  }

  function providerTaskPrompt(task, payload) {
    const resume = JSON.stringify(payload.data || {}, null, 2);
    const jd = payload.jobDescription ? '\n\nJob description:\n' + payload.jobDescription : '';
    const base = [
      'The resume may omit private contact fields by design—do not penalize that.',
      'Use only facts present in the input. Do not fabricate content.',
      'Resume JSON:\n' + resume + jd
    ].join('\n\n');
    if (task === 'translate') {
      const langCode = payload.targetLang === 'English' ? 'en' : 'zh';
      return [
        base,
        '',
        `Task: translate natural-language resume content into ${payload.targetLang}.`,
        '- Keep all JSON keys unchanged.',
        '- Translate names, titles, summaries, bullets, labels, and descriptions with idiomatic, professional phrasing.',
        '- Preserve facts, scope, and tone. Do not add, delete, optimize, or soften/strengthen claims.',
        '- Keep proper nouns (company/product names) accurate; transliterate or keep original when conventional.',
        `- Set resume.meta.lang to "${langCode}".`,
        'Return exactly: {"resume": <full translated resume JSON>}'
      ].join('\n');
    }
    if (task === 'fill') {
      return [
        `UI language: ${payload.outputLang}.`,
        'Task: parse the plain resume text into the VitaLoom resume JSON schema.',
        'Rules:',
        '- Extract only information explicitly stated in the text.',
        '- Use clear, neutral professional phrasing. Split bullet-like lines into description fields where appropriate.',
        '- Do not guess missing dates, employers, schools, numbers, awards, certificates, or contact details.',
        '- Leave uncertain fields as empty strings or empty arrays.',
        'Schema keys: meta, basics, links, highlights, experience, education, projects, skills, languages, awards, certificates, publications, activities, socialWork, notes.',
        `Set resume.meta.lang to "${payload.outputLang === 'English' ? 'en' : 'zh'}".`,
        'Return exactly: {"resume": <full parsed resume JSON>}',
        '',
        'Plain resume text:',
        payload.rawText || ''
      ].join('\n');
    }
    if (task === 'optimize') {
      return [
        base,
        '',
        'Task: suggest field-level resume improvements. This is not translation.',
        'Rules:',
        ...currentYearContextLines(),
        `- Write section, reason, and priority labels for the user in ${payload.outputLang}.`,
        '- One suggestion per real dot path in the JSON (e.g. experience.0.description).',
        '- original: verbatim excerpt from that field. proposal: a drop-in rewrite in the same language as original.',
        '- Prefer concrete improvements: clearer structure, stronger evidence, tighter wording, better hierarchy, JD alignment when a job description is provided.',
        '- Stay honest: do not invent metrics, tools, or outcomes. Do not recommend changes that alter factual meaning.',
        '- Avoid clichés ("results-driven", "passionate") unless replacing weaker phrasing with substantiated detail.',
        '- Return 3–8 suggestions when meaningful improvements exist; fewer is fine if the resume is already strong.',
        '- Never suggest changing the resume language.',
        'Return exactly: {"suggestions":[{"path":"experience.0.description","section":"Experience","original":"...","proposal":"...","reason":"...","priority":"high|medium|low"}]}'
      ].join('\n');
    }
    return [
      base,
      '',
      'Task: score the resume' + (payload.jobDescription ? ' against the job description' : '') + '.',
      'Rules:',
      ...currentYearContextLines(),
      `- All user-facing text must be in ${payload.outputLang}.`,
      '- Score only what is present. Be fair, specific, and calibrated—not flattering or harsh without cause.',
      '- overall score 0–100: 85+ strong and ready with minor polish; 70–84 solid with clear gaps; 55–69 needs meaningful revision; below 55 major gaps.',
      '- dimensions: Clarity (structure and readability), Impact (evidence and outcomes), Role fit' + (payload.jobDescription ? ' (alignment with the JD)' : ' (general professional positioning)') + '.',
      '- quickWins: small, actionable edits grounded in the current content. risks: material gaps or weak presentation—not moral judgment.',
      '- Do not suggest translating the resume.',
      'Return exactly: {"score":85,"summary":"...","dimensions":[{"name":"...","score":80,"comment":"..."}],"quickWins":["..."],"risks":["..."]}'
    ].join('\n');
  }

  function parseJsonContent(text) {
    let raw = String(text || '').trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(raw);
    } catch (e) {
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
      throw new Error('模型返回的 JSON 无法解析');
    }
  }

  async function translate() {
    startGenerating('translate');
    renderGenerating('translate');
    pendingResume = null;
    try {
      const result = await callAI('translate');
      if (!result || !result.resume) throw new Error('AI 没有返回译文 JSON');
      pendingResume = markResumeLanguage(restoreImages(restorePrivateFields(result.resume, currentPrivateMap), currentImageMap), targetLangEl.value);
      renderTranslationReady(pendingResume);
      setIdle('译文已生成');
    } catch (err) {
      renderError(err);
    }
  }

  async function optimize() {
    startGenerating('optimize');
    renderGenerating('optimize');
    latestSuggestions = [];
    try {
      const result = await callAI('optimize');
      latestSuggestions = annotateLanguageSwitchSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      renderSuggestions(latestSuggestions);
      setIdle(latestSuggestions.length ? `收到 ${latestSuggestions.length} 条建议` : '暂无建议');
    } catch (err) {
      renderError(err);
    }
  }

  async function score() {
    startGenerating('score');
    renderGenerating('score');
    try {
      const result = await callAI('score');
      renderScore(result || {});
      setIdle('评分完成');
    } catch (err) {
      renderError(err);
    }
  }

  async function fillResume() {
    if (!rawTextEl || !rawTextEl.value.trim()) {
      renderError({ message: lang() === 'en' ? 'Paste resume text first.' : '请先粘贴简历文本。' });
      return;
    }
    startGenerating('fill');
    renderGenerating('fill');
    pendingResume = null;
    try {
      const result = await callAI('fill');
      if (!result || !result.resume) throw new Error(lang() === 'en' ? 'AI did not return resume JSON.' : 'AI 没有返回简历 JSON');
      pendingResume = markResumeLanguage(
        restoreImages(restorePrivateFields(result.resume, currentPrivateMap), currentImageMap),
        lang() === 'en' ? 'English' : 'Simplified Chinese'
      );
      renderFillReady(pendingResume);
      setIdle(lang() === 'en' ? 'Parsed resume ready' : '简历解析完成');
    } catch (err) {
      renderError(err);
    }
  }

  function startGenerating(task) {
    phase = 'loading';
    activeTask = task;
    clearSuggestionPreview();
    setBusy('');
    panel.classList.add('ai-result-mode');
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => { btn.disabled = true; });
  }

  function finishResult() {
    phase = 'result';
    panel.classList.remove('is-busy');
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => { btn.disabled = false; });
  }

  function backToSetup() {
    phase = 'setup';
    pendingResume = null;
    latestSuggestions = [];
    clearSuggestionPreview();
    resultEl.innerHTML = '';
    panel.classList.remove('ai-result-mode');
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => { btn.disabled = false; });
    setTask(activeTask);
  }

  function renderGenerating(task) {
    const meta = taskText(task || activeTask);
    resultEl.innerHTML = `
      <div class="ai-loading-card" aria-live="polite">
        <div class="ai-loading-orbit" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div>
          <div class="ai-loading-title">${escText(meta.loading || aiText('loadingFallback'))}</div>
          <div class="ai-loading-copy">${escText(aiText('loadingCopy'))}</div>
        </div>
      </div>`;
  }

  function resultNav(title) {
    const wrap = document.createElement('div');
    wrap.className = 'ai-result-nav';
    const label = document.createElement('div');
    label.className = 'ai-result-nav-title';
    label.textContent = title || TASKS[activeTask].title;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-ghost';
    btn.dataset.aiAction = 'back-setup';
    btn.textContent = '返回';
    wrap.appendChild(label);
    wrap.appendChild(btn);
    return wrap;
  }

  function renderTranslationReady(resume) {
    finishResult();
    resultEl.innerHTML = '';
    const count = countTextFields(resume);
    const box = document.createElement('div');
    box.className = 'ai-result-box ai-translation-card';
    box.innerHTML = `
      <div class="ai-result-title">译文已准备好</div>
      <div class="ai-translation-meta">
        <span>${targetLangEl.options[targetLangEl.selectedIndex].textContent}</span>
        <span>${count} 个文本字段</span>
      </div>
      <p class="ai-muted">建议先下载一份译文 JSON 备份。应用后会替换当前简历内容，并同步切换简历板块标题语言。</p>
      <div class="ai-result-actions">
        <button type="button" class="btn btn-primary" data-ai-action="apply-translation">应用译文</button>
        <button type="button" class="btn" data-ai-action="download-translation">下载译文 JSON</button>
        <button type="button" class="btn btn-ghost" data-ai-action="discard-translation">暂不应用</button>
      </div>`;
    resultEl.appendChild(resultNav('翻译结果'));
    resultEl.appendChild(box);
  }

  function renderFillReady(resume) {
    finishResult();
    resultEl.innerHTML = '';
    const count = countTextFields(resume);
    const box = document.createElement('div');
    box.className = 'ai-result-box ai-fill-card';
    box.innerHTML = `
      <div class="ai-result-title">${lang() === 'en' ? 'Parsed resume is ready' : '已解析为简历字段'}</div>
      <div class="ai-translation-meta">
        <span>${count} ${lang() === 'en' ? 'text fields' : '个文本字段'}</span>
      </div>
      <p class="ai-muted">${lang() === 'en' ? 'Applying this result will replace the current resume content.' : '应用后会替换当前简历内容。'}</p>
      <div class="ai-result-actions">
        <button type="button" class="btn btn-primary" data-ai-action="apply-fill">${lang() === 'en' ? 'Apply parsed resume' : '应用填充结果'}</button>
        <button type="button" class="btn" data-ai-action="download-fill">${lang() === 'en' ? 'Download JSON' : '下载 JSON'}</button>
        <button type="button" class="btn btn-ghost" data-ai-action="discard-fill">${lang() === 'en' ? 'Keep current resume' : '保留当前简历'}</button>
      </div>`;
    resultEl.appendChild(resultNav(lang() === 'en' ? 'Smart Fill Result' : '智能填充结果'));
    resultEl.appendChild(box);
  }

  function renderSuggestions(items) {
    finishResult();
    resultEl.innerHTML = '';
    clearSuggestionPreview();
    resultEl.appendChild(resultNav('优化建议'));
    if (!items.length) {
      resultEl.appendChild(emptyBox('这次没有返回建议。可补充 JD 或重新生成一次。'));
      return;
    }
    items.forEach((item) => { if (item) item._status = item._status || 'preview'; });
    const toolbar = document.createElement('div');
    toolbar.className = 'ai-bulk-actions';
    toolbar.innerHTML = `
      <button type="button" class="btn btn-sm btn-primary" data-ai-action="apply-all-suggestions">${lang() === 'en' ? 'Apply all' : '一键应用'}</button>
      <button type="button" class="btn btn-sm btn-ghost" data-ai-action="ignore-all-suggestions">${lang() === 'en' ? 'Ignore all' : '全部忽略'}</button>`;
    resultEl.appendChild(toolbar);
    items.forEach((it, idx) => {
      const box = document.createElement('div');
      box.className = 'ai-suggestion';
      box.dataset.index = String(idx);
      if (it.path) box.dataset.previewPath = it.path;
      box.appendChild(line('ai-sug-meta', `${priorityLabel(it.priority)} · ${it.section || it.path || '简历'}`));
      box.appendChild(line('ai-sug-path', it.path || ''));
      if (it.original) box.appendChild(block('原文', displaySuggestionValue(it.original)));
      if (it.proposal) box.appendChild(block('建议', displaySuggestionValue(it.proposal)));
      if (it.reason) box.appendChild(block('原因', it.reason));
      if (it.languageMismatch) {
        box.appendChild(line('ai-sug-warning', '模型返回了跨语言改写，已保留为参考，但不会一键应用。'));
      }
      if (canApplySuggestion(it)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm';
        btn.dataset.aiAction = 'apply-suggestion';
        btn.dataset.index = String(idx);
        btn.textContent = '应用此项';
        box.appendChild(btn);
      }
      const ignoreBtn = document.createElement('button');
      ignoreBtn.type = 'button';
      ignoreBtn.className = 'btn btn-sm btn-ghost';
      ignoreBtn.dataset.aiAction = 'ignore-suggestion';
      ignoreBtn.dataset.index = String(idx);
      ignoreBtn.textContent = '忽略';
      box.appendChild(ignoreBtn);
      resultEl.appendChild(box);
    });
    renderAllSuggestionPreviews();
  }

  function renderScore(score) {
    finishResult();
    resultEl.innerHTML = '';
    resultEl.appendChild(resultNav('评分结果'));
    const head = document.createElement('div');
    head.className = 'ai-score-head';
    const num = Number(score.score);
    const safeScore = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : null;
    const ring = document.createElement('div');
    ring.className = 'ai-score-ring';
    ring.style.setProperty('--score-pct', `${safeScore == null ? 0 : safeScore}%`);
    ring.innerHTML = `<span>${safeScore == null ? '--' : safeScore}</span><em>综合分</em>`;
    head.appendChild(ring);
    head.appendChild(line('ai-score-summary', score.summary || '暂无总结'));
    resultEl.appendChild(head);

    if (Array.isArray(score.dimensions) && score.dimensions.length) {
      const list = document.createElement('div');
      list.className = 'ai-score-list';
      score.dimensions.forEach((d) => {
        const dimensionScore = Number(d.score);
        const dimensionSafeScore = Number.isFinite(dimensionScore) ? Math.max(0, Math.min(100, Math.round(dimensionScore))) : null;
        const row = document.createElement('div');
        row.className = 'ai-score-row';
        const top = document.createElement('div');
        top.className = 'ai-score-row-top';
        top.appendChild(line('ai-score-name', d.name || '维度'));
        top.appendChild(line('ai-score-value', dimensionSafeScore == null ? '--' : String(dimensionSafeScore)));
        row.appendChild(top);
        const bar = document.createElement('div');
        bar.className = 'ai-score-bar';
        bar.style.setProperty('--score-pct', `${dimensionSafeScore == null ? 0 : dimensionSafeScore}%`);
        bar.appendChild(document.createElement('span'));
        row.appendChild(bar);
        row.appendChild(line('ai-score-comment', d.comment || ''));
        list.appendChild(row);
      });
      resultEl.appendChild(list);
    }

    if (Array.isArray(score.quickWins) && score.quickWins.length) {
      resultEl.appendChild(listBlock('快速改进', score.quickWins));
    }
    if (Array.isArray(score.risks) && score.risks.length) {
      resultEl.appendChild(listBlock('风险点', score.risks));
    }
  }

  function renderError(err) {
    phase = 'result';
    panel.querySelectorAll('[data-ai-task]').forEach((btn) => { btn.disabled = false; });
    setIdle('请求失败');
    resultEl.innerHTML = '';
    resultEl.appendChild(resultNav('生成失败'));
    const box = document.createElement('div');
    box.className = 'ai-error';
    box.textContent = err.message || 'AI 请求失败';
    resultEl.appendChild(box);
  }

  function onResultClick(e) {
    const btn = e.target.closest('[data-ai-action]');
    if (!btn) {
      const card = e.target.closest('.ai-suggestion[data-preview-path]');
      if (card) {
        const item = latestSuggestions[Number(card.dataset.index)];
        scrollPreviewForPath(item && item.path);
        card.classList.add('is-locating');
        setTimeout(() => card.classList.remove('is-locating'), 900);
      }
      return;
    }
    if (!btn) return;
    if (btn.dataset.aiAction === 'back-setup') {
      backToSetup();
      return;
    }
    if (btn.dataset.aiAction === 'apply-translation') {
      if (!pendingResume) return;
      Store.replace(pendingResume, { preserveUiLang: true });
      App.renderAll();
      pendingResume = null;
      backToSetup();
      setIdle('已应用译文');
    }
    if (btn.dataset.aiAction === 'download-translation') {
      if (!pendingResume) return;
      downloadResumeJSON(pendingResume, 'translated_resume.json');
      setIdle('已下载译文 JSON');
    }
    if (btn.dataset.aiAction === 'discard-translation') {
      pendingResume = null;
      backToSetup();
      setIdle('已保留当前简历');
    }
    if (btn.dataset.aiAction === 'apply-fill') {
      if (!pendingResume) return;
      Store.replace(pendingResume, { preserveUiLang: true });
      App.renderAll();
      pendingResume = null;
      backToSetup();
      setIdle(lang() === 'en' ? 'Parsed resume applied' : '已应用填充结果');
    }
    if (btn.dataset.aiAction === 'download-fill') {
      if (!pendingResume) return;
      downloadResumeJSON(pendingResume, 'parsed_resume.json');
      setIdle(lang() === 'en' ? 'JSON downloaded' : '已下载 JSON');
    }
    if (btn.dataset.aiAction === 'discard-fill') {
      pendingResume = null;
      backToSetup();
      setIdle(lang() === 'en' ? 'Current resume kept' : '已保留当前简历');
    }
    if (btn.dataset.aiAction === 'apply-suggestion') {
      const index = Number(btn.dataset.index);
      const applied = applySuggestionAt(index);
      const box = btn.closest('.ai-suggestion');
      if (applied && box) box.remove();
      updateSuggestionEmptyState();
    }
    if (btn.dataset.aiAction === 'ignore-suggestion') {
      ignoreSuggestionAt(Number(btn.dataset.index), btn.closest('.ai-suggestion'));
    }
    if (btn.dataset.aiAction === 'apply-all-suggestions') {
      latestSuggestions.forEach((item) => {
        if (!canApplySuggestion(item)) return;
        item._status = 'applied';
        Store.set(item.path, suggestionApplyValue(item));
      });
      safeRenderAll();
      renderAllSuggestionPreviews();
      resultEl.querySelectorAll('.ai-suggestion').forEach((box) => box.remove());
      updateSuggestionEmptyState();
      setIdle(lang() === 'en' ? 'All applicable suggestions applied' : '已应用全部可用建议');
    }
    if (btn.dataset.aiAction === 'ignore-all-suggestions') {
      latestSuggestions.forEach((item) => {
        if (item) item._status = 'ignored';
      });
      clearSuggestionPreview();
      resultEl.querySelectorAll('.ai-suggestion').forEach((box) => box.remove());
      updateSuggestionEmptyState();
      setIdle(lang() === 'en' ? 'All suggestions ignored' : '已忽略全部建议');
    }
  }

  function applySuggestionAt(index, options) {
    const item = latestSuggestions[Number(index)];
    if (!canApplySuggestion(item)) return false;
    try {
      item._status = 'applied';
      Store.set(item.path, suggestionApplyValue(item));
      safeRenderAll();
      renderAllSuggestionPreviews(index);
      if (!options || !options.silent) setIdle(lang() === 'en' ? 'Suggestion applied' : '已应用建议');
      return true;
    } catch (err) {
      item._status = 'preview';
      console.warn('Failed to apply AI suggestion:', err);
      setIdle(lang() === 'en' ? 'Failed to apply suggestion' : '应用建议失败');
      renderAllSuggestionPreviews(index);
      return false;
    }
  }

  function ignoreSuggestionAt(index, box) {
    const item = latestSuggestions[Number(index)];
    if (item) item._status = 'ignored';
    clearSuggestionPreview(null, index);
    if (box) box.remove();
    updateSuggestionEmptyState();
    setIdle(lang() === 'en' ? 'Suggestion ignored' : '已忽略建议');
  }

  function safeRenderAll() {
    if (window.Editor && typeof Editor.renderAll === 'function') Editor.renderAll();
    if (window.App && typeof App.renderPreview === 'function') App.renderPreview();
  }

  function updateSuggestionEmptyState() {
    if (resultEl.querySelector('.ai-suggestion')) return;
    resultEl.querySelectorAll('.ai-bulk-actions').forEach((node) => node.remove());
    if (!resultEl.querySelector('[data-ai-suggestions-done]')) {
      const done = emptyBox(lang() === 'en' ? 'All suggestions have been handled.' : '所有建议已处理。');
      done.dataset.aiSuggestionsDone = '1';
      resultEl.appendChild(done);
    }
  }

  function canApplySuggestion(item) {
    return !!(item && isSafePath(item.path) && item.proposal != null && !item.languageMismatch);
  }

  function suggestionApplyValue(item) {
    return parseStructuredSuggestionValue(item && item.proposal);
  }

  function parseStructuredSuggestionValue(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed || !/^[\[{]/.test(trimmed)) return value;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return value;
    }
  }

  function displaySuggestionValue(value) {
    const parsed = parseStructuredSuggestionValue(value);
    if (Array.isArray(parsed)) return parsed.map(formatSuggestionRecord).filter(Boolean).join('\n');
    if (parsed && typeof parsed === 'object') return formatSuggestionRecord(parsed);
    return parsed == null ? '' : String(parsed);
  }

  function formatSuggestionRecord(record) {
    if (record == null) return '';
    if (typeof record !== 'object') return String(record);
    const orderedKeys = ['name', 'title', 'company', 'issuer', 'role', 'date', 'period', 'description'];
    const used = new Set();
    const parts = [];
    orderedKeys.forEach((key) => {
      if (record[key] == null || record[key] === '') return;
      used.add(key);
      parts.push(String(record[key]));
    });
    Object.keys(record).forEach((key) => {
      if (used.has(key) || record[key] == null || record[key] === '') return;
      const val = Array.isArray(record[key]) ? record[key].join(' / ') : record[key];
      parts.push(String(val));
    });
    return parts.join(' · ');
  }

  function isSafePath(path) {
    const parts = String(path || '').split('.');
    const allowed = ['basics', 'highlights', 'links', 'experience', 'education', 'projects', 'skills', 'languages', 'awards', 'certificates', 'publications', 'activities', 'socialWork', 'notes'];
    if (!allowed.includes(parts[0])) return false;
    return parts.every((p) => p && !['__proto__', 'prototype', 'constructor'].includes(p));
  }

  function scrollPreviewForPath(path) {
    if (window.App && typeof App.scrollPreviewToPath === 'function') {
      App.scrollPreviewToPath(path);
      return;
    }
    const pageScroll = document.getElementById('pageScroll');
    const resume = document.getElementById('resume');
    if (!pageScroll || !resume) return;
    const root = String(path || '').split('.')[0];
    const key = (root === 'basics' || root === 'links') ? 'top' : root;
    const target = key === 'top' ? resume : resume.querySelector(`[data-section="${key.replace(/"/g, '\\"')}"]`);
    if (!target) return;
    const top = target === resume ? 0 : pageScroll.scrollTop +
      (target.getBoundingClientRect().top - pageScroll.getBoundingClientRect().top) - 32;
    pageScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    resume.querySelectorAll('.sec.is-preview-target').forEach((el) => el.classList.remove('is-preview-target'));
    if (target !== resume && target.classList) {
      target.classList.add('is-preview-target');
      setTimeout(() => target.classList.remove('is-preview-target'), 1200);
    }
  }

  function renderAllSuggestionPreviews(scrollIndex) {
    clearSuggestionPreview();
    latestSuggestions.forEach((item, index) => {
      if (!item || item._status === 'ignored' || item._status === 'applied') return;
      if (!item.path || item.proposal == null || item.languageMismatch) return;
      showSuggestionPreview(item, 'preview', { index });
    });
    if (scrollIndex != null) {
      const item = latestSuggestions[Number(scrollIndex)];
      if (item) scrollPreviewForPath(item.path);
    }
  }

  function showSuggestionPreview(item, mode, options) {
    if (!item || !item.path) return;
    const target = previewTargetForPath(item.path);
    if (!target) return;
    const diff = document.createElement('div');
    diff.className = 'ai-preview-diff is-preview';
    if (options && options.index != null) diff.dataset.aiSuggestionIndex = String(options.index);
    const title = mode === 'applied'
      ? (lang() === 'en' ? 'Applied change' : '已应用修改')
      : (lang() === 'en' ? 'AI suggested change' : 'AI 建议修改');
    diff.innerHTML = `
      <div class="ai-preview-diff-title">${escText(title)}</div>
      ${item.original ? `<div class="ai-preview-del">${escText(displaySuggestionValue(item.original))}</div>` : ''}
      ${item.proposal != null ? `<div class="ai-preview-add">${escText(displaySuggestionValue(item.proposal))}</div>` : ''}`;
    const body = target.querySelector('.sec-body') || target.querySelector('.section-content') || target;
    body.insertBefore(diff, body.firstChild || null);
  }

  function clearSuggestionPreview(path, index) {
    const root = document.getElementById('resume');
    if (!root) return;
    root.querySelectorAll('.ai-preview-diff').forEach((node) => {
      if (index != null) {
        if (node.dataset.aiSuggestionIndex === String(index)) node.remove();
        return;
      }
      if (!path || node.closest(`[data-section="${sectionKeyForPath(path)}"]`)) node.remove();
    });
  }

  function previewTargetForPath(path) {
    const resume = document.getElementById('resume');
    if (!resume) return null;
    const key = sectionKeyForPath(path);
    return key === 'top' ? resume : resume.querySelector(`[data-section="${key.replace(/"/g, '\\"')}"]`);
  }

  function sectionKeyForPath(path) {
    const root = String(path || '').split('.')[0];
    return (root === 'basics' || root === 'links') ? 'top' : (root || 'top');
  }

  function annotateLanguageSwitchSuggestions(items) {
    return items.map((item) => {
      if (!item || !item.original || !item.proposal) return item;
      const original = String(item.original);
      const proposal = String(item.proposal);
      if (isMostlyEnglish(original) && isMostlyCjk(proposal)) {
        return Object.assign({}, item, { languageMismatch: true });
      }
      return item;
    });
  }

  function hasCjk(text) {
    return /[\u3400-\u9fff]/.test(String(text || ''));
  }

  function isMostlyEnglish(text) {
    const value = String(text || '');
    const latin = (value.match(/[A-Za-z]/g) || []).length;
    const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
    return latin >= 12 && latin > cjk * 3;
  }

  function isMostlyCjk(text) {
    const value = String(text || '');
    const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
    const latin = (value.match(/[A-Za-z]/g) || []).length;
    return cjk >= 8 && cjk > latin;
  }

  function stripImages(data) {
    const copy = JSON.parse(JSON.stringify(data));
    const images = {};
    if (copy.basics && copy.basics.avatar) {
      images['basics.avatar'] = copy.basics.avatar;
      copy.basics.avatar = '__IMAGE_basics_avatar__';
    }
    if (Array.isArray(copy.projects)) {
      copy.projects.forEach((project, index) => {
        if (project && project.image) {
          const path = `projects.${index}.image`;
          images[path] = project.image;
          project.image = `__IMAGE_projects_${index}_image__`;
        }
      });
    }
    return { data: copy, images };
  }

  function stripPrivateFields(data) {
    const copy = JSON.parse(JSON.stringify(data || {}));
    const privateFields = {};
    const basicsKeys = ['name', 'email', 'phone', 'location', 'website', 'avatar'];
    if (copy.basics && typeof copy.basics === 'object') {
      basicsKeys.forEach((key) => {
        if (copy.basics[key]) {
          privateFields[`basics.${key}`] = copy.basics[key];
          copy.basics[key] = '';
        }
      });
    }
    if (Array.isArray(copy.links) && copy.links.length) {
      privateFields.links = copy.links;
      copy.links = [];
    }
    return { data: copy, privateFields };
  }

  function restorePrivateFields(data, privateFields) {
    const copy = JSON.parse(JSON.stringify(data || {}));
    Object.keys(privateFields || {}).forEach((path) => {
      safeSet(copy, path, privateFields[path]);
    });
    return copy;
  }

  function restoreImages(data, images) {
    const copy = JSON.parse(JSON.stringify(data));
    Object.keys(images || {}).forEach((path) => {
      safeSet(copy, path, images[path]);
    });
    return copy;
  }

  function markResumeLanguage(data, targetLang) {
    const copy = JSON.parse(JSON.stringify(data || {}));
    copy.meta = copy.meta && typeof copy.meta === 'object' ? copy.meta : {};
    copy.meta.lang = targetLang === 'English' ? 'en' : 'zh';
    return copy;
  }

  function priorityLabel(priority) {
    const value = String(priority || '').toLowerCase();
    if (value === 'high') return '高优先级';
    if (value === 'low') return '低优先级';
    return '中优先级';
  }

  function safeSet(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (cur[key] == null) cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function countTextFields(value) {
    let count = 0;
    walk(value);
    return count;

    function walk(v) {
      if (typeof v === 'string' && v && !v.startsWith('__IMAGE_')) count += 1;
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k]));
    }
  }

  function downloadResumeJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function line(cls, text) {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function escText(text) {
    return (text == null ? '' : String(text)).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function block(title, text) {
    const el = document.createElement('div');
    el.className = 'ai-text-block';
    el.appendChild(line('ai-text-title', title));
    el.appendChild(line('ai-text-body', text));
    return el;
  }

  function listBlock(title, items) {
    const box = document.createElement('div');
    box.className = 'ai-list-block';
    box.appendChild(line('ai-text-title', title));
    const ul = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function emptyBox(text) {
    const box = document.createElement('div');
    box.className = 'ai-result-box';
    box.textContent = text;
    return box;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AI.init);
window.AI = AI;
