const BLANK_DATA = {
  meta: {
    template: 'editorial',
    accent: '#3d4a5c',
    font: 'serif',
    density: 'normal',
    lang: 'en'
  },
  basics: {
    name: '',
    title: '',
    avatar: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    summary: ''
  },
  highlights: [],
  links: [],
  experience: [],
  education: [],
  projects: [],
  skills: [],
  languages: [],
  awards: [],
  certificates: [],
  publications: [],
  activities: [],
  socialWork: [],
  notes: ''
};

const PALETTE = [
  { name: '石板', color: '#3d4a5c' },
  { name: '墨黑', color: '#2b2f36' },
  { name: '松绿', color: '#33493f' },
  { name: '绛红', color: '#6d2e3a' },
  { name: '赭石', color: '#8a5236' },
  { name: '藏青', color: '#2c3a57' },
  { name: '黛紫', color: '#4a3a55' },
  { name: '橄榄', color: '#5a5733' }
];

const SECTION_DEFS = {
  highlights: {
    label: '核心优势',
    en: 'Core Strengths',
    addText: '添加优势',
    titleOf: (it) => it.title || '未命名优势',
    subOf: (it) => it.detail || '',
    blank: { title: '', detail: '' },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'detail', label: '说明', type: 'textarea' }
    ]
  },

  experience: {
    label: '工作经历',
    en: 'Experience',
    addText: '添加工作经历',
    titleOf: (it) => it.position || it.company || '未命名经历',
    subOf: (it) => [it.type, it.company, dateRange(it.start, it.end)].filter(Boolean).join(' · '),
    blank: { type: '', position: '', company: '', location: '', start: '', end: '', description: '' },
    fields: [
      { key: 'type', label: '类型', type: 'text', half: true },
      { key: 'position', label: '职位', type: 'text' },
      { key: 'company', label: '公司', type: 'text' },
      { key: 'location', label: '地点', type: 'text', half: true },
      { key: 'start', label: '开始时间', type: 'text', half: true },
      { key: 'end', label: '结束时间', type: 'text', half: true },
      { key: 'description', label: '工作内容', type: 'textarea' }
    ]
  },

  education: {
    label: '教育背景',
    en: 'Education',
    addText: '添加教育经历',
    titleOf: (it) => it.school || '未命名学校',
    subOf: (it) => [it.degree, it.major, dateRange(it.start, it.end)].filter(Boolean).join(' · '),
    blank: { school: '', degree: '', major: '', start: '', end: '', description: '' },
    fields: [
      { key: 'school', label: '学校', type: 'text' },
      { key: 'degree', label: '学历 / 学位', type: 'text', half: true },
      { key: 'major', label: '专业', type: 'text', half: true },
      { key: 'start', label: '开始时间', type: 'text', half: true },
      { key: 'end', label: '结束时间', type: 'text', half: true },
      { key: 'description', label: '描述（可选）', type: 'textarea' }
    ]
  },

  projects: {
    label: '项目经历',
    en: 'Projects',
    addText: '添加项目',
    titleOf: (it) => it.name || '未命名项目',
    subOf: (it) => [it.role, dateRange(it.start, it.end)].filter(Boolean).join(' · '),
    blank: { name: '', role: '', start: '', end: '', link: '', image: '', tech: '', description: '' },
    fields: [
      { key: 'name', label: '项目名称', type: 'text' },
      { key: 'role', label: '担任角色', type: 'text', half: true },
      { key: 'link', label: '项目链接', type: 'url', half: true },
      { key: 'start', label: '开始时间', type: 'text', half: true },
      { key: 'end', label: '结束时间', type: 'text', half: true },
      { key: 'tech', label: '技术栈', type: 'text' },
      { key: 'image', label: '项目配图（可选）', type: 'image' },
      { key: 'description', label: '项目描述', type: 'textarea' }
    ]
  },

  skills: {
    label: '技能特长',
    en: 'Skills',
    addText: '添加技能',
    titleOf: (it) => it.name || '未命名技能',
    subOf: () => '',
    blank: { name: '' },
    fields: [
      { key: 'name', label: '技能', type: 'text' }
    ]
  },

  languages: {
    label: '语言能力',
    en: 'Languages',
    addText: '添加语言',
    titleOf: (it) => it.name || '未命名语言',
    subOf: (it) => it.note || '',
    blank: { name: '', note: '' },
    fields: [
      { key: 'name', label: '语言', type: 'text', half: true },
      { key: 'note', label: '备注（可选）', type: 'text', half: true }
    ]
  },

  awards: {
    label: '奖项荣誉',
    en: 'Awards',
    addText: '添加奖项',
    titleOf: (it) => it.name || '未命名',
    subOf: (it) => [it.issuer, it.date].filter(Boolean).join(' · '),
    blank: { name: '', issuer: '', date: '' },
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'issuer', label: '主办 / 颁发机构', type: 'text', half: true },
      { key: 'date', label: '时间', type: 'text', half: true }
    ]
  },

  certificates: {
    label: '专业认证',
    en: 'Certifications',
    addText: '添加认证',
    titleOf: (it) => it.name || '未命名',
    subOf: (it) => [it.issuer, it.date].filter(Boolean).join(' · '),
    blank: { name: '', issuer: '', date: '' },
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'issuer', label: '颁发机构', type: 'text', half: true },
      { key: 'date', label: '时间', type: 'text', half: true }
    ]
  },

  publications: {
    label: '成果 / 知识产权',
    en: 'Publications',
    addText: '添加成果',
    titleOf: (it) => it.name || '未命名成果',
    subOf: (it) => [it.issuer, it.date].filter(Boolean).join(' · '),
    blank: { name: '', issuer: '', date: '', description: '' },
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'issuer', label: '机构 / 出版方', type: 'text', half: true },
      { key: 'date', label: '时间', type: 'text', half: true },
      { key: 'description', label: '说明（可选）', type: 'textarea' }
    ]
  },

  activities: {
    label: '交流 / 技术输出',
    en: 'Activities',
    addText: '添加经历',
    titleOf: (it) => it.name || '未命名经历',
    subOf: (it) => [it.role, it.date].filter(Boolean).join(' · '),
    blank: { name: '', role: '', date: '', description: '' },
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'role', label: '角色 / 身份', type: 'text', half: true },
      { key: 'date', label: '时间', type: 'text', half: true },
      { key: 'description', label: '说明（可选）', type: 'textarea' }
    ]
  },

  socialWork: {
    label: '社会实践',
    en: 'Community Engagement',
    addText: '添加社会实践',
    titleOf: (it) => it.name || '未命名社会实践',
    subOf: (it) => [it.role, it.location, it.date].filter(Boolean).join(' · '),
    blank: { name: '', role: '', location: '', date: '', description: '' },
    fields: [
      { key: 'name', label: '项目 / 组织', type: 'text' },
      { key: 'role', label: '角色 / 身份', type: 'text', half: true },
      { key: 'location', label: '地点', type: 'text', half: true },
      { key: 'date', label: '时间', type: 'text', half: true },
      { key: 'description', label: '说明（可选）', type: 'textarea' }
    ]
  }
};

const SECTION_ORDER = ['experience', 'projects', 'publications', 'education', 'skills', 'awards', 'certificates', 'activities', 'socialWork', 'languages', 'highlights'];

function dateRange(a, b) {
  a = (a || '').trim();
  b = (b || '').trim();
  if (a && b) return a + ' – ' + b;
  return a || b || '';
}

const SAMPLE_DATA = JSON.parse(JSON.stringify(BLANK_DATA));

window.BLANK_DATA = BLANK_DATA;
window.SAMPLE_DATA = SAMPLE_DATA;
window.SECTION_DEFS = SECTION_DEFS;
window.SECTION_ORDER = SECTION_ORDER;
window.PALETTE = PALETTE;
window.dateRange = dateRange;
