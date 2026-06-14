const Editor = (function () {
  let paneEl = null;
  const collapsed = {};
  let imgInput = null;
  let pendingImgPath = null;
  const CARD_KEYS = ['basics', 'links'].concat(SECTION_ORDER, ['notes']);
  const EDITOR_TEXT = {
    zh: {
      basics: '基本信息',
      links: '社交 / 作品链接',
      notes: '备注',
      addLink: '＋ 添加链接',
      noLinks: '暂无链接',
      addSection: '点击下方按钮添加',
      avatar: '头像（可选）',
      notesLabel: '备注信息',
      notesPlaceholder: '可填写补充说明、作品集说明、可到岗时间或其它备注'
    },
    en: {
      basics: 'Basic Info',
      links: 'Social / Portfolio Links',
      notes: 'Notes',
      addLink: '+ Add link',
      noLinks: 'No links yet',
      addSection: 'Use the button below to add ',
      avatar: 'Avatar (optional)',
      notesLabel: 'Notes',
      notesPlaceholder: 'Add supplementary notes, portfolio context, availability, or other remarks'
    }
  };
  const FIELD_EN = {
    '姓名': 'Name',
    '求职意向 / 头衔': 'Target role / Title',
    '邮箱': 'Email',
    '电话': 'Phone',
    '所在地': 'Location',
    '个人网站': 'Website',
    '个人简介': 'Summary',
    '标题': 'Title',
    '说明': 'Description',
    '类型': 'Type',
    '职位': 'Position',
    '公司': 'Company',
    '地点': 'Location',
    '开始时间': 'Start',
    '结束时间': 'End',
    '工作内容': 'Description',
    '学校': 'School',
    '学历': 'Degree',
    '学历 / 学位': 'Degree',
    '专业': 'Major',
    '描述（可选）': 'Description',
    '项目名称': 'Project',
    '担任角色': 'Role',
    '角色': 'Role',
    '项目链接': 'Project link',
    '项目配图（可选）': 'Project image (optional)',
    '技术栈': 'Tech stack',
    '项目描述': 'Project description',
    '技能名称': 'Skill',
    '熟练度': 'Level',
    '语言': 'Language',
    '补充说明': 'Note',
    '名称': 'Name',
    '颁发方 / 主办方': 'Issuer / Organizer',
    '主办 / 颁发机构': 'Organizer / Issuer',
    '颁发机构': 'Issuer',
    '机构 / 出版方': 'Institution / Publisher',
    '说明（可选）': 'Description',
    '角色 / 身份': 'Role / Identity',
    '项目 / 组织': 'Project / Organization',
    '时间': 'Date',
    '备注信息': 'Notes'
  };

  const BASIC_FIELDS = [
    { key: 'name', label: '姓名', type: 'text', placeholder: '林婧琴', half: true },
    { key: 'title', label: '求职意向 / 头衔', type: 'text', placeholder: '高级前端工程师', half: true },
    { key: 'email', label: '邮箱', type: 'text', placeholder: 'you@example.com', half: true },
    { key: 'phone', label: '电话', type: 'text', placeholder: '138-0000-0000', half: true },
    { key: 'location', label: '所在地', type: 'text', placeholder: '上海 · 浦东', half: true },
    { key: 'website', label: '个人网站', type: 'text', placeholder: 'github.com/you', half: true },
    { key: 'summary', label: '个人简介', type: 'textarea', placeholder: '一段话概括你的经验与优势…' }
  ];

  function fieldHTML(path, f, value) {
    value = value == null ? '' : value;
    const cls = 'fld' + (f.half ? ' fld-half' : '');

    if (f.type === 'textarea') {
      return `<label class="${cls} fld-full">
        <span class="fld-lab">${fieldLabel(f.label)}</span>
        <textarea class="inp" data-bind="${path}" rows="4">${esc(value)}</textarea>
      </label>`;
    }

    if (f.type === 'image') {
      const preview = value
        ? `<img src="${esc(value)}" alt="${esc(uiLang() === 'en' ? 'Preview' : '预览')}" class="img-thumb"/>`
        : `<div class="img-thumb img-empty">${uiLang() === 'en' ? 'None' : '未选择'}</div>`;
      return `<div class="${cls} fld-full fld-image">
        <span class="fld-lab">${fieldLabel(f.label)}</span>
        <div class="img-row">
          ${preview}
          <div class="img-acts">
            <button type="button" class="btn btn-sm" data-action="img" data-bind="${path}">${uiLang() === 'en' ? 'Choose image' : '选择图片'}</button>
            ${value ? `<button type="button" class="btn btn-sm btn-ghost" data-action="img-clear" data-bind="${path}">${uiLang() === 'en' ? 'Remove' : '移除'}</button>` : ''}
          </div>
        </div>
      </div>`;
    }

    return `<label class="${cls}">
      <span class="fld-lab">${fieldLabel(f.label)}</span>
      <input class="inp" type="text" data-bind="${path}" value="${esc(value)}"/>
    </label>`;
  }

  function basicsCard() {
    const b = Store.data.basics;
    const fields = BASIC_FIELDS.map((f) => fieldHTML('basics.' + f.key, f, b[f.key])).join('');
    const avatar = fieldHTML('basics.avatar', { label: editorText('avatar'), type: 'image' }, b.avatar);
    return card('basics', editorText('basics'), `
      <div class="fld-grid">
        ${avatar}
        ${fields}
      </div>`);
  }

  function linksCard() {
    const links = Store.data.links || [];
    const rows = links.map((l, i) => `
      <div class="link-row">
        <input class="inp" type="text" data-bind="links.${i}.label" value="${esc(l.label)}"/>
        <input class="inp" type="text" data-bind="links.${i}.url" value="${esc(l.url)}"/>
        <button type="button" class="icon-btn" data-action="del" data-section="links" data-index="${i}" title="${uiLang() === 'en' ? 'Delete' : '删除'}">✕</button>
      </div>`).join('');
    return card('links', editorText('links'), `
      <div class="links-list">${rows || `<div class="empty-hint">${editorText('noLinks')}</div>`}</div>
      <button type="button" class="btn btn-add" data-action="add" data-section="links">${editorText('addLink')}</button>`);
  }

  function sectionCard(key) {
    const def = SECTION_DEFS[key];
    const items = Store.data[key] || [];
    const itemsHTML = items.map((it, i) => itemBlock(key, def, it, i, items.length)).join('');
    const label = sectionLabel(def);
    return card(key, label, `
      <div class="items">${itemsHTML || `<div class="empty-hint">${editorText('addSection')}${label}</div>`}</div>
      <button type="button" class="btn btn-add" data-action="add" data-section="${key}">${uiLang() === 'en' ? '+ Add ' + label : '＋ ' + def.addText}</button>`,
      items.length ? `<span class="count-badge">${items.length}</span>` : '');
  }

  function itemBlock(key, def, item, i, total) {
    const fields = def.fields.map((f) => fieldHTML(`${key}.${i}.${f.key}`, f, item[f.key])).join('');
    const title = def.titleOf(item);
    const sub = def.subOf(item);
    return `
    <div class="item" data-preview-section="${key}">
      <div class="item-head">
        <div class="item-titles">
          <span class="item-title">${esc(title)}</span>
          ${sub ? `<span class="item-sub">${esc(sub)}</span>` : ''}
        </div>
        <div class="item-tools">
          <button type="button" class="icon-btn" data-action="up" data-section="${key}" data-index="${i}" ${i === 0 ? 'disabled' : ''} title="${uiLang() === 'en' ? 'Move up' : '上移'}">↑</button>
          <button type="button" class="icon-btn" data-action="down" data-section="${key}" data-index="${i}" ${i === total - 1 ? 'disabled' : ''} title="${uiLang() === 'en' ? 'Move down' : '下移'}">↓</button>
          <button type="button" class="icon-btn icon-del" data-action="del" data-section="${key}" data-index="${i}" title="${uiLang() === 'en' ? 'Delete' : '删除'}">✕</button>
        </div>
      </div>
      <div class="fld-grid">${fields}</div>
    </div>`;
  }

  function card(key, title, inner, badge) {
    const isCollapsed = !!collapsed[key];
    const target = previewSectionFor(key);
    const chevron = '<svg class="card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    return `
    <div class="card ${isCollapsed ? 'is-collapsed' : ''}" data-card="${key}" data-preview-section="${target}">
      <button type="button" class="card-head" data-action="toggle" data-card="${key}" data-preview-section="${target}">
        <span class="card-title">${title}</span>
        ${badge || ''}
        ${chevron}
      </button>
      <div class="card-body">${inner}</div>
    </div>`;
  }

  function notesCard() {
    return card('notes', editorText('notes'), `
      <label class="fld fld-full">
        <span class="fld-lab">${editorText('notesLabel')}</span>
        <textarea class="inp" data-bind="notes" rows="4">${esc(Store.data.notes || '')}</textarea>
      </label>`);
  }

  function uiLang() {
    return window.App && App.currentLang && App.currentLang() === 'en' ? 'en' : 'zh';
  }

  function editorText(key) {
    const lang = uiLang();
    return (EDITOR_TEXT[lang] && EDITOR_TEXT[lang][key]) || EDITOR_TEXT.zh[key] || key;
  }

  function sectionLabel(def) {
    return uiLang() === 'en' && def.en ? def.en : def.label;
  }

  function fieldLabel(label) {
    return uiLang() === 'en' ? (FIELD_EN[label] || label) : label;
  }

  function previewSectionFor(key) {
    if (key === 'basics' || key === 'links') return 'top';
    return key;
  }

  function renderAll() {
    const scroll = paneEl.scrollTop;
    let html = basicsCard() + linksCard();
    SECTION_ORDER.forEach((key) => { html += sectionCard(key); });
    html += notesCard();
    paneEl.innerHTML = html;
    paneEl.scrollTop = scroll;
    syncBulkButtons();
  }

  function syncBulkButtons() {
    const values = CARD_KEYS.map((key) => !!collapsed[key]);
    const allCollapsed = values.every(Boolean);
    const allExpanded = values.every((v) => !v);
    const expandBtn = document.getElementById('btnExpandAll');
    const collapseBtn = document.getElementById('btnCollapseAll');
    if (expandBtn) expandBtn.disabled = allExpanded;
    if (collapseBtn) collapseBtn.disabled = allCollapsed;
  }

  function onInput(e) {
    const el = e.target;
    const path = el.dataset.bind;
    if (!path) return;
    let value = el.value;
    if (el.dataset.type === 'number') value = Number(value);
    Store.set(path, value);
    App.renderPreview();
    refreshItemHeader(el);
  }

  function refreshItemHeader(el) {
    const itemEl = el.closest('.item');
    if (!itemEl) return;
    const m = (el.dataset.bind || '').match(/^(\w+)\.(\d+)\./);
    if (!m) return;
    const [, key, idx] = m;
    const def = SECTION_DEFS[key];
    const item = Store.data[key][idx];
    const t = itemEl.querySelector('.item-title');
    const s = itemEl.querySelector('.item-sub');
    if (t) t.textContent = def.titleOf(item);
    if (s) {
      const sub = def.subOf(item);
      s.textContent = sub || '';
      s.style.display = sub ? '' : 'none';
    }
  }

  function onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const section = btn.dataset.section;
    const index = btn.dataset.index != null ? Number(btn.dataset.index) : null;

    switch (action) {
      case 'toggle':
        collapsed[btn.dataset.card] = !collapsed[btn.dataset.card];
        btn.closest('.card').classList.toggle('is-collapsed');
        if (window.App && typeof App.scrollPreviewToSection === 'function') {
          App.scrollPreviewToSection(btn.dataset.previewSection || previewSectionFor(btn.dataset.card));
        }
        break;

      case 'add':
        if (section === 'links') Store.addItem('links', { label: '', url: '' });
        else Store.addItem(section, JSON.parse(JSON.stringify(SECTION_DEFS[section].blank)));
        collapsed[section] = false;
        renderAll();
        App.renderPreview();
        break;

      case 'del':
        Store.removeItem(section, index);
        renderAll();
        App.renderPreview();
        break;

      case 'up':
        if (Store.moveItem(section, index, -1)) { renderAll(); App.renderPreview(); }
        break;

      case 'down':
        if (Store.moveItem(section, index, +1)) { renderAll(); App.renderPreview(); }
        break;

      case 'img':
        pendingImgPath = btn.dataset.bind;
        imgInput.value = '';
        imgInput.click();
        break;

      case 'img-clear':
        Store.set(btn.dataset.bind, '');
        renderAll();
        App.renderPreview();
        break;
    }
  }

  function onImagePicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || !pendingImgPath) return;
    downscaleImage(file, 800, 0.82).then((dataURL) => {
      Store.set(pendingImgPath, dataURL);
      pendingImgPath = null;
      renderAll();
      App.renderPreview();
    }).catch((err) => {
      alert('图片处理失败：' + err.message);
    });
  }

  function downscaleImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('请选择图片文件'));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const r = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * r);
            height = Math.round(height * r);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const isPng = /png/i.test(file.type);
          resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('无法读取该图片'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function init(pane) {
    paneEl = pane;
    CARD_KEYS.forEach((key) => { collapsed[key] = true; });

    imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/*';
    imgInput.hidden = true;
    imgInput.addEventListener('change', onImagePicked);
    document.body.appendChild(imgInput);

    paneEl.addEventListener('input', onInput);
    paneEl.addEventListener('click', onClick);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnExpandAll')) expandAll();
      if (e.target.closest('#btnCollapseAll')) collapseAll();
    });
    paneEl.addEventListener('click', (e) => {
      const target = e.target.closest('[data-preview-section]');
      if (!target || e.target.closest('[data-action]')) return;
      if (window.App && typeof App.scrollPreviewToSection === 'function') {
        App.scrollPreviewToSection(target.dataset.previewSection);
      }
    });
    renderAll();
  }

  function setAllCollapsed(value) {
    CARD_KEYS.forEach((key) => { collapsed[key] = value; });
    renderAll();
  }

  function collapseAll() { setAllCollapsed(true); }
  function expandAll() { setAllCollapsed(false); }

  return {
    init,
    renderAll,
    collapseAll,
    expandAll
  };
})();

window.Editor = Editor;
