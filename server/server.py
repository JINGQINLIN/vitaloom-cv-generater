import json
import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


def load_env(file_path):
    if not file_path.exists():
        return
    for raw in file_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def strip_code_fence(text):
    text = str(text or "").strip()
    if text.startswith("```") and text.endswith("```"):
        lines = text.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def parse_json_content(text):
    raw = strip_code_fence(text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        first = raw.find("{")
        last = raw.rfind("}")
        if first >= 0 and last > first:
            return json.loads(raw[first : last + 1])
        raise ValueError("AI response was not valid JSON.")


def task_prompt(task, body):
    target_lang = body.get("targetLang") or "English"
    resume = body.get("data") or {}
    resume_lang = ((resume.get("meta") or {}).get("lang") or "en").lower()
    resume_lang_name = "英文" if resume_lang == "en" else "中文"
    output_lang = "English" if body.get("outputLang") == "English" else "Simplified Chinese"
    resume_json = json.dumps(resume, ensure_ascii=False, indent=2)
    jd = body.get("jobDescription") or ""
    jd_text = f"\nJob description:\n{jd}" if jd else ""
    base = "\n\n".join(
        [
            "简历可能刻意省略姓名、邮箱、电话、地址、网站、头像等隐私字段，不要因此扣分，也不要建议补全。",
            "只依据输入内容工作，不得编造公司、学校、日期、数字、奖项、证书、论文、专利或经历。",
            "除非任务明确要求改写文字，否则保留 JSON key、图片 data URL、链接、日期和数字。",
            f"简历 JSON:\n{resume_json}{jd_text}",
        ]
    )

    if task == "translate":
        lang_code = "en" if target_lang == "English" else "zh"
        target_name = "英文" if target_lang == "English" else "简体中文"
        return "\n".join(
            [
                base,
                "",
                f"任务：将简历中的自然语言内容翻译为{target_name}。",
                "- 保持 JSON key 不变。",
                "- 翻译姓名、头衔、简介、要点、标签和描述，用语自然、专业，符合目标语言习惯。",
                "- 忠实传达事实、范围和语气，不增删信息，不优化或夸大/弱化表述。",
                "- 公司名、产品名等专有名词译法准确；惯例保留原文时可保留原文。",
                f'- 设置 resume.meta.lang 为 "{lang_code}"。',
                "- 不要评分、不要提建议、不要新增内容。",
                '返回格式：{"resume": <完整译文 JSON>}',
            ]
        )
    if task == "fill":
        lang_code = "en" if output_lang == "English" else "zh"
        return "\n".join(
            [
                f"界面语言：{output_lang}。",
                "任务：将下方纯文本简历解析为 VitaLoom 的 resume JSON。",
                "规则：",
                "- 只提取文本中明确出现的信息。",
                "- 表述清晰、中性、专业；条目型内容合理拆入 description 等字段。",
                "- 不猜测缺失的日期、单位、学校、数字、奖项、证书或联系方式。",
                "- 无法确定的字段留空字符串或空数组。",
                "schema：meta, basics, links, highlights, experience, education, projects, skills, languages, awards, certificates, publications, activities, socialWork, notes。",
                f'设置 resume.meta.lang 为 "{lang_code}"。',
                '返回格式：{"resume": <完整 JSON>}',
                "",
                "纯文本简历：",
                body.get("rawText") or "",
            ]
        )
    if task == "optimize":
        return "\n".join(
            [
                base,
                "",
                "任务：给出逐字段优化建议（不是翻译）。",
                f"当前简历主体语言：{resume_lang_name}。面向用户的 section、reason 使用 {output_lang}。",
                "规则：",
                "- 每条建议对应 JSON 中一个真实 dot path（如 experience.0.description）。",
                "- original 为该字段原文摘录；proposal 为可直接替换的改写，且必须与 original 同语言。",
                "- 优先改进：结构更清晰、证据更具体、措辞更精炼、层级更合理；如有 JD，兼顾岗位匹配。",
                "- 保持客观：不虚构数据、工具或成果；不改变事实含义。",
                "- 避免空泛套话；若替换，应给出更有信息量的表述。",
                "- 有实质改进空间时给出 3–8 条；若整体已较好，可少于 3 条。",
                "- 严禁建议切换简历语言。",
                '返回格式：{"suggestions":[{"path":"experience.0.description","section":"工作经历","original":"...","proposal":"...","reason":"...","priority":"high|medium|low"}]}',
            ]
        )
    if task == "score":
        scope = "，并结合岗位 JD 评估匹配度" if jd else ""
        role_fit = "（与 JD 的契合度）" if jd else "（整体职业定位）"
        return "\n".join(
            [
                base,
                "",
                f"任务：对简历进行客观评分{scope}。",
                f"所有面向用户的文字使用 {output_lang}。",
                "规则：",
                "- 只评价现有内容，公正、具体、有依据，不空夸也不无依据苛责。",
                "- 总分 0–100：85+ 整体扎实、仅需微调；70–84 可用但有明显短板；55–69 需较大幅度修改；55 以下信息或表达缺口较大。",
                f"- 维度：清晰度（结构与可读性）、影响力（证据与成果）、岗位匹配{role_fit}。",
                "- quickWins：基于当前内容、可立即执行的小改动。risks：实质性缺口或表达薄弱点，不作道德评判。",
                "- 不要建议翻译简历。",
                '返回格式：{"score":85,"summary":"...","dimensions":[{"name":"...","score":80,"comment":"..."}],"quickWins":["..."],"risks":["..."]}',
            ]
        )
    raise ValueError("Unknown AI task.")


def call_ai(task, body):
    api_key = os.environ.get("QWEN_API_KEY") or os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing QWEN_API_KEY in .env.")

    base_url = (os.environ.get("QWEN_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    model = os.environ.get("QWEN_MODEL") or "qwen-plus"
    payload = {
        "model": model,
        "temperature": 0.2 if task == "score" else 0.35,
        "enable_thinking": False,
        "messages": [
            {
                "role": "system",
                "content": "你为 VitaLoom 简历编辑器输出严格 JSON，不要 Markdown，不要 JSON 外的说明。只依据输入内容判断；不编造事实；隐私字段缺失不算问题。优化与评分应具体、平衡、客观；proposal 必须与原字段同语言；不要把切换语言当作优化建议。解释性文字使用请求中的 outputLang。",
            },
            {"role": "user", "content": task_prompt(task, body)},
        ],
        "response_format": {"type": "json_object"},
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(
        f"{base_url}/chat/completions",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
    except HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"AI request failed: {err.code} {detail}") from err
    except URLError as err:
        raise RuntimeError(f"AI request failed: {err.reason}") from err

    result = json.loads(raw)
    content = result.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise RuntimeError("AI response did not include message content.")
    return parse_json_content(content)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        if self.path.endswith(".js"):
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/ai":
            self.send_error(404, "Not found")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 2 * 1024 * 1024:
                raise ValueError("Request body is too large.")
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            result = call_ai(body.get("task"), body)
            self.write_json(200, {"ok": True, "result": result})
        except Exception as err:
            status = 400 if "QWEN_API_KEY" in str(err) else 500
            self.write_json(status, {"ok": False, "error": str(err)})

    def do_GET(self):
        if self.path == "/api/config":
            self.write_json(
                200,
                {
                    "ok": True,
                    "hasLocalProvider": bool(
                        os.environ.get("QWEN_API_KEY") or os.environ.get("DASHSCOPE_API_KEY")
                    ),
                },
            )
            return
        super().do_GET()

    def write_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    load_env(ROOT / ".env")
    mimetypes.add_type("text/javascript; charset=utf-8", ".js")
    port = int(os.environ.get("PORT") or "4321")
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"VitaLoom running at http://127.0.0.1:{port}")
    server.serve_forever()
