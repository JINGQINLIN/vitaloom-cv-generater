const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4321);
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

loadEnv(path.join(ROOT, '.env'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024 * 2) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function safeStaticPath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, 'http://local').pathname);
  } catch {
    return null;
  }
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(ROOT, pathname));
  return file === ROOT || file.startsWith(ROOT + path.sep) ? file : null;
}

function stripCodeFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function parseJsonContent(text) {
  const raw = stripCodeFence(text);
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
    throw new Error('AI response was not valid JSON.');
  }
}

function taskPrompt(task, body) {
  const lang = body.targetLang || 'English';
  const jd = body.jobDescription ? `\nJob description:\n${body.jobDescription}` : '';
  const resumeJson = JSON.stringify(body.data || {}, null, 2);
  const resumeLang = String((body.data && body.data.meta && body.data.meta.lang) || 'en').toLowerCase();
  const resumeLangName = resumeLang === 'en' ? '英文' : '中文';
  const outputLang = body.outputLang === 'English' ? 'English' : 'Simplified Chinese';
  const base = [
    '简历可能刻意省略姓名、邮箱、电话、地址、网站、头像等隐私字段，不要因此扣分，也不要建议补全。',
    '只依据输入内容工作，不得编造公司、学校、日期、数字、奖项、证书、论文、专利或经历。',
    '除非任务明确要求改写文字，否则保留 JSON key、图片 data URL、链接、日期和数字。',
    `简历 JSON:\n${resumeJson}${jd}`
  ].join('\n\n');

  if (task === 'translate') {
    const langCode = lang === 'English' ? 'en' : 'zh';
    return [
      base,
      '',
      `任务：将简历中的自然语言内容翻译为${lang === 'English' ? '英文' : '简体中文'}。`,
      '- 保持 JSON key 不变。',
      '- 翻译姓名、头衔、简介、要点、标签和描述，用语自然、专业，符合目标语言习惯。',
      '- 忠实传达事实、范围和语气，不增删信息，不优化或夸大/弱化表述。',
      '- 公司名、产品名等专有名词译法准确；惯例保留原文时可保留原文。',
      `- 设置 resume.meta.lang 为 "${langCode}"。`,
      '- 不要评分、不要提建议、不要新增内容。',
      '返回格式：{"resume": <完整译文 JSON>}'
    ].join('\n');
  }
  if (task === 'fill') {
    const langCode = outputLang === 'English' ? 'en' : 'zh';
    return [
      `界面语言：${outputLang}。`,
      '任务：将下方纯文本简历解析为 VitaLoom 的 resume JSON。',
      '规则：',
      '- 只提取文本中明确出现的信息。',
      '- 表述清晰、中性、专业；条目型内容合理拆入 description 等字段。',
      '- 不猜测缺失的日期、单位、学校、数字、奖项、证书或联系方式。',
      '- 无法确定的字段留空字符串或空数组。',
      'schema：meta, basics, links, highlights, experience, education, projects, skills, languages, awards, certificates, publications, activities, socialWork, notes。',
      `设置 resume.meta.lang 为 "${langCode}"。`,
      '返回格式：{"resume": <完整 JSON>}',
      '',
      '纯文本简历：',
      String(body.rawText || '')
    ].join('\n');
  }
  if (task === 'optimize') {
    return [
      base,
      '',
      '任务：给出逐字段优化建议（不是翻译）。',
      `当前简历主体语言：${resumeLangName}。面向用户的 section、reason 使用 ${outputLang}。`,
      '规则：',
      '- 每条建议对应 JSON 中一个真实 dot path（如 experience.0.description）。',
      '- original 为该字段原文摘录；proposal 为可直接替换的改写，且必须与 original 同语言。',
      '- 优先改进：结构更清晰、证据更具体、措辞更精炼、层级更合理；如有 JD，兼顾岗位匹配。',
      '- 保持客观：不虚构数据、工具或成果；不改变事实含义。',
      '- 避免空泛套话；若替换，应给出更有信息量的表述。',
      '- 有实质改进空间时给出 3–8 条；若整体已较好，可少于 3 条。',
      '- 严禁建议切换简历语言。',
      '返回格式：{"suggestions":[{"path":"experience.0.description","section":"工作经历","original":"...","proposal":"...","reason":"...","priority":"high|medium|low"}]}'
    ].join('\n');
  }
  if (task === 'score') {
    const scope = body.jobDescription ? '，并结合岗位 JD 评估匹配度' : '';
    return [
      base,
      '',
      `任务：对简历进行客观评分${scope}。`,
      `所有面向用户的文字使用 ${outputLang}。`,
      '规则：',
      '- 只评价现有内容，公正、具体、有依据，不空夸也不无依据苛责。',
      '- 总分 0–100：85+ 整体扎实、仅需微调；70–84 可用但有明显短板；55–69 需较大幅度修改；55 以下信息或表达缺口较大。',
      '- 维度：清晰度（结构与可读性）、影响力（证据与成果）、岗位匹配' + (body.jobDescription ? '（与 JD 的契合度）' : '（整体职业定位）') + '。',
      '- quickWins：基于当前内容、可立即执行的小改动。risks：实质性缺口或表达薄弱点，不作道德评判。',
      '- 不要建议翻译简历。',
      '返回格式：{"score":85,"summary":"...","dimensions":[{"name":"...","score":80,"comment":"..."}],"quickWins":["..."],"risks":["..."]}'
    ].join('\n');
  }
  throw new Error('Unknown AI task.');
}

async function callAI(task, body) {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    const err = new Error('Missing QWEN_API_KEY in .env.');
    err.status = 400;
    throw err;
  }

  const baseUrl = (process.env.QWEN_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.QWEN_MODEL || 'qwen-plus';
  const payload = {
    model,
    temperature: task === 'score' ? 0.2 : 0.35,
    enable_thinking: false,
    messages: [
      { role: 'system', content: '你为 VitaLoom 简历编辑器输出严格 JSON，不要 Markdown，不要 JSON 外的说明。只依据输入内容判断；不编造事实；隐私字段缺失不算问题。优化与评分应具体、平衡、客观；proposal 必须与原字段同语言；不要把切换语言当作优化建议。解释性文字使用请求中的 outputLang。' },
      { role: 'user', content: taskPrompt(task, body) }
    ],
    response_format: { type: 'json_object' }
  };

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    const err = new Error(`AI request failed: ${upstream.status} ${text.slice(0, 500)}`);
    err.status = upstream.status;
    throw err;
  }

  const json = JSON.parse(text);
  const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error('AI response did not include message content.');
  return parseJsonContent(content);
}

async function handleApi(req, res) {
  try {
    const body = await readJson(req);
    const task = body.task;
    const result = await callAI(task, body);
    send(res, 200, { ok: true, result });
  } catch (err) {
    send(res, err.status || 500, { ok: false, error: err.message || 'AI request failed.' });
  }
}

function handleConfig(req, res) {
  send(res, 200, JSON.stringify({
    ok: true,
    hasLocalProvider: Boolean(process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY)
  }), 'application/json; charset=utf-8');
}

function handleStatic(req, res) {
  const file = safeStaticPath(req.url);
  if (!file) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ai') return handleApi(req, res);
  if (req.method === 'GET' && req.url === '/api/config') return handleConfig(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return handleStatic(req, res);
  send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`VitaLoom running at http://127.0.0.1:${PORT}`);
});
