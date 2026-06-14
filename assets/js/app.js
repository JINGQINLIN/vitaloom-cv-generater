const App = (function () {
  let resumeEl, pageScroll, tplSelect, accentInput, fontSelect, densitySelect, uiLangSelect, zoomLabel, pagesEl, themeToggle, workspaceEl, toggleEditorBtn, settingsModal;
  let profileModal = null;
  let zoomMode = 'fit';
  let currentScale = 1;
  let currentFileHandle = null;
  let currentFileName = '';
  let editorHidden = false;
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const THEME_KEY = 'cv_generator_ui_theme';
  const UI_TEXT = {
    zh: {
      title: 'VitaLoom',
      template: '模板',
      color: '配色',
      font: '字体',
      density: '间距',
      language: '语言',
      settings: '设置',
      settingsTitle: '显示设置',
      close: '关闭',
      serif: '衬线',
      sans: '无衬线',
      relaxed: '舒朗',
      normal: '适中',
      compact: '紧凑',
      dark: '深色',
      light: '浅色',
      import: '导入',
      save: '保存',
      profile: '个人主页',
      toggleEditorHide: '收起填写栏',
      toggleEditorShow: '展开填写栏',
      editor: '编辑区',
      editorSub: '点击板块可定位预览',
      expandAll: '全部展开',
      collapseAll: '全部收起',
      preview: '实时预览',
      fit: '适应',
      onePage: '约 1 页',
      pages: '约 {n} 页 · 超出一页',
      profileExport: '个人主页导出',
      profileTemplate: '主页模板',
      profileElements: '主页元素',
      selectAll: '全选',
      coreContent: '核心内容',
      cancel: '取消',
      exportHtml: '导出 HTML',
      previewEffect: '预览效果',
      previewAction: '预览'
    },
    en: {
      title: 'VitaLoom',
      template: 'Template',
      color: 'Color',
      font: 'Font',
      density: 'Spacing',
      language: 'Language',
      settings: 'Settings',
      settingsTitle: 'Display Settings',
      close: 'Close',
      serif: 'Serif',
      sans: 'Sans',
      relaxed: 'Relaxed',
      normal: 'Normal',
      compact: 'Compact',
      dark: 'Dark',
      light: 'Light',
      import: 'Import',
      save: 'Save',
      profile: 'Profile',
      toggleEditorHide: 'Hide editor',
      toggleEditorShow: 'Show editor',
      editor: 'Editor',
      editorSub: 'Click a section to sync preview',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      preview: 'Live preview',
      fit: 'Fit',
      onePage: 'About 1 page',
      pages: 'About {n} pages · over one page',
      profileExport: 'Profile Export',
      profileTemplate: 'Profile template',
      profileElements: 'Profile elements',
      selectAll: 'Select all',
      coreContent: 'Core content',
      cancel: 'Cancel',
      exportHtml: 'Export HTML',
      previewEffect: 'Preview',
      previewAction: 'Preview'
    }
  };
  const PROFILE_SECTIONS = [
    { key: 'about', label: '简介', en: 'About', hint: '个人简介、核心优势、技能与语言' },
    { key: 'publications', label: '代表成果', en: 'Selected Work', source: 'publications' },
    { key: 'projects', label: '项目', en: 'Projects', source: 'projects' },
    { key: 'experience', label: '经历', en: 'Experience', source: 'experience' },
    { key: 'education', label: '教育', en: 'Education', source: 'education' },
    { key: 'awards', label: '荣誉与认证', en: 'Honors & Credentials', source: 'awards', extra: 'certificates' },
    { key: 'community', label: '实践与公共参与', en: 'Community & Activities', source: 'socialWork', extra: 'activities' },
    { key: 'notes', label: '备注', en: 'Notes' }
  ];
  const PROFILE_TEMPLATES = {
    academic: '学术主页',
    noir: '黑曜档案',
    atlas: '研究图谱',
    terminal: '终端档案'
  };
  const PROFILE_TEMPLATE_EN = {
    academic: 'Academic Home',
    noir: 'Noir Profile',
    atlas: 'Research Atlas',
    terminal: 'Terminal Profile'
  };
  const PROFILE_PARTS = [
    { key: 'avatar', label: '头像', en: 'Avatar' },
    { key: 'title', label: '头衔', en: 'Title' },
    { key: 'location', label: '地点', en: 'Location' },
    { key: 'contacts', label: '联系方式', en: 'Contact' },
    { key: 'summary', label: '个人简介', en: 'Summary' },
    { key: 'highlights', label: '核心优势', en: 'Highlights' },
    { key: 'skills', label: '技能', en: 'Skills' },
    { key: 'languages', label: '语言', en: 'Languages' },
    { key: 'dates', label: '条目时间', en: 'Dates' },
    { key: 'descriptions', label: '条目描述', en: 'Descriptions' },
    { key: 'links', label: '条目链接', en: 'Links' }
  ];

  function renderPreview() {
    const d = Store.data;
    const tpl = TEMPLATES[d.meta.template] || TEMPLATES.editorial;
    resumeEl.className = 'resume tpl-' + d.meta.template +
      ' font-' + (d.meta.font || 'serif') +
      ' density-' + (d.meta.density || 'normal');
    resumeEl.style.setProperty('--accent', d.meta.accent || '#3d4a5c');
    resumeEl.innerHTML = tpl.render(d);
    updatePageInfo();
  }

  function updatePageInfo() {
    if (!pagesEl) return;

    const trueH = resumeEl.offsetHeight;
    const pages = Math.max(1, Math.ceil((trueH - 4) / PAGE_H));
    if (pages <= 1) {
      pagesEl.textContent = text('onePage');
      pagesEl.classList.remove('over');
    } else {
      pagesEl.textContent = text('pages').replace('{n}', pages);
      pagesEl.classList.add('over');
    }
  }

  function syncControls() {
    tplSelect.value = Store.data.meta.template;
    accentInput.value = Store.data.meta.accent || '#3d4a5c';
    fontSelect.value = Store.data.meta.font || 'serif';
    densitySelect.value = Store.data.meta.density || 'normal';
    if (uiLangSelect) uiLangSelect.value = Store.data.meta.uiLang || 'en';
    updateActiveSwatch();
    applyUiLanguage();
  }

  function renderTemplateOptions() {
    if (!tplSelect) return;
    const selected = tplSelect.value || (Store.data && Store.data.meta && Store.data.meta.template) || 'editorial';
    tplSelect.innerHTML = Object.entries(TEMPLATES)
      .map(([id, t]) => `<option value="${id}">${currentLang() === 'en' ? (t.en || t.name) : t.name}</option>`)
      .join('');
    tplSelect.value = selected;
  }

  function renderSwatches() {
    const box = document.getElementById('accentSwatches');
    box.innerHTML = PALETTE.map((p) =>
      `<button type="button" class="swatch" data-color="${p.color}" title="${p.name}" style="background:${p.color}"></button>`
    ).join('');
    box.addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch');
      if (sw) setAccent(sw.dataset.color);
    });
  }

  function setAccent(color) {
    Store.set('meta.accent', color);
    accentInput.value = color;
    updateActiveSwatch();
    renderPreview();
  }

  function updateActiveSwatch() {
    const cur = (Store.data.meta.accent || '').toLowerCase();
    document.querySelectorAll('#accentSwatches .swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === cur);
    });
  }

  function rerenderAll() {
    syncControls();
    Editor.renderAll();
    renderPreview();
  }

  function scrollPreviewToSection(key) {
    if (!pageScroll || !resumeEl) return;
    let target = null;
    if (!key || key === 'top') {
      target = resumeEl;
    } else {
      target = resumeEl.querySelector(`[data-section="${String(key).replace(/"/g, '\\"')}"]`);
    }
    if (!target) return;
    const top = target === resumeEl ? 0 : pageScroll.scrollTop +
      (target.getBoundingClientRect().top - pageScroll.getBoundingClientRect().top) - 32;
    pageScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    resumeEl.querySelectorAll('.sec.is-preview-target').forEach((el) => el.classList.remove('is-preview-target'));
    if (target !== resumeEl && target.classList) {
      target.classList.add('is-preview-target');
      setTimeout(() => target.classList.remove('is-preview-target'), 1200);
    }
  }

  function sectionForPath(path) {
    const root = String(path || '').split('.')[0];
    if (root === 'basics' || root === 'links') return 'top';
    return root || 'top';
  }

  function scrollPreviewToPath(path) {
    scrollPreviewToSection(sectionForPath(path));
  }

  function applyZoom() {
    let scale;
    if (zoomMode === 'fit') {
      const avail = pageScroll.clientWidth - 48;
      scale = Math.min(1, avail / PAGE_W);
      zoomLabel.textContent = text('fit');
    } else {
      scale = zoomMode;
      zoomLabel.textContent = Math.round(scale * 100) + '%';
    }
    currentScale = scale;
    resumeEl.style.zoom = scale;
    updatePageInfo();
  }

  function setZoom(delta) {
    let cur = zoomMode === 'fit'
      ? Math.min(1, (pageScroll.clientWidth - 48) / PAGE_W)
      : zoomMode;
    cur = Math.max(0.4, Math.min(1.6, Math.round((cur + delta) * 100) / 100));
    zoomMode = cur;
    applyZoom();
  }

  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    if (themeToggle) themeToggle.textContent = next === 'dark' ? text('light') : text('dark');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      console.warn('保存主题失败：', e);
    }
  }

  function initTheme() {
    let saved = 'light';
    try {
      saved = localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      saved = 'light';
    }
    applyTheme(saved === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }

  function currentLang() {
    return (Store.data && Store.data.meta && Store.data.meta.uiLang === 'en') ? 'en' : 'zh';
  }

  function text(key) {
    const pack = UI_TEXT[currentLang()] || UI_TEXT.zh;
    return pack[key] || UI_TEXT.zh[key] || key;
  }

  function setLabelFor(control, key) {
    const wrap = control && control.closest('.field-inline');
    const label = wrap && wrap.querySelector('.field-lab');
    if (label) label.textContent = text(key);
  }

  function applyUiLanguage() {
    const lang = currentLang();
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.title = text('title');
    renderTemplateOptions();
    setLabelFor(tplSelect, 'template');
    setLabelFor(accentInput, 'color');
    setLabelFor(fontSelect, 'font');
    setLabelFor(densitySelect, 'density');
    setLabelFor(uiLangSelect, 'language');
    if (fontSelect) {
      const opts = fontSelect.options;
      if (opts[0]) opts[0].textContent = text('serif');
      if (opts[1]) opts[1].textContent = text('sans');
    }
    if (densitySelect) {
      const opts = densitySelect.options;
      if (opts[0]) opts[0].textContent = text('relaxed');
      if (opts[1]) opts[1].textContent = text('normal');
      if (opts[2]) opts[2].textContent = text('compact');
    }
    if (themeToggle) themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? text('light') : text('dark');
    const byId = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    byId('btnImport', text('import'));
    byId('btnSave', text('save'));
    byId('btnSettings', text('settings'));
    byId('btnProfile', text('profile'));
    byId('btnPrint', 'PDF');
    byId('btnAI', 'AI');
    byId('btnExpandAll', text('expandAll'));
    byId('btnCollapseAll', text('collapseAll'));
    byId('btnToggleEditor', editorHidden ? text('toggleEditorShow') : text('toggleEditorHide'));
    const editorTitle = document.querySelector('.editor-tools-title');
    if (editorTitle) editorTitle.textContent = text('editor');
    const editorSub = document.querySelector('.editor-tools-sub');
    if (editorSub) editorSub.textContent = text('editorSub');
    const pvLabel = document.querySelector('.pv-label');
    if (pvLabel) pvLabel.textContent = text('preview');
    const zoomFit = document.getElementById('zoomFit');
    if (zoomFit) zoomFit.textContent = text('fit');
    if (zoomLabel && zoomMode === 'fit') zoomLabel.textContent = text('fit');
    const settingsTitle = document.getElementById('settingsTitle');
    if (settingsTitle) settingsTitle.textContent = text('settingsTitle');
    const settingsClose = document.querySelector('[data-settings-close]');
    if (settingsClose) settingsClose.title = text('close');
    updatePageInfo();
    document.dispatchEvent(new CustomEvent('cv:langchange', { detail: { lang } }));
  }

  function ensureSettingsModal() {
    if (settingsModal) return settingsModal;
    const controls = document.querySelector('.toolbar-controls');
    settingsModal = document.createElement('div');
    settingsModal.id = 'settingsModal';
    settingsModal.className = 'settings-modal';
    settingsModal.hidden = true;
    settingsModal.innerHTML = `
      <div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="settings-head">
          <div>
            <div class="profile-dialog-kicker">Settings</div>
            <h2 id="settingsTitle">${text('settingsTitle')}</h2>
          </div>
          <button type="button" class="icon-btn" data-settings-close title="${text('close')}">×</button>
        </div>
        <div class="settings-body"></div>
      </div>`;
    document.body.appendChild(settingsModal);
    settingsModal.querySelector('.settings-body').appendChild(controls);
    controls.classList.add('in-settings');
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal || e.target.closest('[data-settings-close]')) closeSettings();
    });
    return settingsModal;
  }

  function openSettings() {
    ensureSettingsModal();
    settingsModal.hidden = false;
    applyUiLanguage();
  }

  function closeSettings() {
    if (settingsModal) settingsModal.hidden = true;
  }

  function defaultJSONName() {
    const name = (Store.data.basics.name || 'resume').replace(/\s+/g, '_');
    return `${name}_简历.json`;
  }

  function downloadJSON(filename) {
    const blob = new Blob([Store.toJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultJSONName();
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    downloadJSON(currentFileName || defaultJSONName());
  }

  function itemTitle(item) {
    if (!item) return '未命名条目';
    return item.name || item.company || item.school || item.title || item.position || item.role || '未命名条目';
  }

  function sectionItems(section) {
    const primary = section.source ? (Store.data[section.source] || []) : [];
    const extra = section.extra ? (Store.data[section.extra] || []) : [];
    return primary.concat(extra).map((item, index) => ({
      item,
      index,
      label: itemTitle(item),
      meta: [item.date, profileDate(item.start, item.end), item.issuer, item.role, item.position].filter(Boolean)[0] || ''
    }));
  }

  function ensureProfileModal() {
    if (profileModal) return profileModal;
    profileModal = document.createElement('div');
    profileModal.className = 'profile-modal';
    profileModal.innerHTML = `
      <div class="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profileDialogTitle">
        <div class="profile-dialog-head">
          <div>
            <div class="profile-dialog-kicker">HTML Profile</div>
            <h2 id="profileDialogTitle">${text('profileExport')}</h2>
          </div>
          <button type="button" class="icon-btn" data-profile-action="close" title="关闭">×</button>
        </div>
        <div class="profile-dialog-body">
          <label class="fld">
            <span class="fld-lab">${text('profileTemplate')}</span>
            <select class="inp" id="profileTemplate"></select>
          </label>
          <div class="profile-part-card">
            <div class="profile-part-title">${text('profileElements')}</div>
            <div class="profile-part-grid" id="profilePartList"></div>
          </div>
          <div class="profile-panel-tools">
            <button type="button" class="btn btn-sm" data-profile-action="select-all">${text('selectAll')}</button>
            <button type="button" class="btn btn-sm btn-ghost" data-profile-action="select-core">${text('coreContent')}</button>
          </div>
          <div class="profile-section-list" id="profileSectionList"></div>
          <div class="profile-preview-wrap" id="profilePreviewWrap" hidden>
            <div class="profile-preview-title">${text('previewEffect')}</div>
            <iframe id="profilePreviewFrame" title="${text('previewEffect')}"></iframe>
          </div>
        </div>
        <div class="profile-dialog-foot">
          <button type="button" class="btn" data-profile-action="close">${text('cancel')}</button>
          <button type="button" class="btn" data-profile-action="preview">${text('previewAction')}</button>
          <button type="button" class="btn btn-primary" data-profile-action="export">${text('exportHtml')}</button>
        </div>
      </div>`;
    document.body.appendChild(profileModal);
    profileModal.querySelector('#profileTemplate').innerHTML = Object.entries(PROFILE_TEMPLATES)
      .map(([value, label]) => `<option value="${value}">${currentLang() === 'en' ? PROFILE_TEMPLATE_EN[value] : label}</option>`).join('');
    profileModal.querySelector('#profilePartList').innerHTML = profilePartsForCurrentData()
      .map((part) => `<label class="profile-part-row">
        <input type="checkbox" data-profile-part="${part.key}" checked />
        <span>${currentLang() === 'en' && part.en ? part.en : part.label}</span>
      </label>`).join('');
    profileModal.addEventListener('click', onProfileModalClick);
    profileModal.addEventListener('change', onProfileModalChange);
    return profileModal;
  }

  function profilePartsForCurrentData() {
    const hasAvatar = !!(Store.data && Store.data.basics && Store.data.basics.avatar);
    return PROFILE_PARTS.filter((part) => part.key !== 'avatar' || hasAvatar);
  }

  function renderProfileOptions() {
    const list = profileModal.querySelector('#profileSectionList');
    list.innerHTML = PROFILE_SECTIONS.map((section) => {
      const items = sectionItems(section);
      const itemHTML = items.length ? `<div class="profile-item-list">
        ${items.map((row) => `<label class="profile-item-row">
          <input type="checkbox" data-profile-item="${section.key}" data-index="${row.index}" checked />
          <span>${htmlEsc(row.label)}</span>
        </label>`).join('')}
      </div>` : '';
      return `<div class="profile-option" data-profile-section-card="${section.key}">
        <label class="profile-section-row">
          <input type="checkbox" data-profile-section="${section.key}" checked />
          <span>
            <strong>${htmlEsc(currentLang() === 'en' && section.en ? section.en : section.label)}</strong>
          </span>
        </label>
        ${itemHTML}
      </div>`;
    }).join('');
  }

  function openProfileModal() {
    if (profileModal) {
      profileModal.remove();
      profileModal = null;
    }
    ensureProfileModal();
    renderProfileOptions();
    const preview = profileModal.querySelector('#profilePreviewWrap');
    const frame = profileModal.querySelector('#profilePreviewFrame');
    if (preview) preview.hidden = true;
    if (frame) frame.removeAttribute('srcdoc');
    profileModal.classList.add('show');
  }

  function closeProfileModal() {
    if (profileModal) profileModal.classList.remove('show');
  }

  function onProfileModalChange(e) {
    const section = e.target.closest('[data-profile-section]');
    if (!section) return;
    const card = e.target.closest('.profile-option');
    card.querySelectorAll('[data-profile-item]').forEach((item) => { item.checked = section.checked; });
  }

  function onProfileModalClick(e) {
    const btn = e.target.closest('[data-profile-action]');
    if (!btn) return;
    const action = btn.dataset.profileAction;
    if (action === 'close') closeProfileModal();
    if (action === 'select-all') setProfileChecks(true);
    if (action === 'select-core') setCoreProfileChecks();
    if (action === 'preview') previewProfileHTML(readProfileOptions());
    if (action === 'export') {
      exportProfileHTML(readProfileOptions());
      closeProfileModal();
    }
  }

  function setProfileChecks(checked) {
    profileModal.querySelectorAll('[data-profile-section], [data-profile-item]').forEach((input) => {
      input.checked = checked;
    });
    profileModal.querySelectorAll('[data-profile-part]').forEach((input) => {
      input.checked = checked;
    });
  }

  function setCoreProfileChecks() {
    const core = new Set(['about', 'publications', 'projects', 'experience', 'education']);
    profileModal.querySelectorAll('[data-profile-section]').forEach((input) => {
      input.checked = core.has(input.dataset.profileSection);
    });
    profileModal.querySelectorAll('[data-profile-item]').forEach((input) => {
      input.checked = core.has(input.dataset.profileItem);
    });
    profileModal.querySelectorAll('[data-profile-part]').forEach((input) => {
      input.checked = !['avatar'].includes(input.dataset.profilePart);
    });
  }

  function readProfileOptions() {
    const selectedSections = {};
    const selectedItems = {};
    const selectedParts = {};
    profileModal.querySelectorAll('[data-profile-section]').forEach((input) => {
      selectedSections[input.dataset.profileSection] = input.checked;
    });
    profileModal.querySelectorAll('[data-profile-part]').forEach((input) => {
      selectedParts[input.dataset.profilePart] = input.checked;
    });
    profileModal.querySelectorAll('[data-profile-item]').forEach((input) => {
      const key = input.dataset.profileItem;
      if (!selectedItems[key]) selectedItems[key] = [];
      if (input.checked) selectedItems[key].push(Number(input.dataset.index));
    });
    return {
      template: profileModal.querySelector('#profileTemplate').value || 'academic',
      selectedSections,
      selectedItems,
      selectedParts
    };
  }

  function defaultProfileName() {
    const name = (Store.data.basics.name || 'profile').replace(/\s+/g, '_');
    return `${name}_profile.html`;
  }

  function exportProfileHTML(options) {
    const html = buildProfileHTML(Store.data, options || {});
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultProfileName();
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出个人主页 HTML');
  }

  function previewProfileHTML(options) {
    const html = buildProfileHTML(Store.data, options || {});
    const preview = profileModal.querySelector('#profilePreviewWrap');
    const frame = profileModal.querySelector('#profilePreviewFrame');
    if (!preview || !frame) return;
    frame.srcdoc = html;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('已生成个人主页预览');
  }

  function htmlEsc(value) {
    return (value == null ? '' : String(value)).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function profileLines(text) {
    return String(text || '').split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-•·*]\s*/, ''))
      .filter(Boolean);
  }

  function profileDate(start, end) {
    return [start, end].filter(Boolean).join(' - ');
  }

  function profileUrl(url) {
    url = String(url || '').trim();
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }

  function profileTextList(items, cls) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return '';
    return `<ul class="${cls || 'profile-list'}">${list.map((item) => `<li>${htmlEsc(item)}</li>`).join('')}</ul>`;
  }

  function profileSection(title, kicker, body, id) {
    if (!body) return '';
    return `<section class="profile-section" id="${htmlEsc(id || title)}">
      <div class="section-label">
        <span>${htmlEsc(kicker || '')}</span>
        <h2>${htmlEsc(title)}</h2>
      </div>
      <div class="section-content">${body}</div>
    </section>`;
  }

  function profileEntry(item, options, parts) {
    options = options || {};
    parts = parts || {};
    const title = item.name || item.company || item.school || item.title || '';
    const sub = options.sub || item.position || item.role || item.degree || item.issuer || '';
    const meta = parts.dates !== false ? [profileDate(item.start, item.end) || item.date, item.location].filter(Boolean).join(' · ') : '';
    const link = parts.links !== false && item.link ? `<a href="${htmlEsc(profileUrl(item.link))}" target="_blank" rel="noopener">查看链接</a>` : '';
    const desc = parts.descriptions !== false ? profileTextList(profileLines(item.description), 'profile-list compact-list') : '';
    if (!title && !sub && !desc) return '';
    return `<article class="profile-entry">
      <div class="entry-main">
        <h3>${htmlEsc(title)}</h3>
        ${sub ? `<p>${htmlEsc(sub)}</p>` : ''}
        ${desc}
      </div>
      <div class="entry-meta">
        ${meta ? `<span>${htmlEsc(meta)}</span>` : ''}
        ${link}
      </div>
    </article>`;
  }

  function buildProfileHTML(data, options) {
    options = options || {};
    const d = JSON.parse(JSON.stringify(data || {}));
    const b = d.basics || {};
    const accent = d.meta && d.meta.accent ? d.meta.accent : '#3d4a5c';
    const name = b.name || '个人主页';
    const template = PROFILE_TEMPLATES[options.template] ? options.template : 'academic';
    const selectedSections = options.selectedSections || {};
    const selectedItems = options.selectedItems || {};
    const selectedParts = options.selectedParts || {};
    const hasPartOptions = Object.keys(selectedParts).length > 0;
    const includePart = (key) => !hasPartOptions || selectedParts[key] !== false;
    const hasPortrait = includePart('avatar') && !!b.avatar;
    const parts = {
      dates: includePart('dates'),
      descriptions: includePart('descriptions'),
      links: includePart('links')
    };
    const hasSectionOptions = Object.keys(selectedSections).length > 0;
    const includeSection = (key) => !hasSectionOptions || selectedSections[key] !== false;
    const pickItems = (key, items) => {
      const list = items || [];
      const selected = selectedItems[key];
      if (!Array.isArray(selected)) return list;
      const allowed = new Set(selected);
      return list.filter((_, index) => allowed.has(index));
    };
    const links = includePart('contacts') ? [
      b.email ? { label: b.email, href: 'mailto:' + b.email } : null,
      b.website ? { label: b.website, href: profileUrl(b.website) } : null,
      ...(d.links || []).map((l) => l && (l.label || l.url) ? { label: l.label || l.url, href: profileUrl(l.url) } : null)
    ].filter(Boolean) : [];
    const communityRaw = [...(d.socialWork || []), ...(d.activities || [])];
    const awardsRaw = [...(d.awards || []), ...(d.certificates || [])];
    const selectedPublications = pickItems('publications', d.publications || []);
    const selectedProjects = pickItems('projects', d.projects || []);
    const selectedExperience = pickItems('experience', d.experience || []);
    const selectedEducation = pickItems('education', d.education || []);
    const selectedCommunity = pickItems('community', communityRaw);
    const selectedAwards = pickItems('awards', awardsRaw);
    const nav = [
      includeSection('about') && b.summary ? ['简介', 'about'] : null,
      includeSection('publications') && selectedPublications.length ? ['成果', 'publications'] : null,
      includeSection('projects') && selectedProjects.length ? ['项目', 'projects'] : null,
      includeSection('experience') && selectedExperience.length ? ['经历', 'experience'] : null,
      includeSection('education') && selectedEducation.length ? ['教育', 'education'] : null,
      includeSection('community') && selectedCommunity.length ? ['实践', 'community'] : null
    ].filter(Boolean);
    const highlightBody = includeSection('about') && includePart('highlights') && (d.highlights || []).length
      ? `<div class="profile-highlights">${d.highlights.map((it) => `
        <div class="highlight-card">
          <strong>${htmlEsc(it.title)}</strong>
          ${it.detail ? `<span>${htmlEsc(it.detail)}</span>` : ''}
        </div>`).join('')}</div>`
      : '';
    const skills = includeSection('about') && includePart('skills') ? (d.skills || []).map((s) => s.name).filter(Boolean) : [];
    const languages = includeSection('about') && includePart('languages') ? (d.languages || []).map((l) => [l.name, l.note].filter(Boolean).join(' · ')).filter(Boolean) : [];
    const aboutBody = [
      includeSection('about') && includePart('summary') && b.summary ? `<p class="profile-summary">${htmlEsc(b.summary)}</p>` : '',
      highlightBody,
      skills.length || languages.length ? `<div class="profile-tags">
        ${skills.map((s) => `<span>${htmlEsc(s)}</span>`).join('')}
        ${languages.map((s) => `<span>${htmlEsc(s)}</span>`).join('')}
      </div>` : ''
    ].join('');
    const publications = includeSection('publications') ? selectedPublications.map((it) => profileEntry(it, {}, parts)).join('') : '';
    const projects = includeSection('projects') ? selectedProjects.map((it) => profileEntry(it, { sub: [it.role, it.tech].filter(Boolean).join(' · ') }, parts)).join('') : '';
    const experience = includeSection('experience') ? selectedExperience.map((it) => profileEntry(it, { sub: [it.type, it.position].filter(Boolean).join(' · ') }, parts)).join('') : '';
    const education = includeSection('education') ? selectedEducation.map((it) => profileEntry(it, { sub: [it.degree, it.major].filter(Boolean).join(' · ') }, parts)).join('') : '';
    const communityItems = includeSection('community') ? selectedCommunity.map((it) => profileEntry(it, {}, parts)).join('') : '';
    const awards = includeSection('awards') ? selectedAwards.map((it) => profileEntry(it, {}, parts)).join('') : '';
    const notes = includeSection('notes') && d.notes ? `<p class="profile-note">${htmlEsc(d.notes)}</p>` : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEsc(name)} · Academic Profile</title>
  <style>
    :root { --accent: ${htmlEsc(accent)}; --ink: #1f2328; --muted: #68707a; --line: #e5e0d7; --paper: #fbfaf7; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.75 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    a { color: inherit; text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent) 42%, transparent); }
    .site-shell { min-height: 100vh; animation: page-rise .7s cubic-bezier(.2,.8,.2,1) both; }
    .topbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px clamp(22px, 5vw, 68px); background: rgba(251, 250, 247, .88); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(229,224,215,.8); animation: nav-drop .62s cubic-bezier(.2,.8,.2,1) both; }
    .wordmark { font-weight: 760; letter-spacing: .01em; }
    .nav { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
    .nav a { border-bottom: 0; }
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: clamp(30px, 7vw, 92px); align-items: end; padding: clamp(56px, 9vw, 112px) clamp(22px, 6vw, 86px) clamp(42px, 7vw, 76px); border-bottom: 1px solid var(--line); }
    .no-portrait .hero { grid-template-columns: minmax(0, 1fr); }
    .eyebrow { color: var(--accent); font-size: 12px; letter-spacing: .22em; text-transform: uppercase; font-weight: 760; }
    h1 { margin: 12px 0 0; font-family: Georgia, "Times New Roman", "Source Han Serif SC", "Noto Serif SC", serif; font-size: clamp(44px, 8vw, 86px); line-height: .98; font-weight: 520; letter-spacing: 0; }
    .title { margin: 18px 0 0; max-width: 760px; color: #3f454c; font-size: clamp(17px, 2vw, 23px); line-height: 1.55; }
    .contact { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 26px; }
    .contact a, .contact span { padding: 6px 10px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: #3f454c; font-size: 12px; }
    .portrait { width: 210px; aspect-ratio: 4 / 5; justify-self: end; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #fff; box-shadow: 0 18px 48px rgba(31,35,40,.11); animation: portrait-in .85s .12s cubic-bezier(.2,.8,.2,1) both; transition: transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .45s cubic-bezier(.2,.8,.2,1); }
    .portrait:hover { transform: translateY(-4px); box-shadow: 0 24px 64px rgba(31,35,40,.16); }
    .portrait img { width: 100%; height: 100%; object-fit: cover; object-position: center 22%; display: block; }
    .portrait-empty { height: 100%; display: grid; place-items: center; color: var(--muted); font-size: 12px; }
    main { padding: 0 clamp(22px, 6vw, 86px) 72px; }
    .profile-section { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: clamp(24px, 5vw, 72px); padding: 46px 0; border-bottom: 1px solid var(--line); animation: section-rise both; animation-timeline: view(); animation-range: entry 8% cover 28%; }
    .section-label { position: sticky; top: 86px; align-self: start; }
    .section-label span { display: block; color: var(--accent); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; font-weight: 760; }
    .section-label h2 { margin: 9px 0 0; font-size: 22px; line-height: 1.25; font-weight: 760; }
    .profile-summary { margin: 0; max-width: 880px; font-size: 17px; line-height: 1.8; color: #363b42; }
    .profile-highlights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
    .highlight-card { padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; transition: transform .32s cubic-bezier(.2,.8,.2,1), border-color .32s, box-shadow .32s; }
    .highlight-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent) 38%, var(--line)); box-shadow: 0 18px 40px rgba(31,35,40,.08); }
    .highlight-card strong { display: block; font-size: 14px; }
    .highlight-card span { display: block; margin-top: 7px; color: var(--muted); font-size: 13px; line-height: 1.6; }
    .profile-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .profile-tags span { padding: 5px 10px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: #4b525a; font-size: 12px; }
    .profile-entry { display: grid; grid-template-columns: minmax(0, 1fr) 170px; gap: 28px; padding: 22px 0; border-top: 1px solid var(--line); transition: transform .32s cubic-bezier(.2,.8,.2,1), border-color .32s; }
    .profile-entry:hover { transform: translateX(4px); border-top-color: color-mix(in srgb, var(--accent) 34%, var(--line)); }
    .profile-entry:first-child { border-top: 0; padding-top: 0; }
    .profile-entry h3 { margin: 0; font-size: 18px; line-height: 1.35; }
    .profile-entry p { margin: 6px 0 0; color: #4c535b; }
    .entry-meta { color: var(--muted); font-size: 12px; text-align: right; }
    .entry-meta span, .entry-meta a { display: block; margin-bottom: 6px; }
    .profile-list { margin: 12px 0 0; padding-left: 18px; color: #4c535b; }
    .profile-list li { margin: 5px 0; }
    .profile-note { margin: 0; color: var(--muted); }
    .profile-template-noir { --paper: #0d0c11; --ink: #f4f0ff; --muted: #aaa1bc; --line: #2e2938; --accent: #9b7cff; }
    .profile-template-noir .topbar { background: rgba(13,12,17,.84); border-color: #2e2938; }
    .profile-template-noir .hero { min-height: 72vh; align-items: center; border-bottom-color: #2e2938; }
    .profile-template-noir h1 { color: #fff; text-shadow: 0 18px 58px rgba(155,124,255,.24); }
    .profile-template-noir .title,
    .profile-template-noir .profile-summary,
    .profile-template-noir .profile-entry p,
    .profile-template-noir .profile-list { color: #d8d0e9; }
    .profile-template-noir .contact a,
    .profile-template-noir .contact span,
    .profile-template-noir .highlight-card,
    .profile-template-noir .profile-tags span { background: #17131f; border-color: #342d43; color: #eee8ff; }
    .profile-template-noir .portrait { background: #17131f; border-color: #403653; box-shadow: 0 22px 80px rgba(155,124,255,.18); }
    .profile-template-atlas { --paper: #eef3f6; --ink: #17202a; --muted: #62707c; --line: #cad6de; --accent: #275d74; }
    .profile-template-atlas .hero { grid-template-columns: minmax(0, 1fr) 280px; background: linear-gradient(180deg, #f7fbfd, transparent); }
    .profile-template-atlas h1 { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-weight: 820; letter-spacing: 0; }
    .profile-template-atlas .profile-section { grid-template-columns: 260px minmax(0, 1fr); }
    .profile-template-atlas .section-label h2::before { content: ""; display: block; width: 72px; height: 4px; margin-bottom: 14px; background: var(--accent); }
    .profile-template-atlas .profile-entry { border-top-style: dashed; }
    .profile-template-terminal { --paper: #080d0f; --ink: #d8fff0; --muted: #79a596; --line: #17312c; --accent: #5df2bb; }
    .profile-template-terminal body, .profile-template-terminal { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
    .profile-template-terminal .topbar { background: rgba(8,13,15,.88); border-color: #17312c; }
    .profile-template-terminal .hero { grid-template-columns: minmax(0, 1fr); }
    .profile-template-terminal .portrait { display: none; }
    .profile-template-terminal h1 { font-family: inherit; font-weight: 720; letter-spacing: 0; color: #d8fff0; }
    .profile-template-terminal .eyebrow::before { content: "> "; }
    .profile-template-terminal .section-label h2::before { content: "# "; color: var(--accent); }
    .profile-template-terminal .contact a,
    .profile-template-terminal .contact span,
    .profile-template-terminal .highlight-card,
    .profile-template-terminal .profile-tags span { background: #0d1717; border-color: #17312c; color: #d8fff0; }
    .profile-template-terminal .profile-summary,
    .profile-template-terminal .profile-entry p,
    .profile-template-terminal .profile-list { color: #b8ddcf; }
    @keyframes page-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes nav-drop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes portrait-in { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes section-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) {
    }
    @media (max-width: 760px) {
      .topbar { position: static; align-items: flex-start; flex-direction: column; }
      .hero { grid-template-columns: 1fr; align-items: start; }
      .portrait { justify-self: start; width: min(210px, 70vw); }
      .profile-section { grid-template-columns: 1fr; gap: 18px; }
      .section-label { position: static; }
      .profile-highlights { grid-template-columns: 1fr; }
      .profile-entry { grid-template-columns: 1fr; gap: 10px; }
      .entry-meta { text-align: left; }
    }
  </style>
</head>
<body class="profile-template-${htmlEsc(template)} ${hasPortrait ? 'has-portrait' : 'no-portrait'}">
  <div class="site-shell">
    <header class="topbar">
      <div class="wordmark">${htmlEsc(name)}</div>
      <nav class="nav">${nav.map(([label, id]) => `<a href="#${id}">${htmlEsc(label)}</a>`).join('')}</nav>
    </header>
    <section class="hero">
      <div>
        <div class="eyebrow">Academic Profile</div>
        <h1>${htmlEsc(name)}</h1>
        ${includePart('title') && b.title ? `<p class="title">${htmlEsc(b.title)}</p>` : ''}
        <div class="contact">
          ${includePart('location') && b.location ? `<span>${htmlEsc(b.location)}</span>` : ''}
          ${links.map((l) => `<a href="${htmlEsc(l.href)}" target="_blank" rel="noopener">${htmlEsc(l.label)}</a>`).join('')}
        </div>
      </div>
      ${hasPortrait ? `<div class="portrait"><img src="${htmlEsc(b.avatar)}" alt="${htmlEsc(name)}" /></div>` : ''}
    </section>
    <main>
      ${profileSection('简介', 'About', aboutBody, 'about')}
      ${profileSection('代表成果', 'Selected Works', publications, 'publications')}
      ${profileSection('项目', 'Projects', projects, 'projects')}
      ${profileSection('经历', 'Experience', experience, 'experience')}
      ${profileSection('教育', 'Education', education, 'education')}
      ${profileSection('荣誉与认证', 'Awards', awards, 'awards')}
      ${profileSection('实践与公共参与', 'Community', communityItems, 'community')}
      ${profileSection('备注', 'Notes', notes, 'notes')}
    </main>
  </div>
</body>
</html>`;
  }

  async function saveJSON(options) {
    options = options || {};
    try {
      if (currentFileHandle) {
        toast('正在保存 JSON...');
        const writable = await currentFileHandle.createWritable();
        await writable.write(Store.toJSON());
        await writable.close();
        toast('已保存到当前 JSON 文件');
        return;
      }

      if (!options.fromShortcut && window.showSaveFilePicker) {
        toast('请选择 JSON 保存位置...');
        currentFileHandle = await window.showSaveFilePicker({
          suggestedName: currentFileName || defaultJSONName(),
          types: [{ description: 'Resume JSON', accept: { 'application/json': ['.json'] } }]
        });
        currentFileName = currentFileHandle.name || currentFileName;
        await saveJSON();
        return;
      }

      toast('正在下载 JSON...');
      downloadJSON(currentFileName || defaultJSONName());
      toast('浏览器不支持直接写回文件，已下载 JSON');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      alert('保存失败：' + (e.message || e));
    }
  }

  function handleSaveShortcut(e) {
    const isSave = (e.ctrlKey || e.metaKey) &&
      (String(e.key || '').toLowerCase() === 's' || e.code === 'KeyS');
    if (!isSave) return;
    e.preventDefault();
    e.stopPropagation();
    saveJSON({ fromShortcut: true });
  }

  function loadImportedData(text, filename, handle) {
    const data = JSON.parse(text);
    Store.replace(data);
    currentFileName = filename || currentFileName;
    currentFileHandle = handle || null;
    rerenderAll();
    toast(currentFileHandle ? '已导入，可直接保存回当前 JSON' : '已导入 JSON');
  }

  async function importJSONFromPicker() {
    if (!window.showOpenFilePicker) {
      document.getElementById('jsonFile').click();
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Resume JSON', accept: { 'application/json': ['.json'] } }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      loadImportedData(text, file.name, handle);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      alert('导入失败：文件不是有效的简历 JSON。\n' + (e.message || e));
    }
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadImportedData(reader.result, file.name, null);
      } catch (e) {
        alert('导入失败：文件不是有效的简历 JSON。\n' + e.message);
      }
    };
    reader.onerror = () => alert('文件读取失败');
    reader.readAsText(file, 'utf-8');
  }

  function initSplitter(splitter, workspace) {
    let dragging = false;
    const onMove = (e) => {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      let w = e.clientX - rect.left;
      w = Math.max(320, Math.min(rect.width - 360, w));
      workspace.style.setProperty('--editor-w', w + 'px');
      if (zoomMode === 'fit') applyZoom();
    };
    const stop = () => {
      dragging = false;
      document.body.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
    splitter.addEventListener('mousedown', () => {
      dragging = true;
      document.body.classList.add('dragging');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', stop);
    });
  }

  function init() {
    resumeEl = document.getElementById('resume');
    pageScroll = document.getElementById('pageScroll');
    workspaceEl = document.querySelector('.workspace');
    toggleEditorBtn = document.getElementById('btnToggleEditor');
    tplSelect = document.getElementById('tplSelect');
    accentInput = document.getElementById('accentInput');
    fontSelect = document.getElementById('fontSelect');
    densitySelect = document.getElementById('densitySelect');
    uiLangSelect = document.getElementById('uiLangSelect');
    themeToggle = document.getElementById('themeToggle');
    zoomLabel = document.getElementById('zoomLabel');
    pagesEl = document.getElementById('pvPages');
    ensureSettingsModal();

    renderTemplateOptions();

    if (!Store.load()) Store.replace(BLANK_DATA);

    Editor.init(document.getElementById('editorPane'));

    renderSwatches();
    tplSelect.addEventListener('change', () => { Store.set('meta.template', tplSelect.value); renderPreview(); });
    accentInput.addEventListener('input', () => setAccent(accentInput.value));
    fontSelect.addEventListener('change', () => { Store.set('meta.font', fontSelect.value); renderPreview(); });
    densitySelect.addEventListener('change', () => { Store.set('meta.density', densitySelect.value); renderPreview(); });
    if (uiLangSelect) {
      uiLangSelect.addEventListener('change', () => {
        Store.set('meta.uiLang', uiLangSelect.value === 'en' ? 'en' : 'zh');
        rerenderAll();
      });
    }
    if (toggleEditorBtn) toggleEditorBtn.addEventListener('click', toggleEditorPane);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    document.getElementById('btnExport').addEventListener('click', exportJSON);
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.getElementById('btnProfile').addEventListener('click', openProfileModal);
    document.getElementById('btnSave').addEventListener('click', saveJSON);
    document.getElementById('btnImport').addEventListener('click', importJSONFromPicker);
    document.getElementById('jsonFile').addEventListener('change', (e) => {
      if (e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('btnPrint').addEventListener('click', () => {
      const prev = document.title;
      document.title = (Store.data.basics.name || '简历').trim() + ' · 简历';
      window.print();
      setTimeout(() => { document.title = prev; }, 600);
    });

    window.onStoreSaveError = () => toast('内容体积较大，已超出浏览器本地存储上限，未能自动保存。请点「导出」备份为 JSON，并适当减少 / 压缩图片。');

    document.getElementById('zoomIn').addEventListener('click', () => setZoom(+0.1));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(-0.1));
    document.getElementById('zoomFit').addEventListener('click', () => { zoomMode = 'fit'; applyZoom(); });
    window.addEventListener('resize', () => { if (zoomMode === 'fit') applyZoom(); });
    document.addEventListener('keydown', handleSaveShortcut, true);

    initSplitter(document.getElementById('splitter'), document.querySelector('.workspace'));

    syncControls();
    renderPreview();
    applyUiLanguage();
    applyZoom();
  }

  function toggleEditorPane() {
    editorHidden = !editorHidden;
    if (workspaceEl) workspaceEl.classList.toggle('editor-hidden', editorHidden);
    document.body.classList.toggle('editor-hidden-mode', editorHidden);
    document.dispatchEvent(new CustomEvent('cv:editorvisibility', { detail: { hidden: editorHidden } }));
    applyUiLanguage();
    if (zoomMode === 'fit') setTimeout(applyZoom, 80);
  }

  function isEditorHidden() {
    return !!editorHidden;
  }

  return { init, renderPreview, renderAll: rerenderAll, scrollPreviewToSection, scrollPreviewToPath, currentLang, isEditorHidden };
})();

document.addEventListener('DOMContentLoaded', App.init);
window.App = App;
