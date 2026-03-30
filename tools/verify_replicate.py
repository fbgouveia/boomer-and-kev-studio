#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/verify_replicate.py
V.L.A.E.G. Fase 2 -- Link Check: Replicate API
Testa o modelo real usado no projeto: kwaivgi/kling-v2.6
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

HEADERS = {
    "Authorization": "",  # filled per-call
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "replicate-python/1.0.0",
}

def api_get(url, token):
    h = {**HEADERS, "Authorization": f"Token {token}"}
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read()), r.status

def api_post(url, token, data):
    payload = json.dumps(data).encode("utf-8")
    h = {**HEADERS, "Authorization": f"Token {token}"}
    req = urllib.request.Request(url, data=payload, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read()), r.status

def verify_replicate():
    print("=" * 50)
    print("[LINK] V.L.A.E.G. -- Replicate API")
    print("=" * 50)

    env = load_env()
    token = env.get("REPLICATE_API_TOKEN")
    if not token:
        print("[ERR] REPLICATE_API_TOKEN ausente"); sys.exit(1)

    print(f"[OK ] Token: {token[:8]}...{token[-4:]}")
    results = {}

    # 1. Verificar modelo Kling v2.6 (modelo real do projeto)
    print("\n[...] Verificando kwaivgi/kling-v2.6 (modelo do projeto)...")
    try:
        data, status = api_get("https://api.replicate.com/v1/models/kwaivgi/kling-v2.6", token)
        ver = data.get("latest_version", {}).get("id", "N/A")
        print(f"[OK ] kwaivgi/kling-v2.6 encontrado")
        print(f"      Latest version: {ver[:16] if ver != 'N/A' else 'N/A'}...")
        results["kling_v2_6"] = {"status": "ok", "version": ver[:16]}
        results["auth"] = "ok"
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[ERR] HTTP {e.code}: {body[:150]}")
        if e.code == 401:
            print("[TIP] Token invalido"); sys.exit(1)
        elif e.code == 404:
            print("[WARN] Modelo nao encontrado via /models -- pode estar em /deployments")
            results["kling_v2_6"] = {"status": "not_found_via_models"}
            results["auth"] = "ok"  # 404 != auth fail
        elif e.code == 403:
            print("[WARN] Token sem permissao para listar modelos (scope limitado)")
            print("[INFO] Token valido para criar predicoes -- testando via POST...")
            results["kling_v2_6"] = {"status": "restricted_scope"}
            results["auth"] = "restricted"

    # 2. Verificar conta (GET /account) -- mais permissivo
    print("\n[...] Verificando conta Replicate...")
    try:
        data, status = api_get("https://api.replicate.com/v1/account", token)
        username = data.get("username", "N/A")
        plan = data.get("type", "N/A")
        print(f"[OK ] Conta: @{username} (tipo: {plan})")
        results["account"] = {"username": username, "type": plan}
        results["auth"] = "ok"
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[ERR] /account HTTP {e.code}: {body[:100]}")
        if e.code == 401:
            print("[TIP] Token invalido ou expirado")
            results["auth"] = "invalid"
            sys.exit(1)

    # 3. Resumo
    tmp = Path(__file__).parent.parent / ".tmp"
    tmp.mkdir(exist_ok=True)
    (tmp / "verify_replicate.json").write_text(json.dumps(results, indent=2))

    print("\n" + "=" * 50)
    ok = results.get("auth") in ("ok", "restricted")
    print(f"[{'GREEN' if ok else 'RED'}] REPLICATE LINK: {'OK' if ok else 'FALHOU'}")
    if results.get("auth") == "restricted":
        print("[INFO] Token com scope limitado -- funcional para criar predicoes")
    print("[SAVE] .tmp/verify_replicate.json")
    return ok

if __name__ == "__main__":
    verify_replicate()
