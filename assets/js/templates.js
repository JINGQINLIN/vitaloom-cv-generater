function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toLines(text) {
  return String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function bullets(text) {
  const ls = toLines(text);
  if (!ls.length) return '';
  return '<ul class="bullets">' +
    ls.map((l) => `<li>${esc(l.replace(/^[-•·*]\s*/, ''))}</li>`).join('') + '</ul>';
}

function tags(text) {
  const ts = String(text || '').split(/[,，、;；]/).map((t) => t.trim()).filter(Boolean);
  if (!ts.length) return '';
  return '<div class="tags">' + ts.map((t) => `<span class="tag">${esc(t)}</span>`).join('') + '</div>';
}

const SECTION_LABELS = {
  summary: { zh: '个人简介', en: 'Profile' },
  highlights: { zh: '核心优势', en: 'Core Strengths' },
  experience: { zh: '工作经历', en: 'Experience' },
  projects: { zh: '项目经历', en: 'Projects' },
  education: { zh: '教育背景', en: 'Education' },
  awards: { zh: '奖项荣誉', en: 'Awards' },
  certificates: { zh: '专业认证', en: 'Certifications' },
  publications: { zh: '成果 · 知识产权', en: 'Publications & IP' },
  activities: { zh: '交流 · 技术输出', en: 'Talks & Community' },
  socialWork: { zh: '社会实践', en: 'Community Engagement' },
  notes: { zh: '备注', en: 'Notes' },
  skills: { zh: '技能特长', en: 'Skills' },
  languages: { zh: '语言能力', en: 'Languages' }
};

function resumeLang(d) {
  return d && d.meta && d.meta.lang === 'en' ? 'en' : 'zh';
}

function labelOf(d, key) {
  const labels = SECTION_LABELS[key] || {};
  return labels[resumeLang(d)] || labels.zh || key;
}

function withProto(url) {
  url = (url || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}


const ICONS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  pin: '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
};

function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}


function contactItems(d) {
  const b = d.basics;
  const out = [];
  if (b.phone) out.push({ ico: 'phone', text: b.phone, href: 'tel:' + b.phone });
  if (b.email) out.push({ ico: 'mail', text: b.email, href: 'mailto:' + b.email });
  if (b.location) out.push({ ico: 'pin', text: b.location, href: '' });
  if (b.website) out.push({ ico: 'globe', text: b.website, href: withProto(b.website) });
  (d.links || []).forEach((l) => {
    if (l && (l.label || l.url)) out.push({ ico: 'link', text: l.label || l.url, href: withProto(l.url) });
  });
  return out;
}


function contactRows(d) {
  return contactItems(d).map((c) => {
    const inner = `${icon(c.ico)}<span class="ct">${esc(c.text)}</span>`;
    return c.href
      ? `<a class="crow" href="${esc(c.href)}" target="_blank" rel="noopener">${inner}</a>`
      : `<span class="crow">${inner}</span>`;
  }).join('');
}


function contactInline(d) {
  const items = contactItems(d).map((c) => `<span class="ci">${esc(c.text)}</span>`).join('');
  return items ? `<div class="contact-inline">${items}</div>` : '';
}


function contactLines(d) {
  const items = contactItems(d).map((c) => `<div class="cl">${esc(c.text)}</div>`).join('');
  return items ? `<div class="contact-lines">${items}</div>` : '';
}


function avatarHTML(b, cls) {
  if (!b.avatar) return '';
  return `<div class="avatar ${cls || ''}"><img src="${esc(b.avatar)}" alt="${esc(b.name)}"/></div>`;
}


function section(label, body, cls, key) {
  if (!body) return '';
  const attr = key ? ` data-section="${esc(key)}"` : '';
  return `<section class="sec ${cls || ''}"${attr}><h2 class="sec-title"><span>${esc(label)}</span></h2><div class="sec-body">${body}</div></section>`;
}


function expEntry(it) {
  const company = it.company || it.position || '';
  const roleLine = [it.type, it.position].filter(Boolean).join(' · ');
  return `<div class="entry">
    <div class="entry-row"><span class="entry-title entry-company">${esc(company)}</span><span class="entry-date">${esc(dateRange(it.start, it.end))}</span></div>
    <div class="entry-sub entry-role">${esc([roleLine, it.location].filter(Boolean).join(' · '))}</div>
    ${bullets(it.description)}
  </div>`;
}

function eduEntry(it) {
  return `<div class="entry">
    <div class="entry-row"><span class="entry-title">${esc(it.school)}</span><span class="entry-date">${esc(dateRange(it.start, it.end))}</span></div>
    <div class="entry-sub">${esc([it.degree, it.major].filter(Boolean).join(' · '))}</div>
    ${bullets(it.description)}
  </div>`;
}

function projEntry(it) {
  const link = it.link
    ? `<a class="entry-link" href="${esc(withProto(it.link))}" target="_blank" rel="noopener">${esc(it.link)}</a>` : '';
  const img = it.image
    ? `<div class="proj-img"><img src="${esc(it.image)}" alt="${esc(it.name)}"/></div>` : '';
  const titleLine = `${esc(it.name)}${it.role ? `<span class="proj-role"> · ${esc(it.role)}</span>` : ''}`;
  const body = `
    <div class="entry-row"><span class="entry-title">${titleLine}</span><span class="entry-date">${esc(dateRange(it.start, it.end))}</span></div>
    ${link}
    ${bullets(it.description)}
    ${tags(it.tech)}`;
  return `<div class="entry entry-project ${it.image ? 'has-image' : ''}">
    ${it.image ? `<div class="proj-layout"><div class="proj-copy">${body}</div>${img}</div>` : body}
  </div>`;
}

function certEntry(it) {
  return `<div class="entry entry-line">
    <div class="entry-row"><span class="entry-title">${esc(it.name)}</span><span class="entry-date">${esc(it.date)}</span></div>
    ${it.issuer ? `<div class="entry-sub">${esc(it.issuer)}</div>` : ''}
  </div>`;
}

function blkSummary(d) {
  return d.basics.summary ? section(labelOf(d, 'summary'), `<p class="summary">${esc(d.basics.summary)}</p>`, 'sec-summary', 'summary') : '';
}
function blkHighlights(d) {
  const items = d.highlights || [];
  if (!items.length) return '';
  const body = '<div class="highlight-grid">' + items.map((it) => `
    <div class="highlight-item">
      <div class="highlight-title">${esc(it.title)}</div>
      ${it.detail ? `<div class="highlight-detail">${esc(it.detail)}</div>` : ''}
    </div>`).join('') + '</div>';
  return section(labelOf(d, 'highlights'), body, 'sec-highlights', 'highlights');
}
function blkExperience(d) {
  return d.experience.length ? section(labelOf(d, 'experience'), d.experience.map(expEntry).join(''), 'has-entries', 'experience') : '';
}
function blkProjects(d) {
  return d.projects.length ? section(labelOf(d, 'projects'), d.projects.map(projEntry).join(''), 'has-entries', 'projects') : '';
}
function blkEducation(d) {
  return d.education.length ? section(labelOf(d, 'education'), d.education.map(eduEntry).join(''), 'has-entries', 'education') : '';
}
function blkAwards(d) {
  return (d.awards || []).length ? section(labelOf(d, 'awards'), d.awards.map(certEntry).join(''), 'has-entries', 'awards') : '';
}
function blkCertificates(d) {
  return (d.certificates || []).length ? section(labelOf(d, 'certificates'), d.certificates.map(certEntry).join(''), 'has-entries', 'certificates') : '';
}
function richEntry(it) {
  return `<div class="entry entry-line">
    <div class="entry-row"><span class="entry-title">${esc(it.name)}</span><span class="entry-date">${esc(it.date)}</span></div>
    ${it.issuer || it.role ? `<div class="entry-sub">${esc(it.issuer || it.role)}</div>` : ''}
    ${bullets(it.description)}
  </div>`;
}
function blkPublications(d) {
  return (d.publications || []).length ? section(labelOf(d, 'publications'), d.publications.map(richEntry).join(''), 'has-entries', 'publications') : '';
}
function blkActivities(d) {
  return (d.activities || []).length ? section(labelOf(d, 'activities'), d.activities.map(richEntry).join(''), 'has-entries', 'activities') : '';
}
function socialEntry(it) {
  return `<div class="entry entry-line">
    <div class="entry-row"><span class="entry-title">${esc(it.name)}</span><span class="entry-date">${esc(it.date)}</span></div>
    ${it.role || it.location ? `<div class="entry-sub">${esc([it.role, it.location].filter(Boolean).join(' · '))}</div>` : ''}
    ${bullets(it.description)}
  </div>`;
}
function blkSocialWork(d) {
  return (d.socialWork || []).length ? section(labelOf(d, 'socialWork'), d.socialWork.map(socialEntry).join(''), 'has-entries', 'socialWork') : '';
}
function blkNotes(d) {
  return d.notes ? section(labelOf(d, 'notes'), `<p class="notes">${esc(d.notes)}</p>`, 'sec-notes', 'notes') : '';
}


function blkSkills(d, style) {
  if (!d.skills.length) return '';
  let body;
  if (style === 'tags') {
    body = '<div class="tags skill-tags">' +
      d.skills.map((s) => `<span class="tag">${esc(s.name)}</span>`).join('') + '</div>';
  } else {
    body = '<div class="inline-list">' +
      d.skills.map((s) => `<span class="il">${esc(s.name)}</span>`).join('') + '</div>';
  }
  return section(labelOf(d, 'skills'), body, '', 'skills');
}


function blkLanguages(d, style) {
  if (!d.languages.length) return '';
  let body;
  if (style === 'rows') {
    body = '<div class="lang-rows">' +
      d.languages.map((l) => `<div class="lang-row"><span>${esc(l.name)}</span>${l.note ? `<em>${esc(l.note)}</em>` : ''}</div>`).join('') + '</div>';
  } else {
    body = '<div class="inline-list">' +
      d.languages.map((l) => `<span class="il">${esc(l.name)}${l.note ? ` <em>${esc(l.note)}</em>` : ''}</span>`).join('') + '</div>';
  }
  return section(labelOf(d, 'languages'), body, '', 'languages');
}

function nameOf(d) { return esc(d.basics.name); }

function render_editorial(d) {
  const b = d.basics;
  return `
  <div class="wrap ed-wrap">
    <header class="ed-head">
      <div class="ed-id">
        ${avatarHTML(b, 'ed-avatar')}
        <div class="ed-idtext">
          <h1 class="ed-name">${nameOf(d)}</h1>
          ${b.title ? `<div class="ed-title">${esc(b.title)}</div>` : ''}
        </div>
      </div>
      ${contactLines(d)}
    </header>
    <div class="ed-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_sidebar(d) {
  const b = d.basics;
  return `
  <div class="wrap sb-wrap">
    <aside class="sb-side">
      ${avatarHTML(b, 'sb-avatar')}
      <h1 class="sb-name">${nameOf(d)}</h1>
      ${b.title ? `<div class="sb-title">${esc(b.title)}</div>` : ''}
      <div class="sb-contact">${contactRows(d)}</div>
      ${blkSkills(d, 'tags')}
      ${blkLanguages(d, 'rows')}
    </aside>
    <main class="sb-main">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </main>
  </div>`;
}

function render_minimal(d) {
  const b = d.basics;
  return `
  <div class="wrap mn-wrap">
    <header class="mn-head">
      <div class="mn-id">
        <h1 class="mn-name">${nameOf(d)}</h1>
        ${b.title ? `<div class="mn-title">${esc(b.title)}</div>` : ''}
        ${contactInline(d)}
      </div>
      ${avatarHTML(b, 'mn-avatar')}
    </header>
    <div class="mn-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_letterhead(d) {
  const b = d.basics;
  return `
  <div class="wrap lh-wrap">
    <header class="lh-head">
      ${avatarHTML(b, 'lh-avatar')}
      <div class="lh-id">
        <h1 class="lh-name">${nameOf(d)}</h1>
        ${b.title ? `<div class="lh-title">${esc(b.title)}</div>` : ''}
        <div class="lh-contact">${contactRows(d)}</div>
      </div>
    </header>
    <div class="lh-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'tags')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_compact(d) {
  const b = d.basics;
  return `
  <div class="wrap cp-wrap">
    <header class="cp-head">
      <div class="cp-id">
        ${avatarHTML(b, 'cp-avatar')}
        <div class="cp-idtext">
          <h1 class="cp-name">${nameOf(d)}</h1>
          ${b.title ? `<div class="cp-title">${esc(b.title)}</div>` : ''}
        </div>
      </div>
      ${contactLines(d)}
    </header>
    <div class="cp-cols">
      <main class="cp-main">
        ${blkSummary(d)}
      ${blkHighlights(d)}
        ${blkExperience(d)}
        ${blkProjects(d)}
      </main>
      <aside class="cp-rail">
        ${blkEducation(d)}
        ${blkSkills(d, 'tags')}
        ${blkLanguages(d, 'rows')}
        ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
      </aside>
    </div>
  </div>`;
}

function render_timeline(d) {
  const b = d.basics;
  return `
  <div class="wrap tl-wrap">
    <header class="tl-head">
      ${avatarHTML(b, 'tl-avatar')}
      <div class="tl-id">
        <h1 class="tl-name">${nameOf(d)}</h1>
        ${b.title ? `<div class="tl-title">${esc(b.title)}</div>` : ''}
        <div class="tl-contact">${contactRows(d)}</div>
      </div>
    </header>
    <div class="tl-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_refined(d) {
  const b = d.basics;
  return `
  <div class="wrap rf-wrap">
    <header class="rf-head">
      ${avatarHTML(b, 'rf-avatar')}
      <h1 class="rf-name">${nameOf(d)}</h1>
      ${b.title ? `<div class="rf-title">${esc(b.title)}</div>` : ''}
      ${contactInline(d)}
    </header>
    <div class="rf-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_duotone(d) {
  const b = d.basics;
  return `
  <div class="wrap du-wrap">
    <aside class="du-side">
      ${avatarHTML(b, 'du-avatar')}
      <h1 class="du-name">${nameOf(d)}</h1>
      ${b.title ? `<div class="du-title">${esc(b.title)}</div>` : ''}
      <div class="du-contact">${contactRows(d)}</div>
      ${blkSkills(d, 'tags')}
      ${blkLanguages(d, 'rows')}
    </aside>
    <main class="du-main">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </main>
  </div>`;
}

function render_indexed(d) {
  const b = d.basics;
  return `
  <div class="wrap id-wrap">
    <header class="id-head">
      <div class="id-id">
        ${avatarHTML(b, 'id-avatar')}
        <div class="id-idtext">
          <h1 class="id-name">${nameOf(d)}</h1>
          ${b.title ? `<div class="id-title">${esc(b.title)}</div>` : ''}
        </div>
      </div>
      ${contactLines(d)}
    </header>
    <div class="id-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkEducation(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_magazine(d) {
  const b = d.basics;
  return `
  <div class="wrap mg-wrap">
    <header class="mg-head">
      <div class="mg-id">
        ${b.title ? `<div class="mg-kicker">${esc(b.title)}</div>` : ''}
        <h1 class="mg-name">${nameOf(d)}</h1>
        ${contactInline(d) ? `<div class="mg-meta">${contactInline(d)}</div>` : ''}
      </div>
      ${avatarHTML(b, 'mg-avatar')}
    </header>
    <div class="mg-cols">
      <main class="mg-main">
        ${blkSummary(d)}
      ${blkHighlights(d)}
        ${blkExperience(d)}
        ${blkProjects(d)}
      </main>
      <aside class="mg-rail">
        ${blkSkills(d, 'tags')}
        ${blkEducation(d)}
        ${blkLanguages(d, 'rows')}
        ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
      </aside>
    </div>
  </div>`;
}

function render_executive(d) {
  const b = d.basics;
  return `
  <div class="wrap ex-wrap">
    <header class="ex-head">
      <div class="ex-rule"></div>
      <div class="ex-id">
        <div>
          <h1 class="ex-name">${nameOf(d)}</h1>
          ${b.title ? `<div class="ex-title">${esc(b.title)}</div>` : ''}
        </div>
        ${avatarHTML(b, 'ex-avatar')}
      </div>
      ${contactInline(d)}
    </header>
    <div class="ex-cols">
      <main class="ex-main">
        ${blkSummary(d)}
      ${blkHighlights(d)}
        ${blkExperience(d)}
        ${blkProjects(d)}
      </main>
      <aside class="ex-rail">
        ${blkEducation(d)}
        ${blkSkills(d, 'tags')}
        ${blkLanguages(d, 'rows')}
        ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
      </aside>
    </div>
  </div>`;
}

function render_consultant(d) {
  const b = d.basics;
  return `
  <div class="wrap cs-wrap">
    <header class="cs-head">
      <div class="cs-kicker">${esc(b.title || 'Professional Resume')}</div>
      <div class="cs-id">
        <h1 class="cs-name">${nameOf(d)}</h1>
        ${avatarHTML(b, 'cs-avatar')}
      </div>
      ${contactInline(d)}
    </header>
    <div class="cs-grid">
      <main class="cs-primary">
        ${blkSummary(d)}
      ${blkHighlights(d)}
        ${blkExperience(d)}
        ${blkProjects(d)}
      </main>
      <aside class="cs-secondary">
        ${blkSkills(d, 'tags')}
        ${blkEducation(d)}
        ${blkLanguages(d, 'rows')}
        ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
      </aside>
    </div>
  </div>`;
}

function render_engineer(d) {
  const b = d.basics;
  return `
  <div class="wrap en-wrap">
    <header class="en-head">
      <div class="en-id">
        ${avatarHTML(b, 'en-avatar')}
        <div>
          <h1 class="en-name">${nameOf(d)}</h1>
          ${b.title ? `<div class="en-title">${esc(b.title)}</div>` : ''}
        </div>
      </div>
      <div class="en-contact">${contactRows(d)}</div>
    </header>
    <div class="en-body">
      ${blkSkills(d, 'tags')}
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkProjects(d)}
      ${blkExperience(d)}
      ${blkEducation(d)}
      ${blkLanguages(d, 'inline')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </div>
  </div>`;
}

function render_academic(d) {
  const b = d.basics;
  return `
  <div class="wrap ac-wrap">
    <header class="ac-head">
      ${avatarHTML(b, 'ac-avatar')}
      <h1 class="ac-name">${nameOf(d)}</h1>
      ${b.title ? `<div class="ac-title">${esc(b.title)}</div>` : ''}
      ${contactInline(d)}
    </header>
    <div class="ac-body">
      ${blkSummary(d)}
      ${blkHighlights(d)}
      ${blkEducation(d)}
      ${blkExperience(d)}
      ${blkProjects(d)}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
      ${blkSkills(d, 'inline')}
      ${blkLanguages(d, 'inline')}
    </div>
  </div>`;
}

function render_portfolio(d) {
  const b = d.basics;
  return `
  <div class="wrap pf-wrap">
    <aside class="pf-side">
      ${avatarHTML(b, 'pf-avatar')}
      <div class="pf-kicker">${esc(b.title || 'Portfolio Resume')}</div>
      <h1 class="pf-name">${nameOf(d)}</h1>
      ${b.summary ? `<p class="pf-summary">${esc(b.summary)}</p>` : ''}
      <div class="pf-contact">${contactRows(d)}</div>
      ${blkSkills(d, 'tags')}
    </aside>
    <main class="pf-main">
      ${blkHighlights(d)}
      ${blkProjects(d)}
      ${blkExperience(d)}
      ${blkEducation(d)}
      ${blkLanguages(d, 'rows')}
      ${blkAwards(d)}
      ${blkCertificates(d)}
      ${blkPublications(d)}
      ${blkActivities(d)}
      ${blkSocialWork(d)}
      ${blkNotes(d)}
    </main>
  </div>`;
}

const TEMPLATES = {
  editorial:  { name: '编辑 Editorial', en: 'Editorial', render: render_editorial },
  magazine:   { name: '杂志 Magazine', en: 'Magazine', render: render_magazine },
  refined:    { name: '典雅 Refined', en: 'Refined', render: render_refined },
  indexed:    { name: '序号 Indexed', en: 'Indexed', render: render_indexed },
  minimal:    { name: '极简 Minimal', en: 'Minimal', render: render_minimal },
  sidebar:    { name: '栏目 Sidebar', en: 'Sidebar', render: render_sidebar },
  compact:    { name: '紧凑 Compact', en: 'Compact', render: render_compact },
  duotone:    { name: '撞色 Duotone', en: 'Duotone', render: render_duotone },
  timeline:   { name: '时间轴 Timeline', en: 'Timeline', render: render_timeline },
  letterhead: { name: '信笺 Letterhead', en: 'Letterhead', render: render_letterhead }
};

Object.assign(TEMPLATES, {
  executive:  { name: '高管 Executive', en: 'Executive', render: render_executive },
  consultant: { name: '咨询 Consultant', en: 'Consultant', render: render_consultant },
  engineer:   { name: '工程 Engineer', en: 'Engineer', render: render_engineer },
  academic:   { name: '学术 Academic', en: 'Academic', render: render_academic },
  portfolio:  { name: '作品集 Portfolio', en: 'Portfolio', render: render_portfolio }
});

window.TEMPLATES = TEMPLATES;

