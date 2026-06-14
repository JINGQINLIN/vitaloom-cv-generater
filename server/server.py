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
    resume_lang = ((resume.get("meta") or {}).get("lang") or "zh").lower()
    resume_lang_name = "英文" if resume_lang == "en" else "中文"
    output_lang = "English" if body.get("outputLang") == "English" else "Simplified Chinese"
    resume_json = json.dumps(resume, ensure_ascii=False, indent=2)
    jd = body.get("jobDescription") or ""
    jd_text = f"\nJob description:\n{jd}" if jd else ""
    base = "\n\n".join(
        [
            "Input may intentionally omit private identity/contact fields such as name, email, phone, address, website and avatar. Do not penalize missing private contact fields and do not suggest adding them.",
            "你是专业简历编辑。只返回合法 JSON，不要 Markdown，不要解释。",
            "不得编造公司、学校、日期、奖项、证书、数字、论文、专利、出版物或任何不存在的经历。",
            "除非当前任务明确要求改写文本，否则必须保留图片 data URL、链接、日期、数字和 JSON schema key。",
            f"简历 JSON:\n{resume_json}{jd_text}",
        ]
    )

    if task == "translate":
        lang_code = "en" if target_lang == "English" else "zh"
        return (
            f"{base}\n\n任务：翻译简历。\n"
            "- 只翻译简历里的自然语言内容，包括姓名头衔、简介、经历描述、项目描述、技能、语言、奖项、证书、成果、活动、链接标签等。\n"
            f'- 保持 JSON key 不变，但必须把 resume.meta.lang 设置为 "{lang_code}"，用于前端把简历板块标题切换成目标语言。\n'
            "- 不要优化、不要评分、不要提出建议、不要新增内容。\n"
            f"- 目标语言：{target_lang}。\n"
            '返回格式必须是：{"resume": <翻译后的完整简历 JSON>}'
        )
    if task == "fill":
        lang_code = "en" if output_lang == "English" else "zh"
        return (
            f"用户可见输出语言：{output_lang}。\n"
            "任务：把用户粘贴的纯文本简历解析为本项目的完整 resume JSON。\n"
            "只能使用文本中明确出现的信息，不得虚构公司、学校、日期、奖项、证书、数字、论文、专利或经历。\n"
            "字段结构必须兼容当前简历 schema：meta, basics, links, highlights, experience, education, projects, skills, languages, awards, certificates, publications, activities, socialWork, notes。\n"
            f"必须设置 resume.meta.lang 为 \"{lang_code}\"。\n"
            "如果无法判断某个字段，留空字符串或空数组。\n"
            "返回格式必须是：{\"resume\": <解析后的完整简历 JSON>}\n\n"
            "纯文本简历：\n"
            f"{body.get('rawText') or ''}"
        )
    if task == "optimize":
        return (
            f"{base}\n\n任务：逐项优化建议。\n"
            f"当前简历主体语言：{resume_lang_name}。\n"
            f"用户可见解释语言：{output_lang}。\n"
            "硬性规则：\n"
            "- 这是“优化建议”，不是翻译任务。严禁建议把简历翻译成另一种语言，严禁把英文简历改成中文，严禁把中文简历改成英文。\n"
            f"- section、reason、priority 等解释性内容必须使用 {output_lang}。\n"
            "- original 必须忠实摘录原字段；proposal 必须是可直接替换原字段的改写，并且必须保持该字段原本的语言。英文原文给英文 proposal，中文原文给中文 proposal。\n"
            f"- 如果 original 是英文，proposal 中不得出现中文句子；解释原因时使用 {output_lang}。\n"
            "- “输出语言”只表示解释建议原因和位置的语言，不表示把简历内容改写成该语言。\n"
            "- 如果简历存在可改进内容，必须返回 3 到 8 条建议；不要因为语言约束而返回空 suggestions。\n"
            "- 每条建议只针对一个可编辑字段，使用简历 JSON 中真实存在的 dot path。\n"
            "- 重点关注含金量呈现、量化结果、信息层级、措辞精炼、岗位匹配，不要泛泛而谈。\n"
            '返回格式必须是：{"suggestions":[{"path":"experience.0.description","section":"工作经历",'
            f'"original":"original field text","proposal":"same-language replacement text","reason":"reason in {output_lang}","priority":"high|medium|low"}}]}}'
        )
    if task == "score":
        scope = "，并结合岗位 JD 判断匹配度" if jd else ""
        return (
            f"{base}\n\n任务：简历评分{scope}。\n"
            f"用户可见输出语言：{output_lang}。\n"
            "硬性规则：\n"
            f"- 整个 JSON 中除字段名 key 和必要专有名词外，所有用户可见内容必须使用 {output_lang}。\n"
            "- 不要提出翻译类建议；尤其不要建议把英文简历改成中文，也不要建议把中文简历改成英文。\n"
            "- 评分要具体指出当前简历的强项、弱项和最值得先改的地方。\n"
            f'返回格式必须是：{{"score":85,"summary":"summary in {output_lang}","dimensions":[{{"name":"Clarity",'
            f'"score":80,"comment":"comment in {output_lang}"}},{{"name":"Impact","score":80,"comment":"comment in {output_lang}"}},'
            f'{{"name":"Role fit","score":80,"comment":"comment in {output_lang}"}}],"quickWins":["suggestion in {output_lang}"],"risks":["risk in {output_lang}"]}}'
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
                "content": "你为简历生成器输出严格 JSON。除翻译任务外，解释、原因、评分等用户可见说明必须使用请求中的 outputLang；但可直接替换到简历里的 proposal 必须保持原字段语言。不得把切换语言当作优化建议。",
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
