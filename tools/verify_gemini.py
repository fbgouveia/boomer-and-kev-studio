#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/verify_gemini.py
V.L.A.E.G. Fase 2 -- Link Check: Google Gemini 2.5 Flash
"""
import sys, json, urllib.request, urllib.error
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    if not env_path.exists():
        print("[ERR] .env.local nao encontrado"); sys.exit(1)
    env = {}
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

def verify_gemini():
    print("=" * 50)
    print("[LINK] V.L.A.E.G. -- Gemini 2.5 Flash")
    print("=" * 50)

    env = load_env()
    api_key = env.get("GEMINI_API_KEY")
    if not api_key:
        print("[ERR] GEMINI_API_KEY ausente"); sys.exit(1)

    print(f"[OK ] Key: {api_key[:8]}...{api_key[-4:]}")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": "Reply exactly: BOOMER_AND_KEV_LINK_OK"}]}]
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload,
        headers={"Content-Type": "application/json"}, method="POST")

    print("[...] POST v1beta/models/gemini-2.5-flash ...")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())

        text = data.get("candidates",[{}])[0].get("content",{}).get("parts",[{}])[0].get("text","")
        print(f"[OK ] Resposta: {text.strip()[:80]}")

        status = "ok" if "BOOMER_AND_KEV_LINK_OK" in text else "unexpected_response"
        print(f"\n[{'GREEN' if status=='ok' else 'YELLOW'}] GEMINI LINK: {status.upper()}")

        tmp = Path(__file__).parent.parent / ".tmp"
        tmp.mkdir(exist_ok=True)
        (tmp / "verify_gemini.json").write_text(
            json.dumps({"status": status, "model": "gemini-2.5-flash", "endpoint": "v1beta"}, indent=2))
        print("[SAVE] .tmp/verify_gemini.json")
        return status == "ok"

    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[ERR] HTTP {e.code}: {body[:200]}")
        if e.code == 404: print("[TIP] Execute: node find-model.js")
        if e.code == 403: print("[TIP] Key sem acesso ao gemini-2.5-flash")
        sys.exit(1)
    except Exception as e:
        print(f"[ERR] {e}"); sys.exit(1)

if __name__ == "__main__":
    verify_gemini()
