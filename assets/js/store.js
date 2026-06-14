const Store = (function () {
  const KEY = 'cv_generator_data_v2';

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalize(data) {
    const base = clone(BLANK_DATA);
    if (!data || typeof data !== 'object') return base;
    base.meta = Object.assign(base.meta, data.meta || {});

    if (!window.TEMPLATES || !window.TEMPLATES[base.meta.template]) base.meta.template = BLANK_DATA.meta.template;
    if (base.meta.accent === '#2563eb') base.meta.accent = BLANK_DATA.meta.accent;
    if (!['relaxed', 'normal', 'compact'].includes(base.meta.density)) base.meta.density = 'normal';
    if (!['serif', 'sans'].includes(base.meta.font)) base.meta.font = 'serif';
    if (!['zh', 'en'].includes(base.meta.lang)) base.meta.lang = 'en';
    base.basics = Object.assign(base.basics, data.basics || {});
    base.highlights = Array.isArray(data.highlights) ? data.highlights : [];
    base.links = Array.isArray(data.links) ? data.links : [];
    base.experience = Array.isArray(data.experience) ? data.experience : [];
    base.education = Array.isArray(data.education) ? data.education : [];
    base.projects = Array.isArray(data.projects) ? data.projects : [];
    base.skills = Array.isArray(data.skills) ? data.skills : [];
    base.languages = Array.isArray(data.languages) ? data.languages : [];
    base.socialWork = Array.isArray(data.socialWork) ? data.socialWork : [];
    base.notes = typeof data.notes === 'string' ? data.notes : '';
    const legacyCertificates = Array.isArray(data.certificates) ? data.certificates : [];
    const hasSplitSections = ['awards', 'publications', 'activities'].some((key) =>
      Array.isArray(data[key]) && data[key].length
    );
    if (hasSplitSections) {
      base.awards = Array.isArray(data.awards) ? data.awards : [];
      base.certificates = legacyCertificates;
      base.publications = Array.isArray(data.publications) ? data.publications : [];
      base.activities = Array.isArray(data.activities) ? data.activities : [];
    } else {
      splitLegacyCertificates(legacyCertificates, base);
    }
    return base;
  }

  function splitLegacyCertificates(items, base) {
    items.forEach((item) => {
      const text = [item.name, item.issuer, item.date].filter(Boolean).join(' ');
      if (/奖|一等奖|二等奖|竞赛|比赛|第一名|荣誉/.test(text)) {
        base.awards.push(item);
      } else if (/著作权|专利|出版社|专著|论文|出版|知识产权/.test(text)) {
        base.publications.push(Object.assign({ description: '' }, item));
      } else if (/参加|大会|博览会|论坛|讲师|课程|作者|社区|阅读量|技术输出/.test(text)) {
        base.activities.push({ name: item.name || '', role: item.issuer || '', date: item.date || '', description: '' });
      } else {
        base.certificates.push(item);
      }
    });
  }

  const api = {
    data: clone(BLANK_DATA),

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return false;
        this.data = normalize(JSON.parse(raw));
        return true;
      } catch (e) {
        console.warn('载入本地数据失败：', e);
        return false;
      }
    },

    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('保存到本地失败（可能超出容量，例如图片过大）：', e);
        if (typeof window.onStoreSaveError === 'function') window.onStoreSaveError(e);
      }
    },

    replace(data) {
      this.data = normalize(data);
      this.save();
    },

    reset() {
      const meta = clone(this.data.meta);
      this.data = clone(BLANK_DATA);
      this.data.meta = meta;
      this.save();
    },

    loadSample() {
      this.replace(clone(SAMPLE_DATA));
    },

    get(path) {
      return path.split('.').reduce(
        (o, k) => (o == null ? undefined : o[k]),
        this.data
      );
    },

    set(path, value) {
      const keys = path.split('.');
      const last = keys.pop();
      let o = this.data;
      for (const k of keys) {
        if (o[k] == null) o[k] = /^\d+$/.test(k) ? [] : {};
        o = o[k];
      }
      o[last] = value;
      this.save();
    },

    addItem(section, item) {
      if (!Array.isArray(this.data[section])) this.data[section] = [];
      this.data[section].push(item != null ? item : clone(SECTION_DEFS[section].blank));
      this.save();
      return this.data[section].length - 1;
    },

    removeItem(section, index) {
      this.data[section].splice(index, 1);
      this.save();
    },

    moveItem(section, index, dir) {
      const arr = this.data[section];
      const j = index + dir;
      if (j < 0 || j >= arr.length) return false;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      this.save();
      return true;
    },

    toJSON() {
      return JSON.stringify(this.data, null, 2);
    }
  };

  return api;
})();

window.Store = Store;
