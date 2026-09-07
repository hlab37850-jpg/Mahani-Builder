#!/usr/bin/env python3

import json
import os
import re
import sys
import urllib.request

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL = "qwen2.5-coder:3b"

MAX_FILE_CHARS = 5000
MAX_CONTEXT_CHARS = 10000
WINDOW_LINES = 45

SYSTEM_PROMPT = r"""
أنت Repair Engine لمشروع Mahani Builder AI.

مهمتك تحليل أخطاء المشروع واقتراح إصلاحات دقيقة.

قواعد صارمة:
1. لا تخترع ملفات أو دوال غير موجودة في السياق.
2. لا تعتبر التخمين حقيقة.
3. استخدم الأدلة الموجودة في الكود فقط.
4. حدد الملف والدالة والأسطر ذات العلاقة إن أمكن.
5. لا تعدل الملفات بنفسك.
6. لا تقل إن الإصلاح نجح إلا إذا ظهر دليل من اختبار فعلي.
7. إذا لم يكن السياق كافيًا، استخدم INSUFFICIENT_CONTEXT.
8. ابحث عن السبب الجذري وليس مجرد إخفاء رسالة الخطأ.
9. عند اقتراح إصلاح، قدم أقل تغيير آمن ممكن.
10. راعِ أن المشروع يستخدم Node.js وFlutter وGitHub Actions.

أخرج النتيجة بهذا الشكل:

ROOT_CAUSE:
...

EVIDENCE:
...

AFFECTED_FILES:
...

FUNCTIONS:
...

PROPOSED_FIX:
...

VALIDATION:
...

RISKS:
...

CONFIDENCE:
0-100
"""

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as exc:
        return f"[READ_ERROR] {path}: {exc}"


def collect_js_files():
    result = []

    for root, dirs, files in os.walk("server"):
        dirs[:] = [
            d for d in dirs
            if d not in {"node_modules", ".git", ".mahani-agent"}
        ]

        for name in files:
            if name.endswith(".js"):
                result.append(os.path.join(root, name))

    return sorted(result)


def find_relevant_files(error):
    """
    بحث محلي سريع قبل إرسال أي شيء إلى النموذج.
    """
    files = collect_js_files()

    tokens = set(
        t.lower()
        for t in re.findall(r"[A-Za-z_][A-Za-z0-9_.:-]{2,}", error)
    )

    keywords = {
        "github",
        "workflow",
        "workflow_dispatch",
        "commit",
        "sha",
        "artifact",
        "flutter",
        "build",
        "error",
        "actions",
    }

    tokens.update(keywords)

    scored = []

    for path in files:
        content = read_file(path)
        lower = content.lower()

        score = 0

        for token in tokens:
            if token in lower:
                score += lower.count(token)

        if score:
            scored.append((score, path, content))

    scored.sort(reverse=True, key=lambda x: x[0])

    return scored


def build_context(error):
    matches = find_relevant_files(error)

    if not matches:
        return "", []

    selected = []
    context_parts = []
    total = 0

    # نأخذ فقط المقاطع المحيطة بتطابقات الخطأ.
    for score, path, content in matches[:3]:
        lines = content.splitlines()

        tokens = set(
            t.lower()
            for t in re.findall(
                r"[A-Za-z_][A-Za-z0-9_.:-]{2,}",
                error
            )
        )

        hit_lines = []

        for i, line in enumerate(lines):
            lower = line.lower()

            if any(token in lower for token in tokens):
                hit_lines.append(i)

        # إذا لم نجد تطابقًا مباشرًا، نأخذ بداية الملف فقط.
        if not hit_lines:
            hit_lines = [0]

        # دمج النوافذ القريبة من بعضها.
        windows = []

        for line_no in hit_lines:
            start_line = max(0, line_no - WINDOW_LINES)
            end_line = min(len(lines), line_no + WINDOW_LINES + 1)

            merged = False

            for j, (a, b) in enumerate(windows):
                if start_line <= b + 10 and end_line >= a - 10:
                    windows[j] = (
                        min(a, start_line),
                        max(b, end_line)
                    )
                    merged = True
                    break

            if not merged:
                windows.append((start_line, end_line))

        file_parts = []

        for a, b in windows[:4]:
            chunk = "\n".join(
                f"{i + 1}: {lines[i]}"
                for i in range(a, b)
            )

            file_parts.append(
                f"\n--- {path}:{a + 1}-{b} ---\n{chunk}\n"
            )

        block = "".join(file_parts)

        if total + len(block) > MAX_CONTEXT_CHARS:
            remaining = MAX_CONTEXT_CHARS - total

            if remaining < 500:
                break

            block = block[:remaining]

        context_parts.append(
            f"\n===== FILE: {path} =====\n{block}"
        )

        selected.append((path, score))
        total += len(block)

        if total >= MAX_CONTEXT_CHARS:
            break

    return "".join(context_parts), selected

def ask_ollama(prompt):
    payload = {
        "model": MODEL,
        "prompt": SYSTEM_PROMPT + "\n\n" + prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_ctx": 4096,
            "num_predict": 160,
        }
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data.get("response", "")


def main():
    if len(sys.argv) < 2:
        print('Usage: python .mahani-agent/agent.py "ERROR"')
        sys.exit(1)

    error = " ".join(sys.argv[1:])

    print("===== MAHANI REPAIR ENGINE =====")
    print("[ENGINE] Error received.")
    print("[ENGINE] Searching relevant source files...")

    context, selected = build_context(error)

    if not context:
        print("INSUFFICIENT_CONTEXT: no relevant JavaScript source found.")
        sys.exit(3)

    print("[ENGINE] Relevant files:")

    for path, score in selected:
        print(f"  - {path} (score={score})")

    print("[ENGINE] Sending focused context to Ollama...")
    print(f"[ENGINE] Model: {MODEL}")

    prompt = f"""
PROJECT:
{os.path.abspath(".")}

ERROR:
{error}

RELEVANT SOURCE:
{context}

حلل الخطأ اعتمادًا على الملفات المعروضة فقط.
لا تعدل أي ملف.
أعطني التشخيص والإصلاح المقترح وخطوات التحقق.
"""

    try:
        result = ask_ollama(prompt)

        print("\n===== DIAGNOSIS =====\n")
        print(result)
        print("\n===== END DIAGNOSIS =====")

    except Exception as exc:
        print(f"AGENT_ERROR: {exc}")
        sys.exit(2)


if __name__ == "__main__":
    main()
