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
  const resumeLang = String((body.data && body.data.meta && body.data.meta.lang) || 'zh').toLowerCase();
  const resumeLangName = resumeLang === 'en' ? '英文' : '中文';
  const outputLang = body.outputLang === 'English' ? 'English' : 'Simplified Chinese';
  const base = [
    'Input may intentionally omit private identity/contact fields such as name, email, phone, address, website and avatar. Do not penalize missing private contact fields and do not suggest adding them.',
    '你是专业简历编辑。只返回合法 JSON，不要 Markdown，不要解释。',
    '不得编造公司、学校、日期、奖项、证书、数字、论文、专利、出版物或任何不存在的经历。',
    '除非当前任务明确要求改写文本，否则必须保留图片 data URL、链接、日期、数字和 JSON schema key。',
    `简历 JSON:\n${resumeJson}${jd}`
  ].join('\n\n');

  if (task === 'translate') {
    const langCode = lang === 'English' ? 'en' : 'zh';
    return `${base}\n\n任务：翻译简历。\n- 只翻译简历里的自然语言内容，包括姓名头衔、简介、经历描述、项目描述、技能、语言、奖项、证书、成果、活动、链接标签等。\n- 保持 JSON key 不变，但必须把 resume.meta.lang 设置为 "${langCode}"，用于前端把简历板块标题切换成目标语言。\n- 不要优化、不要评分、不要提出建议、不要新增内容。\n- 目标语言：${lang}。\n返回格式必须是：{"resume": <翻译后的完整简历 JSON>}`;
  }
  if (task === 'fill') {
    const langCode = outputLang === 'English' ? 'en' : 'zh';
    return [
      `用户可见输出语言：${outputLang}。`,
      '任务：把用户粘贴的纯文本简历解析为本项目的完整 resume JSON。',
      '只能使用文本中明确出现的信息，不得虚构公司、学校、日期、奖项、证书、数字、论文、专利或经历。',
      '字段结构必须兼容当前简历 schema：meta, basics, links, highlights, experience, education, projects, skills, languages, awards, certificates, publications, activities, socialWork, notes。',
      `必须设置 resume.meta.lang 为 "${langCode}"。`,
      '如果无法判断某个字段，留空字符串或空数组。',
      '返回格式必须是：{"resume": <解析后的完整简历 JSON>}',
      '\n纯文本简历：\n' + String(body.rawText || '')
    ].join('\n');
  }
  if (task === 'optimize') {
    return `${base}\n\n任务：逐项优化建议。\n当前简历主体语言：${resumeLangName}。\n用户可见解释语言：${outputLang}。\n硬性规则：\n- 这是“优化建议”，不是翻译任务。严禁建议把简历翻译成另一种语言，严禁把英文简历改成中文，严禁把中文简历改成英文。\n- section、reason、priority 等解释性内容必须使用 ${outputLang}。\n- original 必须忠实摘录原字段；proposal 必须是可直接替换原字段的改写，并且必须保持该字段原本的语言。英文原文给英文 proposal，中文原文给中文 proposal。\n- 如果 original 是英文，proposal 中不得出现中文句子；解释原因时使用 ${outputLang}。\n- “输出语言”只表示解释建议原因和位置的语言，不表示把简历内容改写成该语言。\n- 如果简历存在可改进内容，必须返回 3 到 8 条建议；不要因为语言约束而返回空 suggestions。\n- 每条建议只针对一个可编辑字段，使用简历 JSON 中真实存在的 dot path。\n- 重点关注含金量呈现、量化结果、信息层级、措辞精炼、岗位匹配，不要泛泛而谈。\n返回格式必须是：{"suggestions":[{"path":"experience.0.description","section":"Experience","original":"original field text","proposal":"same-language replacement text","reason":"reason in ${outputLang}","priority":"high|medium|low"}]}`;
  }
  if (task === 'score') {
    const scope = body.jobDescription ? '，并结合岗位 JD 判断匹配度' : '';
    return `${base}\n\n任务：简历评分${scope}。\n用户可见输出语言：${outputLang}。\n硬性规则：\n- 整个 JSON 中除字段名 key 和必要专有名词外，所有用户可见内容必须使用 ${outputLang}。\n- 不要提出翻译类建议；尤其不要建议把英文简历改成中文，也不要建议把中文简历改成英文。\n- 评分要具体指出当前简历的强项、弱项和最值得先改的地方。\n返回格式必须是：{"score":85,"summary":"summary in ${outputLang}","dimensions":[{"name":"Clarity","score":80,"comment":"comment in ${outputLang}"},{"name":"Impact","score":80,"comment":"comment in ${outputLang}"},{"name":"Role fit","score":80,"comment":"comment in ${outputLang}"}],"quickWins":["suggestion in ${outputLang}"],"risks":["risk in ${outputLang}"]}`;
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
      { role: 'system', content: `你为简历生成器输出严格 JSON。除翻译任务外，解释、原因、评分等用户可见说明必须使用请求中的 outputLang；但可直接替换到简历里的 proposal 必须保持原字段语言。不得把切换语言当作优化建议。` },
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
